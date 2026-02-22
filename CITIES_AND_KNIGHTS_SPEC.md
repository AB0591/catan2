You are a principal game engine engineer + UI engineer.

We already have a working base Settlers of Catan implementation in this repo:
- Deterministic server-driven game state (WS server is source of truth)
- Actions are dispatched as GameAction objects
- UI renders from STATE_UPDATE snapshots and sends DISPATCH_ACTION with GameAction payloads

Your task: extend the existing game to support the "Cities & Knights" expansion (C&K),
while keeping the base game playable and preserving existing rules.

DO NOT rewrite the base engine. Implement C&K as an extension layer with minimal invasive changes.

===========================================================
SCOPE
===========================================================

Implement the Cities & Knights expansion (base Catan + C&K), including:
- Commodities + improved cities
- City improvements (Politics/Science/Trade)
- Knights (active/inactive, movement, promotion)
- Barbarians track + barbarian attacks
- Progress cards (three decks)
- Metropolises (three)
- City walls
- Merchant Fleet / Trade Monopoly / other trade progress
- Defender of Catan (if you choose to include; otherwise omit and note)
- New building costs and rules specific to C&K
- UI support for all C&K actions and state

Out of scope unless explicitly required:
- Seafarers, Traders & Barbarians, other expansions
- Scenario variants
- Online matchmaking / dedicated hosting

===========================================================
NON-NEGOTIABLE CONSTRAINTS
===========================================================

1) Preserve determinism and server authority.
2) Do NOT break the existing base-game mode.
3) Add an "expansionRules" toggle: base vs cities_and_knights.
4) Reuse existing patterns:
   dispatchAction(action, gameState) -> newGameState
   WS protocol unchanged: DISPATCH_ACTION carries action: GameAction
5) Keep all existing tests passing; add extensive new tests.

===========================================================
HIGH-LEVEL GAMEPLAY RULES TO IMPLEMENT
===========================================================

A) New resource types
- In addition to base resources (wood, brick, sheep, wheat, ore),
  implement commodities produced by certain hexes when a CITY (not settlement) receives production:
  - cloth
  - coin
  - paper
(Exact mapping: cloth from sheep, coin from ore, paper from wheat.)
Settlements still receive the base resource (not commodity).
Cities receive the corresponding commodity (per C&K rules).
(If your base implementation already uses city -> 2 resources, update logic for C&K mode:
  city = 1 resource + 1 commodity from that hex type.)

B) City improvements tracks (per player)
- Three improvement areas:
  - Politics (blue)
  - Science (green)
  - Trade (yellow)
- Each has levels 0..5 (or rules-correct maximum)
- Improvements cost commodities (per C&K)
- Reaching certain levels unlocks:
  - ability to build/promote knights (politics)
  - aqueduct, alchemist, inventor access etc (science)
  - trading perks and merchant fleet etc (trade)
- Track which progress cards are accessible and metropolis eligibility.

C) Knights
- Knights exist on edges/vertices (use a consistent location model; pick one and stick).
- Knights have:
  - level (1/2/3: basic/strong/mighty)
  - active/inactive state
  - owner playerId
  - position (board node id)
- Actions:
  - build knight (inactive)
  - activate knight (pay 1 wheat)
  - move knight (requires active)
  - promote knight (requires active and eligible; pay commodities)
  - displace weaker opponent knight by stronger (rules-correct)
  - drive away robber with active knight (per C&K)
- Ensure knight “strength” and activation rules match C&K.

D) Barbarians track + attacks
- Implement a barbarian ship track that advances as “7s” are rolled (or per C&K).
- When barbarians reach Catan, resolve an attack:
  - Compute total active knight strength defending (sum of knight levels of active knights)
  - Compute total city strength (number of cities; settlements do not count)
  - If defense < attack: player(s) with least contribution lose a city (downgrade city -> settlement)
  - If defense >= attack: player(s) with greatest contribution get a progress card reward
- Track contribution per player for the attack resolution.
- Reset barbarians after attack.
- Add clear state markers so UI can guide players through attack resolution.

E) Progress cards
- Three decks: Politics, Science, Trade
- Cards have unique effects, some are “event-like”, some persistent.
- Implement a subset first, then complete full set.
- Must enforce hand limits if applicable.
- Cards can be drawn as rewards from improvements / barbarian defense / specific triggers.
- Implement "play progress card" action family, with parameter payloads as needed.

F) Metropolises
- Three metropolises (Politics/Science/Trade) awarded to first (or highest) player to reach level 4+ (rules-correct).
- Metropolis replaces city (no VP stacking incorrectly).
- Metropolis protects from barbarian downgrades.
- Only one per category globally.

G) City walls
- City walls can be built for cities.
- Increase hand size before discarding on 7 / or modifies discard threshold per C&K.
- Must be reflected in robber discard logic and UI.

H) New build costs / availability
- Add new costs for:
  - city improvement (commodities)
  - knight build/promo/activate
  - city wall
- Keep base build costs intact for base mode.

===========================================================
DATA MODEL CHANGES (STATE)
===========================================================

Add a C&K state extension under game state, e.g.:

gameState.expansions = {
  mode: "base" | "cities_and_knights",
  ck?: {
    barbarians: { position: number, ... }
    commodities: { [playerId]: { cloth, coin, paper } }
    improvements: { [playerId]: { politics: number, science: number, trade: number } }
    knights: Record<knightId, { ownerId, level, active, locationId }>
    cityWalls: { [vertexId]: boolean } or per-city object
    metropolises: { politics?: playerId, science?: playerId, trade?: playerId, cityVertexByType?: ... }
    progressDecks: { politics: DeckState, science: DeckState, trade: DeckState }
    progressHands: { [playerId]: ProgressCard[] }
    pending: {
      type:
        | "NONE"
        | "BARBARIAN_ATTACK_RESOLUTION"
        | "CHOOSE_PROGRESS_CARD_REWARD"
        | "MOVE_ROBBER_BY_KNIGHT"
        | ... ;
      payload: ...
    }
  }
}

Keep JSON-serializable.

===========================================================
ACTIONS (ENGINE API)
===========================================================

Extend your GameAction union with a C&K action family.
Do NOT break existing action types. Add new ones.

Examples (you may rename for consistency, but must be explicit and tested):

- BUILD_KNIGHT { playerId, locationId, knightLevel? } (default basic)
- ACTIVATE_KNIGHT { playerId, knightId }
- MOVE_KNIGHT { playerId, knightId, toLocationId }
- PROMOTE_KNIGHT { playerId, knightId }
- BUILD_CITY_WALL { playerId, cityVertexId }
- IMPROVE_CITY { playerId, area: "politics"|"science"|"trade" }
- DRAW_PROGRESS_CARD { playerId, deck: "politics"|"science"|"trade" } (usually internal reward)
- PLAY_PROGRESS_CARD { playerId, cardId, params... } (design card-specific params)
- RESOLVE_BARBARIAN_ATTACK { playerId, choices... } (may be server-driven stepper)
- DRIVE_AWAY_ROBBER { playerId, knightId, targetHexId? } (if applicable)
- ... plus card-specific actions where required

All actions must be validated by engine; UI cannot bypass.

===========================================================
TURN / PHASE MODEL
===========================================================

Update the turn engine for C&K mode to include:
- Dice roll -> resource + commodity distribution
- Barbarian track advance
- If barbarian attack triggers, enter a pending resolution phase that blocks normal actions
- Allow knights/progress cards per rules (e.g., timing restrictions)

Represent “what the current player must do next” clearly in state, so UI can guide.

===========================================================
UI REQUIREMENTS
===========================================================

Add world-class UI for all C&K elements:
- Display commodities per player
- Display three city improvement tracks with level markers and tooltips
- Knight placement/activation/movement with clear legal highlights
- Barbarians track with animation and attack warning
- Metropolis markers on cities
- Progress cards hand UI (categorized), with “play” flows
- City wall indicator on cities
- Robber-driving-away interaction with knights

Guided flows:
- When barbarians attack, show a cinematic modal and guide through resolution.
- When a progress card needs parameters (choose resource, choose target, etc), provide a stepper UI.

===========================================================
TESTING (MANDATORY)
===========================================================

Add Vitest tests for:
- Commodity distribution (settlement vs city)
- Improvement purchase costs and unlock rules
- Knight build/activate/move/promote validation
- Displacement rules
- Barbarian track advance and attack resolution cases:
  - defense < attack -> correct city downgraded
  - defense >= attack -> correct reward selection
  - metropolis protected
- City walls effect on discards
- Progress card draw/play effects (at least 10 representative cards first)

===========================================================
IMPLEMENTATION PLAN (DO IN ORDER)
===========================================================

Phase 1: Plumbing + Toggle
- Add expansions.mode and ensure base mode unchanged
- Add minimal ck state structures; serialize in snapshots

Phase 2: Commodities + Improvements skeleton
- Add commodity accounting and city vs settlement distribution
- Add improve_city action and track levels (no progress cards yet)

Phase 3: Knights core
- Add knight entities and build/activate/move/promote
- Add robber drive-away if supported

Phase 4: Barbarians
- Add track advance, trigger, and resolution engine with pending phases

Phase 5: Progress cards (incremental)
- Implement deck data structures and a first batch of cards per deck
- Add full set once framework is solid

Phase 6: Metropolises + City walls
- Implement metropolis awarding and protection
- Implement city walls and discard modifications

Phase 7: UI upgrades for C&K
- Visual tracks, knights interactions, barbarians cinematic, progress card UX

Phase 8: Polish + Balance + Regression
- Ensure base mode works
- Add documentation, screenshots, keyboard shortcuts, accessibility

===========================================================
DELIVERABLES
===========================================================

When done:
- User can start a Cities & Knights game from UI (toggle in lobby)
- Full game can be played to completion with correct C&K rules
- Base game still works unchanged
- Tests pass

===========================================================
START NOW
===========================================================

1) Inspect current game state types, turn engine, resource distribution, and actions.
2) Implement Phase 1 and Phase 2 first, with tests.
3) Proceed phase-by-phase.