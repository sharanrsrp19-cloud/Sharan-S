import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ActiveProp,
  Actor,
  Arrow,
  BiomeId,
  ExplosionFlash,
  FloatingCallout,
  Particle,
  Platform,
  RagdollBody,
  StuckArrow,
  Vec2,
} from '../types';
import { WeatherPool, getBiomeWeatherProfile } from '../weather';
import { Courtyard3DEnvironment, createCourtyard3DEnvironment } from './environment3d';
import {
  BIOME_3D_THEMES,
  BIOME_BACKDROP_URLS,
  ProceduralTextureSet,
  WORLD_SCALE,
  createProceduralTextureSet,
  detectSoftwareWebGL,
  toWorldLen,
  toWorldX,
  toWorldY,
} from './materials3d';
import {
  Ragdoll3DRig,
  Stickman3DRig,
  createArrow3DMesh,
  createPlatform3DRig,
  createProp3DRig,
  createRagdoll3DRig,
  createStickman3DRig,
  syncRagdoll3DRig,
  syncStickman3DRig,
} from './models3d';

export type CameraPreset = 'side' | 'cinematic' | 'follow';

export interface AimRenderState {
  active: boolean;
  power: number;
  angle: number;
  trajectory: Vec2[];
  dragStartWorld: Vec2 | null;
  dragCurrWorld: Vec2 | null;
}

export interface ThreeRenderFrameInput {
  biome: BiomeId;
  time: number;
  dt: number;
  wind: number;
  trauma: number;
  platforms: Platform[];
  props: ActiveProp[];
  actors: Actor[];
  ragdolls: RagdollBody[];
  arrows: Arrow[];
  stuckArrows: StuckArrow[];
  particles: Particle[];
  callouts: FloatingCallout[];
  explosions: ExplosionFlash[];
  weatherPool: WeatherPool;
  aimState: AimRenderState;
  isTitleScreen: boolean;
}

// Pre-allocated scratch math helpers (zero per-frame GC)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _vec3C = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scale = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _color = new THREE.Color();
const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _combatPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

const MAX_TRAJ_ORBS = 16;
const MAX_COMET_SPARKS = 256;
const MAX_SIM_PARTICLES = 200;
const MAX_WEATHER_INST = 72;
const MAX_SPLASH_INST = 32;
const MAX_EXPLOSION_FX = 8;

interface PropRigEntry {
  group: THREE.Group;
  chainMesh?: THREE.Mesh;
  bobGroup?: THREE.Group;
}

interface ExplosionFxEntry {
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  ringMesh: THREE.Mesh;
  coreMat: THREE.MeshBasicMaterial;
  ringMat: THREE.MeshBasicMaterial;
}

export class ThreeSceneRenderer {
  public readonly domElement: HTMLCanvasElement;
  public readonly isSoftwareGl: boolean;

  private mountEl: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private envRT: THREE.WebGLRenderTarget;
  private textures: ProceduralTextureSet;
  private courtyard: Courtyard3DEnvironment;

  private keyLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;
  private skyDomeMesh: THREE.Mesh;
  private skyMat: THREE.ShaderMaterial;

  // Panoramic painted backdrop cyclorama (crossfades smoothly per round/biome)
  private backdropMesh: THREE.Mesh;
  private backdropMat: THREE.ShaderMaterial;
  private backdropTextures = new Map<BiomeId, THREE.Texture>();
  private loadingBackdrops = new Set<BiomeId>();
  private fallbackTex: THREE.CanvasTexture;
  private maxAniso = 1;
  private preloadTimerId: number | null = null;
  private backdropBlend = 1;
  private lightningBoltMesh: THREE.Line;

  private currentBiome: BiomeId | null = null;
  private cssW = 1280;
  private cssH = 720;

  // Dynamic entity registries synced against simulation state
  private platformMeshes = new Map<string, { sig: string; group: THREE.Group }>();
  private propRigs = new Map<string, PropRigEntry>();
  private actorRigs = new Map<string, Stickman3DRig>();
  private ragdollRigs = new Map<string, Ragdoll3DRig>();
  private arrowMeshes = new Map<string, THREE.Group>();
  private stuckArrowMeshes: THREE.Group[] = [];
  private stuckSignature = '';

  // Instanced pools
  private trajInst: THREE.InstancedMesh;
  private cometInst: THREE.InstancedMesh;
  private particleInst: THREE.InstancedMesh;
  private weatherInst: THREE.InstancedMesh;
  private splashInst: THREE.InstancedMesh;
  private arrowRibbonLines: THREE.Line[] = [];

  // Aim pull visual cue
  private aimCueLine: THREE.Line;
  private aimCueRing: THREE.Mesh;

  // Explosion pool
  private explosionPool: ExplosionFxEntry[] = [];

  // Callout Sprite pool + CanvasTexture cache
  private calloutSprites: THREE.Sprite[] = [];
  private calloutTexCache = new Map<string, THREE.CanvasTexture>();

  // Camera damping state
  private cameraPreset: CameraPreset = 'side';
  private camPos = new THREE.Vector3(0, 11.4, 37.2);
  private camTarget = new THREE.Vector3(0, 10.6, 0);
  private afterDrawTimerId: number | null = null;

