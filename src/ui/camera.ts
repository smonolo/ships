import { clamp } from '../utils/math.ts'
import type { WorldBounds } from '../types.ts'

export class Camera {
  public x = 0
  public y = 0
  public targetX = 0
  public targetY = 0
  public zoom = 0.85
  public targetZoom = 0.85
  public isDragging = 0
  public isUserPanning = false
  public minZoom = 0.25
  public maxZoom = 2.2
  public worldBounds: WorldBounds = {
    minX: 0,
    maxX: 4800,
    minY: 0,
    maxY: 3200,
  }

  private dragStartX = 0
  private dragStartY = 0

  public setWorldBounds(bounds: WorldBounds): void {
    this.worldBounds = { ...bounds }
    this.clampTarget()
  }

  private clampTarget(): void {
    this.targetX = clamp(
      this.targetX,
      this.worldBounds.minX,
      this.worldBounds.maxX
    )
    this.targetY = clamp(
      this.targetY,
      this.worldBounds.minY,
      this.worldBounds.maxY
    )
  }

  public centerOn(x: number, y: number): void {
    this.isUserPanning = false
    this.targetX = x
    this.targetY = y
    this.x = x
    this.y = y
    this.clampTarget()
  }

  public follow(tx: number, ty: number): void {
    if (!this.isUserPanning) {
      this.targetX = tx
      this.targetY = ty
      this.clampTarget()
    }
  }

  public update(dt: number): void {
    const factor = 1 - Math.exp(-8 * dt)
    this.x += (this.targetX - this.x) * factor
    this.y += (this.targetY - this.y) * factor
    this.zoom += (this.targetZoom - this.zoom) * (1 - Math.exp(-10 * dt))
  }

  public applyTransform(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    ctx.translate(width / 2, height / 2)
    ctx.scale(this.zoom, this.zoom)
    ctx.translate(-this.x, -this.y)
  }

  public onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.isDragging = 1
      this.dragStartX = e.clientX
      this.dragStartY = e.clientY
    }
  }

  public onMouseMove(e: MouseEvent): void {
    if (this.isDragging !== 1) return
    const dx = (e.clientX - this.dragStartX) / this.zoom
    const dy = (e.clientY - this.dragStartY) / this.zoom
    if (Math.hypot(dx, dy) > 4) this.isUserPanning = true
    this.targetX -= dx
    this.targetY -= dy
    this.clampTarget()
    this.dragStartX = e.clientX
    this.dragStartY = e.clientY
  }

  public onMouseUp(): void {
    this.isDragging = 0
  }

  public onWheel(e: WheelEvent): void {
    e.preventDefault()
    let dy = e.deltaY
    if (e.deltaMode === 1) dy *= 18
    else if (e.deltaMode === 2) dy *= 60
    const clampedDy = clamp(dy, -100, 100)
    const zoomDelta = Math.exp(-clampedDy * 0.0012)
    this.targetZoom = clamp(
      this.targetZoom * zoomDelta,
      this.minZoom,
      this.maxZoom
    )
  }
}
