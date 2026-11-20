import * as THREE from 'three';
import {
  ActiveProp,
  Actor,
  ArrowType,
  EnemyArchetype,
  Platform,
  RagdollBody,
} from '../types';
import {
  Biome3DTheme,
  ProceduralTextureSet,
  WORLD_SCALE,
  toWorldLen,
  toWorldX,
  toWorldY,
} from './materials3d';

const _vA = new THREE.Vector3();
const _vB = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _quat = new THREE.Quaternion();

function alignLimb(mesh: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3): void {
  _mid.addVectors(a, b).multiplyScalar(0.5);
  _dir.subVectors(b, a);
  const len = _dir.length();
  mesh.position.copy(_mid);
  if (len > 0.0001) {
    _dir.divideScalar(len);
    _quat.setFromUnitVectors(_up, _dir);
    mesh.quaternion.copy(_quat);
  }
  mesh.scale.set(1, Math.max(0.05, len), 1);
}

export interface Stickman3DRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  contactShadow: THREE.Mesh;
  torsoMesh: THREE.Mesh;
  headMesh: THREE.Mesh;
  headGroup: THREE.Group;
  bowArmMesh: THREE.Mesh;
  drawArmMesh: THREE.Mesh;
  leftThighMesh: THREE.Mesh;
  leftShinMesh: THREE.Mesh;
  rightThighMesh: THREE.Mesh;
  rightShinMesh: THREE.Mesh;
  bowGroup: THREE.Group;
  bowStringLine: THREE.Line;
  nockedArrowGroup: THREE.Group;
  nockGlowMesh: THREE.Mesh;
  shieldGroup?: THREE.Group;
  bombPropGroup?: THREE.Group;
  hpBarGroup?: THREE.Group;
  hpFillMesh?: THREE.Mesh;
  telegraphLine?: THREE.Line;
  bodyMat: THREE.MeshStandardMaterial;
  accentMat: THREE.MeshStandardMaterial;
  dispose: () => void;
}

