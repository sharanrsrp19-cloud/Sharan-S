import * as THREE from 'three';
import { BiomeId } from '../types';
import meadowBackdropUrl from '../../assets/images/bg_meadow_dusk_1794723019627.jpg';
import canyonBackdropUrl from '../../assets/images/bg_canyon_sunset_1794723019909.jpg';
import fortressBackdropUrl from '../../assets/images/bg_fortress_rain_1794723021923.jpg';
import cavernBackdropUrl from '../../assets/images/bg_cavern_glow_1794723041305.jpg';
import citadelBackdropUrl from '../../assets/images/bg_citadel_eclipse_1794723021082.jpg';
import glacierBackdropUrl from '../../assets/images/bg_glacier_aurora_1794723041498.jpg';
import swampBackdropUrl from '../../assets/images/bg_swamp_mist_1794723041874.jpg';
import stormBackdropUrl from '../../assets/images/bg_storm_lightning_1794723042394.jpg';

export const BIOME_BACKDROP_URLS: Record<BiomeId, string> = {
  meadow: meadowBackdropUrl,
  canyon: canyonBackdropUrl,
  fortress: fortressBackdropUrl,
  cavern: cavernBackdropUrl,
  citadel: citadelBackdropUrl,
  glacier: glacierBackdropUrl,
  swamp: swampBackdropUrl,
  storm: stormBackdropUrl,
};

export const WORLD_SCALE = 0.032;

export function toWorldX(x2d: number): number {
  return (x2d - 640) * WORLD_SCALE;
}

export function toWorldY(y2d: number): number {
  return (720 - y2d) * WORLD_SCALE;
}

export function toWorldLen(len2d: number): number {
  return len2d * WORLD_SCALE;
}

export function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export interface Biome3DTheme {
  skyTop: number;
  skyHorizon: number;
  fogColor: number;
  fogDensity: number;
  keyColor: number;
  keyIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
  torchColor: number;
  groundTint: number;
  farCityColor: number;
  cottageWall: number;
  cottageRoof: number;
  windowGlow: number;
  parapetColor: number;
  turfColor: number;
}

