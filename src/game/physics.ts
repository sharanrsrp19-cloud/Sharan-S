import {
  Actor,
  Arrow,
  HitZone,
  Platform,
  RagdollBody,
  RagdollConstraint,
  RagdollNode,
  Vec2,
} from './types';

export const GRAVITY = 880;
export const MAX_LAUNCH_SPEED = 1140;
export const MIN_DRAG_PX = 14;
export const MAX_DRAG_PX = 175;
export const AIR_DRAG = 0.04;

// Stickman anatomical constants relative to feet (x, y)
export const STICKMAN_HEIGHT = 76;
export const HEAD_OFFSET_Y = -66;
export const HEAD_RADIUS = 11.5;
export const TORSO_TOP_Y = -54;
export const TORSO_BOT_Y = -26;
export const TORSO_RADIUS = 11;
export const LEGS_BOT_Y = 0;

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Converts slingshot drag vector (start - current) into arrow launch velocity & normalized power [0, 1].
 */
export function computeLaunchVelocity(
  pullDx: number,
  pullDy: number,
  maxSpeed: number = MAX_LAUNCH_SPEED,
): { vx: number; vy: number; power: number; angle: number } {
  const dist = Math.hypot(pullDx, pullDy);
  if (dist < MIN_DRAG_PX) {
    return { vx: 0, vy: 0, power: 0, angle: 0 };
  }
  const effectiveDist = clamp(dist, MIN_DRAG_PX, MAX_DRAG_PX);
  const power = (effectiveDist - MIN_DRAG_PX) / (MAX_DRAG_PX - MIN_DRAG_PX);
  // Minimum 25% power on valid release so short pulls still feel crisp
  const scaledPower = 0.22 + power * 0.78;
  const speed = scaledPower * maxSpeed;
  const angle = Math.atan2(pullDy, pullDx);
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    power: scaledPower,
    angle,
  };
}

/**
 * Steps a single arrow using exact symplectic Euler integration with wind & subtle aerodynamic drag.
 */
export function stepArrowPhysics(
  arrow: Pick<Arrow, 'x' | 'y' | 'prevX' | 'prevY' | 'vx' | 'vy' | 'angle' | 'age' | 'isBomb'>,
  windX: number,
  gravity: number,
  dt: number,
): void {
  arrow.prevX = arrow.x;
  arrow.prevY = arrow.y;
  const drag = arrow.isBomb ? AIR_DRAG * 0.5 : AIR_DRAG;
  const windFactor = arrow.isBomb ? 0.35 : 1.0;

  arrow.vx += (windX * windFactor - arrow.vx * drag) * dt;
  arrow.vy += (gravity - arrow.vy * drag) * dt;

  arrow.x += arrow.vx * dt;
  arrow.y += arrow.vy * dt;
  arrow.age += dt;
  if (!arrow.isBomb) {
    arrow.angle = Math.atan2(arrow.vy, arrow.vx);
  } else {
    arrow.angle += 6.5 * dt;
  }
}

/**
 * Generates trajectory preview dots matching stepArrowPhysics integration.
 */
export function predictTrajectory(
  startX: number,
  startY: number,
  vx: number,
  vy: number,
  windX: number,
  gravity: number,
  steps: number = 14,
  stepDt: number = 0.032,
): Vec2[] {
  const pts: Vec2[] = [];
  const sim = {
    x: startX,
    y: startY,
    prevX: startX,
    prevY: startY,
    vx,
    vy,
    angle: Math.atan2(vy, vx),
    age: 0,
    isBomb: false,
  };
  for (let i = 0; i < steps; i++) {
    stepArrowPhysics(sim, windX, gravity, stepDt);
    pts.push({ x: sim.x, y: sim.y });
  }
  return pts;
}

/**
 * Solves an accurate launch angle & effective speed in y-down coordinates,
 * compensating for gravity, air drag, wind acceleration, and intervening platforms.
 */