function createHeadgearGroup(
  archetype: Actor['archetype'],
  f: 1 | -1,
  s: number,
  accentMat: THREE.MeshStandardMaterial,
  darkMat: THREE.MeshStandardMaterial,
): THREE.Group {
  const g = new THREE.Group();
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.42, metalness: 0.05 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.2, metalness: 0.85 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.35,
    roughness: 0.1,
    metalness: 0.25,
  });

  if (archetype === 'player') {
    // 4-part backwards red/white cap + brim + twin aviator goggles
    const capDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.39 * s, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
      accentMat,
    );
    capDome.position.set(0, 0.06 * s, 0);
    g.add(capDome);

    const frontPanel = new THREE.Mesh(
      new THREE.SphereGeometry(0.395 * s, 14, 10, -0.5, 1.0, 0.25, 1.0),
      whiteMat,
    );
    frontPanel.position.set(f * 0.03 * s, 0.06 * s, 0);
    frontPanel.rotation.y = f > 0 ? 0 : Math.PI;
    g.add(frontPanel);

    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.42 * s, 0.08 * s, 0.46 * s), accentMat);
    brim.position.set(-f * 0.32 * s, 0.1 * s, 0);
    brim.rotation.z = f * 0.14;
    g.add(brim);

    for (const zOff of [-0.14 * s, 0.14 * s]) {
      const frame = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.14 * s, 0.09 * s, 14), steelMat);
      frame.rotation.z = Math.PI * 0.5;
      frame.position.set(f * 0.26 * s, 0.01 * s, zOff);
      g.add(frame);

      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.1 * s, 0.11 * s, 14), glassMat);
      lens.rotation.z = Math.PI * 0.5;
      lens.position.set(f * 0.27 * s, 0.01 * s, zOff);
      g.add(lens);
    }
  } else if (archetype === 'shield') {
    // Glossy red/white racing knight helmet + steel faceguard bars
    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.42 * s, 16, 14), accentMat);
    helm.position.set(0, 0.03 * s, 0);
    g.add(helm);

    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.68 * s, 0.34 * s, 0.16 * s), whiteMat);
    stripe.position.set(0, 0.24 * s, 0);
    g.add(stripe);

    const guard = new THREE.Mesh(new THREE.TorusGeometry(0.24 * s, 0.035 * s, 8, 14, Math.PI), steelMat);
    guard.position.set(f * 0.22 * s, -0.04 * s, 0);
    guard.rotation.y = f > 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
    guard.rotation.x = Math.PI * 0.35;
    g.add(guard);

    const chinBar = new THREE.Mesh(new THREE.BoxGeometry(0.26 * s, 0.05 * s, 0.32 * s), steelMat);
    chinBar.position.set(f * 0.28 * s, -0.15 * s, 0);
    g.add(chinBar);
  } else if (archetype === 'scout') {
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.42 * s, 0.65 * s, 12), accentMat);
    hood.position.set(-f * 0.06 * s, 0.26 * s, 0);
    hood.rotation.z = f * 0.42;
    g.add(hood);

    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xfacc15, emissiveIntensity: 0.7 });
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08 * s, 10, 10), eyeMat);
    eye.position.set(f * 0.28 * s, 0.02 * s, 0.1 * s);
    g.add(eye);
  } else if (archetype === 'sniper') {
    const cowl = new THREE.Mesh(new THREE.SphereGeometry(0.42 * s, 14, 12), accentMat);
    cowl.position.set(-f * 0.04 * s, 0.04 * s, 0);
    g.add(cowl);

    const cloakTail = new THREE.Mesh(new THREE.ConeGeometry(0.36 * s, 0.62 * s, 10), accentMat);
    cloakTail.position.set(-f * 0.26 * s, -0.2 * s, 0);
    cloakTail.rotation.z = -f * 0.65;
    g.add(cloakTail);

    const visorMat = new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xfacc15, emissiveIntensity: 0.9 });
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.085 * s, 10, 10), visorMat);
    eye.position.set(f * 0.3 * s, 0.02 * s, 0.11 * s);
    g.add(eye);
  } else if (archetype === 'bombardier') {
    const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.38 * s, 0.42 * s, 0.36 * s, 14), darkMat);
    helm.position.set(0, 0.16 * s, 0);
    g.add(helm);

    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.41 * s, 0.43 * s, 0.1 * s, 14), accentMat);
    band.position.set(0, 0.04 * s, 0);
    g.add(band);

    const goggle = new THREE.Mesh(new THREE.SphereGeometry(0.09 * s, 10, 10), accentMat);
    goggle.position.set(f * 0.3 * s, -0.02 * s, 0.12 * s);
    g.add(goggle);
  } else if (archetype === 'boss') {
    const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * s, 0.38 * s, 0.24 * s, 12), accentMat);
    crownBase.position.set(0, 0.24 * s, 0);
    g.add(crownBase);

    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09 * s, 0.32 * s, 8), accentMat);
      spike.position.set(Math.cos(ang) * 0.3 * s, 0.46 * s, Math.sin(ang) * 0.3 * s);
      g.add(spike);
    }

    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.0 });
    for (const zOff of [-0.12 * s, 0.12 * s]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08 * s, 8, 8), eyeMat);
      eye.position.set(f * 0.3 * s, 0.02 * s, zOff);
      g.add(eye);
    }
  }

  return g;
}

