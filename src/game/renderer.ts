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
} from './types';
import { WORLD_HEIGHT, WORLD_WIDTH } from './levels';
import { WeatherPool, renderWeatherOverlay } from './weather';

const INK = '#0A0B0F';

interface BiomePalette {
  skyTop: string;
  skyMid: string;
  skyBot: string;
  sunColor: string;
  sunGlow: string;
  farCity: string;
  midHouse: string;
  roofTone: string;
  windowGlow: string;
  parapetStone: string;
  torchGlow: string;
  groundVoid: string;
}

const BIOME_PALETTES: Record<BiomeId, BiomePalette> = {
  meadow: {
    skyTop: '#242938',
    skyMid: '#3C4256',
    skyBot: '#6B6473',
    sunColor: '#FDE68A',
    sunGlow: 'rgba(251, 191, 36, 0.14)',
    farCity: '#2F3444',
    midHouse: '#3E3942',
    roofTone: '#593334',
    windowGlow: '#FBBF24',
    parapetStone: '#4B4E58',
    torchGlow: 'rgba(249, 115, 22, 0.24)',
    groundVoid: '#0B0C10',
  },
  canyon: {
    skyTop: '#332028',
    skyMid: '#6E3C3B',
    skyBot: '#B86E51',
    sunColor: '#FDE047',
    sunGlow: 'rgba(251, 146, 60, 0.2)',
    farCity: '#45282B',
    midHouse: '#5A3631',
    roofTone: '#7C3E2D',
    windowGlow: '#FDE047',
    parapetStone: '#6E5042',
    torchGlow: 'rgba(251, 146, 60, 0.24)',
    groundVoid: '#0F0A0A',
  },
  fortress: {
    skyTop: '#1A2130',
    skyMid: '#2D384D',
    skyBot: '#536073',
    sunColor: '#E2E8F0',
    sunGlow: 'rgba(148, 163, 184, 0.16)',
    farCity: '#242C3D',
    midHouse: '#2E3545',
    roofTone: '#2A434B',
    windowGlow: '#F59E0B',
    parapetStone: '#475569',
    torchGlow: 'rgba(245, 158, 11, 0.22)',
    groundVoid: '#080A0F',
  },
  cavern: {
    skyTop: '#10121C',
    skyMid: '#1C2032',
    skyBot: '#2D2E42',
    sunColor: '#99F6E4',
    sunGlow: 'rgba(45, 212, 191, 0.12)',
    farCity: '#161826',
    midHouse: '#222536',
    roofTone: '#2E2F45',
    windowGlow: '#5EEAD4',
    parapetStone: '#383B4D',
    torchGlow: 'rgba(45, 212, 191, 0.16)',
    groundVoid: '#07080D',
  },
  citadel: {
    skyTop: '#24111B',
    skyMid: '#521A29',
    skyBot: '#993439',
    sunColor: '#FCD34D',
    sunGlow: 'rgba(239, 68, 68, 0.22)',
    farCity: '#331620',
    midHouse: '#421C26',
    roofTone: '#662028',
    windowGlow: '#FBBF24',
    parapetStone: '#4B2D35',
    torchGlow: 'rgba(239, 68, 68, 0.26)',
    groundVoid: '#0B0709',
  },
  glacier: {
    skyTop: '#0F1E36',
    skyMid: '#1E3A5F',
    skyBot: '#5680A8',
    sunColor: '#E0F2FE',
    sunGlow: 'rgba(103, 232, 249, 0.2)',
    farCity: '#1B314D',
    midHouse: '#274466',
    roofTone: '#385D82',
    windowGlow: '#67E8F9',
    parapetStone: '#475569',
    torchGlow: 'rgba(56, 189, 248, 0.22)',
    groundVoid: '#08101C',
  },
  swamp: {
    skyTop: '#0C1A16',
    skyMid: '#17302A',
    skyBot: '#2D4D42',
    sunColor: '#D9F99D',
    sunGlow: 'rgba(163, 230, 53, 0.16)',
    farCity: '#142621',
    midHouse: '#1F362E',
    roofTone: '#2E4738',
    windowGlow: '#A3E635',
    parapetStone: '#33423B',
    torchGlow: 'rgba(163, 230, 53, 0.22)',
    groundVoid: '#060D0B',
  },
  storm: {
    skyTop: '#0B101D',
    skyMid: '#182238',
    skyBot: '#314266',
    sunColor: '#E0E7FF',
    sunGlow: 'rgba(129, 140, 248, 0.2)',
    farCity: '#141C30',
    midHouse: '#1E2942',
    roofTone: '#2D3B5E',
    windowGlow: '#93C5FD',
    parapetStone: '#3B4861',
    torchGlow: 'rgba(96, 165, 250, 0.26)',
    groundVoid: '#06080F',
  },
};

export interface RenderContextState {
  biome: BiomeId;
  time: number;
  wind: number;
  cameraShakeX: number;
  cameraShakeY: number;
  cameraPanX: number;
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
  aimState: {
    active: boolean;
    power: number;
    angle: number;
    trajectory: Vec2[];
    dragStartWorld: Vec2 | null;
    dragCurrWorld: Vec2 | null;
  };
  isTitleScreen: boolean;
}

export interface ViewportTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
  cssW: number;
  cssH: number;
}

export function computeViewportTransform(cssW: number, cssH: number): ViewportTransform {
  const scale = Math.min(cssW / WORLD_WIDTH, cssH / WORLD_HEIGHT);
  const offsetX = (cssW - WORLD_WIDTH * scale) * 0.5;
  const offsetY = (cssH - WORLD_HEIGHT * scale) * 0.5;
  return { scale, offsetX, offsetY, cssW, cssH };
}

let cachedSkyKey = '';
let cachedSkyGrad: CanvasGradient | null = null;
let cachedBackdropBiome: BiomeId | null = null;
let cachedBackdropCanvas: HTMLCanvasElement | null = null;

const BACKDROP_PAD_X = 160;
const BACKDROP_W = WORLD_WIDTH + BACKDROP_PAD_X * 2;
const BACKDROP_H = WORLD_HEIGHT + 80;

function getOrBuildStaticBackdrop(biome: BiomeId, pal: BiomePalette): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  if (cachedBackdropCanvas && cachedBackdropBiome === biome) {
    return cachedBackdropCanvas;
  }
  const off = cachedBackdropCanvas ?? document.createElement('canvas');
  off.width = BACKDROP_W;
  off.height = BACKDROP_H;
  const bctx = off.getContext('2d');
  if (!bctx) return null;

  bctx.clearRect(0, 0, BACKDROP_W, BACKDROP_H);
  bctx.save();
  bctx.translate(BACKDROP_PAD_X, 0);

  // Soft warm twilight mist along horizon behind castle (replaces flat bullseye moon)
  const horizonGrad = bctx.createLinearGradient(0, 120, 0, 520);
  horizonGrad.addColorStop(0, 'rgba(0,0,0,0)');
  horizonGrad.addColorStop(0.55, pal.sunGlow);
  horizonGrad.addColorStop(1, 'rgba(0,0,0,0)');
  bctx.fillStyle = horizonGrad;
  bctx.fillRect(-BACKDROP_PAD_X, 120, BACKDROP_W, 400);

  drawStaticMedievalCityAndWall(bctx, pal, biome);
  bctx.restore();

  cachedBackdropCanvas = off;
  cachedBackdropBiome = biome;
  return off;
}