export function solveBallisticAimAngle(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  baseSpeed: number,
  windX: number,
  gravity: number,
  highArc: boolean = false,
  jitter: number = 0,
  platforms: Platform[] = [],
  isBomb: boolean = false,
): { angle: number; speed: number } {
  const dx = tx - sx;
  const dy = ty - sy;
  const D = Math.max(1, Math.abs(dx));
  const dir = dx >= 0 ? 1 : -1;

  // Guarantee sufficient speed to reach (tx, ty) even across full arena spans
  const vMinSq = gravity * (dy + Math.hypot(D, dy));
  const vMin = vMinSq > 0 ? Math.sqrt(vMinSq) : 400;
  const speed = Math.max(baseSpeed, vMin * 1.18);
  const v2 = speed * speed;

  const solveAnalytical = (targetY: number, useHigh: boolean): number => {
    const tDy = targetY - sy;
    const underRoot = v2 * v2 - gravity * (gravity * D * D - 2 * tDy * v2);
    if (underRoot < 0) {
      return dir > 0 ? -0.65 : Math.PI + 0.65;
    }
    const root = Math.sqrt(underRoot);
    const u = clamp(
      useHigh ? (v2 + root) / (gravity * D) : (v2 - root) / (gravity * D),
      -0.45,
      3.5,
    );
    const phi = Math.atan(u);
    return dir > 0 ? -phi : Math.PI + phi;
  };

  let useHigh = highArc;
  let aimTargetY = ty;
  let bestAngle = solveAnalytical(aimTargetY, useHigh);

  for (let iter = 0; iter < 7; iter++) {
    const angle = solveAnalytical(aimTargetY, useHigh);
    bestAngle = angle;

    const startX = sx + Math.cos(angle) * 20;
    const startY = sy + Math.sin(angle) * 20;
    const sim = {
      x: startX,
      y: startY,
      prevX: startX,
      prevY: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle,
      age: 0,
      isBomb,
    };

    let blocked = false;
    let yAtTarget: number | null = null;

    for (let step = 0; step < 220; step++) {
      stepArrowPhysics(sim, windX, gravity, 0.016);

      // Ignore the first few pixels right at muzzle so shooter doesn't self-clip
      if (step >= 3 && platforms.length > 0) {
        for (let p = 0; p < platforms.length; p++) {
          const plat = platforms[p];
          const hit = segmentRectIntersect(
            sim.prevX,
            sim.prevY,
            sim.x,
            sim.y,
            plat.x,
            plat.y,
            plat.w,
            plat.h,
          );
          if (hit) {
            blocked = true;
            break;
          }
        }
        if (blocked) break;
      }

      const crossed = dir > 0 ? sim.x >= tx : sim.x <= tx;
      if (crossed) {
        const segDx = sim.x - sim.prevX;
        const frac = Math.abs(segDx) > 1e-6 ? clamp((tx - sim.prevX) / segDx, 0, 1) : 1;
        yAtTarget = sim.prevY + (sim.y - sim.prevY) * frac;
        break;
      }
      if (sim.y > 900) break;
    }

    if (blocked && !useHigh) {
      // Switch to lobbed arc to clear intermediate cliff/pillar
      useHigh = true;
      aimTargetY = ty;
      continue;
    }

    if (yAtTarget !== null) {
      const errY = yAtTarget - ty;
      if (Math.abs(errY) < 1.5) break;
      aimTargetY -= errY * 0.85;
    } else {
      break;
    }
  }

  return { angle: bestAngle + jitter, speed };
}

/**
 * Swept line-segment vs circle intersection returning earliest t in [0, 1] or null.
 */
export function segmentCircleIntersect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  cx: number,
  cy: number,
  r: number,
): { t: number; hitX: number; hitY: number } | null {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const fx = x1 - cx;
  const fy = y1 - cy;

  const a = dx * dx + dy * dy;
  if (a < 1e-8) {
    if (fx * fx + fy * fy <= r * r) {
      return { t: 0, hitX: x1, hitY: y1 };
    }
    return null;
  }

  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;

  const sqrtDisc = Math.sqrt(disc);
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);

  if (t1 >= 0 && t1 <= 1) {
    return { t: t1, hitX: x1 + t1 * dx, hitY: y1 + t1 * dy };
  }
  if (t1 < 0 && t2 >= 0) {
    // Segment started inside circle
    return { t: 0, hitX: x1, hitY: y1 };
  }
  return null;
}

/**
 * Swept line-segment vs AABB intersection using slab method. Returns hit fraction t and surface normal.
 */