export function createStickman3DRig(
  actor: Actor,
  textures: ProceduralTextureSet,
): Stickman3DRig {
  const s = actor.archetype === 'boss' ? 1.28 : 1.0;
  const f = actor.facing;

  const accentColor =
    actor.archetype === 'player'
      ? 0xdc2626
      : actor.archetype === 'scout'
        ? 0x65a30d
        : actor.archetype === 'sniper'
          ? 0x9333ea
          : actor.archetype === 'shield'
            ? 0xdc2626
            : actor.archetype === 'bombardier'
              ? 0xf59e0b
              : 0xf59e0b;

  // Glossy obsidian stickman silhouette with warm specular response
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x101218,
    roughness: 0.24,
    metalness: 0.16,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.45,
    metalness: 0.25,
  });
  const darkGearMat = new THREE.MeshStandardMaterial({
    color: 0x523421,
    roughness: 0.72,
    metalness: 0.08,
  });

  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  // Soft radial contact shadow flush on platform top
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4 * s, 0.75 * s),
    new THREE.MeshBasicMaterial({
      map: textures.shadowDisc,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  );
  contactShadow.rotation.x = -Math.PI * 0.5;
  contactShadow.position.y = 0.015;
  root.add(contactShadow);

  const makeLimb = (radius: number) => {
    const geo = new THREE.CylinderGeometry(radius * s, radius * s, 1, 10);
    const m = new THREE.Mesh(geo, bodyMat);
    m.castShadow = true;
    m.receiveShadow = true;
    bodyGroup.add(m);
    return m;
  };

  const torsoMesh = makeLimb(0.145);
  const bowArmMesh = makeLimb(0.085);
  const drawArmMesh = makeLimb(0.085);
  const leftThighMesh = makeLimb(0.098);
  const leftShinMesh = makeLimb(0.088);
  const rightThighMesh = makeLimb(0.098);
  const rightShinMesh = makeLimb(0.088);

  const headGroup = new THREE.Group();
  bodyGroup.add(headGroup);

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.35 * s, 18, 14), bodyMat);
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Snug striped neck/chin gaiter on player
  if (actor.isPlayer) {
    const gaiterWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
    const gaiter = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * s, 0.3 * s, 0.26 * s, 14), gaiterWhite);
    gaiter.position.set(0, -0.34 * s, 0);
    headGroup.add(gaiter);
    const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.29 * s, 0.305 * s, 0.09 * s, 14), accentMat);
    stripe.position.set(0, -0.34 * s, 0);
    headGroup.add(stripe);
  }

  const headgear = createHeadgearGroup(actor.archetype, f, s, accentMat, darkGearMat);
  headGroup.add(headgear);

  // Sculpted 3D Recurve Bow using TubeGeometry
  const bowGroup = new THREE.Group();
  bodyGroup.add(bowGroup);
  const bowCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.18 * s, 0.72 * s, 0),
    new THREE.Vector3(0.22 * s, 0.34 * s, 0),
    new THREE.Vector3(0.26 * s, 0, 0),
    new THREE.Vector3(0.22 * s, -0.34 * s, 0),
    new THREE.Vector3(-0.18 * s, -0.72 * s, 0),
  ]);
  const bowWoodMat = new THREE.MeshStandardMaterial({
    color: actor.archetype === 'boss' ? 0xdc2626 : 0xc97b63,
    roughness: 0.42,
    metalness: 0.15,
  });
  const bowArcMesh = new THREE.Mesh(new THREE.TubeGeometry(bowCurve, 20, 0.065 * s, 8, false), bowWoodMat);
  bowArcMesh.castShadow = true;
  bowGroup.add(bowArcMesh);

  const gripMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * s, 0.08 * s, 0.24 * s, 10), darkGearMat);
  gripMesh.position.set(0.25 * s, 0, 0);
  bowGroup.add(gripMesh);

  // Dynamic 3-point bowstring
  const stringGeo = new THREE.BufferGeometry();
  const stringPos = new Float32Array(9);
  stringGeo.setAttribute('position', new THREE.BufferAttribute(stringPos, 3));
  const bowStringLine = new THREE.Line(
    stringGeo,
    new THREE.LineBasicMaterial({ color: 0xf8fafc, transparent: true, opacity: 0.9 }),
  );
  bowGroup.add(bowStringLine);

  // Nocked arrow inside bow
  const nockedArrowGroup = createArrow3DMesh('standard', false);
  nockedArrowGroup.scale.setScalar(s);
  bowGroup.add(nockedArrowGroup);

  const nockGlowMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.13 * s, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.7 }),
  );
  nockGlowMesh.position.set(0.55 * s, 0, 0);
  bowGroup.add(nockGlowMesh);

  // Shield for Shield Knight / Boss
  let shieldGroup: THREE.Group | undefined;
  if (actor.archetype === 'shield' || actor.archetype === 'boss') {
    shieldGroup = new THREE.Group();
    const shMat = new THREE.MeshStandardMaterial({
      color: actor.archetype === 'boss' ? 0x991b1b : 0x64748b,
      roughness: 0.3,
      metalness: 0.78,
    });
    const bossMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.85 });
    const shPlate = new THREE.Mesh(new THREE.BoxGeometry(0.2 * s, 1.44 * s, 0.86 * s), shMat);
    shPlate.castShadow = true;
    shieldGroup.add(shPlate);
    const shRim = new THREE.Mesh(new THREE.BoxGeometry(0.24 * s, 1.5 * s, 0.16 * s), bossMat);
    shieldGroup.add(shRim);
    const shKnob = new THREE.Mesh(new THREE.SphereGeometry(0.18 * s, 12, 10), bossMat);
    shKnob.position.set(f * 0.14 * s, 0, 0);
    shieldGroup.add(shKnob);
    shieldGroup.rotation.y = f * 0.48;
    bodyGroup.add(shieldGroup);
  }

  // Bombardier held bomb
  let bombPropGroup: THREE.Group | undefined;
  if (actor.archetype === 'bombardier') {
    bombPropGroup = createArrow3DMesh('standard', true);
    bodyGroup.add(bombPropGroup);
  }

  // Enemy HP Bar & Aim Telegraph Sightline
  let hpBarGroup: THREE.Group | undefined;
  let hpFillMesh: THREE.Mesh | undefined;
  let telegraphLine: THREE.Line | undefined;
  if (!actor.isPlayer) {
    hpBarGroup = new THREE.Group();
    hpBarGroup.position.set(0, 2.95 * s, 0);
    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4 * s, 0.22),
      new THREE.MeshBasicMaterial({ color: 0x090a0d, side: THREE.DoubleSide }),
    );
    hpBarGroup.add(bg);
    hpFillMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3 * s, 0.14),
      new THREE.MeshBasicMaterial({
        color: actor.archetype === 'boss' ? 0xef4444 : 0xf97316,
        side: THREE.DoubleSide,
      }),
    );
    hpFillMesh.position.z = 0.02;
    hpBarGroup.add(hpFillMesh);
    root.add(hpBarGroup);

    const tGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(-4, 0, 0),
    ]);
    telegraphLine = new THREE.Line(
      tGeo,
      new THREE.LineBasicMaterial({
        color: actor.archetype === 'sniper' ? 0xef4444 : 0xfb923c,
        transparent: true,
        opacity: 0.65,
      }),
    );
    telegraphLine.visible = false;
    root.add(telegraphLine);
  }

  return {
    root,
    bodyGroup,
    contactShadow,
    torsoMesh,
    headMesh,
    headGroup,
    bowArmMesh,
    drawArmMesh,
    leftThighMesh,
    leftShinMesh,
    rightThighMesh,
    rightShinMesh,
    bowGroup,
    bowStringLine,
    nockedArrowGroup,
    nockGlowMesh,
    shieldGroup,
    bombPropGroup,
    hpBarGroup,
    hpFillMesh,
    telegraphLine,
    bodyMat,
    accentMat,
    dispose: () => {
      root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          (obj as THREE.Mesh).geometry.dispose();
        }
      });
      bodyMat.dispose();
      accentMat.dispose();
      darkGearMat.dispose();
    },
  };
}

