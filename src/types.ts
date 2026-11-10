export interface Point2D {
  x: number
  y: number
}

export type WorldSize = 'S' | 'M' | 'L' | 'XL' | 'XXL'

export type ShipClass = 'ferry' | 'cargo' | 'container'

export interface WorldBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface Dock {
  id: string
  name: string
  code: string
  x: number
  y: number
  angle: number
  length: number
  width: number
}

export interface Rock {
  points: Point2D[]
  cx: number
  cy: number
  radius: number
}

export interface WarningAlert {
  type: 'danger' | 'warning' | 'info'
  title: string
  message: string
  canReset: boolean
}
