import type { WorldSize, ShipClass } from '../types.ts'

export interface WorldConfig {
  seed: number | string
  size: WorldSize
}

export function loadWorldConfig(): WorldConfig {
  const urlParams = new URLSearchParams(window.location.search)
  const urlSeed = urlParams.get('seed')
  const urlSize = urlParams.get('size') as WorldSize | null
  const storedSeed = localStorage.getItem('ships_seed')
  const storedSize = localStorage.getItem('ships_size') as WorldSize | null

  let seed: number | string

  if (urlSeed && urlSeed.trim().length > 0) {
    seed = isNaN(Number(urlSeed)) ? urlSeed.trim() : Number(urlSeed)
  } else if (storedSeed && storedSeed.trim().length > 0) {
    seed = isNaN(Number(storedSeed)) ? storedSeed.trim() : Number(storedSeed)
  } else {
    seed = Math.floor(Math.random() * 900000) + 100000
  }

  let size: WorldSize = 'M'

  if (urlSize && ['S', 'M', 'L', 'XL', 'XXL'].includes(urlSize)) {
    size = urlSize
  } else if (storedSize && ['S', 'M', 'L', 'XL', 'XXL'].includes(storedSize)) {
    size = storedSize
  }

  return { seed, size }
}

export function saveWorldConfig(config: WorldConfig): void {
  localStorage.setItem('ships_seed', String(config.seed))
  localStorage.setItem('ships_size', config.size)

  const currentUrl = new URL(window.location.href)
  currentUrl.searchParams.set('seed', String(config.seed))
  currentUrl.searchParams.set('size', config.size)
  currentUrl.searchParams.delete('shape')
  window.history.replaceState({}, '', currentUrl.toString())
}

export function loadShipClass(): ShipClass {
  const url = new URLSearchParams(window.location.search).get('ship')
  const stored = localStorage.getItem('ships_class') as ShipClass | null

  if (url && ['ferry', 'cargo', 'container'].includes(url)) {
    return url as ShipClass
  }

  if (stored && ['ferry', 'cargo', 'container'].includes(stored)) {
    return stored
  }

  return 'ferry'
}

export function saveShipClass(shipClass: ShipClass): void {
  localStorage.setItem('ships_class', shipClass)
  const currentUrl = new URL(window.location.href)
  currentUrl.searchParams.set('ship', shipClass)
  window.history.replaceState({}, '', currentUrl.toString())
}
