import type { ShipClass } from '../types.ts'
import { clamp, normalizeAngle } from '../utils/math.ts'
import type { World } from './world.ts'

export interface ShipStats {
  label: string
  length: number
  beam: number
  maxKnots: number
  accel: number
  turnRate: number
}

const STATS: Record<ShipClass, ShipStats> = {
  ferry: {
    label: 'Coastal Ferry',
    length: 72,
    beam: 16,
    maxKnots: 24,
    accel: 3.2,
    turnRate: 0.9,
  },
  cargo: {
    label: 'Bulk Carrier',
    length: 96,
    beam: 18,
    maxKnots: 15,
    accel: 1.5,
    turnRate: 0.45,
  },
  container: {
    label: 'Container Liner',
    length: 110,
    beam: 20,
    maxKnots: 22,
    accel: 2.2,
    turnRate: 0.55,
  },
}

export class Vessel {
  public shipClass: ShipClass = 'ferry'
  public x = 0
  public y = 0
  public heading = 0
  public speedKnots = 0
  public throttle = 0
  public rudder = 0
  public targetThrottle = 0
  public targetRudder = 0
  public crashed = false
  public crashReason: string | null = null

  public get stats(): ShipStats {
    return STATS[this.shipClass]
  }

  public get speedDisplay(): number {
    return Math.round(Math.abs(this.speedKnots))
  }

  public setClass(shipClass: ShipClass): void {
    this.shipClass = shipClass
  }

  public spawnAt(x: number, y: number, heading: number): void {
    this.x = x
    this.y = y
    this.heading = heading
    this.speedKnots = 0
    this.throttle = 0
    this.targetThrottle = 0
    this.rudder = 0
    this.targetRudder = 0
    this.crashed = false
    this.crashReason = null
  }

  public update(dt: number, world: World): void {
    if (this.crashed) {
      this.speedKnots = 0
      this.targetThrottle = 0
      this.throttle = 0
      return
    }

    this.throttle += clamp(
      this.targetThrottle - this.throttle,
      -2.2 * dt,
      2.2 * dt
    )
    this.rudder += clamp(this.targetRudder - this.rudder, -3.5 * dt, 3.5 * dt)

    const desired = this.throttle * this.stats.maxKnots
    const accel = this.stats.accel

    if (this.speedKnots < desired) {
      this.speedKnots = Math.min(desired, this.speedKnots + accel * dt)
    } else {
      this.speedKnots = Math.max(desired, this.speedKnots - accel * 1.6 * dt)
    }

    const speedFactor = clamp(Math.abs(this.speedKnots) / 12, 0.2, 1)
    this.heading = normalizeAngle(
      this.heading + this.rudder * this.stats.turnRate * speedFactor * dt
    )

    const step = this.speedKnots * 0.55 * dt
    const nx = this.x + Math.cos(this.heading) * step
    const ny = this.y + Math.sin(this.heading) * step
    const hitRadius = this.stats.beam * 0.35
    const hit = world.hitsRock(nx, ny, hitRadius)

    if (hit) {
      this.crashed = true
      this.crashReason = 'Hull contact with rock'
      this.speedKnots = 0
      return
    }

    const clamped = world.clampInside(nx, ny)
    this.x = clamped.x
    this.y = clamped.y

    if (clamped.x !== nx || clamped.y !== ny) {
      this.speedKnots *= 0.4
    }
  }

  public resetCrash(world: World): void {
    const pose = world.spawnPose()
    this.spawnAt(pose.x, pose.y, pose.heading)
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.heading)

    const w = this.stats.length
    const h = this.stats.beam

    if (this.throttle > 0.05 && this.speedKnots > 1) {
      this.renderLightBeam(ctx, w / 2, 1)
    }

    if (this.shipClass === 'container') {
      this.renderContainer(ctx, w, h)
    } else if (this.shipClass === 'cargo') {
      this.renderCargo(ctx, w, h)
    } else {
      this.renderFerry(ctx, w, h)
    }

    this.renderLampPair(ctx, w / 2 - 1.5, true)
    this.renderLampPair(ctx, -w / 2 + 1.5, false)

    if (this.crashed) {
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 2.5
      this.drawRoundedRect(ctx, -w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 5)
      ctx.stroke()
    }