export const BIOME_3D_THEMES: Record<BiomeId, Biome3DTheme> = {
  meadow: {
    skyTop: 0x2a314a,
    skyHorizon: 0x7b6375,
    fogColor: 0x615368,
    fogDensity: 0.0085,
    keyColor: 0xffd5a6,
    keyIntensity: 2.5,
    hemiSky: 0x8fa3cf,
    hemiGround: 0x2b2420,
    hemiIntensity: 1.25,
    torchColor: 0xff922e,
    groundTint: 0x2d313b,
    farCityColor: 0x353b4f,
    cottageWall: 0x5c515c,
    cottageRoof: 0x874444,
    windowGlow: 0xffc83d,
    parapetColor: 0x6b7080,
    turfColor: 0x5d8247,
  },
  canyon: {
    skyTop: 0x3f2634,
    skyHorizon: 0xc26e4f,
    fogColor: 0x945242,
    fogDensity: 0.009,
    keyColor: 0xffc482,
    keyIntensity: 2.6,
    hemiSky: 0xb36d68,
    hemiGround: 0x331d18,
    hemiIntensity: 1.15,
    torchColor: 0xff7b29,
    groundTint: 0x362622,
    farCityColor: 0x523135,
    cottageWall: 0x6e453e,
    cottageRoof: 0x914835,
    windowGlow: 0xfde047,
    parapetColor: 0x826050,
    turfColor: 0x946645,
  },
  fortress: {
    skyTop: 0x222c44,
    skyHorizon: 0x5c6b82,
    fogColor: 0x4b576b,
    fogDensity: 0.0095,
    keyColor: 0xe2ecff,
    keyIntensity: 2.3,
    hemiSky: 0x7a8ca6,
    hemiGround: 0x1e242e,
    hemiIntensity: 1.25,
    torchColor: 0xf59e0b,
    groundTint: 0x272e3d,
    farCityColor: 0x2e374d,
    cottageWall: 0x454f66,
    cottageRoof: 0x335761,
    windowGlow: 0xfbbf24,
    parapetColor: 0x5b6980,
    turfColor: 0x586980,
  },
  cavern: {
    skyTop: 0x161b2c,
    skyHorizon: 0x343a57,
    fogColor: 0x2a2e45,
    fogDensity: 0.011,
    keyColor: 0xa7f3d0,
    keyIntensity: 2.2,
    hemiSky: 0x4b6887,
    hemiGround: 0x151724,
    hemiIntensity: 1.1,
    torchColor: 0x2dd4bf,
    groundTint: 0x1c1f2e,
    farCityColor: 0x22263b,
    cottageWall: 0x32364d,
    cottageRoof: 0x3c3f5e,
    windowGlow: 0x5eead4,
    parapetColor: 0x494d63,
    turfColor: 0x3a5261,
  },
  citadel: {
    skyTop: 0x301724,
    skyHorizon: 0xa63a42,
    fogColor: 0x7d2934,
    fogDensity: 0.009,
    keyColor: 0xfecaca,
    keyIntensity: 2.5,
    hemiSky: 0x9e3d51,
    hemiGround: 0x241116,
    hemiIntensity: 1.15,
    torchColor: 0xef4444,
    groundTint: 0x2e1a20,
    farCityColor: 0x421d2a,
    cottageWall: 0x572734,
    cottageRoof: 0x802a34,
    windowGlow: 0xfbbf24,
    parapetColor: 0x633c46,
    turfColor: 0x70303a,
  },
  glacier: {
    skyTop: 0x0f1d3a,
    skyHorizon: 0x3d7399,
    fogColor: 0x2c5273,
    fogDensity: 0.008,
    keyColor: 0xdbeafe,
    keyIntensity: 2.45,
    hemiSky: 0x67e8f9,
    hemiGround: 0x1e293b,
    hemiIntensity: 1.3,
    torchColor: 0x38bdf8,
    groundTint: 0x1e334d,
    farCityColor: 0x274261,
    cottageWall: 0x475569,
    cottageRoof: 0x334155,
    windowGlow: 0x67e8f9,
    parapetColor: 0x7dd3fc,
    turfColor: 0xbfe3f7,
  },
  swamp: {
    skyTop: 0x112a2b,
    skyHorizon: 0x2f6b5d,
    fogColor: 0x245249,
    fogDensity: 0.011,
    keyColor: 0xd9f99d,
    keyIntensity: 2.15,
    hemiSky: 0x5eead4,
    hemiGround: 0x14261d,
    hemiIntensity: 1.2,
    torchColor: 0xa3e635,
    groundTint: 0x182b24,
    farCityColor: 0x1e382e,
    cottageWall: 0x354a3f,
    cottageRoof: 0x2b3d33,
    windowGlow: 0xd9f99d,
    parapetColor: 0x4d6b57,
    turfColor: 0x4d7c3f,
  },
  storm: {
    skyTop: 0x11152c,
    skyHorizon: 0x3f4e78,
    fogColor: 0x2d3859,
    fogDensity: 0.0095,
    keyColor: 0xc7d2fe,
    keyIntensity: 2.35,
    hemiSky: 0x818cf8,
    hemiGround: 0x181c2e,
    hemiIntensity: 1.25,
    torchColor: 0xa855f7,
    groundTint: 0x1c2138,
    farCityColor: 0x242b47,
    cottageWall: 0x363e5c,
    cottageRoof: 0x2b314a,
    windowGlow: 0x93c5fd,
    parapetColor: 0x525d82,
    turfColor: 0x485678,
  },
};