export function syncStickman3DRig(
  rig: Stickman3DRig,
  actor: Actor,
  time: number,
  aimOverride: { active: boolean; power: number; angle: number } | null,
): void {
  const s = actor.archetype === 'boss' ? 1.28 : 1.0;
  const f = actor.facing;

  rig.root.position.set(toWorldX(actor.x), toWorldY(actor.y), 0);
  rig.bodyGroup.scale.set(actor.squashX, actor.squashY, 1);

  if (actor.flashTimer > 0) {
    rig.bodyMat.emissive.setHex(0xffffff);
    rig.bodyMat.emissiveIntensity = 0.9;
  } else {
    rig.bodyMat.emissive.setHex(0x000000);
    rig.bodyMat.emissiveIntensity = 0;
  }

  const stride = Math.sin(actor.walkPhase) * 0.25 * s;
  const breathe = Math.sin(time * 3.5 + actor.x * 0.01) * 0.045;

  const pelvis = _vA.set(0, 0.86 * s + breathe * 0.4, 0);
  const neck = _vB.set(0, 1.7 * s + breathe, 0);

  // Align torso & head
  alignLimb(rig.torsoMesh, pelvis, neck);
  rig.headGroup.position.set(0, 2.1 * s + breathe, 0);

  // Legs
  const lFoot = new THREE.Vector3(-0.28 * s - stride, 0.06, -0.08);
  const rFoot = new THREE.Vector3(0.28 * s + stride, 0.06, 0.08);
  const lKnee = new THREE.Vector3((pelvis.x + lFoot.x) * 0.5 - f * 0.1 * s, 0.42 * s, -0.06);
  const rKnee = new THREE.Vector3((pelvis.x + rFoot.x) * 0.5 + f * 0.1 * s, 0.42 * s, 0.06);

  alignLimb(rig.leftThighMesh, pelvis, lKnee);
  alignLimb(rig.leftShinMesh, lKnee, lFoot);
  alignLimb(rig.rightThighMesh, pelvis, rKnee);
  alignLimb(rig.rightShinMesh, rKnee, rFoot);

  // Aiming angle (convert 2D screen-down angle into 3D Y-up angle)
  const aimAngle2D = aimOverride ? aimOverride.angle : actor.aimAngle;
  const aimAngle3D = -aimAngle2D;
  const aimPower = aimOverride
    ? aimOverride.power
    : actor.state === 'aiming'
      ? Math.min(1, 1 - actor.stateTimer / Math.max(0.1, actor.aimDuration))
      : 0.15;

  const isNocked = actor.state === 'aiming' || !!aimOverride;
  const pullBack = isNocked ? 0.26 + aimPower * 0.45 : 0.12;

  const bowHand = new THREE.Vector3(
    neck.x + Math.cos(aimAngle3D) * 0.74 * s,
    neck.y + Math.sin(aimAngle3D) * 0.74 * s,
    0.08,
  );
  const drawHand = new THREE.Vector3(
    bowHand.x - Math.cos(aimAngle3D) * pullBack * s,
    bowHand.y - Math.sin(aimAngle3D) * pullBack * s,
    -0.08,
  );

  const shoulderBow = new THREE.Vector3(neck.x, neck.y - 0.06 * s, 0.12);
  const shoulderDraw = new THREE.Vector3(neck.x, neck.y - 0.06 * s, -0.12);

  if (actor.archetype === 'bombardier') {
    rig.bowGroup.visible = false;
    const handPos = new THREE.Vector3(neck.x + f * 0.48 * s, neck.y + 0.12 * s, 0.08);
    alignLimb(rig.bowArmMesh, shoulderBow, handPos);
    alignLimb(rig.drawArmMesh, shoulderDraw, new THREE.Vector3(neck.x - f * 0.2 * s, neck.y - 0.4 * s, -0.1));
    if (rig.bombPropGroup) {
      rig.bombPropGroup.visible = actor.state === 'aiming';
      rig.bombPropGroup.position.set(handPos.x, handPos.y + 0.28 * s, 0.1);
    }
  } else {
    rig.bowGroup.visible = true;
    alignLimb(rig.bowArmMesh, shoulderBow, bowHand);
    alignLimb(rig.drawArmMesh, shoulderDraw, drawHand);

    rig.bowGroup.position.copy(bowHand);
    rig.bowGroup.rotation.set(0, 0, aimAngle3D);

    // Update bowstring vertices in bow local space
    const flex = (0.08 + aimPower * 0.28) * s;
    const posAttr = rig.bowStringLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    const pullLocalX = isNocked ? -pullBack * s : -0.12 * s;
    posAttr.setXYZ(0, -0.18 * s - flex * 0.35, 0.72 * s, 0);
    posAttr.setXYZ(1, pullLocalX, 0, 0);
    posAttr.setXYZ(2, -0.18 * s - flex * 0.35, -0.72 * s, 0);
    posAttr.needsUpdate = true;

    rig.nockedArrowGroup.visible = isNocked;
    rig.nockGlowMesh.visible = isNocked;
    if (isNocked) {
      rig.nockedArrowGroup.position.set(pullLocalX + 0.35 * s, 0, 0);
    }
  }

  if (rig.shieldGroup) {
    rig.shieldGroup.visible = actor.shieldActive;
    rig.shieldGroup.position.set(f * 0.56 * s, 1.15 * s, 0.22);
  }

  if (rig.hpBarGroup && rig.hpFillMesh) {
    const showHp = actor.hp < actor.maxHp || actor.archetype === 'boss';
    rig.hpBarGroup.visible = showHp;
    if (showHp) {
      const ratio = Math.max(0.01, actor.hp / actor.maxHp);
      rig.hpFillMesh.scale.x = ratio;
      rig.hpFillMesh.position.x = -(1 - ratio) * 0.65 * s;
    }
  }

  if (rig.telegraphLine) {
    const showTelegraph = !actor.isPlayer && actor.state === 'aiming';
    rig.telegraphLine.visible = showTelegraph;
    if (showTelegraph) {
      const rayLen = actor.archetype === 'sniper' ? 10 : 3.6;
      const tPos = rig.telegraphLine.geometry.getAttribute('position') as THREE.BufferAttribute;
      tPos.setXYZ(0, bowHand.x, bowHand.y, 0.05);
      tPos.setXYZ(1, bowHand.x + Math.cos(aimAngle3D) * rayLen, bowHand.y + Math.sin(aimAngle3D) * rayLen, 0.05);
      tPos.needsUpdate = true;
    }
  }
}