export function renderGameFrame(
  ctx: CanvasRenderingContext2D,
  vt: ViewportTransform,
  state: RenderContextState,
): void {
  const { scale, offsetX, offsetY, cssW, cssH } = vt;
  const pal = BIOME_PALETTES[state.biome];

  ctx.save();

  // 1. Atmospheric dusk sky background
  const skyKey = `${state.biome}:${Math.round(cssH)}`;
  if (skyKey !== cachedSkyKey || !cachedSkyGrad) {
    const grad = ctx.createLinearGradient(0, 0, 0, cssH);
    grad.addColorStop(0, pal.skyTop);
    grad.addColorStop(0.58, pal.skyMid);
    grad.addColorStop(1, pal.skyBot);
    cachedSkyGrad = grad;
    cachedSkyKey = skyKey;
  }
  ctx.fillStyle = cachedSkyGrad;
  ctx.fillRect(0, 0, cssW, cssH);

  // Logical world transform + camera shake
  ctx.translate(
    offsetX + state.cameraShakeX * scale,
    offsetY + state.cameraShakeY * scale,
  );
  ctx.scale(scale, scale);

  // 2. Soft drifting dusk clouds + cached medieval castle/village/parapet backdrop
  drawDuskClouds(ctx, state.time, state.wind, state.cameraPanX);

  const staticBackdrop = getOrBuildStaticBackdrop(state.biome, pal);
  if (staticBackdrop) {
    ctx.drawImage(staticBackdrop, -BACKDROP_PAD_X - state.cameraPanX * 0.22, 0);
  } else {
    drawStaticMedievalCityAndWall(ctx, pal, state.biome);
  }

  // Animated chimney smoke rising from central cottage
  drawChimneySmoke(ctx, state.time, -state.cameraPanX * 0.22);

  // Cavern ceiling stalactites
  if (state.biome === 'cavern') {
    drawCavernCeiling(ctx);
  }

  // 3. Hanging emblem banners (sway in wind)
  drawHangingBanner(ctx, 84, 345, 'pumpkin', state.time, state.wind);
  drawHangingBanner(ctx, 1196, 345, 'swirl', state.time, state.wind);

  // 4. Platforms (dark foreground earth with rim-lit stone/timber/turf caps)
  for (const p of state.platforms) {
    drawPlatform(ctx, p, pal, state.time);
  }

  // Title Screen Archery Target Stand on right cliff
  if (state.isTitleScreen) {
    drawTitleTargetDummy(ctx, 1085, 500);
  }

  // 5. Props (crates, barrels, pendulums)
  for (const prop of state.props) {
    if (!prop.destroyed) {
      drawProp(ctx, prop, state.time);
    }
  }

  // 6. Ragdolls (defeated stickmen)
  for (const rag of state.ragdolls) {
    drawRagdoll(ctx, rag);
  }

  // 7. Active Glossy Rim-Lit Stickman Actors
  for (const actor of state.actors) {
    drawStickmanActor(
      ctx,
      actor,
      state.time,
      actor.isPlayer && state.aimState.active ? state.aimState : null,
    );
  }

  // 8. Stuck Arrows pinned to terrain/props
  for (const sa of state.stuckArrows) {
    if (sa.targetType === 'platform' || sa.targetType === 'prop') {
      let drawX = sa.relX;
      let drawY = sa.relY;
      if (sa.targetType === 'platform') {
        const plat = state.platforms.find((pl) => pl.id === sa.targetId);
        if (plat) {
          drawX = plat.x + sa.relX;
          drawY = plat.y + sa.relY;
        }
      }
      drawArrowShape(ctx, drawX, drawY, sa.angle, sa.type, false);
    }
  }

  // 9. Trajectory Preview Arc & Slingshot Pull Indicator
  if (state.aimState.active && state.aimState.trajectory.length > 0 && !state.isTitleScreen) {
    drawTrajectoryPreview(ctx, state.aimState.trajectory);
    if (state.aimState.dragStartWorld && state.aimState.dragCurrWorld) {
      drawDragIndicator(ctx, state.aimState.dragStartWorld, state.aimState.dragCurrWorld, state.aimState.power);
    }
  }

  // 10. Flying Arrows with Fiery Tapered Comet Trails & Bombs
  for (const arrow of state.arrows) {
    if (!arrow.active) continue;
    if (arrow.isBomb) {
      drawBombTrail(ctx, arrow);
      drawBombProjectile(ctx, arrow.x, arrow.y, arrow.angle, state.time);
    } else {
      drawCometArrowTrail(ctx, arrow);
      drawArrowShape(ctx, arrow.x, arrow.y, arrow.angle, arrow.type, true);
    }
  }

  // 11. Luminous Radial Explosions
  for (const exp of state.explosions) {
    drawExplosionFlash(ctx, exp);
  }

  // 12. Particles
  for (const pt of state.particles) {
    if (!pt.active) continue;
    drawParticle(ctx, pt);
  }

  // 13. Angled Iron Wall Torches framing left/right foreground corners
  drawCornerTorch(ctx, 18, 138, 1, state.time, pal.torchGlow);
  drawCornerTorch(ctx, 1262, 138, -1, state.time + 1.4, pal.torchGlow);

  // 14. Floating Comic Callouts
  for (const c of state.callouts) {
    drawCallout(ctx, c);
  }

  ctx.restore();

  // 15. Subtle Biome Weather Overlay
  renderWeatherOverlay(
    ctx,
    state.weatherPool,
    state.wind,
    state.time,
    cssW,
    cssH,
    scale,
    offsetX + state.cameraShakeX * scale,
    offsetY + state.cameraShakeY * scale,
  );
}

