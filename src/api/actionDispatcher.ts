import type { GameState, GameAction } from '../state/gameState';
import { dispatchAction } from '../engine/turnManager/turnManager';
import { validateAction } from './gameController';

export type Middleware = (
  action: GameAction,
  state: GameState,
  next: (action: GameAction, state: GameState) => GameState
) => GameState;

type DispatchFn = (action: GameAction, state: GameState) => GameState;

/**
 * Create an action dispatcher with optional middleware chain.
 * Middlewares are called in order; the last one calls dispatchAction.
 */
export function createDispatcher(middlewares: Middleware[] = []): DispatchFn {
  return function dispatch(action: GameAction, state: GameState): GameState {
    const core: DispatchFn = (a, s) => dispatchAction(a, s);

    // Build the middleware chain from the end
    const chain = middlewares.reduceRight<DispatchFn>(
      (next, mw) => (a: GameAction, s: GameState) => mw(a, s, next),
      core
    );

    return chain(action, state);
  };
}

/** Logging middleware — logs action type and player after dispatch. */
export const loggingMiddleware: Middleware = (action, state, next) => {
  const newState = next(action, state);
  console.log(`[Action] ${action.type} by ${action.playerId}`);
  return newState;
};

/** Validation middleware — rejects invalid actions and returns unchanged state. */
export const validationMiddleware: Middleware = (action, state, next) => {
  const { valid, reason } = validateAction(action, state);
  if (!valid) {
    console.warn(`[Invalid Action] ${action.type}: ${reason}`);
    return state;
  }
  return next(action, state);
};
