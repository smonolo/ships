import type { ShipClass, WorldSize, WarningAlert } from '../types.ts'
import type { Vessel } from '../core/vessel.ts'
import type { World } from '../core/world.ts'
import { clamp } from '../utils/math.ts'
import { saveShipClass, saveWorldConfig } from '../utils/config.ts'

export class Hud {
  private vessel: Vessel
  private world: World
  private onRegenerate: (size: WorldSize, seed?: number | string) => void
  private keysPressed: Record<string, boolean> = {}
  private activeAlert: WarningAlert | null = null

  private speedNumEl: HTMLElement
  private headingEl: HTMLElement
  private dockEl: HTMLElement
  private throttleFillEl: HTMLElement
  private throttleHandleEl: HTMLElement
  private rudderFillEl: HTMLElement
  private rudderHandleEl: HTMLElement
  private warningBanner: HTMLElement
  private warningTitle: HTMLElement
  private warningDesc: HTMLElement
  private warningReset: HTMLElement
  private shipCard: HTMLElement
  private worldCard: HTMLElement
  private helpCard: HTMLElement

  constructor(
    vessel: Vessel,
    world: World,
    onRegenerate: (size: WorldSize, seed?: number | string) => void
  ) {
    this.vessel = vessel
    this.world = world
    this.onRegenerate = onRegenerate

    this.speedNumEl = document.getElementById('hud-speed-num')!
    this.headingEl = document.getElementById('hud-heading')!
    this.dockEl = document.getElementById('hud-dock')!
    this.throttleFillEl = document.getElementById('throttle-bar-fill')!
    this.throttleHandleEl = document.getElementById('throttle-handle')!
    this.rudderFillEl = document.getElementById('rudder-bar-fill')!
    this.rudderHandleEl = document.getElementById('rudder-handle')!
    this.warningBanner = document.getElementById('warning-banner')!
    this.warningTitle = document.getElementById('warning-title')!
    this.warningDesc = document.getElementById('warning-desc')!
    this.warningReset = document.getElementById('warning-reset-btn')!
    this.shipCard = document.getElementById('ship-config-card')!
    this.worldCard = document.getElementById('world-config-card')!
    this.helpCard = document.getElementById('controls-modal')!

    this.bindUi()
    this.bindKeys()
    this.bindLevers()
    this.syncShipButtons()
    this.syncWorldButtons()
  }

  public rebind(vessel: Vessel, world: World): void {
    this.vessel = vessel
    this.world = world
    this.syncShipButtons()
    this.syncWorldButtons()
    this.clearAlert()
  }

  private bindUi(): void {
    document
      .getElementById('btn-toggle-ship-config')
      ?.addEventListener('click', () => {
        this.shipCard.classList.toggle('hidden')
        this.worldCard.classList.add('hidden')
      })
    document
      .getElementById('btn-toggle-world-config')
      ?.addEventListener('click', () => {
        this.worldCard.classList.toggle('hidden')
        this.shipCard.classList.add('hidden')
      })
    document
      .getElementById('btn-top-controls')
      ?.addEventListener('click', () => {
        this.helpCard.classList.toggle('hidden')
      })
    document
      .getElementById('btn-close-ship-config')
      ?.addEventListener('click', () => {
        this.shipCard.classList.add('hidden')
      })
    document
      .getElementById('btn-close-world-config')
      ?.addEventListener('click', () => {
        this.worldCard.classList.add('hidden')
      })
    document
      .getElementById('btn-close-controls')
      ?.addEventListener('click', () => {
        this.helpCard.classList.add('hidden')
      })
    document.getElementById('btn-eb')?.addEventListener('click', () => {
      this.vessel.targetThrottle = 0
      this.vessel.speedKnots = 0
    })
    this.warningReset.addEventListener('click', () => {
      this.vessel.resetCrash(this.world)
      this.clearAlert()
    })

    const setClass = (cls: ShipClass) => {
      this.vessel.setClass(cls)
      saveShipClass(cls)
      this.syncShipButtons()
    }

    document
      .getElementById('btn-type-ferry')
      ?.addEventListener('click', () => setClass('ferry'))
    document
      .getElementById('btn-type-cargo')
      ?.addEventListener('click', () => setClass('cargo'))
    document
      .getElementById('btn-type-container')
      ?.addEventListener('click', () => setClass('container'))

    document.querySelectorAll('[data-size]').forEach(el => {
      el.addEventListener('click', () => {
        const size = (el as HTMLElement).dataset.size as WorldSize
        saveWorldConfig({ seed: this.world.seed, size })
        this.onRegenerate(size)
      })
    })

    document
      .getElementById('btn-world-regenerate')
      ?.addEventListener('click', () => {
        const seed = Math.floor(Math.random() * 900000) + 100000
        saveWorldConfig({ seed, size: this.world.size })
        this.onRegenerate(this.world.size, seed)
      })

    document
      .getElementById('btn-seed-random')
      ?.addEventListener('click', () => {
        const seed = Math.floor(Math.random() * 900000) + 100000
        const input = document.getElementById('seed-input') as HTMLInputElement
        if (input) input.value = String(seed)
      })

    document.getElementById('btn-apply-seed')?.addEventListener('click', () => {
      const input = document.getElementById('seed-input') as HTMLInputElement
      const raw = input?.value?.trim() || String(this.world.seed)
      const seed = isNaN(Number(raw)) ? raw : Number(raw)
      saveWorldConfig({ seed, size: this.world.size })
      this.onRegenerate(this.world.size, seed)
    })
  }