export interface Ragdoll3DRig {
  root: THREE.Group;
  limbs: THREE.Mesh[];
  headMesh: THREE.Mesh;
  hatGroup: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
  dispose: () => void;
}

const RAGDOLL_BONE_PAIRS: Array<[number, number, number]> = [
  [1, 3, 0.082],
  [3, 4, 0.075],
  [2, 7, 0.095],
  [7, 8, 0.085],
  [1, 2, 0.14],
  [1, 5, 0.082],
  [5, 6, 0.075],
  [2, 9, 0.095],
  [9, 10, 0.085],
];

export function createRagdoll3DRig(rag: RagdollBody): Ragdoll3DRig {
  const s = rag.archetype === 'boss' ? 1.28 : 1.0;
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x101218,
    roughness: 0.25,
    metalness: 0.15,
    transparent: true,
    opacity: 1,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: rag.archetype === 'player' ? 0xdc2626 : 0xf59e0b,
    roughness: 0.45,
    metalness: 0.2,
    transparent: true,
    opacity: 1,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x523421,
    roughness: 0.7,
    transparent: true,
    opacity: 1,
  });

  const root = new THREE.Group();
  const limbs: THREE.Mesh[] = [];
  for (const [, , rad] of RAGDOLL_BONE_PAIRS) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rad * s, rad * s, 1, 8), bodyMat);
    m.castShadow = true;
    root.add(m);
    limbs.push(m);
  }

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.35 * s, 14, 12), bodyMat);
  headMesh.castShadow = true;
  root.add(headMesh);

  const hatGroup = createHeadgearGroup(rag.archetype, rag.facing, s, accentMat, darkMat);
  root.add(hatGroup);

  return {
    root,
    limbs,
    headMesh,
    hatGroup,
    bodyMat,
    dispose: () => {
      root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          (obj as THREE.Mesh).geometry.dispose();
        }
      });
      bodyMat.dispose();
      accentMat.dispose();
      darkMat.dispose();
    },
  };
}

