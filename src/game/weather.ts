import { WORLD_HEIGHT, WORLD_WIDTH } from './levels';
import { BiomeId, Platform } from './types';

export type WeatherKind =
  | 'leaves'
  | 'dust'
  | 'rain'
  | 'spores'
  | 'embers'
  | 'snow'
  | 'fireflies'
  | 'lightning';

export interface BiomeWeatherProfile {
  kind: WeatherKind;
  activeCount: number;
  baseVy: number;
  windScale: number;
  swayAmp: number;
  swayFreq: number;
  colors: string[];
  alpha: number;
  hazeColor: string | null;
}

export interface WeatherParticle {
  x: number;
  y: number;
  speedMult: number;
  size: number;
  rot: number;
  vRot: number;
  phase: number;
  colorIdx: number;
  splashTimer: number;
  splashX: number;
  splashY: number;
}

export interface WeatherPool {
  biome: BiomeId;
  particles: WeatherParticle[];
}

export const MAX_WEATHER_PARTICLES = 72;
const MARGIN_X = 120;
const MARGIN_Y = 80;

const PROFILES: Record<BiomeId, BiomeWeatherProfile> = {
  meadow: {
    kind: 'leaves',
    activeCount: 28,
    baseVy: 46,
    windScale: 1.15,
    swayAmp: 36,
    swayFreq: 1.8,
    colors: ['#7BD65E', '#A3E635', '#FBBF24', '#F59E0B'],
    alpha: 0.72,
    hazeColor: null,
  },
  canyon: {
    kind: 'dust',
    activeCount: 40,
    baseVy: 22,
    windScale: 2.1,
    swayAmp: 16,
    swayFreq: 2.4,
    colors: ['#FDE68A', '#FDBA74', '#E7C08A'],
    alpha: 0.42,
    hazeColor: 'rgba(252, 211, 145, 0.06)',
  },
  fortress: {
    kind: 'rain',
    activeCount: 68,
    baseVy: 540,
    windScale: 1.85,
    swayAmp: 0,
    swayFreq: 0,
    colors: ['#E0F2FE', '#BAE6FD'],
    alpha: 0.44,
    hazeColor: 'rgba(148, 163, 184, 0.07)',
  },
  cavern: {
    kind: 'spores',
    activeCount: 34,
    baseVy: 16,
    windScale: 0.45,
    swayAmp: 22,
    swayFreq: 1.1,
    colors: ['#7CE8C8', '#A7F3D0', '#93C5FD'],
    alpha: 0.55,
    hazeColor: 'rgba(30, 41, 59, 0.08)',
  },
  citadel: {
    kind: 'embers',
    activeCount: 44,
    baseVy: -42, // Embers rise gently!
    windScale: 1.25,
    swayAmp: 28,
    swayFreq: 2.2,
    colors: ['#FB923C', '#FACC15', '#F87171'],
    alpha: 0.65,
    hazeColor: 'rgba(153, 27, 27, 0.06)',
  },
  glacier: {
    kind: 'snow',
    activeCount: 56,
    baseVy: 68,
    windScale: 1.45,
    swayAmp: 34,
    swayFreq: 1.6,
    colors: ['#F8FAFC', '#E0F2FE', '#BAE6FD'],
    alpha: 0.78,
    hazeColor: 'rgba(186, 230, 253, 0.06)',
  },
  swamp: {
    kind: 'fireflies',
    activeCount: 38,
    baseVy: -12,
    windScale: 0.6,
    swayAmp: 42,
    swayFreq: 2.0,
    colors: ['#D9F99D', '#A3E635', '#FDE047'],
    alpha: 0.74,
    hazeColor: 'rgba(20, 83, 45, 0.08)',
  },
  storm: {
    kind: 'lightning',
    activeCount: 72,
    baseVy: 660,
    windScale: 2.2,
    swayAmp: 0,
    swayFreq: 0,
    colors: ['#C4B5FD', '#E0F2FE', '#93C5FD'],
    alpha: 0.52,
    hazeColor: 'rgba(49, 46, 129, 0.09)',
  },
};

export function getBiomeWeatherProfile(biome: BiomeId): BiomeWeatherProfile {
  return PROFILES[biome];
}

export function createWeatherPool(biome: BiomeId = 'meadow'): WeatherPool {
  const particles: WeatherParticle[] = [];
  for (let i = 0; i < MAX_WEATHER_PARTICLES; i++) {
    // Deterministic spread on init so first frame looks naturally populated
    const seedA = ((i * 73) % 100) / 100;
    const seedB = ((i * 37) % 100) / 100;
    const seedC = ((i * 19) % 100) / 100;
    particles.push({
      x: -MARGIN_X + seedA * (WORLD_WIDTH + MARGIN_X * 2),
      y: -MARGIN_Y + seedB * (WORLD_HEIGHT + MARGIN_Y * 2),
      speedMult: 0.78 + seedC * 0.48,
      size: 3 + (i % 4) * 1.15,
      rot: seedA * Math.PI * 2,
      vRot: ((i % 2 === 0 ? 1 : -1) * (1.2 + seedB * 2.2)),
      phase: i * 0.83,
      colorIdx: i,
      splashTimer: 0,
      splashX: 0,
      splashY: 0,
    });
  }
  return { biome, particles };
}