export interface ProceduralTextureSet {
  stoneMap: THREE.CanvasTexture;
  stoneBump: THREE.CanvasTexture;
  woodMap: THREE.CanvasTexture;
  woodBump: THREE.CanvasTexture;
  ironMap: THREE.CanvasTexture;
  ironBump: THREE.CanvasTexture;
  pumpkinBanner: THREE.CanvasTexture;
  swirlBanner: THREE.CanvasTexture;
  targetMap: THREE.CanvasTexture;
  shadowDisc: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextureSet(maxAniso: number): ProceduralTextureSet {
  const stone = buildStoneTextures(maxAniso);
  const wood = buildWoodTextures(maxAniso);
  const iron = buildIronTextures(maxAniso);
  const pumpkinBanner = buildBannerTexture('pumpkin', maxAniso);
  const swirlBanner = buildBannerTexture('swirl', maxAniso);
  const targetMap = buildTargetTexture(maxAniso);
  const shadowDisc = buildShadowDiscTexture();

  return {
    stoneMap: stone.map,
    stoneBump: stone.bump,
    woodMap: wood.map,
    woodBump: wood.bump,
    ironMap: iron.map,
    ironBump: iron.bump,
    pumpkinBanner,
    swirlBanner,
    targetMap,
    shadowDisc,
    dispose: () => {
      stone.map.dispose();
      stone.bump.dispose();
      wood.map.dispose();
      wood.bump.dispose();
      iron.map.dispose();
      iron.bump.dispose();
      pumpkinBanner.dispose();
      swirlBanner.dispose();
      targetMap.dispose();
      shadowDisc.dispose();
    },
  };
}

function buildStoneTextures(maxAniso: number): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 256;
  const cColor = document.createElement('canvas');
  cColor.width = size;
  cColor.height = size;
  const ctx = cColor.getContext('2d')!;

  const cBump = document.createElement('canvas');
  cBump.width = size;
  cBump.height = size;
  const btx = cBump.getContext('2d')!;

  ctx.fillStyle = '#5a5f6b';
  ctx.fillRect(0, 0, size, size);
  btx.fillStyle = '#555555';
  btx.fillRect(0, 0, size, size);