export function segmentRectIntersect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): { t: number; hitX: number; hitY: number; nx: number; ny: number } | null {
  const dx = x2 - x1;
  const dy = y2 - y1;

  let tMin = 0;
  let tMax = 1;
  let nx = 0;
  let ny = 0;

  // X slab
  if (Math.abs(dx) < 1e-8) {
    if (x1 < rx || x1 > rx + rw) return null;
  } else {
    const invDx = 1 / dx;
    let t1 = (rx - x1) * invDx;
    let t2 = (rx + rw - x1) * invDx;
    let sign = -1;
    if (t1 > t2) {
      [t1, t2] = [t2, t1];
      sign = 1;
    }
    if (t1 > tMin) {
      tMin = t1;
      nx = sign;
      ny = 0;
    }
    if (t2 < tMax) tMax = t2;
    if (tMin > tMax) return null;
  }

  // Y slab
  if (Math.abs(dy) < 1e-8) {
    if (y1 < ry || y1 > ry + rh) return null;
  } else {
    const invDy = 1 / dy;
    let t1 = (ry - y1) * invDy;
    let t2 = (ry + rh - y1) * invDy;
    let sign = -1;
    if (t1 > t2) {
      [t1, t2] = [t2, t1];
      sign = 1;
    }
    if (t1 > tMin) {
      tMin = t1;
      nx = 0;
      ny = sign;
    }
    if (t2 < tMax) tMax = t2;
    if (tMin > tMax) return null;
  }

  return {
    t: tMin,
    hitX: x1 + tMin * dx,
    hitY: y1 + tMin * dy,
    nx,
    ny,
  };
}

/**
 * Evaluates swept arrow hit against an actor's front shield, head, torso, and limbs.
 */
export function evaluateHitZone(
  arrow: Pick<Arrow, 'prevX' | 'prevY' | 'x' | 'y' | 'vx' | 'vy' | 'type'>,
  actor: Pick<Actor, 'x' | 'y' | 'facing' | 'shieldActive' | 'archetype'>,
): { zone: HitZone; damageMultiplier: number; isCrit: boolean; hitX: number; hitY: number; t: number } {
  const isBoss = actor.archetype === 'boss';
  const scale = isBoss ? 1.28 : 1.0;

  let bestT = 2;
  let bestZone: HitZone = 'none';
  let bestX = arrow.x;
  let bestY = arrow.y;

  // 1. Check front shield first if active (shield guards torso/chest from frontal projectiles)
  if (actor.shieldActive) {
    const shieldX = actor.x + actor.facing * 17 * scale;
    const shieldTop = actor.y - 54 * scale;
    const shieldW = 10 * scale;
    const shieldH = 44 * scale;
    const shieldHit = segmentRectIntersect(
      arrow.prevX,
      arrow.prevY,
      arrow.x,
      arrow.y,
      shieldX - shieldW * 0.5,
      shieldTop,
      shieldW,
      shieldH,
    );
    // Shield only blocks arrows traveling toward the actor's front face (or downward angled into shield face)
    const hittingFromFront = arrow.vx * actor.facing < 0;
    if (shieldHit && hittingFromFront && shieldHit.t < bestT) {
      bestT = shieldHit.t;
      bestZone = 'shield';
      bestX = shieldHit.hitX;
      bestY = shieldHit.hitY;
    }
  }

  // 2. Head circle (highest priority if unblocked, e.g., high arc over shield!)
  const headHit = segmentCircleIntersect(
    arrow.prevX,
    arrow.prevY,
    arrow.x,
    arrow.y,
    actor.x,
    actor.y + HEAD_OFFSET_Y * scale,
    HEAD_RADIUS * scale,
  );
  if (headHit && headHit.t < bestT) {
    bestT = headHit.t;
    bestZone = 'head';
    bestX = headHit.hitX;
    bestY = headHit.hitY;
  }

  // 3. Torso box
  const torsoW = 20 * scale;
  const torsoHit = segmentRectIntersect(
    arrow.prevX,
    arrow.prevY,
    arrow.x,
    arrow.y,
    actor.x - torsoW * 0.5,
    actor.y + TORSO_TOP_Y * scale,
    torsoW,
    (TORSO_BOT_Y - TORSO_TOP_Y) * scale,
  );
  if (torsoHit && torsoHit.t < bestT) {
    bestT = torsoHit.t;
    bestZone = 'torso';
    bestX = torsoHit.hitX;
    bestY = torsoHit.hitY;
  }

  // 4. Legs box
  const legsW = 22 * scale;
  const legsHit = segmentRectIntersect(
    arrow.prevX,
    arrow.prevY,
    arrow.x,
    arrow.y,
    actor.x - legsW * 0.5,
    actor.y + TORSO_BOT_Y * scale,
    legsW,
    Math.abs(TORSO_BOT_Y) * scale,
  );
  if (legsHit && legsHit.t < bestT) {
    bestT = legsHit.t;
    bestZone = 'limb';
    bestX = legsHit.hitX;
    bestY = legsHit.hitY;
  }

  if (bestZone === 'none') {
    return { zone: 'none', damageMultiplier: 0, isCrit: false, hitX: arrow.x, hitY: arrow.y, t: 1 };
  }

  const multMap: Record<HitZone, number> = {
    head: 2.2,
    torso: 1.0,
    limb: 0.65,
    shield: 0,
    none: 0,
  };

  return {
    zone: bestZone,
    damageMultiplier: multMap[bestZone],
    isCrit: bestZone === 'head',
    hitX: bestX,
    hitY: bestY,
    t: bestT,
  };
}

