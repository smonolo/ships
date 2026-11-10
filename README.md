# Ships

A minimalist 2D open-water helm game with the same visual language as Rails — Geist, dark HUD pills, cab levers, `#008cff`.

Steer a ship across a generated chart of docks and rocks. No tracks, no economy loop — just helm, chart size, and clean ship classes.

## Play

```bash
cd ships
npm install
npm run dev
```

## Controls

| Input           | Action                          |
| --------------- | ------------------------------- |
| `W` / `S`       | Throttle up / down              |
| `A` / `D`       | Rudder port / starboard         |
| Cab levers      | Drag PWR / RUD                  |
| `X`             | All stop                        |
| `C`             | Center camera                   |
| `T` / `G` / `H` | Ship / new chart / help         |
| `R`             | Respawn at dock after collision |

## Chart

Map size `S` → `XXL` (same scale steps as Rails worlds). Seeded docks and rocks fill the water. Change size or seed from **Chart**.

## Ships

- **Ferry** — nimble coastal ferry
- **Cargo** — heavier bulk carrier
- **Container** — longer liner with streamliner nose

## License

MIT