function drawDuskClouds(
  ctx: CanvasRenderingContext2D,
  time: number,
  wind: number,
  panX: number,
): void {
  const drift = time * (6 + wind * 0.18) - panX * 0.2;
  const clouds = [
    { x: 190, y: 95, s: 1.3 },
    { x: 640, y: 72, s: 1.05 },
    { x: 1090, y: 112, s: 1.4 },
  ];
  ctx.fillStyle = 'rgba(203, 213, 225, 0.08)';
  for (const c of clouds) {
    const wx = ((((c.x + drift) % 1680) + 1680) % 1680) - 220;
    ctx.beginPath();
    ctx.ellipse(wx, c.y, 85 * c.s, 22 * c.s, 0, 0, Math.PI * 2);
    ctx.ellipse(wx - 36 * c.s, c.y + 8, 52 * c.s, 16 * c.s, 0, 0, Math.PI * 2);
    ctx.ellipse(wx + 42 * c.s, c.y + 7, 56 * c.s, 17 * c.s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawChimneySmoke(ctx: CanvasRenderingContext2D, time: number, pxMid: number): void {
  const smokeX = 562 + pxMid;
  for (let i = 0; i < 6; i++) {
    const t = (time * 0.42 + i * 0.17) % 1;
    const sx = smokeX + Math.sin(time * 1.4 + i) * 9 + t * 14;
    const sy = 248 - t * 150;
    ctx.fillStyle = `rgba(226, 232, 240, ${(1 - t) * 0.14})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 9 + t * 20, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStaticMedievalCityAndWall(
  ctx: CanvasRenderingContext2D,
  pal: BiomePalette,
  biome: BiomeId,
): void {
  ctx.save();

  // Far castle battlements & watchtowers (soft dusk depth)
  ctx.fillStyle = pal.farCity;
  ctx.fillRect(-200, 290, 1700, 320);

  // Crenelations across castle wall
  for (let bx = -180; bx < 1460; bx += 46) {
    ctx.fillRect(bx, 272, 26, 22);
  }
  // Distant towers
  const castleTowers = [
    { x: 350, y: 185, w: 68 },
    { x: 520, y: 202, w: 60 },
    { x: 930, y: 170, w: 74 },
  ];
  for (const t of castleTowers) {
    ctx.fillRect(t.x, t.y, t.w, 160);
    ctx.fillRect(t.x - 6, t.y - 16, 18, 20);
    ctx.fillRect(t.x + t.w * 0.5 - 9, t.y - 16, 18, 20);
    ctx.fillRect(t.x + t.w - 12, t.y - 16, 18, 20);
  }

  // Left stone keep tower with subtle stone masonry lines & recessed arched slit
  const lx = 152;
  ctx.fillStyle = '#4B505C';
  ctx.fillRect(lx, 172, 120, 345);
  ctx.fillStyle = 'rgba(255, 240, 210, 0.08)';
  ctx.fillRect(lx + 104, 172, 16, 345);
  ctx.fillStyle = '#3B404B';
  ctx.fillRect(lx - 8, 162, 136, 18);
  // Subtle masonry seams
  ctx.strokeStyle = 'rgba(10, 11, 15, 0.25)';
  ctx.lineWidth = 1.5;
  for (let my = 205; my < 500; my += 32) {
    ctx.beginPath();
    ctx.moveTo(lx, my);
    ctx.lineTo(lx + 120, my);
    ctx.stroke();
  }
  // Recessed arched slit window
  ctx.fillStyle = '#14161D';
  ctx.beginPath();
  ctx.moveTo(lx + 49, 240);
  ctx.lineTo(lx + 49, 214);
  ctx.quadraticCurveTo(lx + 60, 198, lx + 71, 214);
  ctx.lineTo(lx + 71, 240);
  ctx.closePath();
  ctx.fill();

  // Midground village cottages with pitched roofs & warm glowing Gothic windows
  drawCottage(ctx, 410, 295, 210, 222, pal.midHouse, pal.roofTone, pal.windowGlow, true);
  drawCottage(ctx, 645, 232, 245, 285, '#443B40', '#5E2D2D', pal.windowGlow, false);
  drawCottage(ctx, 920, 280, 175, 237, '#353844', '#2F4858', pal.windowGlow, false);
  drawCottage(ctx, 1105, 208, 200, 309, '#3E424D', biome === 'citadel' ? '#662028' : '#265352', pal.windowGlow, false);

  // Courtyard low stone parapet backdrop
  const wallY = 518;
  ctx.fillStyle = pal.parapetStone;
  ctx.fillRect(-200, wallY, 1700, 240);
  ctx.fillStyle = 'rgba(255, 244, 214, 0.11)';
  ctx.fillRect(-200, wallY, 1700, 7);

  ctx.strokeStyle = 'rgba(10, 11, 15, 0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-200, wallY + 34);
  ctx.lineTo(1500, wallY + 34);
  ctx.stroke();

  // Stone pillars & catenary iron chains
  const pillars = [40, 290, 540, 790, 1040, 1290];
  for (let i = 0; i < pillars.length; i++) {
    const px = pillars[i];
    ctx.fillStyle = '#5B5E68';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    roundRect(ctx, px - 18, wallY - 14, 36, 74, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#6E727D';
    roundRect(ctx, px - 22, wallY - 20, 44, 12, 3);
    ctx.fill();
    ctx.stroke();

    if (i < pillars.length - 1) {
      const nx = pillars[i + 1];
      ctx.strokeStyle = '#1E2028';
      ctx.lineWidth = 5;
      ctx.setLineDash([7, 4]);
      ctx.beginPath();
      ctx.moveTo(px + 18, wallY + 6);
      ctx.quadraticCurveTo((px + nx) * 0.5, wallY + 30, nx - 18, wallY + 6);
      ctx.stroke();
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Deep dark foreground courtyard floor shadow
  ctx.fillStyle = pal.groundVoid;
  ctx.fillRect(-200, 588, 1700, 260);
  ctx.restore();
}

function drawCottage(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  wallColor: string,
  roofColor: string,
  winGlow: string,
  hasChimney: boolean,
): void {
  if (hasChimney) {
    ctx.fillStyle = '#4E4448';
    ctx.fillRect(x + w * 0.65, y - 48, 28, 60);
    ctx.fillStyle = '#3B3336';
    ctx.fillRect(x + w * 0.65 - 3, y - 52, 34, 8);
  }

  // Wall body with subtle timber framing
  ctx.fillStyle = wallColor;
  ctx.fillRect(x, y + 48, w, h - 48);
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(x, y + 48, w, 8);

  // Pitched roof with tile ridge shading
  ctx.fillStyle = roofColor;
  ctx.beginPath();
  ctx.moveTo(x - 14, y + 54);
  ctx.lineTo(x + w * 0.5, y);
  ctx.lineTo(x + w + 14, y + 54);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 240, 200, 0.14)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - 10, y + 52);
  ctx.lineTo(x + w * 0.5, y + 2);
  ctx.stroke();

  // Pointed Gothic twin lantern windows
  const winW = 20;
  const winH = 34;
  const winY = y + 90;
  const positions = [x + w * 0.32, x + w * 0.64];

  for (const wx of positions) {
    // Soft glow halo
    ctx.fillStyle = 'rgba(251, 191, 36, 0.12)';
    ctx.beginPath();
    ctx.arc(wx, winY + winH * 0.5, 30, 0, Math.PI * 2);
    ctx.fill();

    // Dark recessed frame
    ctx.fillStyle = '#1E1A18';
    ctx.beginPath();
    ctx.moveTo(wx - winW * 0.5 - 2, winY + winH + 2);
    ctx.lineTo(wx - winW * 0.5 - 2, winY + 14);
    ctx.lineTo(wx, winY - 2);
    ctx.lineTo(wx + winW * 0.5 + 2, winY + 14);
    ctx.lineTo(wx + winW * 0.5 + 2, winY + winH + 2);
    ctx.closePath();
    ctx.fill();

    // Glowing pointed pane
    ctx.fillStyle = winGlow;
    ctx.beginPath();
    ctx.moveTo(wx - winW * 0.5, winY + winH);
    ctx.lineTo(wx - winW * 0.5, winY + 14);
    ctx.lineTo(wx, winY + 1);
    ctx.lineTo(wx + winW * 0.5, winY + 14);
    ctx.lineTo(wx + winW * 0.5, winY + winH);
    ctx.closePath();
    ctx.fill();

    // Delicate muntin cross
    ctx.strokeStyle = '#2B2420';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wx, winY + 2);
    ctx.lineTo(wx, winY + winH);
    ctx.moveTo(wx - winW * 0.5, winY + winH * 0.58);
    ctx.lineTo(wx + winW * 0.5, winY + winH * 0.58);
    ctx.stroke();
  }
}

function drawHangingBanner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  emblem: 'pumpkin' | 'swirl',
  time: number,
  wind: number,
): void {
  ctx.save();
  const sway = Math.sin(time * 2.2 + x * 0.02) * 3 + wind * 0.05;

  // Pole & crossbar
  ctx.strokeStyle = '#1E2028';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(x, y + 175);
  ctx.lineTo(x, y - 16);
  ctx.moveTo(x - 42, y);
  ctx.lineTo(x + 42, y);
  ctx.stroke();

  // Spear finial
  ctx.fillStyle = '#64748B';
  ctx.beginPath();
  ctx.moveTo(x, y - 28);
  ctx.lineTo(x - 6, y - 14);
  ctx.lineTo(x + 6, y - 14);
  ctx.closePath();
  ctx.fill();

  // Dark tapered cloth pennant
  ctx.fillStyle = '#121318';
  ctx.strokeStyle = '#2A2E3B';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - 35, y + 4);
  ctx.lineTo(x + 35, y + 4);
  ctx.lineTo(x + 33 + sway * 0.6, y + 102);
  ctx.lineTo(x + sway, y + 126);
  ctx.lineTo(x - 33 + sway * 0.6, y + 102);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Emblem
  const cx = x + sway * 0.4;
  const cy = y + 58;
  if (emblem === 'pumpkin') {
    ctx.fillStyle = '#EA580C';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 20, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#65A30D';
    ctx.fillRect(cx - 2.5, cy - 22, 5, 7);
    // Jack-o-lantern eyes & grin
    ctx.fillStyle = '#121318';
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 2);
    ctx.lineTo(cx - 6, cy - 9);
    ctx.lineTo(cx - 2, cy - 2);
    ctx.moveTo(cx + 2, cy - 2);
    ctx.lineTo(cx + 6, cy - 9);
    ctx.lineTo(cx + 10, cy - 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy + 4, 10, 0.15, Math.PI - 0.15);
    ctx.fill();
  } else {
    // Swirl crest (matching right banner in reference)
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.arc(cx, cy - 2, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#E11D48';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 3.4; a += 0.25) {
      const r = a * 1.45;
      const sx = cx + Math.cos(a) * r;
      const sy = cy - 2 + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    }
    ctx.stroke();
    ctx.fillStyle = '#94A3B8';
    ctx.fillRect(cx - 2, cy + 16, 4, 14);
  }

  ctx.restore();
}

function drawCornerTorch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: 1 | -1,
  time: number,
  glowColor: string,
): void {
  ctx.save();
  const flicker = 1 + Math.sin(time * 16 + x) * 0.11;

  // Fast layered radial glow (zero per-frame gradient allocation)
  ctx.fillStyle = glowColor;
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.arc(x + dir * 8, y, 165 * flicker, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.arc(x + dir * 8, y, 85 * flicker, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Angled wall post & torch handle
  ctx.strokeStyle = '#1E2028';
  ctx.lineWidth = 9;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - dir * 32, y + 72);
  ctx.lineTo(x + dir * 8, y + 6);
  ctx.stroke();

  // Torch iron cup
  ctx.fillStyle = '#334155';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + dir * 1 - 9, y + 8);
  ctx.lineTo(x + dir * 12 + 9, y + 8);
  ctx.lineTo(x + dir * 10 + 5, y + 16);
  ctx.lineTo(x + dir * 3 - 5, y + 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Multi-layered flickering flame
  const fx = x + dir * 8;
  ctx.fillStyle = '#EA580C';
  ctx.beginPath();
  ctx.moveTo(fx - 11, y + 8);
  ctx.quadraticCurveTo(fx - 13, y - 16 * flicker, fx + dir * 3, y - 34 * flicker);
  ctx.quadraticCurveTo(fx + 14, y - 15 * flicker, fx + 11, y + 8);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#FACC15';
  ctx.beginPath();
  ctx.moveTo(fx - 6, y + 7);
  ctx.quadraticCurveTo(fx - 7, y - 8 * flicker, fx + dir * 2, y - 21 * flicker);
  ctx.quadraticCurveTo(fx + 8, y - 7 * flicker, fx + 6, y + 7);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#FEF9C3';
  ctx.beginPath();
  ctx.arc(fx, y + 2, 4.5 * flicker, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTitleTargetDummy(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.fillStyle = '#5C3A21';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.fillRect(x - 6, y - 54, 12, 54);
  ctx.strokeRect(x - 6, y - 54, 12, 54);

  ctx.fillStyle = '#FFF9EE';
  ctx.beginPath();
  ctx.ellipse(x - 4, y - 56, 20, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#E84A27';
  ctx.beginPath();
  ctx.ellipse(x - 4, y - 56, 12, 16, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FACC15';
  ctx.beginPath();
  ctx.ellipse(x - 4, y - 56, 5, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  drawArrowShape(ctx, x - 14, y - 58, 0.14, 'standard', false);
  ctx.restore();
}

function drawCavernCeiling(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#090A0F';
  ctx.beginPath();
  ctx.moveTo(-400, -200);
  ctx.lineTo(1700, -200);
  for (let x = 1700; x >= -400; x -= 85) {
    const drop = 48 + Math.abs(Math.sin(x * 0.037)) * 55;
    ctx.lineTo(x, drop);
  }
  ctx.closePath();
  ctx.fill();
}

function drawPlatform(
  ctx: CanvasRenderingContext2D,
  p: Platform,
  pal: BiomePalette,
  time: number,
): void {
  ctx.save();
  const r = 8;

  if (p.material === 'grass') {
    // Rich dark foreground earth silhouette with warm stone-moss rim
    ctx.fillStyle = pal.groundVoid;
    roundRect(ctx, p.x, p.y + 6, p.w, p.h - 6, r);
    ctx.fill();

    // Deep slate stone top ledge with mossy highlights
    ctx.fillStyle = '#2C332B';
    roundRect(ctx, p.x - 2, p.y, p.w + 4, 20, 7);
    ctx.fill();

    ctx.fillStyle = '#4B6B3C';
    roundRect(ctx, p.x + 2, p.y + 2, p.w - 4, 7, 4);
    ctx.fill();

    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    roundRect(ctx, p.x, p.y, p.w, p.h, r);
    ctx.stroke();

    // Subtle rim-lit grass tufts
    ctx.fillStyle = '#4B6B3C';
    for (let gx = p.x + 22; gx < p.x + p.w - 22; gx += 46) {
      const sway = Math.sin(time * 2.2 + gx * 0.05) * 1.6;
      ctx.beginPath();
      ctx.arc(gx + sway, p.y, 4.5, Math.PI, 0);
      ctx.fill();
    }
  } else if (p.material === 'wood') {
    if (p.h > 60) {
      ctx.fillStyle = '#231712';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.fillRect(p.x + 16, p.y + 22, 18, p.h - 22);
      ctx.strokeRect(p.x + 16, p.y + 22, 18, p.h - 22);
      ctx.fillRect(p.x + p.w - 34, p.y + 22, 18, p.h - 22);
      ctx.strokeRect(p.x + p.w - 34, p.y + 22, 18, p.h - 22);
    }

    ctx.fillStyle = '#523421';
    roundRect(ctx, p.x, p.y, p.w, Math.min(p.h, 28), 6);
    ctx.fill();
    ctx.fillStyle = '#7A4E31';
    roundRect(ctx, p.x + 4, p.y + 2, p.w - 8, 7, 3);
    ctx.fill();

    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    roundRect(ctx, p.x, p.y, p.w, Math.min(p.h, 28), 6);
    ctx.stroke();

    ctx.fillStyle = '#1E1916';
    for (let rx = p.x + 24; rx < p.x + p.w - 14; rx += 54) {
      ctx.beginPath();
      ctx.arc(rx, p.y + 14, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (p.material === 'iron') {
    ctx.fillStyle = '#2C3647';
    roundRect(ctx, p.x, p.y, p.w, p.h, 6);
    ctx.fill();
    ctx.fillStyle = '#64748B';
    roundRect(ctx, p.x + 4, p.y + 3, p.w - 8, 6, 3);
    ctx.fill();

    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    roundRect(ctx, p.x, p.y, p.w, p.h, 6);
    ctx.stroke();

    ctx.fillStyle = '#CBD5E1';
    for (let rx = p.x + 18; rx < p.x + p.w - 10; rx += 40) {
      ctx.beginPath();
      ctx.arc(rx, p.y + p.h * 0.5, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Dark dusk stone with warm lit top flagstone rim
    ctx.fillStyle = '#14161D';
    roundRect(ctx, p.x, p.y + 6, p.w, p.h - 6, r);
    ctx.fill();

    ctx.fillStyle = '#4B4E58';
    roundRect(ctx, p.x - 1, p.y, p.w + 2, 18, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(253, 230, 138, 0.22)';
    roundRect(ctx, p.x + 3, p.y + 2, p.w - 6, 5, 3);
    ctx.fill();

    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    roundRect(ctx, p.x, p.y, p.w, p.h, r);
    ctx.stroke();
  }

  ctx.restore();
}

function drawProp(ctx: CanvasRenderingContext2D, prop: ActiveProp, time: number): void {
  ctx.save();
  const flash = prop.flashTimer > 0;

  if (prop.kind === 'barrel') {
    const { x, y, w, h } = prop;
    ctx.fillStyle = flash ? '#FFFFFF' : '#DC2626';
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();

    ctx.fillStyle = flash ? '#FFFFFF' : '#1E2028';
    ctx.fillRect(x + 1, y + 7, w - 2, 6);
    ctx.fillRect(x + 1, y + h - 13, w - 2, 6);

    if (!flash) {
      ctx.fillStyle = 'rgba(255, 230, 200, 0.28)';
      ctx.fillRect(x + 5, y + 4, 7, h - 8);
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.moveTo(x + w * 0.5, y + 17);
      ctx.lineTo(x + w * 0.5 + 8, y + 25);
      ctx.lineTo(x + w * 0.5, y + 33);
      ctx.lineTo(x + w * 0.5 - 8, y + 25);
      ctx.closePath();
      ctx.fill();
    }

    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.8;
    roundRect(ctx, x, y, w, h, 8);
    ctx.stroke();
  } else if (prop.kind === 'crate' || prop.kind === 'supply_crate') {
    const { x, y, w, h } = prop;
    ctx.fillStyle = flash ? '#FFFFFF' : prop.kind === 'supply_crate' ? '#B45309' : '#6B4226';
    roundRect(ctx, x, y, w, h, 5);
    ctx.fill();

    if (!flash) {
      ctx.strokeStyle = '#3B2314';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 6);
      ctx.lineTo(x + w - 6, y + h - 6);
      ctx.moveTo(x + w - 6, y + 6);
      ctx.lineTo(x + 6, y + h - 6);
      ctx.stroke();

      if (prop.kind === 'supply_crate') {
        ctx.fillStyle = '#16A34A';
        ctx.beginPath();
        ctx.arc(x + w * 0.5, y + h * 0.5, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x + w * 0.5 - 2, y + h * 0.5 - 6, 4, 12);
        ctx.fillRect(x + w * 0.5 - 6, y + h * 0.5 - 2, 12, 4);
      }
    }

    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.8;
    roundRect(ctx, x, y, w, h, 5);
    ctx.stroke();
  } else if (prop.kind === 'pendulum') {
    if (!prop.ropeSevered) {
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(prop.x, prop.y);
      ctx.lineTo(prop.bobX, prop.bobY);
      ctx.stroke();

      const pulse = 0.85 + Math.sin(time * 5) * 0.15;
      ctx.fillStyle = '#F59E0B';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(prop.x, prop.y + 8, 8 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(prop.bobX, prop.bobY);
    ctx.rotate(prop.angle);
    ctx.fillStyle = flash ? '#FFFFFF' : '#334155';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.8;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.18) * prop.bobRadius * 0.85, Math.sin(a - 0.18) * prop.bobRadius * 0.85);
      ctx.lineTo(Math.cos(a) * (prop.bobRadius + 9), Math.sin(a) * (prop.bobRadius + 9));
      ctx.lineTo(Math.cos(a + 0.18) * prop.bobRadius * 0.85, Math.sin(a + 0.18) * prop.bobRadius * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, prop.bobRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function getArchetypeColors(arch: Actor['archetype']): { body: string; accent: string; rim: string } {
  switch (arch) {
    case 'player':
      return { body: '#0D0E12', accent: '#E11D48', rim: 'rgba(255, 224, 178, 0.45)' };
    case 'scout':
      return { body: '#0E110E', accent: '#65A30D', rim: 'rgba(226, 232, 240, 0.35)' };
    case 'sniper':
      return { body: '#120E1A', accent: '#9333EA', rim: 'rgba(216, 180, 254, 0.4)' };
    case 'shield':
      return { body: '#0D0E12', accent: '#DC2626', rim: 'rgba(254, 240, 138, 0.48)' };
    case 'bombardier':
      return { body: '#140F0C', accent: '#F59E0B', rim: 'rgba(253, 186, 116, 0.45)' };
    case 'boss':
      return { body: '#12080A', accent: '#DC2626', rim: 'rgba(252, 165, 165, 0.5)' };
  }
}

function drawStickmanActor(
  ctx: CanvasRenderingContext2D,
  actor: Actor,
  time: number,
  aimOverride: RenderContextState['aimState'] | null,
): void {
  const s = actor.archetype === 'boss' ? 1.28 : 1.0;
  const f = actor.facing;
  const colors = getArchetypeColors(actor.archetype);
  const flash = actor.flashTimer > 0;
  const fillCol = flash ? '#FFFFFF' : colors.body;

  ctx.save();
  ctx.translate(actor.x, actor.y);
  ctx.scale(actor.squashX, actor.squashY);

  // Ground contact shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 1, 20 * s, 5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  const stride = Math.sin(actor.walkPhase) * 8 * s;
  const breathe = Math.sin(time * 3.5 + actor.x * 0.01) * 1.4;

  const pelvis = { x: 0, y: -27 * s + breathe * 0.4 };
  const neck = { x: 0, y: -53 * s + breathe };
  const head = { x: 0, y: -66 * s + breathe };

  const lFoot = { x: -9 * s - stride, y: 0 };
  const rFoot = { x: 9 * s + stride, y: 0 };
  const lKnee = { x: (pelvis.x + lFoot.x) * 0.5 - f * 3 * s, y: -13 * s };
  const rKnee = { x: (pelvis.x + rFoot.x) * 0.5 + f * 3 * s, y: -13 * s };

  const aimAngle = aimOverride ? aimOverride.angle : actor.aimAngle;
  const aimPower = aimOverride
    ? aimOverride.power
    : actor.state === 'aiming'
      ? Math.min(1, 1 - actor.stateTimer / Math.max(0.1, actor.aimDuration))
      : 0.15;

  const bowHandDist = 23 * s;
  const bowHand = {
    x: neck.x + Math.cos(aimAngle) * bowHandDist,
    y: neck.y + Math.sin(aimAngle) * bowHandDist,
  };
  const pullBack = actor.state === 'aiming' || aimOverride ? 8 + aimPower * 14 : 4;
  const drawHand = {
    x: bowHand.x - Math.cos(aimAngle) * pullBack * s,
    y: bowHand.y - Math.sin(aimAngle) * pullBack * s,
  };

  // Snug red-and-white striped neck/chin gaiter (matching reference archer)
  if (actor.isPlayer) {
    const collarY = neck.y - 5 * s;
    ctx.fillStyle = flash ? '#FFFFFF' : '#F8FAFC';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    roundRect(ctx, -10.5 * s, collarY - 4 * s, 21 * s, 11 * s, 5);
    ctx.fill();
    ctx.stroke();
    if (!flash) {
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(-7 * s, collarY - 2.5 * s, 4 * s, 8 * s);
      ctx.fillRect(1 * s, collarY - 2.5 * s, 4 * s, 8 * s);
    }
  }

  // Glossy rim-lit cartoon limb drawer
  const drawBone = (ax: number, ay: number, bx: number, by: number, width: number) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // Subtle outer rim glow
    if (!flash) {
      ctx.strokeStyle = colors.rim;
      ctx.lineWidth = width + 2;
      ctx.beginPath();
      ctx.moveTo(ax + f * 1, ay - 0.8);
      ctx.lineTo(bx + f * 1, by - 0.8);
      ctx.stroke();
    }

    ctx.strokeStyle = fillCol;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
  };

  // Back leg & drawing arm
  drawBone(pelvis.x, pelvis.y, lKnee.x, lKnee.y, 6 * s);
  drawBone(lKnee.x, lKnee.y, lFoot.x, lFoot.y, 5.5 * s);

  if (actor.archetype !== 'bombardier') {
    drawBone(neck.x, neck.y + 3 * s, drawHand.x, drawHand.y, 5 * s);
  }

  // Spine / torso
  drawBone(neck.x, neck.y, pelvis.x, pelvis.y, 8 * s);

  // Front leg
  drawBone(pelvis.x, pelvis.y, rKnee.x, rKnee.y, 6 * s);
  drawBone(rKnee.x, rKnee.y, rFoot.x, rFoot.y, 5.5 * s);

  // Glossy Head with rim highlight
  if (!flash) {
    ctx.fillStyle = colors.rim;
    ctx.beginPath();
    ctx.arc(head.x + f * 1.4, head.y - 1.2, 11.8 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = fillCol;
  ctx.beginPath();
  ctx.arc(head.x, head.y, 11 * s, 0, Math.PI * 2);
  ctx.fill();

  // Archetype headgear (backwards cap + goggles, striped helmet, hood, crown)
  drawHeadgear(ctx, actor.archetype, head.x, head.y, f, s, flash, colors.accent);

  // Bow & Front Arm (or Bombardier bomb)
  if (actor.archetype === 'bombardier') {
    const handX = neck.x + f * 15 * s;
    const handY = neck.y - 4 * s;
    drawBone(neck.x, neck.y + 3 * s, handX, handY, 5 * s);
    if (actor.state === 'aiming') {
      drawBombProjectile(ctx, handX, handY - 9 * s, 0, time);
    }
  } else {
    drawBone(neck.x, neck.y + 3 * s, bowHand.x, bowHand.y, 5 * s);
    drawBow(
      ctx,
      bowHand.x,
      bowHand.y,
      drawHand.x,
      drawHand.y,
      aimAngle,
      aimPower,
      s,
      actor.state === 'aiming' || !!aimOverride,
      actor.archetype === 'boss',
    );
  }

  // Front Shield for Shield Knight / Boss
  if (actor.shieldActive) {
    const shX = f * 17 * s;
    const shY = -54 * s;
    const shW = 10 * s;
    const shH = 44 * s;
    ctx.fillStyle = flash ? '#FFFFFF' : actor.archetype === 'boss' ? '#7F1D1D' : '#475569';
    roundRect(ctx, shX - shW * 0.5, shY, shW, shH, 4);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6;
    roundRect(ctx, shX - shW * 0.5, shY, shW, shH, 4);
    ctx.stroke();
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(shX + f * 2, shY + shH * 0.5, 3.5 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // Enemy Aim Telegraph Sightline
  if (!actor.isPlayer && actor.state === 'aiming') {
    const prog = 1 - actor.stateTimer / Math.max(0.1, actor.aimDuration);
    const pulse = 0.45 + Math.sin(time * 22) * 0.35;
    ctx.save();
    ctx.strokeStyle = actor.archetype === 'sniper'
      ? `rgba(239, 68, 68, ${0.5 + prog * 0.45})`
      : `rgba(251, 146, 60, ${0.28 + prog * 0.45})`;
    ctx.lineWidth = actor.archetype === 'sniper' ? 2.2 : 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(bowHand.x, bowHand.y);
    const rayLen = actor.archetype === 'sniper' ? 320 : 110;
    ctx.lineTo(bowHand.x + Math.cos(aimAngle) * rayLen, bowHand.y + Math.sin(aimAngle) * rayLen);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = `rgba(253, 224, 71, ${pulse})`;
    ctx.beginPath();
    ctx.arc(bowHand.x, bowHand.y, (4.5 + prog * 5) * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Enemy HP Bar when wounded or boss
  if (!actor.isPlayer && (actor.hp < actor.maxHp || actor.archetype === 'boss')) {
    const bw = actor.archetype === 'boss' ? 68 : 42;
    const bh = 7;
    const bx = -bw * 0.5;
    const by = -94 * s;
    ctx.fillStyle = INK;
    roundRect(ctx, bx - 2, by - 2, bw + 4, bh + 4, 4);
    ctx.fill();
    ctx.fillStyle = '#334155';
    roundRect(ctx, bx, by, bw, bh, 3);
    ctx.fill();
    const ratio = Math.max(0, actor.hp / actor.maxHp);
    ctx.fillStyle = actor.archetype === 'boss' ? '#EF4444' : '#F97316';
    if (ratio > 0) {
      roundRect(ctx, bx, by, Math.max(4, bw * ratio), bh, 3);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawHeadgear(
  ctx: CanvasRenderingContext2D,
  arch: Actor['archetype'],
  hx: number,
  hy: number,
  f: number,
  s: number,
  flash: boolean,
  accent: string,
): void {
  if (flash) return;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;

  if (arch === 'player') {
    // Backwards red/white cap + aviator goggles (matching reference left archer!)
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(hx, hy - 3 * s, 12.2 * s, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // White front panel
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.arc(hx + f * 2 * s, hy - 3 * s, 11.5 * s, -Math.PI * 0.55, 0);
    ctx.lineTo(hx + f * 2 * s, hy - 3 * s);
    ctx.closePath();
    ctx.fill();

    // Backwards cap brim
    ctx.fillStyle = '#B91C1C';
    roundRect(ctx, hx - f * 17 * s - (f === 1 ? 0 : 8 * s), hy - 6 * s, 14 * s, 4.5 * s, 2);
    ctx.fill();
    ctx.stroke();

    // Aviator goggles
    ctx.fillStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.arc(hx + f * 6 * s, hy - 1 * s, 4.2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#38BDF8';
    ctx.beginPath();
    ctx.arc(hx + f * 6.5 * s, hy - 1 * s, 2.3 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (arch === 'scout') {
    // Red-white sporty/knight helmet or cap
    ctx.fillStyle = '#65A30D';
    ctx.beginPath();
    ctx.moveTo(hx - 12 * s, hy - 4 * s);
    ctx.lineTo(hx - f * 14 * s, hy - 17 * s);
    ctx.lineTo(hx + 11 * s, hy - 4 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.arc(hx + f * 5 * s, hy - 1 * s, 2.4 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (arch === 'sniper') {
    // Hooded cloak cowl + glowing amber eye
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(hx - f * 2 * s, hy - 1 * s, 13 * s, Math.PI * 0.7, Math.PI * 2.1);
    ctx.lineTo(hx - f * 15 * s, hy + 8 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.arc(hx + f * 5 * s, hy - 1 * s, 2.5 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (arch === 'shield') {
    // Glossy red/white crash/knight helmet with steel faceguard (matching right enemy in reference!)
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(hx, hy - 1 * s, 13 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // White racing stripe
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(hx - 3 * s, hy - 13 * s, 6 * s, 12 * s);

    // Steel faceguard bars
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx + f * 3 * s, hy + 2 * s);
    ctx.lineTo(hx + f * 13 * s, hy + 3 * s);
    ctx.lineTo(hx + f * 10 * s, hy + 10 * s);
    ctx.stroke();
  } else if (arch === 'bombardier') {
    ctx.fillStyle = '#78350F';
    roundRect(ctx, hx - 13 * s, hy - 15 * s, 26 * s, 12 * s, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#FBBF24';
    ctx.beginPath();
    ctx.arc(hx + f * 5 * s, hy - 1 * s, 2.5 * s, 0, Math.PI * 2);
    ctx.fill();
  } else if (arch === 'boss') {
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(hx - 12 * s, hy - 7 * s);
    ctx.lineTo(hx - 18 * s, hy - 24 * s);
    ctx.lineTo(hx - 5 * s, hy - 12 * s);
    ctx.lineTo(hx, hy - 22 * s);
    ctx.lineTo(hx + 5 * s, hy - 12 * s);
    ctx.lineTo(hx + 18 * s, hy - 24 * s);
    ctx.lineTo(hx + 12 * s, hy - 7 * s);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.arc(hx + f * 5 * s, hy - 1 * s, 2.8 * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBow(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  dhx: number,
  dhy: number,
  angle: number,
  power: number,
  s: number,
  nocked: boolean,
  isBoss: boolean,
): void {
  const perpX = -Math.sin(angle);
  const perpY = Math.cos(angle);
  const bowHalf = (isBoss ? 27 : 23) * s;
  const flex = (3 + power * 10) * s;

  const topX = bx + perpX * bowHalf - Math.cos(angle) * flex;
  const topY = by + perpY * bowHalf - Math.sin(angle) * flex;
  const botX = bx - perpX * bowHalf - Math.cos(angle) * flex;
  const botY = by - perpY * bowHalf - Math.sin(angle) * flex;

  // Taut bowstring
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.85)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(topX, topY);
  ctx.lineTo(nocked ? dhx : (topX + botX) * 0.5, nocked ? dhy : (topY + botY) * 0.5);
  ctx.lineTo(botX, botY);
  ctx.stroke();

  // Ornate sculpted recurve bow limbs (matching reference bone/redwood bow)
  const ctrlX = bx + Math.cos(angle) * 16 * s;
  const ctrlY = by + Math.sin(angle) * 16 * s;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(topX, topY);
  ctx.quadraticCurveTo(ctrlX, ctrlY, botX, botY);
  ctx.stroke();

  ctx.strokeStyle = isBoss ? '#DC2626' : '#C97B63';
  ctx.lineWidth = 4.6;
  ctx.stroke();

  // Specular highlight along front edge of bow
  ctx.strokeStyle = 'rgba(255, 235, 220, 0.55)';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  if (nocked) {
    const tipX = (dhx + bx) * 0.5 + Math.cos(angle) * 14;
    const tipY = (dhy + by) * 0.5 + Math.sin(angle) * 14;
    drawArrowShape(ctx, (dhx + bx) * 0.5 + Math.cos(angle) * 8, (dhy + by) * 0.5 + Math.sin(angle) * 8, angle, 'standard', false);
    // Warm nock spark glow
    ctx.fillStyle = 'rgba(253, 224, 71, 0.55)';
    ctx.beginPath();
    ctx.arc(tipX, tipY, 5.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRagdoll(ctx: CanvasRenderingContext2D, rag: RagdollBody): void {
  ctx.save();
  ctx.globalAlpha = rag.alpha;
  const colors = getArchetypeColors(rag.archetype);
  const s = rag.archetype === 'boss' ? 1.28 : 1.0;

  const bonePairs = [
    [1, 3], [3, 4],
    [2, 7], [7, 8],
    [1, 2],
    [1, 5], [5, 6],
    [2, 9], [9, 10],
  ];

  for (let i = 0; i < bonePairs.length; i++) {
    const [aIdx, bIdx] = bonePairs[i];
    const a = rag.nodes[aIdx];
    const b = rag.nodes[bIdx];
    const w = i === 4 ? 7.5 * s : 5.5 * s;

    ctx.lineCap = 'round';
    ctx.strokeStyle = colors.rim;
    ctx.lineWidth = w + 2;
    ctx.beginPath();
    ctx.moveTo(a.x + 1, a.y - 1);
    ctx.lineTo(b.x + 1, b.y - 1);
    ctx.stroke();

    ctx.strokeStyle = colors.body;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  const head = rag.nodes[0];
  ctx.fillStyle = colors.rim;
  ctx.beginPath();
  ctx.arc(head.x + 1, head.y - 1, 11.8 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.body;
  ctx.beginPath();
  ctx.arc(head.x, head.y, 11 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#FCA5A5';
  ctx.lineWidth = 2;
  const ex = head.x + rag.facing * 3 * s;
  const ey = head.y - 1 * s;
  ctx.beginPath();
  ctx.moveTo(ex - 2.5, ey - 2.5);
  ctx.lineTo(ex + 2.5, ey + 2.5);
  ctx.moveTo(ex + 2.5, ey - 2.5);
  ctx.lineTo(ex - 2.5, ey + 2.5);
  ctx.stroke();

  if (rag.hatLost) {
    ctx.save();
    ctx.translate(rag.hatX, rag.hatY);
    ctx.rotate(rag.hatRot);
    drawHeadgear(ctx, rag.archetype, 0, 8, rag.facing, s, false, colors.accent);
    ctx.restore();
  }

  ctx.restore();
}

function drawArrowShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  type: Arrow['type'],
  inFlight: boolean,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Dark sleek arrow shaft
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.lineTo(13, 0);
  ctx.stroke();

  ctx.strokeStyle = type === 'fire' ? '#FDBA74' : '#334155';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Fletching feathers
  const featherColor = type === 'fire' ? '#EF4444' : type === 'triple' ? '#38BDF8' : '#1E293B';
  ctx.fillStyle = featherColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.lineTo(-27, -5);
  ctx.lineTo(-17, -4);
  ctx.lineTo(-14, 0);
  ctx.lineTo(-17, 4);
  ctx.lineTo(-27, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glowing spark arrowhead in flight (matching reference image!)
  if (inFlight) {
    const glow = type === 'triple' ? 'rgba(56, 189, 248, 0.55)' : 'rgba(250, 204, 21, 0.65)';
    const core = type === 'triple' ? '#E0F2FE' : '#FEF9C3';
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(14, 0, type === 'fire' ? 9 : 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(14, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#CBD5E1';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(9, -4.5);
    ctx.lineTo(9, 4.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

function drawCometArrowTrail(ctx: CanvasRenderingContext2D, arrow: Arrow): void {
  if (arrow.trail.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round';
  const len = arrow.trail.length;

  // Tapered fiery outer glow streak
  for (let i = 1; i < len; i++) {
    const frac = i / len;
    ctx.strokeStyle =
      arrow.type === 'triple'
        ? `rgba(56, 189, 248, ${frac * 0.72})`
        : arrow.fromPlayer
          ? `rgba(234, 88, 12, ${frac * 0.85})`
          : `rgba(220, 38, 38, ${frac * 0.75})`;
    ctx.lineWidth = 1 + frac * 7.5;
    ctx.beginPath();
    ctx.moveTo(arrow.trail[i - 1].x, arrow.trail[i - 1].y);
    ctx.lineTo(arrow.trail[i].x, arrow.trail[i].y);
    ctx.stroke();

    // Inner bright core streak
    ctx.strokeStyle =
      arrow.type === 'triple'
        ? `rgba(224, 242, 254, ${frac * 0.85})`
        : `rgba(254, 240, 138, ${frac * 0.9})`;
    ctx.lineWidth = 0.6 + frac * 2.6;
    ctx.beginPath();
    ctx.moveTo(arrow.trail[i - 1].x, arrow.trail[i - 1].y);
    ctx.lineTo(arrow.trail[i].x, arrow.trail[i].y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBombTrail(ctx: CanvasRenderingContext2D, arrow: Arrow): void {
  if (arrow.trail.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 1; i < arrow.trail.length; i++) {
    const frac = i / arrow.trail.length;
    ctx.strokeStyle = `rgba(148, 163, 184, ${frac * 0.35})`;
    ctx.lineWidth = 4 * frac;
    ctx.beginPath();
    ctx.moveTo(arrow.trail[i - 1].x, arrow.trail[i - 1].y);
    ctx.lineTo(arrow.trail[i].x, arrow.trail[i].y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawExplosionFlash(ctx: CanvasRenderingContext2D, exp: ExplosionFlash): void {
  const prog = 1 - exp.life / exp.maxLife; // 0 -> 1
  const alpha = Math.max(0, 1 - prog);
  const r = exp.radius * (0.35 + prog * 0.78);

  ctx.save();
  ctx.translate(exp.x, exp.y);

  // Soft outer golden light wash
  const grad = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 1.45);
  grad.addColorStop(0, `rgba(254, 249, 195, ${0.88 * alpha})`);
  grad.addColorStop(0.45, `rgba(250, 204, 21, ${0.62 * alpha})`);
  grad.addColorStop(0.78, `rgba(249, 115, 22, ${0.28 * alpha})`);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.45, 0, Math.PI * 2);
  ctx.fill();

  // Crisp expanding golden shockwave arc (iconic from reference!)
  ctx.strokeStyle = `rgba(254, 240, 138, ${0.9 * alpha})`;
  ctx.lineWidth = 4 * (1 - prog * 0.5);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
  ctx.stroke();

  // Sharp radial light rays
  ctx.strokeStyle = `rgba(254, 249, 195, ${0.75 * alpha})`;
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + prog * 0.3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25);
    ctx.lineTo(Math.cos(a) * r * 1.25, Math.sin(a) * r * 1.25);
    ctx.stroke();
  }

  ctx.restore();
}

function drawBombProjectile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  time: number,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#1E293B';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const flicker = 4 + Math.sin(time * 35) * 2;
  ctx.fillStyle = '#FACC15';
  ctx.beginPath();
  ctx.arc(7, -9, flicker, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#EF4444';
  ctx.beginPath();
  ctx.arc(7, -9, flicker * 0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTrajectoryPreview(ctx: CanvasRenderingContext2D, pts: Vec2[]): void {
  ctx.save();
  for (let i = 0; i < pts.length; i++) {
    const t = 1 - i / pts.length;
    const radius = 3.8 * t + 1.5;
    ctx.fillStyle = `rgba(254, 240, 138, ${0.88 * t})`;
    ctx.strokeStyle = `rgba(10, 11, 15, ${0.85 * t})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(pts[i].x, pts[i].y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawDragIndicator(
  ctx: CanvasRenderingContext2D,
  start: Vec2,
  curr: Vec2,
  power: number,
): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.65)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(curr.x, curr.y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = 'rgba(232, 74, 39, 0.9)';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(start.x, start.y, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.font = '700 13px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FEF9C3';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  const pctText = `${Math.round(power * 100)}%`;
  ctx.strokeText(pctText, start.x, start.y - 15);
  ctx.fillText(pctText, start.x, start.y - 15);
  ctx.restore();
}

function drawParticle(ctx: CanvasRenderingContext2D, pt: Particle): void {
  const alpha = Math.max(0, pt.life / pt.maxLife);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(pt.x, pt.y);
  ctx.rotate(pt.rot);

  if (pt.kind === 'starburst') {
    ctx.fillStyle = pt.color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    const spikes = 8;
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? pt.size : pt.size * 0.45;
      const a = (i / (spikes * 2)) * Math.PI * 2;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (pt.kind === 'splinter') {
    ctx.fillStyle = pt.color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.fillRect(-pt.size, -pt.size * 0.35, pt.size * 2, pt.size * 0.7);
    ctx.strokeRect(-pt.size, -pt.size * 0.35, pt.size * 2, pt.size * 0.7);
  } else if (pt.kind === 'leaf') {
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, pt.size * 1.3, pt.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(0, 0, pt.size, 0, Math.PI * 2);
    ctx.fill();
    if (pt.outline) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawCallout(ctx: CanvasRenderingContext2D, c: FloatingCallout): void {
  const alpha = Math.min(1, (c.life / c.maxLife) * 1.6);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(c.x, c.y);
  ctx.scale(c.scale, c.scale);
  ctx.font = '700 20px "Fredoka", sans-serif';
  ctx.textAlign = 'center';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.strokeText(c.text, 0, 0);
  ctx.fillStyle = c.color;
  ctx.fillText(c.text, 0, 0);
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}