/**
 * Reflects velocity vector off a surface normal with restitution.
 */
export function reflectVelocity(
  vx: number,
  vy: number,
  nx: number,
  ny: number,
  restitution: number = 0.78,
): Vec2 {
  const dot = vx * nx + vy * ny;
  return {
    x: (vx - 2 * dot * nx) * restitution,
    y: (vy - 2 * dot * ny) * restitution,
  };
}

/**
 * Node indices for articulated stickman ragdoll:
 * 0: head, 1: neck, 2: pelvis,
 * 3: lElbow, 4: lHand, 5: rElbow, 6: rHand,
 * 7: lKnee, 8: lFoot, 9: rKnee, 10: rFoot
 */
export function createRagdoll(
  id: string,
  x: number,
  y: number,
  facing: 1 | -1,
  isPlayer: boolean,
  archetype: RagdollBody['archetype'],
  impulseX: number,
  impulseY: number,
  hitZone: HitZone,
  hatLost: boolean,
): RagdollBody {
  const s = archetype === 'boss' ? 1.28 : 1.0;
  const f = facing;

  const restCoords: Vec2[] = [
    { x: x, y: y - 66 * s }, // 0 head
    { x: x, y: y - 53 * s }, // 1 neck
    { x: x, y: y - 27 * s }, // 2 pelvis
    { x: x - f * 12 * s, y: y - 42 * s }, // 3 lElbow
    { x: x - f * 18 * s, y: y - 30 * s }, // 4 lHand
    { x: x + f * 13 * s, y: y - 44 * s }, // 5 rElbow
    { x: x + f * 22 * s, y: y - 34 * s }, // 6 rHand
    { x: x - f * 8 * s, y: y - 13 * s }, // 7 lKnee
    { x: x - f * 12 * s, y: y }, // 8 lFoot
    { x: x + f * 8 * s, y: y - 13 * s }, // 9 rKnee
    { x: x + f * 12 * s, y: y }, // 10 rFoot
  ];

  // Apply localized knockback weighted by hitZone
  const nodes: RagdollNode[] = restCoords.map((pt, idx) => {
    let weight = 0.55;
    if (hitZone === 'head' && (idx === 0 || idx === 1)) weight = 1.35;
    else if (hitZone === 'torso' && (idx === 1 || idx === 2)) weight = 1.15;
    else if (hitZone === 'limb' && idx >= 7) weight = 1.25;
    else if (hitZone === 'none') weight = 1.0; // explosion

    const dtStep = 0.016;
    return {
      x: pt.x,
      y: pt.y,
      oldX: pt.x - impulseX * weight * dtStep,
      oldY: pt.y - (impulseY * weight - 55) * dtStep,
    };
  });

  const link = (a: number, b: number): RagdollConstraint => ({
    a,
    b,
    length: Math.hypot(restCoords[a].x - restCoords[b].x, restCoords[a].y - restCoords[b].y),
  });

  const constraints: RagdollConstraint[] = [
    link(0, 1), // head-neck
    link(1, 2), // spine
    link(1, 3), // l upper arm
    link(3, 4), // l forearm
    link(1, 5), // r upper arm
    link(5, 6), // r forearm
    link(2, 7), // l thigh
    link(7, 8), // l shin
    link(2, 9), // r thigh
    link(9, 10), // r shin
    // Cross-brace to prevent unnatural accordion collapse
    { a: 0, b: 2, length: Math.hypot(restCoords[0].x - restCoords[2].x, restCoords[0].y - restCoords[2].y) },
  ];

  return {
    id,
    isPlayer,
    archetype,
    facing,
    nodes,
    constraints,
    age: 0,
    alpha: 1,
    hatX: x,
    hatY: y - 75 * s,
    hatVx: impulseX * 0.8 + (Math.random() - 0.5) * 90,
    hatVy: impulseY * 0.7 - 180,
    hatRot: 0,
    hatVRot: (impulseX >= 0 ? 1 : -1) * 7.5,
    hatLost,
  };
}

