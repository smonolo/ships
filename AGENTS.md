# AGENTS.md

Guidelines for the `ships` repository.

## Philosophy

`Ships` shares Rails branding (Geist, HUD chrome, cab levers, `#008cff`) but is a separate open-water helm game: map size → docks/rocks, free steering, no rail tracks, no AI.

## Rules

- Never add comments to `.ts`, `.js`, `.css`, or `.html`.
- Do not add AI copilots, gateway SDKs, or API-key UI.
- Prefer `npx tsc --noEmit` for verification. Do not run `npm run build` / `vite build` in agent sessions.
- Keep map size tables (`S`–`XXL`) in the same spirit as Rails world sizing.
