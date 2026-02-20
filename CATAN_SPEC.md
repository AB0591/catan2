You are a senior game engine and full-stack software engineer.

Your task is to implement a modern, fully playable digital implementation of the board game
"Settlers of Catan" (base game only — no expansions).

The goal is NOT to create a prototype — it is to create a production-quality rules-correct
implementation with a modern web UI and deterministic multiplayer game engine.

===========================================================
PRIMARY OBJECTIVES
===========================================================

You must build:

1. Full rules-accurate Catan gameplay engine
2. Turn-based multiplayer support (local first)
3. Deterministic game state model
4. Modern responsive web UI
5. AI opponents (after core engine is complete)
6. Separation of UI from game logic
7. Documentation in the Documentation folder

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
GAMEPLAY RULES (BASE CATAN ONLY)
===========================================================

You MUST implement rules exactly as follows:

Game Setup:
- 19 hex tiles
    4 forest (wood)
    4 pasture (sheep)
    4 fields (wheat)
    3 hills (brick)
    3 mountains (ore)
    1 desert

- 18 number tokens
    2–12 excluding 7
    Correct distribution

- Robber starts on desert

Each player starts with:
- 2 settlements
- 2 roads

Initial placement rules:
- Snake order
- Distance rule enforced

===========================================================
TURN STRUCTURE
===========================================================

Each turn consists of:

1. Dice Roll
2. Resource Distribution
3. Trade Phase
4. Build Phase
5. End Turn

If dice roll = 7:
    Trigger Robber Phase:
        - All players >7 cards discard half
        - Current player moves robber
        - Current player steals 1 random card

===========================================================
BUILDING RULES
===========================================================

Road:
    cost: 1 brick + 1 wood
    must connect to player network

Settlement:
    cost: 1 brick + 1 wood + 1 sheep + 1 wheat
    must obey distance rule
    must connect to owned road

City:
    cost: 3 ore + 2 wheat
    upgrades existing settlement

Development Card:
    cost: 1 ore + 1 wheat + 1 sheep

===========================================================
DEVELOPMENT CARDS
===========================================================

Implement:
- Knight
- Victory Point
- Road Building
- Year of Plenty
- Monopoly

Knights contribute to Largest Army.

===========================================================
VICTORY CONDITIONS
===========================================================

First player to 10 victory points wins.

Points from:
- Settlements (1)
- Cities (2)
- Largest Army (2)
- Longest Road (2)
- Victory Point cards

===========================================================
LONGEST ROAD
===========================================================

Must correctly handle:
- Branching
- Opponent settlement breaks

===========================================================
AI PLAYERS (PHASE 3)
===========================================================

After engine complete:
Implement heuristic AI:
- Evaluate resource scarcity
- Prefer expansion early
- Prefer cities midgame
- Use knights strategically

===========================================================
TESTING REQUIREMENTS
===========================================================

Must include:

- Placement rule tests
- Resource distribution tests
- Longest road tests
- Robber discard tests
- Development card tests
- Victory condition tests

Use a modern maintained TypeScript test runner (Vitest preferred).

Test tooling version policy:
- Use actively maintained major versions only (no deprecated packages).
- Minimum versions:
    - vitest >= 3
    - typescript >= 5.8
- Avoid broad transitive `overrides` as a long-term strategy.
- Prefer direct dependency upgrades or toolchain migration over forced transitive pinning.

===========================================================
DELIVERY PLAN
===========================================================

Implement in the following order:

Step 1: Board model
Step 2: Game state model
Step 3: Placement rules
Step 4: Turn engine
Step 5: Resource distribution
Step 6: Build logic
Step 7: Robber
Step 8: Development cards
Step 9: Victory detection
Step 10: UI board renderer
Step 11: Player controls
Step 12: Trading system
Step 13: AI opponents
Step 14: Multiplayer sync

After each step:
- Add unit tests
- Ensure engine runs headless
- Generate documentation for work completed in Documentation folder
- Commit the code for that step into git

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
BEGIN IMPLEMENTATION NOW
===========================================================

Start with:
Board data model
Hex coordinate system
Vertex graph representation
Edge graph representation