/**
 * Integrates Verlet ragdoll nodes, solves bone constraints, and resolves platform collisions.
 */
export function stepRagdoll(
  body: RagdollBody,
  platforms: Platform[],
  gravity: number,
  dt: number,
): void {
  body.age += dt;
  const damping = 0.992;
  const gravStep = gravity * dt * dt;

  for (const n of body.nodes) {
    const vx = clamp((n.x - n.oldX) * damping, -24, 24);
    const vy = clamp((n.y - n.oldY) * damping, -24, 24);
    n.oldX = n.x;
    n.oldY = n.y;
    n.x += vx;
    n.y += vy + gravStep;
  }

  // Solve constraints iteratively
  for (let iter = 0; iter < 5; iter++) {
    for (const c of body.constraints) {
      const na = body.nodes[c.a];
      const nb = body.nodes[c.b];
      const dx = nb.x - na.x;
      const dy = nb.y - na.y;
      const dist = Math.hypot(dx, dy) || 0.0001;
      const diff = (dist - c.length) / dist;
      const offsetX = dx * diff * 0.5;
      const offsetY = dy * diff * 0.5;
      na.x += offsetX;
      na.y += offsetY;
      nb.x -= offsetX;
      nb.y -= offsetY;
    }

    // Platform & floor collisions
    for (let i = 0; i < body.nodes.length; i++) {
      const n = body.nodes[i];
      const radius = i === 0 ? 10 : 4;
      for (const p of platforms) {
        if (
          n.x + radius > p.x &&
          n.x - radius < p.x + p.w &&
          n.y + radius > p.y &&
          n.y - radius < p.y + p.h
        ) {
          const overlapTop = n.y + radius - p.y;
          const overlapLeft = n.x + radius - p.x;
          const overlapRight = p.x + p.w - (n.x - radius);
          if (overlapTop <= overlapLeft && overlapTop <= overlapRight && overlapTop < 32) {
            n.y = p.y - radius;
            // Friction on ground contact
            const vx = (n.x - n.oldX) * 0.72;
            n.oldX = n.x - vx;
          } else if (overlapLeft < overlapRight) {
            n.x = p.x - radius;
          } else {
            n.x = p.x + p.w + radius;
          }
        }
      }
      // World bottom floor safety catch
      if (n.y > 760) {
        n.y = 760;
      }
    }
  }

  // Animate flying hat/helmet
  if (body.hatLost) {
    body.hatVy += gravity * dt;
    body.hatX += body.hatVx * dt;
    body.hatY += body.hatVy * dt;
    body.hatRot += body.hatVRot * dt;
    for (const p of platforms) {
      if (body.hatX > p.x && body.hatX < p.x + p.w && body.hatY >= p.y - 6 && body.hatY <= p.y + 18 && body.hatVy > 0) {
        body.hatY = p.y - 6;
        body.hatVy *= -0.35;
        body.hatVx *= 0.65;
        body.hatVRot *= 0.4;
      }
    }
  }
}

export function calculateStars(accuracy: number, hpRemainingRatio: number, won: boolean): number {
  if (!won) return 0;
  let stars = 1;
  if (hpRemainingRatio >= 0.5) stars++;
  if (accuracy >= 0.45 && hpRemainingRatio >= 0.7) stars++;
  return Math.min(3, stars);
}

export function calculateHitScore(zone: HitZone, combo: number, isKill: boolean): number {
  const base = zone === 'head' ? 150 : zone === 'torso' ? 80 : 50;
  const killBonus = isKill ? 75 : 0;
  const mult = 1 + Math.min(combo, 6) * 0.25;
  return Math.round((base + killBonus) * mult);
}