  const rows = 4;
  const cols = 4;
  const rh = size / rows;
  const cw = size / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (cw * 0.5);
    for (let c = -1; c <= cols; c++) {
      const bx = c * cw + offset;
      const by = r * rh;
      const shade = 82 + ((r * 13 + c * 29) & 31);
      ctx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 10})`;
      ctx.fillRect(bx + 3, by + 3, cw - 6, rh - 6);

      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(bx + 4, by + 4, cw - 8, 5);

      const bVal = 175 + ((r * 17 + c * 23) & 45);
      btx.fillStyle = `rgb(${bVal}, ${bVal}, ${bVal})`;
      btx.fillRect(bx + 4, by + 4, cw - 8, rh - 8);
    }
  }

  // Subtle grain speckles
  for (let i = 0; i < 420; i++) {
    const x = (i * 73) % size;
    const y = (i * 137) % size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.06)';
    ctx.fillRect(x, y, 2, 2);
  }

  const map = new THREE.CanvasTexture(cColor);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAniso;

  const bump = new THREE.CanvasTexture(cBump);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.anisotropy = maxAniso;
  return { map, bump };
}

function buildWoodTextures(maxAniso: number): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 256;
  const cColor = document.createElement('canvas');
  cColor.width = size;
  cColor.height = size;
  const ctx = cColor.getContext('2d')!;

  const cBump = document.createElement('canvas');
  cBump.width = size;
  cBump.height = size;
  const btx = cBump.getContext('2d')!;

  ctx.fillStyle = '#6f4528';
  ctx.fillRect(0, 0, size, size);
  btx.fillStyle = '#888888';
  btx.fillRect(0, 0, size, size);

  const planks = 4;
  const ph = size / planks;
  for (let p = 0; p < planks; p++) {
    const py = p * ph;
    const r = 108 + ((p * 19) % 24);
    const g = 66 + ((p * 11) % 14);
    const b = 38 + ((p * 7) % 10);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(0, py + 2, size, ph - 4);

    // Grain streaks
    for (let k = 0; k < 14; k++) {
      const gy = py + 6 + ((k * 13) % (ph - 12));
      ctx.fillStyle = k % 2 === 0 ? 'rgba(30,15,5,0.22)' : 'rgba(255,220,180,0.08)';
      ctx.fillRect(0, gy, size, 2);
      btx.fillStyle = k % 2 === 0 ? '#b8b8b8' : '#707070';
      btx.fillRect(0, gy, size, 2);
    }

    // Plank seam
    ctx.fillStyle = '#24140a';
    ctx.fillRect(0, py, size, 3);
    btx.fillStyle = '#252525';
    btx.fillRect(0, py, size, 3);
  }

  const map = new THREE.CanvasTexture(cColor);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAniso;

  const bump = new THREE.CanvasTexture(cBump);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.anisotropy = maxAniso;
  return { map, bump };
}

function buildIronTextures(maxAniso: number): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const size = 256;
  const cColor = document.createElement('canvas');
  cColor.width = size;
  cColor.height = size;
  const ctx = cColor.getContext('2d')!;

  const cBump = document.createElement('canvas');
  cBump.width = size;
  cBump.height = size;
  const btx = cBump.getContext('2d')!;

  ctx.fillStyle = '#475569';
  ctx.fillRect(0, 0, size, size);
  btx.fillStyle = '#808080';
  btx.fillRect(0, 0, size, size);

  // Brushed horizontal metal sheen lines
  for (let y = 0; y < size; y += 3) {
    ctx.fillStyle = y % 6 === 0 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)';
    ctx.fillRect(0, y, size, 1);
  }

  // Rivets around border
  for (let i = 24; i < size; i += 48) {
    for (const ry of [20, size - 20]) {
      ctx.fillStyle = '#94a3b8';
      ctx.beginPath();
      ctx.arc(i, ry, 6, 0, Math.PI * 2);
      ctx.fill();
      btx.fillStyle = '#eeeeee';
      btx.beginPath();
      btx.arc(i, ry, 6, 0, Math.PI * 2);
      btx.fill();
    }
  }

  const map = new THREE.CanvasTexture(cColor);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = maxAniso;

  const bump = new THREE.CanvasTexture(cBump);
  bump.wrapS = THREE.RepeatWrapping;
  bump.wrapT = THREE.RepeatWrapping;
  bump.anisotropy = maxAniso;
  return { map, bump };
}

function buildBannerTexture(emblem: 'pumpkin' | 'swirl', maxAniso: number): THREE.CanvasTexture {
  const w = 256;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#12131a';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  const cx = w * 0.5;
  const cy = h * 0.45;
  if (emblem === 'pumpkin') {
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 66, 56, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#65a30d';
    ctx.fillRect(cx - 8, cy - 72, 16, 22);
    ctx.fillStyle = '#12131a';
    ctx.beginPath();
    ctx.moveTo(cx - 32, cy - 8);
    ctx.lineTo(cx - 18, cy - 30);
    ctx.lineTo(cx - 4, cy - 8);
    ctx.moveTo(cx + 4, cy - 8);
    ctx.lineTo(cx + 18, cy - 30);
    ctx.lineTo(cx + 32, cy - 8);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy + 12, 32, 0.15, Math.PI - 0.15);
    ctx.fill();
  } else {
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(cx, cy, 62, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 14;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 3.4; a += 0.22) {
      const r = a * 5.0;
      const sx = cx + Math.cos(a) * r;
      const sy = cy + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(cx - 6, cy + 60, 12, 46);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function buildTargetTexture(maxAniso: number): THREE.CanvasTexture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const cx = size * 0.5;
  const cy = size * 0.5;

  const rings: Array<[number, string]> = [
    [122, '#1e1916'],
    [114, '#fff9ee'],
    [82, '#e84a27'],
    [50, '#fff9ee'],
    [24, '#facc15'],
  ];
  for (const [r, col] of rings) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function buildShadowDiscTexture(): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(size * 0.5, size * 0.5, 4, size * 0.5, size * 0.5, size * 0.48);
  grad.addColorStop(0, 'rgba(0,0,0,0.68)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.28)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}
