# Repository Guidelines

## Project Structure & Module Organization
- `src/engine/`: pure TypeScript game logic (rules, resources, robber, dev cards, AI, turn manager). Keep this layer framework-agnostic.
- `src/state/`: core game types and state factories.
- `src/store/`: Zustand store wiring engine/state to UI.
- `src/ui/`: React UI components (board, dialogs, panels, controls).
- `src/api/`: serialization, replay, and action dispatch middleware.
- Tests live next to modules in `__tests__/` folders and `*.test.ts(x)` files (for example `src/engine/victory/__tests__/victoryEngine.test.ts`).
- Static assets: `public/`; build output: `dist/`; process docs: `Documentation/`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run dev`: start Vite dev server (`http://localhost:5173`).
- `npm run build`: type-check and build production bundle (`tsc -b && vite build`).
- `npm run preview`: serve the production build locally.
- `npm run lint`: run ESLint across the repository.
- `npm test`: run Vitest once.
- `npm run test:watch`: run Vitest in watch mode.

## Coding Style & Naming Conventions
- Language: TypeScript + React with ESM modules.
- Follow existing style: semicolons, single quotes, 2-space indentation, trailing commas where present.
- File naming: components/types use `PascalCase` where appropriate (`TradeDialog.tsx`); utilities/modules use `camelCase` (`resourceDistribution.ts`).
- Keep engine code deterministic and side-effect light; UI logic should stay in `src/ui`/`src/store`.
- Linting is configured in `eslint.config.js`. Underscore-prefixed args are allowed for intentionally unused parameters.

## Testing Guidelines
- Framework: Vitest with `jsdom` and Testing Library (`@testing-library/react`, `@testing-library/jest-dom`).
- Test names should describe behavior and outcomes; colocate tests with the module under test.
- Prefer focused unit tests for engine/state logic and integration-style tests for UI/store interactions.
- Run `npm test` before opening a PR; run `npm run lint` as part of pre-PR checks.
- Test tooling version policy:
   - Use actively maintained major versions only (no deprecated packages).
   - Minimum versions:
      - vitest >= 3
      - typescript >= 5.8
   - Avoid broad transitive `overrides` as a long-term strategy.
   - Prefer direct dependency upgrades or toolchain migration over forced transitive pinning.

## Commit & Pull Request Guidelines
- Current history favors short, imperative subjects, often with prefixes like `Fix:`, `Documentation:`, or milestone tags (`Step 13: AI opponents`).
- Keep commit titles concise and scoped to one logical change.
- PRs should include:
  - clear summary of behavior changes,
  - linked issue/task (if available),
  - test/lint status,
  - screenshots or short clips for UI changes.

===========================================================
IMPORTANT CONSTRAINTS
===========================================================

- No randomness outside of seeded RNG
- All rules must be enforced by engine
- UI cannot override engine logic
- Game must be replayable from action log
- Engine must support undo via action history
- Dependencies must pass `npm audit` at `high` severity threshold (or stricter).
- Deprecated packages are not allowed in production or test toolchains.
- Lockfile updates are required whenever dependency versions are changed.
- Before each delivery step, run:
    - `npm outdated`
    - `npm audit --audit-level=high`
  and upgrade stale/unsafe packages before adding new features.

===========================================================
ARCHITECTURE REQUIREMENTS
===========================================================

Use a layered architecture:

/engine
    rules
    board
    actions
    turnManager
    victory
    robber
    developmentCards
    trading

/state
    gameState
    playerState
    boardState

/ui
    boardRenderer
    playerPanel
    tradeDialog
    diceRoll
    buildMenu

/api
    gameController
    actionDispatcher

Game state must be serializable to JSON at all times.

All gameplay must occur through action dispatching:

dispatchAction(action, gameState) -> newGameState

No mutation of gameState allowed.

===========================================================
TECH STACK REQUIREMENTS
===========================================================

Frontend:
- React
- TypeScript
- Zustand or Redux Toolkit for state
- TailwindCSS
- SVG or Canvas board rendering

Backend (logic layer):
- Node.js
- TypeScript

Game engine:
- Pure functional logic where possible
- No UI coupling
- Engine must run headless

Networking (phase 2):
- WebSockets

