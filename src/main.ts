import { World } from './core/world.ts'
import { Vessel } from './core/vessel.ts'
import { Camera } from './ui/camera.ts'
import { Hud } from './ui/hud.ts'
import {
  loadWorldConfig,
  saveWorldConfig,
  loadShipClass,
} from './utils/config.ts'
import type { WorldSize } from './types.ts'
import './style.css'

class ShipsGame {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private world: World
  private vessel: Vessel
  private camera: Camera
  private hud: Hud
  private lastTime = 0

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement
    this.ctx = this.canvas.getContext('2d')!

    const cfg = loadWorldConfig()
    saveWorldConfig(cfg)

    this.world = new World(cfg.seed, cfg.size)
    this.vessel = new Vessel()
    this.vessel.setClass(loadShipClass())
    this.camera = new Camera()
    this.camera.setWorldBounds(this.world.bounds)

    this.spawn()
    this.hud = new Hud(this.vessel, this.world, (size, seed) => {
      this.regenerate(size, seed)
    })

    this.resize()
    this.bindCamera()
    window.addEventListener('resize', () => this.resize())
    window.addEventListener('keydown', e => {
      if (e.code === 'KeyC') {
        this.camera.centerOn(this.vessel.x, this.vessel.y)
      }
    })

    requestAnimationFrame(t => this.frame(t))
  }

  private spawn(): void {
    const pose = this.world.spawnPose()
    this.vessel.spawnAt(pose.x, pose.y, pose.heading)
    this.camera.centerOn(this.vessel.x, this.vessel.y)
  }

  private regenerate(size: WorldSize, seed?: number | string): void {
    const cfg = loadWorldConfig()
    const nextSeed = seed ?? cfg.seed
    saveWorldConfig({ seed: nextSeed, size })
    this.world.generate(nextSeed, size)
    this.camera.setWorldBounds(this.world.bounds)
    this.spawn()
    this.hud.rebind(this.vessel, this.world)
  }

  private resize(): void {
    this.canvas.width = window.innerWidth * devicePixelRatio
    this.canvas.height = window.innerHeight * devicePixelRatio
    this.canvas.style.width = `${window.innerWidth}px`
    this.canvas.style.height = `${window.innerHeight}px`
  }

  private bindCamera(): void {
    const container = document.getElementById('canvas-container')!

    container.addEventListener('mousedown', e => {
      if ((e.target as HTMLElement).closest('#hud-overlay, .modal-backdrop')) {
        return
      }
      this.camera.onMouseDown(e)
    })
    window.addEventListener('mousemove', e => this.camera.onMouseMove(e))
    window.addEventListener('mouseup', () => this.camera.onMouseUp())
    container.addEventListener(
      'wheel',
      e => {
        if (
          (e.target as HTMLElement).closest('#hud-overlay, .modal-backdrop')
        ) {
          return
        }
        this.camera.onWheel(e)
      },
      { passive: false }
    )
  }

  private frame(time: number): void {
    const dt = Math.min(0.05, (time - this.lastTime) / 1000 || 0.016)
    this.lastTime = time

    this.vessel.update(dt, this.world)
    this.camera.follow(this.vessel.x, this.vessel.y)
    this.camera.update(dt)
    this.hud.update()
    this.draw()

    requestAnimationFrame(t => this.frame(t))
  }

  private draw(): void {
    const ctx = this.ctx
    const dpr = devicePixelRatio
    const cssW = this.canvas.width / dpr
    const cssH = this.canvas.height / dpr

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)
    ctx.fillStyle = '#0c1824'
    ctx.fillRect(0, 0, cssW, cssH)

    ctx.save()
    this.camera.applyTransform(ctx, cssW, cssH)

    this.drawWater(ctx)
    this.drawRocks(ctx)
    this.drawDocks(ctx)
    this.vessel.draw(ctx)
    this.drawCartouche(ctx)

    ctx.restore()
  }

  private drawWater(ctx: CanvasRenderingContext2D): void {
    const b = this.world.bounds
    ctx.fillStyle = '#143552'
    ctx.fillRect(
      b.minX - 200,
      b.minY - 200,
      b.maxX - b.minX + 400,
      b.maxY - b.minY + 400
    )

    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    const step = 200
    for (let x = b.minX; x <= b.maxX; x += step) {
      ctx.beginPath()
      ctx.moveTo(x, b.minY)
      ctx.lineTo(x, b.maxY)
      ctx.stroke()
    }
    for (let y = b.minY; y <= b.maxY; y += step) {
      ctx.beginPath()
      ctx.moveTo(b.minX, y)
      ctx.lineTo(b.maxX, y)
      ctx.stroke()
    }
  }

  private drawRocks(ctx: CanvasRenderingContext2D): void {
    for (const rock of this.world.rocks) {
      if (rock.points.length < 3) continue
      ctx.beginPath()
      ctx.moveTo(rock.points[0].x, rock.points[0].y)
      for (let i = 1; i < rock.points.length; i++) {
        ctx.lineTo(rock.points[i].x, rock.points[i].y)
      }
      ctx.closePath()
      ctx.fillStyle = '#2a3038'
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
  }

  private drawDocks(ctx: CanvasRenderingContext2D): void {
    for (const dock of this.world.docks) {
      ctx.save()
      ctx.translate(dock.x, dock.y)
      ctx.rotate(dock.angle)

      ctx.fillStyle = '#3f3f46'
      ctx.fillRect(
        -dock.length * 0.15,
        -dock.width / 2,
        dock.length,
        dock.width
      )
      ctx.fillStyle = '#27272a'
      ctx.fillRect(
        -dock.length * 0.15,
        -dock.width / 2 - 10,
        18,
        dock.width + 20
      )

      ctx.restore()

      ctx.save()
      ctx.translate(
        dock.x - Math.cos(dock.angle) * 28,
        dock.y - Math.sin(dock.angle) * 28
      )
      ctx.fillStyle = 'rgba(18,18,22,0.88)'
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(-34, -16, 68, 32, 8)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#ffffff'
      ctx.font = '600 11px Geist, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(dock.code, 0, -2)
      ctx.fillStyle = '#a3a3a3'
      ctx.font = '400 9px Geist, sans-serif'
      ctx.fillText(dock.name, 0, 10)
      ctx.restore()
    }
  }

  private drawCartouche(ctx: CanvasRenderingContext2D): void {
    const b = this.world.bounds
    const x = b.minX + 24
    const y = b.minY + 24

    ctx.fillStyle = 'rgba(18,18,22,0.82)'
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(x, y, 200, 78, 10)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = '600 13px Geist, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('SHIPS', x + 14, y + 24)
    ctx.fillStyle = '#008cff'
    ctx.font = '500 10px Geist Mono, monospace'
    ctx.fillText('CHART', x + 68, y + 24)
    ctx.fillStyle = '#a3a3a3'
    ctx.font = '400 10px Geist Mono, monospace'
    ctx.fillText(`SIZE   ${this.world.size}`, x + 14, y + 48)
    ctx.fillText(`SEED   ${this.world.seed}`, x + 14, y + 66)
  }
}

new ShipsGame()