  private bindKeys(): void {
    window.addEventListener('keydown', e => {
      this.keysPressed[e.code] = true
      const isRepeat = e.repeat

      if (e.code === 'KeyC') return
      if (e.code === 'KeyH') this.helpCard.classList.toggle('hidden')
      if (e.code === 'KeyT') {
        this.shipCard.classList.toggle('hidden')
        this.worldCard.classList.add('hidden')
      }
      if (e.code === 'KeyG') {
        const seed = Math.floor(Math.random() * 900000) + 100000
        saveWorldConfig({ seed, size: this.world.size })
        this.onRegenerate(this.world.size, seed)
      }

      if (this.vessel.crashed) {
        if (e.code === 'KeyR' || e.code === 'Space') {
          this.vessel.resetCrash(this.world)
          this.clearAlert()
        }
        return
      }

      if (!isRepeat) {
        if (e.code === 'KeyW' || e.code === 'ArrowUp') {
          this.vessel.targetThrottle = clamp(
            +(this.vessel.targetThrottle + 0.01).toFixed(2),
            0,
            1
          )
        } else if (e.code === 'KeyS' || e.code === 'ArrowDown') {
          this.vessel.targetThrottle = clamp(
            +(this.vessel.targetThrottle - 0.01).toFixed(2),
            0,
            1
          )
        } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
          this.vessel.targetRudder = clamp(
            +(this.vessel.targetRudder - 0.05).toFixed(2),
            -1,
            1
          )
        } else if (e.code === 'KeyD' || e.code === 'ArrowRight') {
          this.vessel.targetRudder = clamp(
            +(this.vessel.targetRudder + 0.05).toFixed(2),
            -1,
            1
          )
        } else if (e.code === 'KeyX') {
          this.vessel.targetThrottle = 0
          this.vessel.speedKnots = 0
        }
      }
    })

    window.addEventListener('keyup', e => {
      this.keysPressed[e.code] = false
      if (
        e.code === 'KeyA' ||
        e.code === 'KeyD' ||
        e.code === 'ArrowLeft' ||
        e.code === 'ArrowRight'
      ) {
        if (
          !this.keysPressed['KeyA'] &&
          !this.keysPressed['KeyD'] &&
          !this.keysPressed['ArrowLeft'] &&
          !this.keysPressed['ArrowRight']
        ) {
          this.vessel.targetRudder = 0
        }
      }
    })