    ctx.restore()
  }

  private renderFerry(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ): void {
    ctx.fillStyle = '#ffffff'
    this.drawRoundedRect(ctx, -w / 2, -h / 2, w, h, 4)
    ctx.fill()

    ctx.fillStyle = '#121215'
    ctx.fillRect(w / 2 - 10, -h / 2 + 3, 4, h - 6)

    const numWindows = 4
    const winW = 6
    const winH = 2.5
    const spacing = 11
    const startX = -((numWindows - 1) * spacing) / 2

    for (let i = 0; i < numWindows; i++) {
      const wx = startX + i * spacing
      ctx.fillRect(wx - winW / 2, -h / 2 + 3.5, winW, winH)
      ctx.fillRect(wx - winW / 2, h / 2 - 3.5 - winH, winW, winH)
    }

    ctx.strokeStyle = '#008cff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(-w / 2 + 8, h / 2 - 2)
    ctx.lineTo(w / 2 - 12, h / 2 - 2)
    ctx.stroke()
  }

  private renderCargo(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ): void {
    ctx.fillStyle = '#ffffff'
    this.drawRoundedRect(ctx, -w / 2, -h / 2, w, h, 3)
    ctx.fill()

    ctx.fillStyle = '#121215'
    ctx.fillRect(w / 2 - 12, -h / 2 + 3, 3, h - 6)
    ctx.fillRect(-w / 2 + 6, -h / 2 + 3.5, 3, h - 7)

    ctx.fillStyle = '#1e1e28'
    const holdW = 16
    const gap = 8
    const holds = 3
    const total = holds * holdW + (holds - 1) * gap
    let hx = -total / 2

    for (let i = 0; i < holds; i++) {
      ctx.fillRect(hx, -h / 2 + 4, holdW, h - 8)
      hx += holdW + gap
    }
  }

  private renderContainer(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ): void {
    const noseStart = w / 2 - 14

    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.moveTo(-w / 2, -h / 2)
    ctx.lineTo(noseStart, -h / 2)
    ctx.bezierCurveTo(noseStart + 7, -h / 2, w / 2, -h / 2 + 5, w / 2, 0)
    ctx.bezierCurveTo(w / 2, h / 2 - 5, noseStart + 7, h / 2, noseStart, h / 2)
    ctx.lineTo(-w / 2, h / 2)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = '#121215'
    ctx.beginPath()
    ctx.moveTo(noseStart + 1, -h / 2 + 2.5)
    ctx.bezierCurveTo(noseStart + 5, -h / 2 + 2.5, w / 2 - 4, -4, w / 2 - 4, 0)
    ctx.bezierCurveTo(
      w / 2 - 4,
      4,
      noseStart + 5,
      h / 2 - 2.5,
      noseStart + 1,
      h / 2 - 2.5
    )
    ctx.quadraticCurveTo(noseStart + 3, 0, noseStart + 1, -h / 2 + 2.5)
    ctx.fill()

    ctx.strokeStyle = '#008cff'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(-w / 2, h / 2 - 2)
    ctx.lineTo(noseStart - 2, h / 2 - 2)
    ctx.stroke()

    ctx.fillStyle = '#f97316'
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(-w / 2 + 8 + i * 14, -h / 2 + 4, 11, h - 8)
    }
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
  }

  private renderLightBeam(
    ctx: CanvasRenderingContext2D,
    originX: number,
    direction: 1 | -1
  ): void {
    const beamLen = 90
    const endX = originX + beamLen * direction
    const grad = ctx.createLinearGradient(originX, 0, endX, 0)
    grad.addColorStop(0, 'rgba(255, 255, 245, 0.18)')
    grad.addColorStop(0.35, 'rgba(255, 255, 245, 0.08)')
    grad.addColorStop(1, 'rgba(255, 255, 245, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(originX, -5)
    ctx.lineTo(endX, -16)
    ctx.lineTo(endX, 16)
    ctx.lineTo(originX, 5)
    ctx.closePath()
    ctx.fill()
  }

  private renderLampPair(
    ctx: CanvasRenderingContext2D,
    x: number,
    isWhite: boolean
  ): void {
    const halo = isWhite ? 'rgba(255,255,255,0.25)' : 'rgba(239,68,68,0.3)'
    const core = isWhite ? '#ffffff' : '#ef4444'
    ctx.fillStyle = halo
    ctx.beginPath()
    ctx.arc(x, -3.6, 2.1, 0, Math.PI * 2)
    ctx.arc(x, 3.6, 2.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = core
    ctx.beginPath()
    ctx.arc(x, -3.6, 1.2, 0, Math.PI * 2)
    ctx.arc(x, 3.6, 1.2, 0, Math.PI * 2)
    ctx.fill()
  }
}
