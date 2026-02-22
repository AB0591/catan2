import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../../store/gameStore';

describe('gameStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useGameStore.setState({
      gameState: null,
      liveGameState: null,
      initialGameState: null,
      selectedAction: null,
      lastPlacedSettlementVertexId: null,
      aiPlayerIds: [],
      isReplayMode: false,
      timelineIndex: null,
      debugEnabled: true,
      lastVictoryPointTarget: 10,
    });
  });

  it('startGame creates a game with correct player count', () => {
    useGameStore.getState().startGame(['Alice', 'Bob', 'Charlie']);
    const { gameState } = useGameStore.getState();
    expect(gameState).not.toBeNull();
    expect(gameState!.players).toHaveLength(3);
    expect(gameState!.players[0].name).toBe('Alice');
    expect(gameState!.players[1].name).toBe('Bob');
    expect(gameState!.players[2].name).toBe('Charlie');
  });

  it('startGame applies selected expansion rules', () => {
    useGameStore.getState().startGame(['Alice', 'Bob'], [], 'cities_and_knights');
    const { gameState } = useGameStore.getState();
    expect(gameState?.expansionRules).toBe('cities_and_knights');
    expect(gameState?.ck).not.toBeNull();
    expect(gameState?.victoryPointTarget).toBe(13);
  });

  it('startGame stores custom victory point target and restart preserves it', () => {
    useGameStore.getState().startGame(['Alice', 'Bob'], [], 'base', 12);
    let { gameState, lastVictoryPointTarget } = useGameStore.getState();
    expect(gameState?.victoryPointTarget).toBe(12);
    expect(lastVictoryPointTarget).toBe(12);

    useGameStore.getState().restartGame();
    ({ gameState, lastVictoryPointTarget } = useGameStore.getState());
    expect(gameState?.victoryPointTarget).toBe(12);
    expect(lastVictoryPointTarget).toBe(12);
  });

  it('dispatch updates game state', () => {
    useGameStore.getState().startGame(['Alice', 'Bob']);
    const { gameState: initial } = useGameStore.getState();
    expect(initial).not.toBeNull();

    // Place a settlement at a valid vertex during setup
    const validVertices = useGameStore.getState().getValidPlacements().vertices;
    expect(validVertices.length).toBeGreaterThan(0);

    const vertexId = validVertices[0];
    useGameStore.getState().dispatch({
      type: 'PLACE_SETTLEMENT',
      playerId: 'player_0',
      payload: { vertexId },
      timestamp: Date.now(),
    });

    const { gameState: after } = useGameStore.getState();
    expect(after!.board.buildings[vertexId]).toBeDefined();
    expect(after!.board.buildings[vertexId].playerId).toBe('player_0');
  });

  it('getCurrentPlayer returns correct player', () => {
    useGameStore.getState().startGame(['Alice', 'Bob']);
    const player = useGameStore.getState().getCurrentPlayer();
    expect(player).not.toBeNull();
    expect(player!.name).toBe('Alice');
    expect(player!.id).toBe('player_0');
  });

  it('supports replay mode and return to live state', () => {
    useGameStore.getState().startGame(['Alice', 'Bob']);
    const validVertices = useGameStore.getState().getValidPlacements().vertices;
    const vertexId = validVertices[0];
    useGameStore.getState().dispatch({
      type: 'PLACE_SETTLEMENT',
      playerId: 'player_0',
      payload: { vertexId },
      timestamp: Date.now(),
    });

    expect(useGameStore.getState().liveGameState?.actionLog.length).toBe(1);
    useGameStore.getState().setTimelineIndex(0);
    expect(useGameStore.getState().isReplayMode).toBe(true);
    expect(useGameStore.getState().timelineIndex).toBe(0);

    useGameStore.getState().exitReplayMode();
    expect(useGameStore.getState().isReplayMode).toBe(false);
    expect(useGameStore.getState().gameState?.actionLog.length).toBe(1);
  });

  it('runs debug commands against live game state', () => {
    useGameStore.getState().startGame(['Alice', 'Bob']);
    const result = useGameStore.getState().runDebugCommand('give player_0 wood 3');
    expect(result.ok).toBe(true);

    const current = useGameStore.getState().gameState;
    expect(current?.players[0].resources.wood).toBe(3);
    expect(current?.actionLog.length).toBe(0);
  });
});