export function syncRagdoll3DRig(rig: Ragdoll3DRig, rag: RagdollBody): void {
  rig.bodyMat.opacity = rag.alpha;
  for (let i = 0; i < RAGDOLL_BONE_PAIRS.length; i++) {
    const [aIdx, bIdx] = RAGDOLL_BONE_PAIRS[i];
    const a = rag.nodes[aIdx];
    const b = rag.nodes[bIdx];
    _vA.set(toWorldX(a.x), toWorldY(a.y), 0.12);
    _vB.set(toWorldX(b.x), toWorldY(b.y), 0.12);
    alignLimb(rig.limbs[i], _vA, _vB);
  }
  const head = rag.nodes[0];
  rig.headMesh.position.set(toWorldX(head.x), toWorldY(head.y), 0.12);

  rig.hatGroup.visible = rag.hatLost;
  if (rag.hatLost) {
    rig.hatGroup.position.set(toWorldX(rag.hatX), toWorldY(rag.hatY), 0.25);
    rig.hatGroup.rotation.set(0.2, 0, -rag.hatRot);
  }
}

export function createArrow3DMesh(type: ArrowType, isBomb: boolean): THREE.Group {
  const g = new THREE.Group();

  if (isBomb) {
    const bombMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.75 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.8 });
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 14), bombMat);
    sphere.castShadow = true;
    g.add(sphere);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.12, 10), brassMat);
    collar.position.set(0.18, 0.24, 0);
    collar.rotation.z = -0.6;
    g.add(collar);

    const spark = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), sparkMat);
    spark.position.set(0.28, 0.36, 0);
    g.add(spark);
    return g;
  }

  // 4-part composite arrow along +X
  const shaftMat = new THREE.MeshStandardMaterial({
    color: type === 'fire' ? 0xfdba74 : 0x334155,
    roughness: 0.55,
    metalness: 0.25,
  });
  const tipColor = type === 'fire' ? 0xfef08a : type === 'triple' ? 0x38bdf8 : 0xcbd5e1;
  const tipMat = new THREE.MeshStandardMaterial({
    color: tipColor,
    emissive: type === 'fire' ? 0xf97316 : type === 'triple' ? 0x0284c7 : 0xfacc15,
    emissiveIntensity: type === 'standard' ? 0.35 : 0.85,
    roughness: 0.2,
    metalness: 0.8,
  });
  const vaneMat = new THREE.MeshStandardMaterial({
    color: type === 'fire' ? 0xef4444 : type === 'triple' ? 0x38bdf8 : 0xe2e8f0,
    roughness: 0.7,
    side: THREE.DoubleSide,
  });

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 1.12, 8), shaftMat);
  shaft.rotation.z = -Math.PI * 0.5;
  shaft.position.x = -0.12;
  shaft.castShadow = true;
  g.add(shaft);

  const head = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.28, 8), tipMat);
  head.rotation.z = -Math.PI * 0.5;
  head.position.x = 0.52;
  g.add(head);

  for (let i = 0; i < 3; i++) {
    const vane = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.14), vaneMat);
    vane.position.x = -0.56;
    vane.rotation.x = (i * Math.PI) / 1.5;
    g.add(vane);
  }

  return g;
}

