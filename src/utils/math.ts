import type { Point2D } from '../types.ts'

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function distance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.hypot(x2 - x1, y2 - y1)
}

export function normalizeAngle(angle: number): number {
  let a = angle

  while (a > Math.PI) a -= 2 * Math.PI
  while (a < -Math.PI) a += 2 * Math.PI

  return a
}

export function angleDiff(fromAngle: number, toAngle: number): number {
  return normalizeAngle(toAngle - fromAngle)
}

export function lerpAngle(a: number, b: number, t: number): number {
  return a + angleDiff(a, b) * t
}

export function catmullRom2D(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  t: number
): Point2D {
  const t2 = t * t
  const t3 = t2 * t
  const f0 = -0.5 * t3 + t2 - 0.5 * t
  const f1 = 1.5 * t3 - 2.5 * t2 + 1.0
  const f2 = -1.5 * t3 + 2.0 * t2 + 0.5 * t
  const f3 = 0.5 * t3 - 0.5 * t2

  return {
    x: p0.x * f0 + p1.x * f1 + p2.x * f2 + p3.x * f3,
    y: p0.y * f0 + p1.y * f1 + p2.y * f2 + p3.y * f3,
  }
}

export function pointInPolygon(x: number, y: number, poly: Point2D[]): boolean {
  let inside = false

  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x
    const yi = poly[i].y
    const xj = poly[j].x
    const yj = poly[j].y
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi

    if (intersect) inside = !inside
  }

  return inside
}