    setInterval(() => {
      if (this.vessel.crashed) return
      const fineStep = 0.01

      if (this.keysPressed['KeyW'] || this.keysPressed['ArrowUp']) {
        this.vessel.targetThrottle = clamp(
          +(this.vessel.targetThrottle + fineStep).toFixed(2),
          0,
          1
        )
      }
      if (this.keysPressed['KeyS'] || this.keysPressed['ArrowDown']) {
        this.vessel.targetThrottle = clamp(
          +(this.vessel.targetThrottle - fineStep).toFixed(2),
          0,
          1
        )
      }
      if (this.keysPressed['KeyA'] || this.keysPressed['ArrowLeft']) {
        this.vessel.targetRudder = clamp(
          +(this.vessel.targetRudder - 0.04).toFixed(2),
          -1,
          1
        )
      }
      if (this.keysPressed['KeyD'] || this.keysPressed['ArrowRight']) {
        this.vessel.targetRudder = clamp(
          +(this.vessel.targetRudder + 0.04).toFixed(2),
          -1,
          1
        )
      }
    }, 40)
  }

  private bindLevers(): void {
    this.bindVerticalLever('throttle-track', v => {
      this.vessel.targetThrottle = v
    })
    this.bindVerticalLever(
      'rudder-track',
      v => {
        this.vessel.targetRudder = v * 2 - 1
      },
      true
    )
  }

  private bindVerticalLever(
    trackId: string,
    onValue: (v: number) => void,
    centered = false
  ): void {
    const track = document.getElementById(trackId)
    if (!track) return

    const read = (clientY: number) => {
      const rect = track.getBoundingClientRect()
      const t = clamp(1 - (clientY - rect.top) / rect.height, 0, 1)
      onValue(centered ? t : t)
    }

    const onDown = (e: PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      track.setPointerCapture(e.pointerId)
      read(e.clientY)
    }

    track.addEventListener('pointerdown', onDown)
    track.addEventListener('pointermove', e => {
      if (!track.hasPointerCapture(e.pointerId)) return
      read(e.clientY)
    })
    track.addEventListener('pointerup', e => {
      if (centered) this.vessel.targetRudder = 0
      track.releasePointerCapture(e.pointerId)
    })
  }

  private syncShipButtons(): void {
    ;(['ferry', 'cargo', 'container'] as ShipClass[]).forEach(cls => {
      document
        .getElementById(`btn-type-${cls}`)
        ?.classList.toggle('active', this.vessel.shipClass === cls)
    })
    const meta = document.getElementById('ship-meta')
    if (meta) {
      const s = this.vessel.stats
      meta.textContent = `${s.label} · ${s.length} m · ${s.maxKnots} kn`
    }
  }

  private syncWorldButtons(): void {
    document.querySelectorAll('[data-size]').forEach(el => {
      el.classList.toggle(
        'active',
        (el as HTMLElement).dataset.size === this.world.size
      )
    })
    const input = document.getElementById(
      'seed-input'
    ) as HTMLInputElement | null
    if (input) input.value = String(this.world.seed)
  }

  public showAlert(alert: WarningAlert): void {
    this.activeAlert = alert
    this.warningBanner.classList.remove('hidden')
    this.warningTitle.textContent = alert.title
    this.warningDesc.textContent = alert.message
    this.warningReset.classList.toggle('hidden', !alert.canReset)
  }

  public clearAlert(): void {
    this.activeAlert = null
    this.warningBanner.classList.add('hidden')
  }

  public update(): void {
    this.speedNumEl.textContent = String(this.vessel.speedDisplay)
    const deg = ((this.vessel.heading * 180) / Math.PI + 360) % 360
    this.headingEl.textContent = `${deg.toFixed(0).padStart(3, '0')}°`

    let nearest = this.world.docks[0]
    let best = Infinity
    for (const d of this.world.docks) {
      const dist = Math.hypot(d.x - this.vessel.x, d.y - this.vessel.y)
      if (dist < best) {
        best = dist
        nearest = d
      }
    }
    this.dockEl.textContent = nearest
      ? `${nearest.code} · ${Math.round(best)} m`
      : '—'

    const thr = Math.round(this.vessel.targetThrottle * 100)
    this.throttleFillEl.style.height = `${thr}%`
    this.throttleHandleEl.style.bottom = `${thr}%`

    const rudPct = Math.round(((this.vessel.targetRudder + 1) / 2) * 100)
    this.rudderFillEl.style.height = `${Math.abs(this.vessel.targetRudder) * 50}%`
    this.rudderFillEl.style.bottom =
      this.vessel.targetRudder >= 0
        ? '50%'
        : `${50 - Math.abs(this.vessel.targetRudder) * 50}%`
    this.rudderHandleEl.style.bottom = `${rudPct}%`

    if (this.vessel.crashed) {
      if (!this.activeAlert) {
        this.showAlert({
          type: 'danger',
          title: 'Collision',
          message:
            this.vessel.crashReason ||
            'Hull contact. Press R to respawn at dock.',
          canReset: true,
        })
      }
    } else if (this.activeAlert) {
      this.clearAlert()
    }
  }
}