export function createProp3DRig(
  prop: ActiveProp,
  textures: ProceduralTextureSet,
): { group: THREE.Group; chainMesh?: THREE.Mesh; bobGroup?: THREE.Group } {
  const g = new THREE.Group();
  const w = toWorldLen(prop.w);
  const h = toWorldLen(prop.h);

  if (prop.kind === 'barrel') {
    const pts = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(w * 0.44, 0),
      new THREE.Vector2(w * 0.54, h * 0.5),
      new THREE.Vector2(w * 0.44, h),
      new THREE.Vector2(0, h),
    ];
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.48, metalness: 0.18 });
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x1e2028, roughness: 0.3, metalness: 0.85 });
    const hazardMat = new THREE.MeshStandardMaterial({
      map: textures.ironMap,
      color: 0xfacc15,
      emissive: 0xca8a04,
      emissiveIntensity: 0.25,
      roughness: 0.35,
    });

    const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 18), barrelMat);
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    for (const yFrac of [0.2, 0.8]) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(w * 0.48, 0.05, 8, 18), bandMat);
      hoop.rotation.x = Math.PI * 0.5;
      hoop.position.y = h * yFrac;
      g.add(hoop);
    }

    const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.1), hazardMat);
    plaque.position.set(0, h * 0.5, w * 0.51);
    plaque.rotation.z = Math.PI * 0.25;
    g.add(plaque);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 1.35, w * 1.35),
      new THREE.MeshBasicMaterial({ map: textures.shadowDisc, transparent: true, opacity: 0.5, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI * 0.5;
    shadow.position.y = 0.015;
    g.add(shadow);

    g.position.set(toWorldX(prop.x + prop.w * 0.5), toWorldY(prop.y + prop.h), 0);
    return { group: g };
  }

  if (prop.kind === 'crate' || prop.kind === 'supply_crate') {
    const woodMat = new THREE.MeshStandardMaterial({
      map: textures.woodMap,
      bumpMap: textures.woodBump,
      bumpScale: 0.04,
      color: prop.kind === 'supply_crate' ? 0xf59e0b : 0xb47b52,
      roughness: 0.78,
      metalness: 0.05,
    });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x452715, roughness: 0.85 });

    const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), woodMat);
    box.position.y = h * 0.5;
    box.castShadow = true;
    box.receiveShadow = true;
    g.add(box);

    // Diagonal cross brace on front face
    const brace = new THREE.Mesh(new THREE.BoxGeometry(w * 1.05, 0.14, w + 0.08), frameMat);
    brace.position.y = h * 0.5;
    brace.rotation.z = Math.PI * 0.25;
    g.add(brace);

    if (prop.kind === 'supply_crate') {
      const greenMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.4 });
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x86efac, emissiveIntensity: 0.3 });
      const badge = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.28, w * 0.28, w + 0.12, 16), greenMat);
      badge.rotation.x = Math.PI * 0.5;
      badge.position.y = h * 0.5;
      g.add(badge);
      const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.14, w * 0.36, w + 0.16), whiteMat);
      crossV.position.y = h * 0.5;
      g.add(crossV);
      const crossH = new THREE.Mesh(new THREE.BoxGeometry(w * 0.36, 0.14, w + 0.16), whiteMat);
      crossH.position.y = h * 0.5;
      g.add(crossH);
    }

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 1.4, w * 1.4),
      new THREE.MeshBasicMaterial({ map: textures.shadowDisc, transparent: true, opacity: 0.5, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI * 0.5;
    shadow.position.y = 0.015;
    g.add(shadow);

    g.position.set(toWorldX(prop.x + prop.w * 0.5), toWorldY(prop.y + prop.h), 0);
    return { group: g };
  }

  // Pendulum spiked iron ball
  const ironMat = new THREE.MeshStandardMaterial({
    map: textures.ironMap,
    color: 0x64748b,
    roughness: 0.3,
    metalness: 0.85,
  });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.8 });

  const pivot = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), goldMat);
  pivot.position.set(toWorldX(prop.x), toWorldY(prop.y), 0);
  g.add(pivot);

  const chainMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 8), ironMat);
  chainMesh.castShadow = true;
  g.add(chainMesh);

  const bobGroup = new THREE.Group();
  const r = toWorldLen(prop.bobRadius);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 14), ironMat);
  ball.castShadow = true;
  bobGroup.add(ball);

  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.36, 8), ironMat);
    spike.position.set(Math.cos(ang) * r, Math.sin(ang) * r, 0);
    spike.rotation.z = ang - Math.PI * 0.5;
    bobGroup.add(spike);
  }
  g.add(bobGroup);
  return { group: g, chainMesh, bobGroup };
}