  constructor(mountEl: HTMLElement) {
    this.mountEl = mountEl;
    this.isSoftwareGl = detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.domElement = this.renderer.domElement;
    this.domElement.tabIndex = 0;
    this.domElement.dataset.testid = 'game-canvas';
    this.domElement.setAttribute('aria-label', 'Arrowfall 3D archery battlefield');
    this.domElement.className = 'block w-full h-full outline-none cursor-crosshair';
    this.mountEl.appendChild(this.domElement);

    this.scene = new THREE.Scene();
    const initialTheme = BIOME_3D_THEMES.meadow;
    this.scene.background = new THREE.Color(initialTheme.skyHorizon);
    this.scene.fog = new THREE.FogExp2(initialTheme.fogColor, initialTheme.fogDensity);

    // Mandatory studio environment map via RoomEnvironment + PMREMGenerator
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRT = pmrem.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRT.texture;
    roomEnv.dispose();
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.5, 180);
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camTarget);

    // Sky gradient backdrop dome matching dusk biome mood
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTop: { value: new THREE.Color(initialTheme.skyTop) },
        uHorizon: { value: new THREE.Color(initialTheme.skyHorizon) },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uTop;
        uniform vec3 uHorizon;
        varying vec3 vWorldPos;
        void main() {
          float h = clamp((vWorldPos.y - 2.0) / 34.0, 0.0, 1.0);
          vec3 col = mix(uHorizon, uTop, pow(h, 0.68));
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
    this.skyDomeMesh = new THREE.Mesh(new THREE.SphereGeometry(95, 24, 16), this.skyMat);
    this.scene.add(this.skyDomeMesh);

    // Warm/cool 3-point lighting rig (single shadow-caster)
    this.hemiLight = new THREE.HemisphereLight(
      initialTheme.hemiSky,
      initialTheme.hemiGround,
      initialTheme.hemiIntensity,
    );
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(initialTheme.keyColor, initialTheme.keyIntensity);
    this.keyLight.position.set(-14, 28, 22);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 75;
    this.keyLight.shadow.camera.left = -24;
    this.keyLight.shadow.camera.right = 24;
    this.keyLight.shadow.camera.top = 24;
    this.keyLight.shadow.camera.bottom = -8;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.DirectionalLight(0x93c5fd, 0.85);
    this.rimLight.position.set(18, 16, -18);
    this.scene.add(this.rimLight);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.maxAniso = maxAniso;
    this.textures = createProceduralTextureSet(maxAniso);

    // Fallback 2x2 texture so backdrop never flickers before image decode completes
    const fbCanvas = document.createElement('canvas');
    fbCanvas.width = 4;
    fbCanvas.height = 4;
    const fbCtx = fbCanvas.getContext('2d')!;
    const fbGrad = fbCtx.createLinearGradient(0, 0, 0, 4);
    fbGrad.addColorStop(0, '#2a314a');
    fbGrad.addColorStop(1, '#7b6375');
    fbCtx.fillStyle = fbGrad;
    fbCtx.fillRect(0, 0, 4, 4);
    this.fallbackTex = new THREE.CanvasTexture(fbCanvas);
    this.fallbackTex.colorSpace = THREE.SRGBColorSpace;

    // Preload remaining biome backdrops gently in background after initial active biome gets priority
    this.preloadTimerId = window.setTimeout(() => {
      this.preloadTimerId = null;
      (Object.keys(BIOME_BACKDROP_URLS) as BiomeId[]).forEach((bId) => {
        this.loadBackdropTexture(bId);
      });
    }, 250);

    // Curved panoramic backdrop cyclorama behind the courtyard (z = -38)
    const backdropGeo = new THREE.PlaneGeometry(108, 60.75, 24, 1);
    const bPos = backdropGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < bPos.count; i++) {
      const vx = bPos.getX(i);
      const norm = vx / 54;
      bPos.setZ(i, norm * norm * 6.5);
    }
    backdropGeo.computeVertexNormals();

    this.backdropMat = new THREE.ShaderMaterial({
      depthWrite: false,
      fog: false,
      transparent: true,
      uniforms: {
        uTexPrev: { value: this.fallbackTex },
        uTexNext: { value: this.fallbackTex },
        uMix: { value: 1.0 },
        uFlash: { value: 0.0 },
        uReady: { value: 0.0 },
        uFogColor: { value: new THREE.Color(initialTheme.fogColor) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexPrev;
        uniform sampler2D uTexNext;
        uniform float uMix;
        uniform float uFlash;
        uniform float uReady;
        uniform vec3 uFogColor;
        varying vec2 vUv;
        void main() {
          vec4 c0 = texture2D(uTexPrev, vUv);
          vec4 c1 = texture2D(uTexNext, vUv);
          vec3 col = mix(c0.rgb, c1.rgb, uMix);
          // Subtle horizon & top vignette blend into 3D scene fog
          float edgeFade = smoothstep(0.0, 0.14, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
          col = mix(uFogColor * 0.72, col, mix(0.45, 1.0, edgeFade));
          col += vec3(0.55, 0.68, 0.95) * uFlash;
          gl_FragColor = vec4(col, uReady);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
    this.backdropMesh = new THREE.Mesh(backdropGeo, this.backdropMat);
    this.backdropMesh.position.set(0, 18.2, -38);
    this.backdropMesh.renderOrder = -10;
    this.scene.add(this.backdropMesh);

    // 3D sky lightning bolt line for 'storm' biome
    const boltPts = [
      new THREE.Vector3(6, 32, -26),
      new THREE.Vector3(4.5, 25, -26),
      new THREE.Vector3(7.2, 21, -26),
      new THREE.Vector3(3.8, 13, -26),
      new THREE.Vector3(5.6, 8, -26),
    ];
    this.lightningBoltMesh = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(boltPts),
      new THREE.LineBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.95 }),
    );
    this.lightningBoltMesh.visible = false;
    this.scene.add(this.lightningBoltMesh);

    this.courtyard = createCourtyard3DEnvironment(this.textures, initialTheme);
    this.scene.add(this.courtyard.group);

    // Instanced pools
    this.trajInst = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.18, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.92 }),
      MAX_TRAJ_ORBS,
    );
    this.trajInst.frustumCulled = false;
    this.trajInst.count = 0;
    this.scene.add(this.trajInst);

    this.cometInst = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.14, 0),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 }),
      MAX_COMET_SPARKS,
    );
    this.cometInst.frustumCulled = false;
    this.cometInst.count = 0;
    this.scene.add(this.cometInst);

    this.particleInst = new THREE.InstancedMesh(
      new THREE.DodecahedronGeometry(0.16, 0),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      MAX_SIM_PARTICLES,
    );
    this.particleInst.frustumCulled = false;
    this.particleInst.count = 0;
    this.scene.add(this.particleInst);

    this.weatherInst = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.12),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.72 }),
      MAX_WEATHER_INST,
    );
    this.weatherInst.frustumCulled = false;
    this.weatherInst.count = 0;
    this.scene.add(this.weatherInst);

    this.splashInst = new THREE.InstancedMesh(
      new THREE.RingGeometry(0.1, 0.22, 12),
      new THREE.MeshBasicMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide,
      }),
      MAX_SPLASH_INST,
    );
    this.splashInst.frustumCulled = false;
    this.splashInst.count = 0;
    this.scene.add(this.splashInst);

    // Pre-allocate fiery ribbon lines for active arrows
    for (let i = 0; i < 16; i++) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(16 * 3), 3));
      const line = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.85 }),
      );
      line.visible = false;
      line.frustumCulled = false;
      this.scene.add(line);
      this.arrowRibbonLines.push(line);
    }

    // Aim slingshot pull cue
    const cueGeo = new THREE.BufferGeometry();
    cueGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    this.aimCueLine = new THREE.Line(
      cueGeo,
      new THREE.LineBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.88 }),
    );
    this.aimCueLine.visible = false;
    this.scene.add(this.aimCueLine);

    this.aimCueRing = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.46, 20),
      new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      }),
    );
    this.aimCueRing.visible = false;
    this.scene.add(this.aimCueRing);

    // Explosion FX pool
    for (let i = 0; i < MAX_EXPLOSION_FX; i++) {
      const group = new THREE.Group();
      group.visible = false;
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
      const coreMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), coreMat);
      group.add(coreMesh);

      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xf97316,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 8, 24), ringMat);
      group.add(ringMesh);
      this.scene.add(group);
      this.explosionPool.push({ group, coreMesh, ringMesh, coreMat, ringMat });
    }

    // Callout sprite pool
    for (let i = 0; i < 14; i++) {
      const sp = new THREE.Sprite(
        new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false }),
      );
      sp.visible = false;
      sp.renderOrder = 50;
      this.scene.add(sp);
      this.calloutSprites.push(sp);
    }

    this.resize(mountEl.clientWidth || 1280, mountEl.clientHeight || 720);

    // Pre-warm shaders on GPU devices only
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  public setCameraPreset(preset: CameraPreset): void {
    this.cameraPreset = preset;
  }

  public getCameraPreset(): CameraPreset {
    return this.cameraPreset;
  }

  public resize(width: number, height: number): void {
    this.cssW = Math.max(320, width);
    this.cssH = Math.max(240, height);
    this.camera.aspect = this.cssW / this.cssH;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.cssW, this.cssH, false);
  }

  public screenToWorld2D(clientX: number, clientY: number): Vec2 {
    const rect = this.domElement.getBoundingClientRect();
    const w = rect.width || this.cssW;
    const h = rect.height || this.cssH;
    _ndc.set(
      ((clientX - rect.left) / w) * 2 - 1,
      -((clientY - rect.top) / h) * 2 + 1,
    );
    this.camera.updateMatrixWorld();
    _raycaster.setFromCamera(_ndc, this.camera);
    if (_raycaster.ray.intersectPlane(_combatPlane, _vec3A)) {
      return {
        x: _vec3A.x / WORLD_SCALE + 640,
        y: 720 - _vec3A.y / WORLD_SCALE,
      };
    }
    return { x: 640, y: 360 };
  }

  public afterDraw(cb: () => void): void {
    if (this.afterDrawTimerId !== null) {
      window.clearTimeout(this.afterDrawTimerId);
      this.afterDrawTimerId = null;
    }
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = typeof gl.fenceSync === 'function' ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
    if (typeof gl.flush === 'function') gl.flush();

    if (!sync) {
      this.afterDrawTimerId = window.setTimeout(() => {
        this.afterDrawTimerId = null;
        cb();
      }, 80);
      return;
    }

    const poll = () => {
      const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.afterDrawTimerId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.afterDrawTimerId = window.setTimeout(() => {
          this.afterDrawTimerId = null;
          cb();
        }, 80);
      }
    };
    this.afterDrawTimerId = window.setTimeout(poll, 5);
  }

  public cancelAfterDraw(): void {
    if (this.afterDrawTimerId !== null) {
      window.clearTimeout(this.afterDrawTimerId);
      this.afterDrawTimerId = null;
    }
  }

  public renderFrame(input: ThreeRenderFrameInput): void {
    this.applyBiomeTheme(input.biome);
    this.courtyard.update(input.time, input.wind, input.isTitleScreen);

    // Smoothly crossfade painted background image on round/biome transitions
    if (this.backdropBlend < 1) {
      this.backdropBlend = Math.min(1, this.backdropBlend + Math.max(0.016, input.dt) * 1.4);
      this.backdropMat.uniforms.uMix.value = this.backdropBlend;
    }

    // Periodic lightning bolt & illumination pulse in 'storm' biome
    if (input.biome === 'storm') {
      const cycle = input.time % 4.2;
      const flash =
        cycle < 0.14
          ? Math.sin((cycle / 0.14) * Math.PI) * 0.65
          : cycle > 0.22 && cycle < 0.31
            ? Math.sin(((cycle - 0.22) / 0.09) * Math.PI) * 0.45
            : 0;
      this.backdropMat.uniforms.uFlash.value = flash;
      this.rimLight.intensity = 0.85 + flash * 3.2;
      this.lightningBoltMesh.visible = flash > 0.18;
      if (this.lightningBoltMesh.visible) {
        const shiftX = Math.sin(Math.floor(input.time / 4.2) * 3.7) * 14;
        this.lightningBoltMesh.position.x = shiftX;
      }
    } else {
      this.backdropMat.uniforms.uFlash.value = 0;
      this.rimLight.intensity = 0.85;
      this.lightningBoltMesh.visible = false;
    }

    this.syncPlatforms(input.platforms, input.biome);
    this.syncProps(input.props);
    this.syncActors(input.actors, input.time, input.aimState);
    this.syncRagdolls(input.ragdolls);
    this.syncArrows(input.arrows, input.time);
    this.syncStuckArrows(input.stuckArrows, input.platforms);
    this.syncTrajectoryAndAim(input.aimState, input.time);
    this.syncParticles(input.particles);
    this.syncWeather(input.weatherPool, input.wind, input.time);
    this.syncExplosions(input.explosions);
    this.syncCallouts(input.callouts);
    this.updateCamera(input);

    this.renderer.render(this.scene, this.camera);
  }

  private loadBackdropTexture(bId: BiomeId): void {
    if (this.backdropTextures.has(bId) || this.loadingBackdrops.has(bId)) return;
    this.loadingBackdrops.add(bId);
    const texLoader = new THREE.TextureLoader();
    texLoader.load(
      BIOME_BACKDROP_URLS[bId],
      (loadedTex) => {
        this.loadingBackdrops.delete(bId);
        loadedTex.colorSpace = THREE.SRGBColorSpace;
        loadedTex.anisotropy = this.maxAniso;
        loadedTex.needsUpdate = true;
        this.backdropTextures.set(bId, loadedTex);

        if (this.currentBiome === bId) {
          if (this.backdropBlend >= 0.99) {
            this.backdropMat.uniforms.uTexPrev.value = loadedTex;
            this.backdropMat.uniforms.uTexNext.value = loadedTex;
          } else {
            this.backdropMat.uniforms.uTexNext.value = loadedTex;
          }
          this.backdropMat.uniforms.uReady.value = 1.0;
        }
      },
      undefined,
      () => {
        this.loadingBackdrops.delete(bId);
      },
    );
  }

  private applyBiomeTheme(biome: BiomeId): void {
    if (this.currentBiome === biome) return;
    const isInitial = this.currentBiome === null;
    this.currentBiome = biome;
    this.loadBackdropTexture(biome);
    const theme = BIOME_3D_THEMES[biome];

    (this.scene.background as THREE.Color).setHex(theme.skyHorizon);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.setHex(theme.fogColor);
      this.scene.fog.density = theme.fogDensity;
    }
    this.skyMat.uniforms.uTop.value.setHex(theme.skyTop);
    this.skyMat.uniforms.uHorizon.value.setHex(theme.skyHorizon);
    this.keyLight.color.setHex(theme.keyColor);
    this.keyLight.intensity = theme.keyIntensity;
    this.hemiLight.color.setHex(theme.hemiSky);
    this.hemiLight.groundColor.setHex(theme.hemiGround);
    this.hemiLight.intensity = theme.hemiIntensity;

    const decodedTex = this.backdropTextures.get(biome);
    const nextTex = decodedTex || this.fallbackTex;
    this.backdropMat.uniforms.uReady.value = decodedTex ? 1.0 : 0.0;
    if (isInitial || !decodedTex) {
      this.backdropMat.uniforms.uTexPrev.value = nextTex;
      this.backdropMat.uniforms.uTexNext.value = nextTex;
      this.backdropBlend = 1;
      this.backdropMat.uniforms.uMix.value = 1;
    } else {
      this.backdropMat.uniforms.uTexPrev.value = this.backdropMat.uniforms.uTexNext.value;
      this.backdropMat.uniforms.uTexNext.value = nextTex;
      this.backdropBlend = 0;
      this.backdropMat.uniforms.uMix.value = 0;
    }
    this.backdropMat.uniforms.uFogColor.value.setHex(theme.fogColor);

    this.courtyard.applyTheme(biome, theme);

    // Rebuild static platforms for updated turf/biome color
    for (const entry of this.platformMeshes.values()) {
      this.scene.remove(entry.group);
      disposeGroupResources(entry.group);
    }
    this.platformMeshes.clear();
  }

  private syncPlatforms(platforms: Platform[], biome: BiomeId): void {
    const theme = BIOME_3D_THEMES[biome];
    const activeIds = new Set<string>();

    for (const p of platforms) {
      activeIds.add(p.id);
      const sig = `${p.material}|${p.w}|${p.h}|${Boolean(p.ricochet)}`;
      let entry = this.platformMeshes.get(p.id);
      if (!entry || entry.sig !== sig) {
        if (entry) {
          this.scene.remove(entry.group);
          disposeGroupResources(entry.group);
        }
        const group = createPlatform3DRig(p, theme, this.textures);
        this.scene.add(group);
        entry = { sig, group };
        this.platformMeshes.set(p.id, entry);
      } else {
        entry.group.position.set(toWorldX(p.x + p.w * 0.5), toWorldY(p.y), 0);
      }
    }

    for (const [id, entry] of this.platformMeshes.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(entry.group);
        disposeGroupResources(entry.group);
        this.platformMeshes.delete(id);
      }
    }
  }

  private syncProps(props: ActiveProp[]): void {
    const activeIds = new Set<string>();

    for (const pr of props) {
      if (pr.destroyed) continue;
      activeIds.add(pr.id);
      let entry = this.propRigs.get(pr.id);
      if (!entry) {
        entry = createProp3DRig(pr, this.textures);
        this.scene.add(entry.group);
        this.propRigs.set(pr.id, entry);
      }
      if (pr.kind === 'pendulum' && entry.chainMesh && entry.bobGroup) {
        const ax = toWorldX(pr.x);
        const ay = toWorldY(pr.y);
        const bx = toWorldX(pr.bobX);
        const by = toWorldY(pr.bobY);

        entry.bobGroup.position.set(bx, by, 0);
        entry.bobGroup.rotation.z = -pr.angle;

        entry.chainMesh.visible = !pr.ropeSevered;
        if (!pr.ropeSevered) {
          _vec3A.set(ax, ay, 0);
          _vec3B.set(bx, by, 0);
          _vec3C.addVectors(_vec3A, _vec3B).multiplyScalar(0.5);
          entry.chainMesh.position.copy(_vec3C);
          _vec3B.sub(_vec3A);
          const len = _vec3B.length();
          if (len > 0.001) {
            _vec3B.divideScalar(len);
            _quat.setFromUnitVectors(_vec3C.set(0, 1, 0), _vec3B);
            entry.chainMesh.quaternion.copy(_quat);
          }
          entry.chainMesh.scale.set(1, Math.max(0.05, len), 1);
        }
      } else {
        entry.group.position.set(toWorldX(pr.x + pr.w * 0.5), toWorldY(pr.y + pr.h), 0);
      }
    }

    for (const [id, entry] of this.propRigs.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(entry.group);
        disposeGroupResources(entry.group);
        this.propRigs.delete(id);
      }
    }
  }

  private syncActors(actors: Actor[], time: number, aimState: AimRenderState): void {
    const activeIds = new Set<string>();

    for (const actor of actors) {
      activeIds.add(actor.id);
      let rig = this.actorRigs.get(actor.id);
      if (!rig) {
        rig = createStickman3DRig(actor, this.textures);
        this.scene.add(rig.root);
        this.actorRigs.set(actor.id, rig);
      }
      const override =
        actor.isPlayer && aimState.active
          ? { active: true, power: aimState.power, angle: aimState.angle }
          : null;
      syncStickman3DRig(rig, actor, time, override);
    }

    for (const [id, rig] of this.actorRigs.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(rig.root);
        rig.dispose();
        this.actorRigs.delete(id);
      }
    }
  }

  private syncRagdolls(ragdolls: RagdollBody[]): void {
    const activeIds = new Set<string>();

    for (const rag of ragdolls) {
      activeIds.add(rag.id);
      let rig = this.ragdollRigs.get(rag.id);
      if (!rig) {
        rig = createRagdoll3DRig(rag);
        this.scene.add(rig.root);
        this.ragdollRigs.set(rag.id, rig);
      }
      syncRagdoll3DRig(rig, rag);
    }

    for (const [id, rig] of this.ragdollRigs.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(rig.root);
        rig.dispose();
        this.ragdollRigs.delete(id);
      }
    }
  }

  private syncArrows(arrows: Arrow[], time: number): void {
    const activeIds = new Set<string>();
    let sparkCount = 0;
    let ribbonIdx = 0;

    for (const arr of arrows) {
      if (!arr.active) continue;
      activeIds.add(arr.id);
      let mesh = this.arrowMeshes.get(arr.id);
      if (!mesh) {
        mesh = createArrow3DMesh(arr.type, Boolean(arr.isBomb));
        this.scene.add(mesh);
        this.arrowMeshes.set(arr.id, mesh);
      }

      mesh.position.set(toWorldX(arr.x), toWorldY(arr.y), 0);
      if (arr.isBomb) {
        mesh.rotation.set(0, 0, -arr.age * 5);
      } else {
        mesh.rotation.set(0, 0, -arr.angle);
      }

      // Glowing comet trail ribbon + instanced embers behind active projectiles
      if (arr.trail.length >= 2 && ribbonIdx < this.arrowRibbonLines.length) {
        const line = this.arrowRibbonLines[ribbonIdx++];
        line.visible = true;
        const mat = line.material as THREE.LineBasicMaterial;
        mat.color.setHex(
          arr.type === 'fire' || arr.isBomb
            ? 0xf97316
            : arr.type === 'triple'
              ? 0x38bdf8
              : arr.fromPlayer
                ? 0xfb923c
                : 0xf87171,
        );
        const posAttr = line.geometry.getAttribute('position') as THREE.BufferAttribute;
        const n = Math.min(16, arr.trail.length);
        for (let k = 0; k < 16; k++) {
          const pt = arr.trail[Math.min(k, n - 1)];
          posAttr.setXYZ(k, toWorldX(pt.x), toWorldY(pt.y), 0);
        }
        posAttr.needsUpdate = true;

        // Fiery sparks clustered along trail
        const sparksPerArrow = arr.type === 'fire' ? 10 : 6;
        for (let s = 0; s < sparksPerArrow && sparkCount < MAX_COMET_SPARKS; s++) {
          const tIdx = Math.min(arr.trail.length - 1, Math.floor((s / sparksPerArrow) * arr.trail.length));
          const tp = arr.trail[tIdx];
          const jitterX = Math.sin(time * 22 + s * 2.1 + arr.age * 14) * 0.14;
          const jitterY = Math.cos(time * 25 + s * 1.7 + arr.age * 12) * 0.14;
          _vec3A.set(toWorldX(tp.x) + jitterX, toWorldY(tp.y) + jitterY, (s % 3 - 1) * 0.06);
          const sc = 0.45 + (tIdx / Math.max(1, arr.trail.length)) * 0.85;
          _scale.set(sc, sc, sc);
          _quat.identity();
          _mat4.compose(_vec3A, _quat, _scale);
          this.cometInst.setMatrixAt(sparkCount, _mat4);
          _color.setHex(s % 2 === 0 ? 0xfef08a : arr.type === 'triple' ? 0x38bdf8 : 0xf97316);
          this.cometInst.setColorAt(sparkCount, _color);
          sparkCount++;
        }
      }
    }

    for (let i = ribbonIdx; i < this.arrowRibbonLines.length; i++) {
      this.arrowRibbonLines[i].visible = false;
    }

    this.cometInst.count = sparkCount;
    if (sparkCount > 0) {
      this.cometInst.instanceMatrix.needsUpdate = true;
      if (this.cometInst.instanceColor) this.cometInst.instanceColor.needsUpdate = true;
    }

    for (const [id, mesh] of this.arrowMeshes.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        disposeGroupResources(mesh);
        this.arrowMeshes.delete(id);
      }
    }
  }

  private syncStuckArrows(stuckArrows: StuckArrow[], platforms: Platform[]): void {
    const sig = `${stuckArrows.length}:${stuckArrows[0]?.targetId || ''}:${stuckArrows[stuckArrows.length - 1]?.relX.toFixed(1) || ''}`;
    if (sig !== this.stuckSignature) {
      this.stuckSignature = sig;
      while (this.stuckArrowMeshes.length < stuckArrows.length) {
        const m = createArrow3DMesh('standard', false);
        this.scene.add(m);
        this.stuckArrowMeshes.push(m);
      }
      for (let i = stuckArrows.length; i < this.stuckArrowMeshes.length; i++) {
        this.stuckArrowMeshes[i].visible = false;
      }
    }

    for (let i = 0; i < stuckArrows.length; i++) {
      const sa = stuckArrows[i];
      const mesh = this.stuckArrowMeshes[i];
      const plat = platforms.find((p) => p.id === sa.targetId);
      if (!plat) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      mesh.position.set(toWorldX(plat.x + sa.relX), toWorldY(plat.y + sa.relY), 0);
      mesh.rotation.set(0, 0, -sa.angle);
    }
  }

  private syncTrajectoryAndAim(aimState: AimRenderState, time: number): void {
    if (!aimState.active || aimState.trajectory.length === 0) {
      this.trajInst.count = 0;
      this.aimCueLine.visible = false;
      this.aimCueRing.visible = false;
      return;
    }

    const n = Math.min(MAX_TRAJ_ORBS, aimState.trajectory.length);
    for (let i = 0; i < n; i++) {
      const pt = aimState.trajectory[i];
      const frac = 1 - i / n;
      const sc = 0.55 + frac * 0.65;
      _vec3A.set(toWorldX(pt.x), toWorldY(pt.y), 0.12);
      _quat.identity();
      _scale.set(sc, sc, sc);
      _mat4.compose(_vec3A, _quat, _scale);
      this.trajInst.setMatrixAt(i, _mat4);
    }
    this.trajInst.count = n;
    this.trajInst.instanceMatrix.needsUpdate = true;

    if (aimState.dragStartWorld && aimState.dragCurrWorld) {
      this.aimCueLine.visible = true;
      this.aimCueRing.visible = true;
      const sx = toWorldX(aimState.dragStartWorld.x);
      const sy = toWorldY(aimState.dragStartWorld.y);
      const cx = toWorldX(aimState.dragCurrWorld.x);
      const cy = toWorldY(aimState.dragCurrWorld.y);
      const posAttr = this.aimCueLine.geometry.getAttribute('position') as THREE.BufferAttribute;
      posAttr.setXYZ(0, sx, sy, 0.25);
      posAttr.setXYZ(1, cx, cy, 0.25);
      posAttr.needsUpdate = true;

      this.aimCueRing.position.set(sx, sy, 0.25);
      const pulse = 0.95 + Math.sin(time * 8) * 0.08;
      this.aimCueRing.scale.setScalar(pulse);
    } else {
      this.aimCueLine.visible = false;
      this.aimCueRing.visible = false;
    }
  }

  private syncParticles(particles: Particle[]): void {
    let count = 0;
    for (let i = 0; i < particles.length && count < MAX_SIM_PARTICLES; i++) {
      const pt = particles[i];
      if (!pt.active) continue;
      const lifeRatio = Math.max(0.05, pt.life / pt.maxLife);
      const sc = Math.max(0.15, toWorldLen(pt.size) * 2.8 * lifeRatio);
      _vec3A.set(toWorldX(pt.x), toWorldY(pt.y), (i % 5 - 2) * 0.14);
      _euler.set(pt.rot * 0.5, pt.rot, -pt.rot);
      _quat.setFromEuler(_euler);
      if (pt.kind === 'splinter' || pt.kind === 'spark') {
        _scale.set(sc * 1.9, sc * 0.45, sc * 0.45);
      } else {
        _scale.set(sc, sc, sc);
      }
      _mat4.compose(_vec3A, _quat, _scale);
      this.particleInst.setMatrixAt(count, _mat4);
      _color.set(pt.color);
      this.particleInst.setColorAt(count, _color);
      count++;
    }
    this.particleInst.count = count;
    if (count > 0) {
      this.particleInst.instanceMatrix.needsUpdate = true;
      if (this.particleInst.instanceColor) this.particleInst.instanceColor.needsUpdate = true;
    }
  }

  private syncWeather(pool: WeatherPool, wind: number, time: number): void {
    const profile = getBiomeWeatherProfile(pool.biome);
    const count = Math.min(profile.activeCount, pool.particles.length, MAX_WEATHER_INST);
    const isRain = profile.kind === 'rain' || profile.kind === 'lightning';
    const rainAngle = isRain
      ? Math.atan2(profile.baseVy, wind * profile.windScale)
      : 0;

    let splashCount = 0;
    for (let i = 0; i < count; i++) {
      const pt = pool.particles[i];
      const z = -1.6 + (i % 7) * 0.55;
      _vec3A.set(toWorldX(pt.x), toWorldY(pt.y), z);

      if (isRain) {
        _euler.set(0, 0, Math.PI * 0.5 - rainAngle);
        _quat.setFromEuler(_euler);
        _scale.set(0.28, (profile.kind === 'lightning' ? 4.4 : 3.6) * pt.speedMult, 0.28);
      } else if (profile.kind === 'leaves') {
        _euler.set(0.4, pt.rot * 0.6, pt.rot + Math.sin(time * 2.5 + pt.phase) * 0.4);
        _quat.setFromEuler(_euler);
        const s = pt.size * 0.35;
        _scale.set(s * 1.5, s * 0.65, s * 0.25);
      } else if (profile.kind === 'snow') {
        _euler.set(pt.rot * 0.5, pt.rot * 0.7, pt.rot);
        _quat.setFromEuler(_euler);
        const s = pt.size * 0.3;
        _scale.set(s, s, s);
      } else if (profile.kind === 'fireflies') {
        _euler.set(0, 0, 0);
        _quat.setFromEuler(_euler);
        const pulse = 0.65 + Math.sin(time * 5.2 + pt.phase) * 0.45;
        const s = pt.size * 0.32 * pulse;
        _scale.set(s, s, s);
      } else {
        _euler.set(0, 0, pt.rot);
        _quat.setFromEuler(_euler);
        const s = pt.size * 0.26;
        _scale.set(profile.kind === 'dust' ? s * 1.8 : s, s * 0.85, s);
      }

      _mat4.compose(_vec3A, _quat, _scale);
      this.weatherInst.setMatrixAt(i, _mat4);
      _color.set(profile.colors[pt.colorIdx % profile.colors.length]);
      this.weatherInst.setColorAt(i, _color);

      if (isRain && pt.splashTimer > 0 && splashCount < MAX_SPLASH_INST) {
        const t = 1 - pt.splashTimer / 0.22;
        _vec3A.set(toWorldX(pt.splashX), toWorldY(pt.splashY) + 0.04, z * 0.4);
        _euler.set(-Math.PI * 0.5, 0, 0);
        _quat.setFromEuler(_euler);
        const r = 0.6 + t * 1.6;
        _scale.set(r, r, r);
        _mat4.compose(_vec3A, _quat, _scale);
        this.splashInst.setMatrixAt(splashCount++, _mat4);
      }
    }

    this.weatherInst.count = count;
    if (count > 0) {
      this.weatherInst.instanceMatrix.needsUpdate = true;
      if (this.weatherInst.instanceColor) this.weatherInst.instanceColor.needsUpdate = true;
    }

    this.splashInst.count = splashCount;
    if (splashCount > 0) {
      this.splashInst.instanceMatrix.needsUpdate = true;
    }
  }

  private syncExplosions(explosions: ExplosionFlash[]): void {
    for (let i = 0; i < MAX_EXPLOSION_FX; i++) {
      const fx = this.explosionPool[i];
      if (i >= explosions.length) {
        fx.group.visible = false;
        continue;
      }
      const ex = explosions[i];
      const t = 1 - ex.life / ex.maxLife;
      const worldR = toWorldLen(ex.radius);
      fx.group.visible = true;
      fx.group.position.set(toWorldX(ex.x), toWorldY(ex.y), 0.35);

      const coreScale = Math.max(0.15, worldR * (0.38 + t * 0.55));
      fx.coreMesh.scale.setScalar(coreScale);
      fx.coreMat.opacity = (1 - t) * 0.88;

      const ringScale = Math.max(0.2, worldR * (0.3 + t * 1.15));
      fx.ringMesh.scale.setScalar(ringScale);
      fx.ringMat.opacity = (1 - t) * 0.92;
    }
  }

  private syncCallouts(callouts: FloatingCallout[]): void {
    for (let i = 0; i < this.calloutSprites.length; i++) {
      const sp = this.calloutSprites[i];
      if (i >= callouts.length) {
        sp.visible = false;
        continue;
      }
      const c = callouts[i];
      const tex = this.getCalloutTexture(c.text, c.color);
      const mat = sp.material as THREE.SpriteMaterial;
      if (mat.map !== tex) {
        mat.map = tex;
        mat.needsUpdate = true;
      }
      mat.opacity = Math.min(1, (c.life / c.maxLife) * 1.4);
      sp.visible = true;
      sp.position.set(toWorldX(c.x), toWorldY(c.y), 1.4);
      sp.scale.set(4.8 * c.scale, 1.35 * c.scale, 1);
    }
  }

  private getCalloutTexture(text: string, color: string): THREE.CanvasTexture {
    const key = `${text}|${color}`;
    const existing = this.calloutTexCache.get(key);
    if (existing) return existing;

    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 144;
    const ctx = c.getContext('2d')!;
    ctx.font = '800 54px Fredoka, "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#090A0D';
    ctx.strokeText(text, 256, 72);
    ctx.fillStyle = color;
    ctx.fillText(text, 256, 72);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.calloutTexCache.set(key, tex);
    if (this.calloutTexCache.size > 40) {
      const firstKey = this.calloutTexCache.keys().next().value;
      if (firstKey) {
        this.calloutTexCache.get(firstKey)?.dispose();
        this.calloutTexCache.delete(firstKey);
      }
    }
    return tex;
  }

  private updateCamera(input: ThreeRenderFrameInput): void {
    const aspect = Math.max(0.65, this.cssW / this.cssH);
    const baseZ = 37.2 * Math.max(1, 1.66 / aspect);

    let desX = 0;
    let desY = 11.4;
    let desZ = baseZ;
    let lookX = 0;
    let lookY = 10.6;
    let lookZ = 0;

    if (input.isTitleScreen) {
      const sway = Math.sin(input.time * 0.42) * 1.8;
      desX = sway;
      desY = 11.4 + Math.cos(input.time * 0.35) * 0.35;
      desZ = baseZ * 0.98;
      lookX = sway * 0.35;
      lookY = 10.6;
    } else if (this.cameraPreset === 'cinematic') {
      desX = -8.8;
      desY = 16.4;
      desZ = baseZ * 0.96;
      lookX = 0.6;
      lookY = 9.8;
      lookZ = -1.6;
    } else if (this.cameraPreset === 'follow') {
      const playerArrow = input.arrows.find((a) => a.active && a.fromPlayer);
      if (playerArrow) {
        const ax = toWorldX(playerArrow.x);
        const ay = toWorldY(playerArrow.y);
        desX = THREE.MathUtils.clamp(ax * 0.32, -5.5, 5.5);
        desY = THREE.MathUtils.clamp(10.8 + (ay - 10) * 0.2, 9.5, 14.5);
        desZ = baseZ * 0.88;
        lookX = THREE.MathUtils.clamp(ax * 0.45, -7, 7);
        lookY = THREE.MathUtils.clamp(10.2 + (ay - 10) * 0.25, 8.5, 13.5);
      } else {
        desX = -1.4;
        desY = 11.8;
        desZ = baseZ * 0.93;
        lookX = 0.6;
        lookY = 10.4;
      }
    }

    // Frame-rate-independent exponential damping
    const dampAlpha = 1 - Math.exp(-5.5 * Math.max(0.001, input.dt));
    this.camPos.x += (desX - this.camPos.x) * dampAlpha;
    this.camPos.y += (desY - this.camPos.y) * dampAlpha;
    this.camPos.z += (desZ - this.camPos.z) * dampAlpha;

    this.camTarget.x += (lookX - this.camTarget.x) * dampAlpha;
    this.camTarget.y += (lookY - this.camTarget.y) * dampAlpha;
    this.camTarget.z += (lookZ - this.camTarget.z) * dampAlpha;

    const shake = input.trauma * input.trauma * 0.48;
    const sx = shake > 0.001 ? (Math.random() * 2 - 1) * shake : 0;
    const sy = shake > 0.001 ? (Math.random() * 2 - 1) * shake : 0;

    this.camera.position.set(this.camPos.x + sx, this.camPos.y + sy, this.camPos.z);
    this.camera.lookAt(this.camTarget.x + sx * 0.5, this.camTarget.y + sy * 0.5, this.camTarget.z);
  }

  public dispose(): void {
    this.cancelAfterDraw();
    if (this.preloadTimerId !== null) {
      window.clearTimeout(this.preloadTimerId);
      this.preloadTimerId = null;
    }

    for (const entry of this.platformMeshes.values()) {
      disposeGroupResources(entry.group);
    }
    this.platformMeshes.clear();

    for (const entry of this.propRigs.values()) {
      disposeGroupResources(entry.group);
    }
    this.propRigs.clear();

    for (const rig of this.actorRigs.values()) rig.dispose();
    this.actorRigs.clear();

    for (const rig of this.ragdollRigs.values()) rig.dispose();
    this.ragdollRigs.clear();

    for (const mesh of this.arrowMeshes.values()) {
      disposeGroupResources(mesh);
    }
    this.arrowMeshes.clear();

    for (const m of this.stuckArrowMeshes) {
      disposeGroupResources(m);
    }
    this.stuckArrowMeshes = [];

    for (const tex of this.calloutTexCache.values()) tex.dispose();
    this.calloutTexCache.clear();

    this.trajInst.geometry.dispose();
    (this.trajInst.material as THREE.Material).dispose();
    this.cometInst.geometry.dispose();
    (this.cometInst.material as THREE.Material).dispose();
    this.particleInst.geometry.dispose();
    (this.particleInst.material as THREE.Material).dispose();
    this.weatherInst.geometry.dispose();
    (this.weatherInst.material as THREE.Material).dispose();
    this.splashInst.geometry.dispose();
    (this.splashInst.material as THREE.Material).dispose();

    for (const l of this.arrowRibbonLines) {
      l.geometry.dispose();
      (l.material as THREE.Material).dispose();
    }
    this.aimCueLine.geometry.dispose();
    (this.aimCueLine.material as THREE.Material).dispose();
    this.aimCueRing.geometry.dispose();
    (this.aimCueRing.material as THREE.Material).dispose();

    for (const ex of this.explosionPool) {
      ex.coreMesh.geometry.dispose();
      ex.ringMesh.geometry.dispose();
      ex.coreMat.dispose();
      ex.ringMat.dispose();
    }

    this.skyDomeMesh.geometry.dispose();
    this.skyMat.dispose();
    this.backdropMesh.geometry.dispose();
    this.backdropMat.dispose();
    this.fallbackTex.dispose();
    for (const tex of this.backdropTextures.values()) tex.dispose();
    this.backdropTextures.clear();
    this.lightningBoltMesh.geometry.dispose();
    (this.lightningBoltMesh.material as THREE.Material).dispose();
    this.courtyard.dispose();
    this.textures.dispose();
    this.envRT.dispose();
    this.renderer.dispose();

    if (this.domElement.parentNode === this.mountEl) {
      this.mountEl.removeChild(this.domElement);
    }
  }
}

function disposeGroupResources(group: THREE.Object3D): void {
  group.traverse((obj) => {
    const m = obj as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    if (m.material) {
      if (Array.isArray(m.material)) {
        m.material.forEach((mat) => mat.dispose());
      } else {
        m.material.dispose();
      }
    }
  });
}
