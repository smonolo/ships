import type { Point2D, WorldSize, WorldBounds, Dock, Rock } from '../types.ts'
import { PRNG } from '../utils/prng.ts'
import { distance, pointInPolygon } from '../utils/math.ts'

const DOCK_NAMES = [
  { name: 'Northhaven', code: 'NHV' },
  { name: 'Southbay', code: 'SBY' },
  { name: 'Eastreach', code: 'ERC' },
  { name: 'Westmere', code: 'WMR' },
  { name: 'Cleargate', code: 'CGT' },
  { name: 'Amberport', code: 'AMB' },
]

const MAP_SIZE: Record<
  WorldSize,
  { w: number; h: number; docks: number; rocks: number }
> = {
  S: { w: 3200, h: 2200, docks: 3, rocks: 14 },
  M: { w: 4800, h: 3200, docks: 4, rocks: 22 },
  L: { w: 7000, h: 4600, docks: 5, rocks: 34 },
  XL: { w: 10500, h: 6800, docks: 6, rocks: 48 },
  XXL: { w: 15500, h: 10000, docks: 8, rocks: 70 },
}

export class World {
  public seed: number | string = 12345
  public size: WorldSize = 'M'
  public bounds: WorldBounds = { minX: 0, maxX: 4800, minY: 0, maxY: 3200 }
  public docks: Dock[] = []
  public rocks: Rock[] = []

  constructor(seed: number | string = 12345, size: WorldSize = 'M') {
    this.generate(seed, size)
  }

  public generate(seed: number | string, size: WorldSize = 'M'): void {
    this.seed = seed
    this.size = size
    this.docks = []
    this.rocks = []

    const dims = MAP_SIZE[size]
    const pad = 200
    this.bounds = {
      minX: pad,
      maxX: dims.w - pad,
      minY: pad,
      maxY: dims.h - pad,
    }

    const prng = new PRNG(seed)
    this.placeRocks(prng, dims.rocks)
    this.placeDocks(prng, dims.docks)
  }

  private placeRocks(prng: PRNG, count: number): void {
    const b = this.bounds
    let attempts = 0

    while (this.rocks.length < count && attempts < count * 40) {
      attempts++
      const cx = prng.range(b.minX + 180, b.maxX - 180)
      const cy = prng.range(b.minY + 180, b.maxY - 180)
      const radius = prng.range(55, 160)

      if (
        this.rocks.some(
          r => distance(cx, cy, r.cx, r.cy) < r.radius + radius + 80
        )
      ) {
        continue
      }

      const verts = prng.rangeInt(5, 8)
      const points: Point2D[] = []

      for (let i = 0; i < verts; i++) {
        const a = (i / verts) * Math.PI * 2 + prng.range(-0.2, 0.2)
        const rr = radius * prng.range(0.65, 1.1)
        points.push({
          x: cx + Math.cos(a) * rr,
          y: cy + Math.sin(a) * rr,
        })
      }

      this.rocks.push({ points, cx, cy, radius })
    }
  }

  private placeDocks(prng: PRNG, count: number): void {
    const b = this.bounds
    const margin = 320
    let attempts = 0

    while (this.docks.length < count && attempts < count * 50) {
      attempts++
      const edge = prng.rangeInt(0, 3)
      let x = 0
      let y = 0
      let angle = 0

      if (edge === 0) {
        x = prng.range(b.minX + margin, b.maxX - margin)
        y = b.minY + 90
        angle = Math.PI / 2
      } else if (edge === 1) {
        x = prng.range(b.minX + margin, b.maxX - margin)
        y = b.maxY - 90
        angle = -Math.PI / 2
      } else if (edge === 2) {
        x = b.minX + 90
        y = prng.range(b.minY + margin, b.maxY - margin)
        angle = 0
      } else {
        x = b.maxX - 90
        y = prng.range(b.minY + margin, b.maxY - margin)
        angle = Math.PI
      }

      if (this.rocks.some(r => distance(x, y, r.cx, r.cy) < r.radius + 220)) {
        continue
      }

      if (this.docks.some(d => distance(x, y, d.x, d.y) < 420)) {
        continue
      }

      const meta = DOCK_NAMES[this.docks.length % DOCK_NAMES.length]
      this.docks.push({
        id: `dock-${this.docks.length}`,
        name: meta.name,
        code: meta.code,
        x,
        y,
        angle,
        length: 140,
        width: 36,
      })
    }
  }

  public spawnPose(): { x: number; y: number; heading: number } {
    const dock = this.docks[0]
    if (!dock) {
      const b = this.bounds
      return {
        x: (b.minX + b.maxX) / 2,
        y: (b.minY + b.maxY) / 2,
        heading: 0,
      }
    }

    const clear = 120
    return {
      x: dock.x + Math.cos(dock.angle) * clear,
      y: dock.y + Math.sin(dock.angle) * clear,
      heading: dock.angle,
    }
  }

  public hitsRock(x: number, y: number, radius: number): Rock | null {
    for (const rock of this.rocks) {
      if (distance(x, y, rock.cx, rock.cy) > rock.radius + radius + 20) {
        continue
      }

      if (pointInPolygon(x, y, rock.points)) {
        return rock
      }

      for (let i = 0; i < rock.points.length; i++) {
        const a = rock.points[i]
        const b = rock.points[(i + 1) % rock.points.length]
        if (distToSegment(x, y, a.x, a.y, b.x, b.y) < radius) {
          return rock
        }
      }
    }

    return null
  }

  public clampInside(x: number, y: number): Point2D {
    const b = this.bounds
    return {
      x: Math.max(b.minX, Math.min(b.maxX, x)),
      y: Math.max(b.minY, Math.min(b.maxY, y)),
    }
  }
}

function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1
  const dy = y2 - y1
  const len2 = dx * dx + dy * dy || 1
  let t = ((px - x1) * dx + (py - y1) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}