export function createPlatform3DRig(
  p: Platform,
  theme: Biome3DTheme,
  textures: ProceduralTextureSet,
): THREE.Group {
  const g = new THREE.Group();
  const w = toWorldLen(p.w);
  const h = toWorldLen(p.h);
  const depth = 3.2;

  const isThinDeck = h < 1.2;

  if (p.material === 'grass') {
    const earthMat = new THREE.MeshStandardMaterial({
      map: textures.stoneMap,
      bumpMap: textures.stoneBump,
      bumpScale: 0.05,
      color: 0x3b404c,
      roughness: 0.9,
      metalness: 0.05,
    });
    const stoneRimMat = new THREE.MeshStandardMaterial({
      map: textures.stoneMap,
      bumpMap: textures.stoneBump,
      bumpScale: 0.05,
      color: 0x8d94a3,
      roughness: 0.82,
    });
    const turfMat = new THREE.MeshStandardMaterial({ color: theme.turfColor, roughness: 0.85, metalness: 0.04 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, Math.max(0.4, h - 0.32), depth), earthMat);
    body.position.y = -(h - 0.32) * 0.5 - 0.32;
    body.receiveShadow = true;
    g.add(body);

    const rim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.16, 0.3, depth + 0.18), stoneRimMat);
    rim.position.y = -0.18;
    rim.castShadow = true;
    rim.receiveShadow = true;
    g.add(rim);

    const turf = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, 0.14, depth + 0.14), turfMat);
    turf.position.y = -0.05;
    turf.receiveShadow = true;
    g.add(turf);
  } else if (p.material === 'wood') {
    const woodMat = new THREE.MeshStandardMaterial({
      map: textures.woodMap,
      bumpMap: textures.woodBump,
      bumpScale: 0.05,
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.05,
    });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.88 });

    const deckH = Math.min(h, 0.85);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(w, deckH, depth), woodMat);
    deck.position.y = -deckH * 0.5;
    deck.castShadow = true;
    deck.receiveShadow = true;
    g.add(deck);

    if (h > 1.8) {
      const postH = h - deckH;
      for (const xSign of [-1, 1]) {
        for (const zSign of [-1, 1]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, postH, 10), postMat);
          post.position.set(xSign * (w * 0.5 - 0.65), -deckH - postH * 0.5, zSign * (depth * 0.35));
          post.castShadow = true;
          post.receiveShadow = true;
          g.add(post);
        }
      }
    }
  } else if (p.material === 'iron') {
    const ironMat = new THREE.MeshStandardMaterial({
      map: textures.ironMap,
      bumpMap: textures.ironBump,
      bumpScale: 0.04,
      color: 0x94a3b8,
      roughness: 0.32,
      metalness: 0.82,
    });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(w, h, depth * 0.92), ironMat);
    beam.position.y = -h * 0.5;
    beam.castShadow = true;
    beam.receiveShadow = true;
    g.add(beam);

    // Glow strip underneath ricochet iron beams
    if (p.ricochet) {
      const glowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const strip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.08, depth * 0.96), glowMat);
      strip.position.y = -h + 0.06;
      g.add(strip);
    }
  } else {
    // Dusk stone bastion
    const stoneMat = new THREE.MeshStandardMaterial({
      map: textures.stoneMap,
      bumpMap: textures.stoneBump,
      bumpScale: 0.05,
      color: 0x8f96a6,
      roughness: 0.82,
      metalness: 0.08,
    });
    const darkStoneMat = new THREE.MeshStandardMaterial({
      map: textures.stoneMap,
      bumpMap: textures.stoneBump,
      bumpScale: 0.05,
      color: 0x414757,
      roughness: 0.88,
      metalness: 0.06,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, Math.max(0.3, h - (isThinDeck ? 0 : 0.38)), depth), darkStoneMat);
    body.position.y = -(h * 0.5) - (isThinDeck ? 0 : 0.19);
    body.receiveShadow = true;
    g.add(body);

    const capH = isThinDeck ? h : 0.42;
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, capH, depth + 0.16), stoneMat);
    cap.position.y = -capH * 0.5;
    cap.castShadow = true;
    cap.receiveShadow = true;
    g.add(cap);
  }

  g.position.set(toWorldX(p.x + p.w * 0.5), toWorldY(p.y), 0);
  return g;
}