export function stepWeatherPool(
  pool: WeatherPool,
  biome: BiomeId,
  wind: number,
  time: number,
  dt: number,
  platforms: Platform[],
): void {
  if (pool.biome !== biome) {
    pool.biome = biome;
    for (const p of pool.particles) {
      p.splashTimer = 0;
    }
  }

  const profile = PROFILES[biome];
  const count = Math.min(profile.activeCount, pool.particles.length);
  const minX = -MARGIN_X;
  const maxX = WORLD_WIDTH + MARGIN_X;
  const minY = -MARGIN_Y;
  const maxY = WORLD_HEIGHT + MARGIN_Y;
  const spanX = maxX - minX;
  const spanY = maxY - minY;

  for (let i = 0; i < count; i++) {
    const pt = pool.particles[i];

    if (pt.splashTimer > 0) {
      pt.splashTimer = Math.max(0, pt.splashTimer - dt);
    }

    const sway =
      profile.swayAmp > 0
        ? Math.sin(time * profile.swayFreq + pt.phase) * profile.swayAmp
        : 0;

    // Canyon & meadow still drift slightly even when wind is 0
    const baseDriftX =
      profile.kind === 'dust' ? 45 : profile.kind === 'leaves' ? 14 : 0;

    const vx = (wind * profile.windScale + baseDriftX + sway) * pt.speedMult;
    const vy = profile.baseVy * pt.speedMult;

    const prevY = pt.y;
    pt.x += vx * dt;
    pt.y += vy * dt;
    pt.rot += pt.vRot * dt;

    // Rain droplet splash against top of platforms
    if ((profile.kind === 'rain' || profile.kind === 'lightning') && vy > 0) {
      for (let j = 0; j < platforms.length; j++) {
        const plat = platforms[j];
        if (
          pt.x >= plat.x &&
          pt.x <= plat.x + plat.w &&
          prevY <= plat.y &&
          pt.y >= plat.y
        ) {
          pt.splashTimer = 0.22;
          pt.splashX = pt.x;
          pt.splashY = plat.y;
          pt.y = minY + ((i * 23) % 40);
          break;
        }
      }
    }

    // Wrap smoothly around padded world bounds
    if (pt.x < minX) pt.x += spanX;
    else if (pt.x > maxX) pt.x -= spanX;

    if (pt.y > maxY) {
      pt.y -= spanY;
    } else if (pt.y < minY) {
      pt.y += spanY;
    }
  }
}

export function renderWeatherOverlay(
  ctx: CanvasRenderingContext2D,
  pool: WeatherPool,
  wind: number,
  time: number,
  cssW: number,
  cssH: number,
  scale: number,
  offsetX: number,
  offsetY: number,
): void {
  const profile = PROFILES[pool.biome];
  const count = Math.min(profile.activeCount, pool.particles.length);

  ctx.save();

  // Optional ultra-subtle biome atmosphere veil
  if (profile.hazeColor) {
    ctx.fillStyle = profile.hazeColor;
    ctx.fillRect(0, 0, cssW, cssH);
  }

  // Draw weather particles in logical world space so they match wind & platforms
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  if (profile.kind === 'rain' || profile.kind === 'lightning') {
    const rainVx = wind * profile.windScale;
    const rainVy = profile.baseVy;
    const len = 18;
    const mag = Math.hypot(rainVx, rainVy) || 1;
    const dx = (rainVx / mag) * len;
    const dy = (rainVy / mag) * len;

    ctx.lineCap = 'round';
    for (let i = 0; i < count; i++) {
      const pt = pool.particles[i];
      ctx.globalAlpha = profile.alpha * (0.65 + (i % 3) * 0.15);
      ctx.strokeStyle = profile.colors[pt.colorIdx % profile.colors.length];
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      ctx.moveTo(pt.x, pt.y);
      ctx.lineTo(pt.x - dx * pt.speedMult, pt.y - dy * pt.speedMult);
      ctx.stroke();

      if (pt.splashTimer > 0) {
        const t = 1 - pt.splashTimer / 0.22;
        ctx.globalAlpha = (1 - t) * 0.55;
        ctx.strokeStyle = '#E0F2FE';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(pt.splashX, pt.splashY, 3 + t * 9, 1.5 + t * 2.5, 0, Math.PI, 0);
        ctx.stroke();
      }
    }
  } else if (profile.kind === 'leaves') {
    for (let i = 0; i < count; i++) {
      const pt = pool.particles[i];
      const col = profile.colors[pt.colorIdx % profile.colors.length];
      ctx.save();
      ctx.globalAlpha = profile.alpha;
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.rot + Math.sin(time * 2.5 + pt.phase) * 0.45);
      ctx.fillStyle = col;
      ctx.strokeStyle = 'rgba(30, 25, 22, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, pt.size * 1.45, pt.size * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  } else if (profile.kind === 'dust') {
    ctx.lineCap = 'round';
    for (let i = 0; i < count; i++) {
      const pt = pool.particles[i];
      const col = profile.colors[pt.colorIdx % profile.colors.length];
      ctx.globalAlpha = profile.alpha * (0.6 + (i % 3) * 0.18);
      if (i % 3 === 0) {
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x - (14 + pt.size * 2), pt.y - 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else {
    // Spores (cavern) & Embers (citadel)
    for (let i = 0; i < count; i++) {
      const pt = pool.particles[i];
      const col = profile.colors[pt.colorIdx % profile.colors.length];
      const pulse = 0.72 + Math.sin(time * 4 + pt.phase) * 0.28;
      ctx.globalAlpha = profile.alpha * pulse;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
