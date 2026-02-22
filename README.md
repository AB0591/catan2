# Settlers of Catan (React + TypeScript)

A browser-based Catan implementation built with React, TypeScript, Vite, and Zustand.

It supports both the base game and a substantial **Cities & Knights** ruleset implementation, with a pure TypeScript engine and a React UI layered on top.

## Highlights

- Base Catan gameplay (setup, build, trade, robber, dev cards, victory)
- Cities & Knights gameplay systems:
  - city improvements and commodities
  - knights (build / activate / move / promote / drive robber)
  - city walls
  - barbarians + barbarian attack resolution
  - progress cards and C&K-specific UI flows
- 2-4 players with per-seat AI toggles
- Configurable victory target in lobby (`6-16`)
  - defaults: Base `10`, C&K `13`
- Replay timeline + state replay from action log
- Debug console and scenario import/export tooling (dev/debug builds)

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Starting a Game

1. Choose `2-4` players and names
2. Mark any seats as `AI`
3. Select ruleset (`Base Catan` or `Cities & Knights`)
4. Select `Victory Points to Win` (`6-16`)
5. Click `Start Game`

## Scripts

```bash
npm run dev        # start Vite dev server
npm run build      # typecheck + production build
npm run lint       # ESLint
npm test           # run Vitest suite
npm run test:watch # watch mode
npm run preview    # preview production build
```

## Project Structure

- `src/engine/`: pure game logic (rules, actions, AI, victory, C&K modules)
- `src/state/`: state types and game-state factory
- `src/ui/`: React UI components (board, dialogs, overlays, menus)
- `src/store/`: Zustand store + UI/engine orchestration
- `src/api/`: serialization, replay, validation, dispatcher middleware
- `src/debug/`: debug console commands + scenario tooling
- `Documentation/`: implementation notes, plans, and feature docs

## Core Engine Modules

- `src/engine/turnManager/`: central action dispatcher
- `src/engine/actions/`: base build actions
- `src/engine/resources/`: dice distribution + commodity generation
- `src/engine/robber/`: robber, discard, steal logic
- `src/engine/developmentCards/`: base dev card actions
- `src/engine/trading/`: bank/port/player trading
- `src/engine/victory/`: VP calculation + win checks
- `src/engine/citiesAndKnights/`: C&K systems (knights, walls, barbarians, progress cards, metropolises)
- `src/engine/ai/`: heuristic AI action selection

## Testing

The project uses `Vitest` with unit/integration coverage across engine, UI components, store behavior, and serialization/validation.

Current suite size: `222` tests.

## Specs and Docs

- `CATAN_SPEC.md`
- `CITIES_AND_KNIGHTS_SPEC.md`
- `Documentation/` for implementation notes, UX changes, and feature plans
