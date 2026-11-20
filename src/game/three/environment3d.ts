import * as THREE from 'three';
import { BiomeId } from '../types';
import { Biome3DTheme, ProceduralTextureSet, toWorldX, toWorldY } from './materials3d';

export interface Courtyard3DEnvironment {
  group: THREE.Group;
  titleTargetGroup: THREE.Group;
  leftTorchLight: THREE.PointLight;
  rightTorchLight: THREE.PointLight;
  applyTheme: (biome: BiomeId, theme: Biome3DTheme) => void;
  update: (time: number, wind: number, showTitleTarget: boolean) => void;
  dispose: () => void;
}

export function createCourtyard3DEnvironment(
  textures: ProceduralTextureSet,
  initialTheme: Biome3DTheme,
): Courtyard3DEnvironment {
  const group = new THREE.Group();

  // Dedicated floor stone repeat so parapet and platforms keep crisp block proportions
  const floorStoneMap = textures.stoneMap.clone();
  floorStoneMap.repeat.set(22, 16);
  floorStoneMap.needsUpdate = true;
  const floorStoneBump = textures.stoneBump.clone();
  floorStoneBump.repeat.set(22, 16);
  floorStoneBump.needsUpdate = true;

  const floorMat = new THREE.MeshStandardMaterial({
    map: floorStoneMap,
    bumpMap: floorStoneBump,
    bumpScale: 0.08,
    color: 0xffffff,
    roughness: 0.88,
    metalness: 0.06,
  });

  const parapetStoneMap = textures.stoneMap.clone();
  parapetStoneMap.repeat.set(14, 1.4);
  parapetStoneMap.needsUpdate = true;
  const parapetStoneBump = textures.stoneBump.clone();
  parapetStoneBump.repeat.set(14, 1.4);
  parapetStoneBump.needsUpdate = true;

  const parapetMat = new THREE.MeshStandardMaterial({
    map: parapetStoneMap,
    bumpMap: parapetStoneBump,
    bumpScale: 0.06,
    color: 0x9aa0ad,
    roughness: 0.82,
    metalness: 0.08,
  });

  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x6b707d,
    roughness: 0.78,
    metalness: 0.1,
  });

  const chainMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.35,
    metalness: 0.82,
  });

  const farCityMat = new THREE.MeshStandardMaterial({
    color: initialTheme.farCityColor,
    roughness: 0.92,
    metalness: 0.05,
  });

  const houseWallMat = new THREE.MeshStandardMaterial({
    color: initialTheme.cottageWall,
    roughness: 0.86,
    metalness: 0.04,
  });

  const houseRoofMat = new THREE.MeshStandardMaterial({
    color: initialTheme.cottageRoof,
    roughness: 0.76,
    metalness: 0.08,
  });

  const windowGlowMat = new THREE.MeshStandardMaterial({
    color: initialTheme.windowGlow,
    emissive: initialTheme.windowGlow,
    emissiveIntensity: 2.2,
    roughness: 0.25,
  });

  const cavernCeilingMat = new THREE.MeshStandardMaterial({
    color: 0x10131d,
    roughness: 0.92,
  });

  // 1. Wide Courtyard Cobblestone Ground Plane (extends seamlessly into horizon fog)
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(140, 100), floorMat);
  floor.rotation.x = -Math.PI * 0.5;
  floor.position.set(0, -0.2, -18);
  floor.receiveShadow = true;
  group.add(floor);

  // 2. Low Stone Parapet Wall + 7 Beveled Pillars + Catenary Iron Chains (Z = -3.8)
  const wallZ = -3.8;
  const parapetWall = new THREE.Mesh(new THREE.BoxGeometry(58, 4.8, 1.1), parapetMat);
  parapetWall.position.set(0, 2.2, wallZ);
  parapetWall.receiveShadow = true;
  group.add(parapetWall);

  const parapetLedge = new THREE.Mesh(new THREE.BoxGeometry(58.4, 0.36, 1.38), pillarMat);
  parapetLedge.position.set(0, 4.72, wallZ);
  parapetLedge.receiveShadow = true;
  group.add(parapetLedge);

  const pillarXs = [-21, -14, -7, 0, 7, 14, 21];
  for (let i = 0; i < pillarXs.length; i++) {
    const px = pillarXs[i];
    const pGroup = new THREE.Group();
    pGroup.position.set(px, 4.8, wallZ);

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.38, 1.38), pillarMat);
    plinth.position.y = 0.19;
    pGroup.add(plinth);

    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.4, 1.16), pillarMat);
    shaft.position.y = 0.95;
    pGroup.add(shaft);

    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.34, 1.48), parapetMat);
    cap.position.y = 1.78;
    pGroup.add(cap);
    group.add(pGroup);

    // Draped catenary chain to next pillar
    if (i < pillarXs.length - 1) {
      const nx = pillarXs[i + 1];
      const midX = (px + nx) * 0.5;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(px + 0.5, 5.75, wallZ + 0.35),
        new THREE.Vector3(midX, 4.9, wallZ + 0.45),
        new THREE.Vector3(nx - 0.5, 5.75, wallZ + 0.35),
      ]);
      const chain = new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.08, 6, false), chainMat);
      group.add(chain);
    }
  }

  // 3. Hanging Emblem Banners (left pumpkin, right swirl)
  const createBanner = (x: number, tex: THREE.CanvasTexture) => {
    const bGroup = new THREE.Group();
    bGroup.position.set(x, 4.8, -2.5);

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e2028, roughness: 0.4, metalness: 0.8 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 7.0, 10), poleMat);
    pole.position.y = 3.5;
    bGroup.add(pole);

    const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.7, 8), poleMat);
    cross.rotation.z = Math.PI * 0.5;
    cross.position.y = 6.2;
    bGroup.add(cross);

    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 8), chainMat);
    finial.position.y = 7.22;
    bGroup.add(finial);

    const clothMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.82,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 3.45, 1, 6), clothMat);
    cloth.position.y = 4.42;
    bGroup.add(cloth);
    group.add(bGroup);
    return cloth;
  };

  const leftBannerCloth = createBanner(-17.8, textures.pumpkinBanner);
  const rightBannerCloth = createBanner(17.8, textures.swirlBanner);

  // 4. Midground 3D Medieval Village (Left Keep + 4 Cottages + Distant Battlements)
  const villageGroup = new THREE.Group();
  group.add(villageGroup);

  // Left masonry keep tower
  const keepStoneMap = textures.stoneMap.clone();
  keepStoneMap.repeat.set(1.6, 5.2);
  keepStoneMap.needsUpdate = true;
  const keepMat = new THREE.MeshStandardMaterial({
    map: keepStoneMap,
    bumpMap: parapetStoneBump,
    bumpScale: 0.05,
    color: 0x8f96a6,
    roughness: 0.84,
    metalness: 0.06,
  });
  const keepGroup = new THREE.Group();
  keepGroup.position.set(-13.8, 0, -10.5);
  const keepBody = new THREE.Mesh(new THREE.BoxGeometry(4.2, 16.8, 4.2), keepMat);
  keepBody.position.y = 8.4;
  keepGroup.add(keepBody);
  const keepCornice = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.8, 4.8), pillarMat);
  keepCornice.position.y = 17.0;
  keepGroup.add(keepCornice);
  const slitMat = new THREE.MeshBasicMaterial({ color: 0x11131a });
  const keepSlit = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.5, 0.2), slitMat);
  keepSlit.position.set(0, 14.5, 2.12);
  keepGroup.add(keepSlit);
  villageGroup.add(keepGroup);

  // Helper to assemble 3D cottages with pitched roofs & glowing Gothic twin windows
  const addCottage = (
    cx: number,
    cz: number,
    w: number,
    h: number,
    d: number,
    hasChimney: boolean,
  ) => {
    const c = new THREE.Group();
    c.position.set(cx, 0, cz);

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), houseWallMat);
    body.position.y = h * 0.5;
    c.add(body);

    // Pitched roof (2 angled roof slopes + gable fill)
    const roofH = 2.4;
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-w * 0.55, 0);
    roofShape.lineTo(0, roofH);
    roofShape.lineTo(w * 0.55, 0);
    roofShape.closePath();

    const roofGeo = new THREE.ExtrudeGeometry(roofShape, {
      depth: d + 0.5,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.1,
      bevelSegments: 2,
    });
    roofGeo.translate(0, h - 0.1, -(d + 0.5) * 0.5);
    const roof = new THREE.Mesh(roofGeo, houseRoofMat);
    c.add(roof);

    if (hasChimney) {
      const chim = new THREE.Mesh(new THREE.BoxGeometry(0.95, 2.6, 0.95), pillarMat);
      chim.position.set(w * 0.22, h + 1.4, 0.2);
      c.add(chim);
    }

    // Glowing pointed Gothic twin windows on front face
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1718, roughness: 0.8 });
    for (const wx of [-w * 0.2, w * 0.2]) {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.45, 0.18), frameMat);
      frame.position.set(wx, h * 0.68, d * 0.5 + 0.04);
      c.add(frame);

      const pane = new THREE.Mesh(new THREE.BoxGeometry(0.62, 1.18, 0.22), windowGlowMat);
      pane.position.set(wx, h * 0.68, d * 0.5 + 0.06);
      c.add(pane);

      // Muntin cross
      const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.26), frameMat);
      vBar.position.set(wx, h * 0.68, d * 0.5 + 0.07);
      c.add(vBar);
      const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.08, 0.26), frameMat);
      hBar.position.set(wx, h * 0.65, d * 0.5 + 0.07);
      c.add(hBar);
    }

    villageGroup.add(c);
  };

  addCottage(-4.2, -11.5, 6.8, 11.4, 4.6, true);
  addCottage(4.5, -13.2, 7.6, 13.5, 5.2, false);
  addCottage(12.2, -11.0, 5.8, 11.8, 4.4, false);
  addCottage(19.2, -13.8, 6.6, 14.5, 5.0, false);

  // Rising animated 3D chimney smoke puffs
  const smokePuffs: THREE.Mesh[] = [];
  const smokeMat = new THREE.MeshBasicMaterial({
    color: 0xe2e8f0,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });
  const smokeGeo = new THREE.SphereGeometry(0.5, 10, 8);
  for (let i = 0; i < 6; i++) {
    const puff = new THREE.Mesh(smokeGeo, smokeMat.clone());
    villageGroup.add(puff);
    smokePuffs.push(puff);
  }

  // Distant Castle Curtain Wall & Towers (Z = -21)
  const farWall = new THREE.Mesh(new THREE.BoxGeometry(86, 13.5, 2.2), farCityMat);
  farWall.position.set(0, 6.5, -21.5);
  villageGroup.add(farWall);

  for (let bx = -36; bx <= 36; bx += 2.2) {
    const merlon = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.95, 2.25), farCityMat);
    merlon.position.set(bx, 13.7, -21.5);
    villageGroup.add(merlon);
  }
  for (const tx of [-9.5, -2.5, 9.8, 22.0]) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 18, 12), farCityMat);
    tower.position.set(tx, 9.0, -22.0);
    villageGroup.add(tower);
  }

  // Cavern Stalactite Ceiling (only visible in 'cavern' biome)
  const cavernGroup = new THREE.Group();
  cavernGroup.visible = false;
  for (let sx = -24; sx <= 24; sx += 3.2) {
    const len = 2.8 + Math.abs(Math.sin(sx * 0.7)) * 2.5;
    const stal = new THREE.Mesh(new THREE.ConeGeometry(1.2, len, 7), cavernCeilingMat);
    stal.rotation.x = Math.PI;
    stal.position.set(sx, 23.0 - len * 0.4, -2.0 + Math.cos(sx) * 2.0);
    cavernGroup.add(stal);
  }
  group.add(cavernGroup);

  // Soft radial glow texture for corner torches
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = 128;
  glowCanvas.height = 128;
  const gCtx = glowCanvas.getContext('2d')!;
  const grad = gCtx.createRadialGradient(64, 64, 4, 64, 64, 60);
  grad.addColorStop(0, 'rgba(255, 220, 120, 0.72)');
  grad.addColorStop(0.4, 'rgba(249, 115, 22, 0.32)');
  grad.addColorStop(1, 'rgba(249, 115, 22, 0)');
  gCtx.fillStyle = grad;
  gCtx.fillRect(0, 0, 128, 128);
  const glowTex = new THREE.CanvasTexture(glowCanvas);
  glowTex.colorSpace = THREE.SRGBColorSpace;

  // 5. Left & Right Angled Iron Corner Wall Torches with Soft Glow & PointLights
  const createTorch = (x: number, dir: 1 | -1) => {
    const tGroup = new THREE.Group();
    tGroup.position.set(x, 19.3, 2.4);

    const armMat = new THREE.MeshStandardMaterial({ color: 0x1e2028, roughness: 0.4, metalness: 0.85 });
    const sconce = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.4, 8), armMat);
    sconce.rotation.z = -dir * 0.52;
    tGroup.add(sconce);

    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.2, 0.42, 10), armMat);
    cup.position.set(dir * 0.55, 0.88, 0);
    tGroup.add(cup);

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    halo.position.set(dir * 0.55, 1.48, 0);
    halo.scale.set(3.4, 3.4, 1);
    tGroup.add(halo);

    const flameOuter = new THREE.Mesh(
      new THREE.ConeGeometry(0.46, 1.25, 10),
      new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.94 }),
    );
    flameOuter.position.set(dir * 0.55, 1.42, 0);
    tGroup.add(flameOuter);

    const flameInner = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 0.74, 8),
      new THREE.MeshBasicMaterial({ color: 0xfef08a }),
    );
    flameInner.position.set(dir * 0.55, 1.28, 0);
    tGroup.add(flameInner);

    const light = new THREE.PointLight(initialTheme.torchColor, 20, 26, 1.5);
    light.position.set(dir * 0.85, 1.65, 0.6);
    tGroup.add(light);

    group.add(tGroup);
    return { flameOuter, flameInner, halo, light };
  };

  const leftTorch = createTorch(-19.8, 1);
  const rightTorch = createTorch(19.8, -1);

  // 6. Title Screen 3D Archery Target Stand on Right Cliff
  const titleTargetGroup = new THREE.Group();
  titleTargetGroup.position.set(toWorldX(1085), toWorldY(500), 0);
  const standWood = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.82 });
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.0, 8), standWood);
  legL.position.set(-0.22, 0.95, 0.25);
  legL.rotation.z = -0.18;
  titleTargetGroup.add(legL);
  const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.0, 8), standWood);
  legR.position.set(0.22, 0.95, -0.25);
  legR.rotation.z = 0.18;
  titleTargetGroup.add(legR);

  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.75, 0.2, 24),
    new THREE.MeshStandardMaterial({ map: textures.targetMap, roughness: 0.55 }),
  );
  disc.rotation.z = Math.PI * 0.5;
  disc.position.set(-0.1, 1.8, 0);
  disc.castShadow = true;
  titleTargetGroup.add(disc);
  group.add(titleTargetGroup);

  return {
    group,
    titleTargetGroup,
    leftTorchLight: leftTorch.light,
    rightTorchLight: rightTorch.light,
    applyTheme: (biome: BiomeId, theme: Biome3DTheme) => {
      farCityMat.color.setHex(theme.farCityColor);
      houseWallMat.color.setHex(theme.cottageWall);
      houseRoofMat.color.setHex(theme.cottageRoof);
      windowGlowMat.color.setHex(theme.windowGlow);
      windowGlowMat.emissive.setHex(theme.windowGlow);
      parapetMat.color.setHex(theme.parapetColor);
      leftTorch.light.color.setHex(theme.torchColor);
      rightTorch.light.color.setHex(theme.torchColor);
      cavernGroup.visible = biome === 'cavern';
      villageGroup.visible = biome === 'meadow' || biome === 'fortress';
    },
    update: (time: number, wind: number, showTitleTarget: boolean) => {
      titleTargetGroup.visible = showTitleTarget;

      // Subtle banner cloth wind sway
      const sway = Math.sin(time * 2.2) * 0.08 + wind * 0.0014;
      leftBannerCloth.rotation.x = sway;
      rightBannerCloth.rotation.x = -sway * 0.85;

      // Rising 3D chimney smoke puffs
      for (let i = 0; i < smokePuffs.length; i++) {
        const t = (time * 0.4 + i / smokePuffs.length) % 1;
        const puff = smokePuffs[i];
        puff.position.set(
          -2.6 + Math.sin(time * 1.4 + i) * 0.35 + t * 0.8,
          13.2 + t * 4.8,
          -11.2,
        );
        const sc = 0.55 + t * 1.2;
        puff.scale.setScalar(sc);
        (puff.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.22;
      }

      // Torch flame flicker
      const f1 = 1 + Math.sin(time * 16) * 0.14;
      const f2 = 1 + Math.sin(time * 18 + 1.5) * 0.14;
      leftTorch.flameOuter.scale.set(1, f1, 1);
      leftTorch.flameInner.scale.set(1, f1, 1);
      const h1 = 3.2 + Math.sin(time * 12) * 0.35;
      leftTorch.halo.scale.set(h1, h1, 1);
      leftTorch.light.intensity = 18 + Math.sin(time * 15) * 3.0;

      rightTorch.flameOuter.scale.set(1, f2, 1);
      rightTorch.flameInner.scale.set(1, f2, 1);
      const h2 = 3.2 + Math.cos(time * 13) * 0.35;
      rightTorch.halo.scale.set(h2, h2, 1);
      rightTorch.light.intensity = 18 + Math.cos(time * 17) * 3.0;
    },
    dispose: () => {
      floorStoneMap.dispose();
      floorStoneBump.dispose();
      parapetStoneMap.dispose();
      parapetStoneBump.dispose();
      keepStoneMap.dispose();
      glowTex.dispose();
      leftTorch.halo.material.dispose();
      rightTorch.halo.material.dispose();
      group.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material.dispose();
        }
      });
    },
  };
}
