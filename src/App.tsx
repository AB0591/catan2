import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useGameStore } from './store/gameStore';
import { HexBoard } from './ui/boardRenderer';
import { PlayerPanel } from './ui/playerPanel';
import { DiceRoll } from './ui/diceRoll';
import { BuildMenu } from './ui/buildMenu';
import { DevCardHand } from './ui/devCardHand';
import { DiscardDialog } from './ui/discardDialog/DiscardDialog';
import { StealDialog } from './ui/stealDialog';
import { getStealTargets } from './engine/robber/robberActions';
import { TradeDialog } from './ui/tradeDialog';
import { ActionTimeline } from './ui/timeline/ActionTimeline';
import { Coachmark } from './ui/onboarding/Coachmark';
import { ResourceGainOverlay } from './ui/resourceGainOverlay/ResourceGainOverlay';
import {
  getBuildDisabledReason,
  getDevCardPlayReason,
  getEndTurnDisabledReason,
  getRollDisabledReason,
} from './ui/reasons/actionReasons';
import type { VertexId, EdgeId } from './engine/board/boardTypes';
import type { HexCoord } from './engine/board/hexGrid';
import type { ResourceType } from './state/playerState';

const PLAYER_CSS_COLORS: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  orange: '#f97316',
  white: '#e5e7eb',
};

function nextTimestamp(): number {
  return Date.now();
}

function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function hasPositiveGains(gains: Partial<Record<ResourceType, number>> | null | undefined): boolean {
  return Object.values(gains ?? {}).some(v => (v ?? 0) > 0);
}

type StartScreenProps = {
  showCoachmark: boolean;
  dismissCoachmark: () => void;
};

// Start screen component
function StartScreen({ showCoachmark, dismissCoachmark }: StartScreenProps) {
  const [playerNames, setPlayerNames] = useState(['Alice', 'Bob', 'Charlie', 'Dana']);
  const [numPlayers, setNumPlayers] = useState(2);
  const [aiFlags, setAiFlags] = useState([false, true, true, true]);
  const { startGame } = useGameStore();

  const handleStart = () => {
    const names = playerNames.slice(0, numPlayers);
    const aiIds = names
      .map((_, i) => `player_${i}`)
      .filter((_, i) => aiFlags[i]);
    startGame(names, aiIds);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 12, padding: 32, maxWidth: 400, width: '100%' }}>
        <h1 style={{ textAlign: 'center', marginBottom: 24, color: '#ffd700', fontSize: 28 }}>
          🏝️ Settlers of Catan
        </h1>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, color: '#aaa', fontSize: 13 }}>
            Number of Players
          </label>
          <select
            value={numPlayers}
            onChange={e => setNumPlayers(Number(e.target.value))}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 4, background: '#222', color: '#fff', border: '1px solid #444' }}
          >
            {[2, 3, 4].map(n => (
              <option key={n} value={n}>{n} Players</option>
            ))}
          </select>
        </div>

        {Array.from({ length: numPlayers }, (_, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: Object.values(PLAYER_CSS_COLORS)[i], flexShrink: 0 }} />
              <input
                value={playerNames[i]}
                onChange={e => {
                  const names = [...playerNames];
                  names[i] = e.target.value;
                  setPlayerNames(names);
                }}
                style={{ flex: 1, padding: '6px 10px', borderRadius: 4, background: '#222', color: '#fff', border: '1px solid #444' }}
                placeholder={`Player ${i + 1} name`}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#aaa', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={aiFlags[i]}
                  onChange={e => {
                    const flags = [...aiFlags];
                    flags[i] = e.target.checked;
                    setAiFlags(flags);
                  }}
                />
                AI
              </label>
            </div>
          </div>
        ))}

        <button
          onClick={handleStart}
          style={{
            width: '100%',
            marginTop: 16,
            padding: '12px 0',
            background: '#ffd700',
            color: '#1a1a1a',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Start Game
        </button>
      </div>
      {showCoachmark && (
        <Coachmark
          title="Welcome"
          message="Set up 2-4 players, enable AI for any seat, and start your first game."
          onDismiss={dismissCoachmark}
          onDontShowAgain={dismissCoachmark}
        />
      )}
    </div>
  );
}

// Main game component
function GameBoard() {
  const {
    gameState,
    liveGameState,
    dispatch,
    selectedAction,
    setSelectedAction,
    lastPlacedSettlementVertexId,
    setLastPlacedSettlement,
    getCurrentPlayer,
    getValidPlacements,
    isAIThinking,
    restartGame,
    isReplayMode,
    timelineIndex,
    setTimelineIndex,
    exitReplayMode,
    resumeLiveFromReplay,
    debugEnabled,
    runDebugCommand,
    lastDebugMessage,
    savedScenarios,
    saveScenario,
    loadScenario,
    importScenario,
    exportScenario,
    deleteScenario,
    onboardingSeen,
    dismissCoachmark,
    resetOnboarding,
  } = useGameStore();

  const [showTrade, setShowTrade] = useState(false);
  const [pendingKnightCardIndex, setPendingKnightCardIndex] = useState<number | null>(null);
  const [debugConsoleOpen, setDebugConsoleOpen] = useState(false);
  const [debugInput, setDebugInput] = useState('');
  const [scenarioName, setScenarioName] = useState('');
  const [debugMessage, setDebugMessage] = useState<string | null>(null);

  const currentPlayer = getCurrentPlayer();
  const { vertices: validVertices, edges: validEdges } = getValidPlacements();

  useEffect(() => {
    if (!debugEnabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === '`') {
        event.preventDefault();
        setDebugConsoleOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [debugEnabled]);

  if (!gameState) return null;

  const playerColors: Record<string, string> = {};
  for (const p of gameState.players) {
    playerColors[p.id] = PLAYER_CSS_COLORS[p.color] ?? '#fff';
  }

  const handleDebugSubmit = () => {
    if (!debugInput.trim()) return;
    const result = runDebugCommand(debugInput);
    setDebugMessage(result.message);
    if (result.ok) setDebugInput('');
  };

  const handleScenarioImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = importScenario(text);
    setDebugMessage(result.message);
    event.target.value = '';
  };

  const handleScenarioExport = (scenarioId: string) => {
    const exported = exportScenario(scenarioId);
    if (!exported) {
      setDebugMessage('Scenario export failed.');
      return;
    }
    const blob = new Blob([exported], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${scenarioId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setDebugMessage('Scenario exported.');
  };

  const handleVertexClick = (vertexId: VertexId) => {
    if (!currentPlayer) return;
    if (isReplayMode) return;

    if (gameState.phase === 'setup') {
      const settlementsPlaced = 5 - currentPlayer.settlements;
      const roadsPlaced = 15 - currentPlayer.roads;
      const needsRoad = settlementsPlaced > roadsPlaced;
      if (!needsRoad) {
        dispatch({
          type: 'PLACE_SETTLEMENT',
          playerId: currentPlayer.id,
          payload: { vertexId },
          timestamp: nextTimestamp(),
        });
        setLastPlacedSettlement(vertexId);
      }
      return;
    }

    if (selectedAction === 'settlement') {
      dispatch({
        type: 'BUILD_SETTLEMENT',
        playerId: currentPlayer.id,
        payload: { vertexId },
        timestamp: nextTimestamp(),
      });
      setSelectedAction(null);
    } else if (selectedAction === 'city') {
      dispatch({
        type: 'BUILD_CITY',
        playerId: currentPlayer.id,
        payload: { vertexId },
        timestamp: nextTimestamp(),
      });
      setSelectedAction(null);
    }
  };

  const handleEdgeClick = (edgeId: EdgeId) => {
    if (!currentPlayer) return;
    if (isReplayMode) return;

    if (gameState.phase === 'setup') {
      const settlementsPlaced = 5 - currentPlayer.settlements;
      const roadsPlaced = 15 - currentPlayer.roads;
      const needsRoad = settlementsPlaced > roadsPlaced;
      if (needsRoad) {
        dispatch({
          type: 'PLACE_ROAD',
          playerId: currentPlayer.id,
          payload: { edgeId, lastPlacedSettlementVertexId: lastPlacedSettlementVertexId ?? undefined },
          timestamp: nextTimestamp(),
        });
        setLastPlacedSettlement(null);
      }
      return;
    }

    if (selectedAction === 'road') {
      dispatch({
        type: 'BUILD_ROAD',
        playerId: currentPlayer.id,
        payload: { edgeId },
        timestamp: nextTimestamp(),
      });
      setSelectedAction(null);
    }
  };

  const handleHexClick = (coord: HexCoord) => {
    if (!currentPlayer) return;
    if (isReplayMode) return;
    if (pendingKnightCardIndex !== null) {
      dispatch({
        type: 'PLAY_KNIGHT',
        playerId: currentPlayer.id,
        payload: { cardIndex: pendingKnightCardIndex, hexCoord: coord },
        timestamp: nextTimestamp(),
      });
      setPendingKnightCardIndex(null);
      return;
    }
    if (gameState.turnPhase === 'robber') {
      dispatch({
        type: 'MOVE_ROBBER',
        playerId: currentPlayer.id,
        payload: { hexCoord: coord },
        timestamp: nextTimestamp(),
      });
    }
  };

  const handleRoll = () => {
    if (!currentPlayer) return;
    if (isReplayMode) return;
    const die1 = rollDie();
    const die2 = rollDie();
    dispatch({
      type: 'ROLL_DICE',
      playerId: currentPlayer.id,
      payload: { die1, die2 },
      timestamp: nextTimestamp(),
    });
  };

  const handleEndTurn = () => {
    if (!currentPlayer) return;
    if (isReplayMode) return;
    dispatch({
      type: 'END_TURN',
      playerId: currentPlayer.id,
      payload: {},
      timestamp: nextTimestamp(),
    });
    setSelectedAction(null);
    setPendingKnightCardIndex(null);
  };

  const validHexes: HexCoord[] = (!isReplayMode && (gameState.turnPhase === 'robber' || pendingKnightCardIndex !== null))
    ? gameState.board.graph.hexes
        .map(h => h.coord)
        .filter(c => !(c.q === gameState.board.robberHex.q && c.r === gameState.board.robberHex.r))
    : [];

  const distributionOverlayKey =
    gameState.turnPhase === 'postRoll' && gameState.lastDistribution && gameState.lastDiceRoll
      ? `${gameState.currentTurn}-${gameState.lastDiceRoll.die1}-${gameState.lastDiceRoll.die2}`
      : null;

  const setupPhaseLabel = (() => {
    if (gameState.phase !== 'setup' || !currentPlayer) return '';
    const settlementsPlaced = 5 - currentPlayer.settlements;
    const roadsPlaced = 15 - currentPlayer.roads;
    return settlementsPlaced > roadsPlaced ? 'Place Road' : 'Place Settlement';
  })();

  const rollDisabledReason = getRollDisabledReason(gameState, currentPlayer?.id, isReplayMode);
  const canRoll = rollDisabledReason === null;
  const endTurnDisabledReason = getEndTurnDisabledReason(gameState, currentPlayer?.id, isReplayMode);
  const canEndTurn = endTurnDisabledReason === null;
  const tradeDisabledReason =
    isReplayMode
      ? 'Replay mode active. Return to live play to trade.'
      : (gameState.phase === 'playing' && gameState.turnPhase === 'postRoll' ? null : 'Trading is only available in post-roll phase.');
  const devCardBlockedReason = getDevCardPlayReason(gameState, isReplayMode);

  const buildDisabledReasons = currentPlayer ? {
    settlement: getBuildDisabledReason('settlement', gameState, currentPlayer, isReplayMode) ?? undefined,
    road: getBuildDisabledReason('road', gameState, currentPlayer, isReplayMode) ?? undefined,
    city: getBuildDisabledReason('city', gameState, currentPlayer, isReplayMode) ?? undefined,
    devCard: getBuildDisabledReason('devCard', gameState, currentPlayer, isReplayMode) ?? undefined,
  } : {};

  const activeCoachmark = (() => {
    if (onboardingSeen.firstTurn === false && gameState.phase === 'playing' && gameState.turnPhase === 'preRoll') {
      return {
        key: 'firstTurn' as const,
        title: 'Turn Start',
        message: 'Roll dice first, then build or trade, then end your turn.',
      };
    }
    if (onboardingSeen.buildPhase === false && gameState.phase === 'playing' && gameState.turnPhase === 'postRoll') {
      return {
        key: 'buildPhase' as const,
        title: 'Build Phase',
        message: 'Use Build and Trade actions now. Hover disabled controls to see why they are unavailable.',
      };
    }
    if (
      onboardingSeen.devCards === false &&
      currentPlayer &&
      currentPlayer.developmentCards.length > 0 &&
      gameState.phase === 'playing'
    ) {
      return {
        key: 'devCards' as const,
        title: 'Development Cards',
        message: 'You can play one development card per turn (except Victory Point cards, which are passive).',
      };
    }
    return null;
  })();

  const phaseLabel =
    gameState.phase === 'setup'
      ? `Setup: ${setupPhaseLabel}`
      : isReplayMode ? '⏪ Replay mode'
      : pendingKnightCardIndex !== null ? '⚔️ Select a hex for Knight'
      : gameState.turnPhase === 'preRoll' ? 'Roll dice to start your turn'
      : gameState.turnPhase === 'robber' ? '🦹 Move the Robber'
      : gameState.turnPhase === 'discarding' ? '⚠️ Players must discard'
      : gameState.turnPhase === 'stealing' ? '🤜 Steal a resource'
      : 'Build or trade, then end turn';

  return (
    <>
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Left sidebar */}
      <div style={{ width: 180, padding: 10, overflowY: 'auto', background: 'rgba(0,0,0,0.3)' }}>
        <h2 style={{ fontSize: 14, color: '#ffd700', marginBottom: 8, marginTop: 0 }}>Players</h2>
        {gameState.players.map((player, i) => {
          const gains = gameState.lastDistribution?.[player.id];
          const showOverlay = distributionOverlayKey !== null && hasPositiveGains(gains);
          return (
            <div
              key={player.id}
              style={{
                position: 'relative',
                paddingTop: showOverlay ? 94 : 0,
              }}
            >
              {showOverlay && (
                <ResourceGainOverlay
                  key={`${player.id}-${distributionOverlayKey}`}
                  gains={gains}
                  durationMs={2500}
                />
              )}
              <PlayerPanel
                player={player}
                isCurrentPlayer={i === gameState.currentPlayerIndex}
                isLocalPlayer={true}
              />
            </div>
          );
        })}
      </div>

      {/* Center: board */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
        {/* Fixed-height notification area — reserved space so the board never moves */}
        <div style={{ height: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', width: '100%', paddingBottom: 4 }}>
          <div style={{ background: 'rgba(0,0,0,0.5)', padding: '6px 16px', borderRadius: 20, marginBottom: 6, fontSize: 13, color: '#ffd700' }}>
            {currentPlayer && <span style={{ color: playerColors[currentPlayer.id] }}>{currentPlayer.name}</span>}
            {' — '}{phaseLabel}
          </div>

          {/* AI message */}
          {gameState.aiMessage && (
            <div style={{
              background: 'rgba(59,130,246,0.15)', border: '1px solid #3b82f6',
              borderRadius: 8, padding: '4px 14px',
              fontSize: 12, color: '#93c5fd', maxWidth: 420, textAlign: 'center',
            }}>
              🤖 {gameState.aiMessage}
            </div>
          )}

          {/* Resource distribution after roll */}
          {!gameState.aiMessage && gameState.lastDistribution && gameState.turnPhase === 'postRoll' &&
            Object.keys(gameState.lastDistribution).length > 0 && (
            <div style={{
              background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e',
              borderRadius: 8, padding: '4px 14px',
              fontSize: 12, color: '#86efac', maxWidth: 420,
            }}>
              <span style={{ fontWeight: 'bold' }}>📦 </span>
              {Object.entries(gameState.lastDistribution).map(([pid, gains]) => {
                const player = gameState.players.find(p => p.id === pid);
                if (!player || !gains) return null;
                const gainStr = Object.entries(gains)
                  .filter(([, v]) => (v ?? 0) > 0)
                  .map(([r, v]) => `${v} ${r}`)
                  .join(', ');
                if (!gainStr) return null;
                return (
                  <span key={pid}>
                    <span style={{ color: playerColors[pid] ?? '#fff' }}>{player.name}</span>{': '}{gainStr}{' '}
                  </span>
                );
              })}
            </div>
          )}

          {/* Steal outcome */}
          {!gameState.aiMessage && gameState.lastSteal && gameState.turnPhase === 'postRoll' && (() => {
            const thief = gameState.players.find(p => p.id === gameState.lastSteal!.thiefId);
            const victim = gameState.players.find(p => p.id === gameState.lastSteal!.victimId);
            return (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444',
                borderRadius: 8, padding: '4px 14px',
                fontSize: 12, color: '#fca5a5', maxWidth: 420,
              }}>
                🦹 <span style={{ color: playerColors[thief?.id ?? ''] ?? '#fff' }}>{thief?.name}</span>
                {' '}stole 1 <strong>{gameState.lastSteal!.resource}</strong> from{' '}
                <span style={{ color: playerColors[victim?.id ?? ''] ?? '#fff' }}>{victim?.name}</span>
              </div>
            );
          })()}
        </div>

        <HexBoard
          boardState={gameState.board}
          validVertices={validVertices}
          validEdges={validEdges}
          validHexes={validHexes}
          onVertexClick={handleVertexClick}
          onEdgeClick={handleEdgeClick}
          onHexClick={gameState.turnPhase === 'robber' || pendingKnightCardIndex !== null ? handleHexClick : undefined}
          playerColors={playerColors}
        />

        {gameState.phase === 'finished' && gameState.winner && (
          <div style={{ background: '#ffd700', color: '#1a1a1a', padding: '12px 24px', borderRadius: 12, marginTop: 12, fontWeight: 'bold', fontSize: 18, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>🏆 {gameState.players.find(p => p.id === gameState.winner)?.name ?? 'Unknown'} wins!</span>
            <button
              onClick={restartGame}
              style={{
                background: '#1a1a1a',
                color: '#ffd700',
                border: 'none',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 13,
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              New Game
            </button>
          </div>
        )}
      </div>

      {/* Right sidebar */}
      <div style={{ width: 200, padding: 10, overflowY: 'auto', background: 'rgba(0,0,0,0.3)' }}>
        {isAIThinking && (
          <div style={{
            background: 'rgba(251,191,36,0.15)', border: '1px solid #fbbf24',
            borderRadius: 6, padding: '6px 10px', marginBottom: 8,
            fontSize: 12, color: '#fbbf24',
          }}>
            🤖 AI is thinking…
          </div>
        )}
        <DiceRoll
          lastRoll={gameState.lastDiceRoll}
          canRoll={canRoll}
          disabledReason={rollDisabledReason}
          onRoll={handleRoll}
        />

        {gameState.phase === 'playing' && currentPlayer && (
          <>
            <BuildMenu
              player={currentPlayer}
              turnPhase={gameState.turnPhase}
              disabledReasons={buildDisabledReasons}
              onBuildSettlement={() => setSelectedAction(selectedAction === 'settlement' ? null : 'settlement')}
              onBuildRoad={() => setSelectedAction(selectedAction === 'road' ? null : 'road')}
              onBuildCity={() => setSelectedAction(selectedAction === 'city' ? null : 'city')}
              onBuyDevCard={() => {
                dispatch({
                  type: 'BUY_DEVELOPMENT_CARD',
                  playerId: currentPlayer.id,
                  payload: {},
                  timestamp: nextTimestamp(),
                });
              }}
            />

            {selectedAction && (
              <div style={{ fontSize: 12, color: '#ffff00', marginBottom: 8, padding: '4px 8px', background: 'rgba(255,255,0,0.1)', borderRadius: 4 }}>
                Click {selectedAction === 'road' ? 'edge' : 'vertex'} on board
                <button
                  onClick={() => setSelectedAction(null)}
                  style={{ marginLeft: 6, background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 12 }}
                >
                  ✕
                </button>
              </div>
            )}
            {pendingKnightCardIndex !== null && (
              <div style={{ fontSize: 12, color: '#fca5a5', marginBottom: 8, padding: '4px 8px', background: 'rgba(239,68,68,0.1)', borderRadius: 4 }}>
                Click a hex to move the robber (Knight)
                <button
                  onClick={() => setPendingKnightCardIndex(null)}
                  style={{ marginLeft: 6, background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 12 }}
                >
                  ✕
                </button>
              </div>
            )}

            {gameState.turnPhase === 'postRoll' && (
              <>
                <button
                  onClick={() => {
                    if (!tradeDisabledReason) setShowTrade(true);
                  }}
                  disabled={tradeDisabledReason !== null}
                  title={tradeDisabledReason ?? 'Open trade dialog'}
                  style={{
                    width: '100%',
                    padding: '8px 0',
                    background: tradeDisabledReason ? '#0f3b38' : '#0f766e',
                    color: tradeDisabledReason ? '#7ea4a2' : '#fff',
                    border: '1px solid #0d9488',
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: tradeDisabledReason ? 'not-allowed' : 'pointer',
                    marginTop: 6,
                  }}
                >
                  🔄 Trade
                </button>
                {tradeDisabledReason && (
                  <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>{tradeDisabledReason}</div>
                )}
                <button
                  onClick={handleEndTurn}
                  disabled={!canEndTurn}
                  title={endTurnDisabledReason ?? 'End your turn'}
                  style={{
                    width: '100%',
                    padding: '8px 0',
                    background: canEndTurn ? '#374151' : '#222a37',
                    color: canEndTurn ? '#fff' : '#7f8a9c',
                    border: '1px solid #555',
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: canEndTurn ? 'pointer' : 'not-allowed',
                    marginTop: 6,
                  }}
                >
                  End Turn →
                </button>
                {!canEndTurn && endTurnDisabledReason && (
                  <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>{endTurnDisabledReason}</div>
                )}
              </>
            )}

            {gameState.turnPhase === 'discarding' && gameState.pendingDiscards.length > 0 && (
              <div style={{ fontSize: 12, color: '#f97316', padding: 8, background: 'rgba(249,115,22,0.1)', borderRadius: 4 }}>
                ⚠️ {gameState.pendingDiscards.map(id => gameState.players.find(p => p.id === id)?.name).join(', ')} must discard
              </div>
            )}

            {/* Dev card hand */}
            <div style={{ marginTop: 8, borderTop: '1px solid #333', paddingTop: 8 }}>
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>Dev Cards</div>
              <DevCardHand
                cards={currentPlayer.developmentCards}
                currentTurn={gameState.currentTurn}
                canPlay={devCardBlockedReason === null}
                blockedReason={devCardBlockedReason}
                onPlayCard={(cardIndex, payload) => {
                  if (isReplayMode) return;
                  const card = currentPlayer.developmentCards[cardIndex];
                  if (!card) return;
                  if (card.type === 'knight') {
                    setPendingKnightCardIndex(cardIndex);
                    setSelectedAction(null);
                    return;
                  }
                  const actionMap: Record<string, string> = {
                    knight: 'PLAY_KNIGHT',
                    roadBuilding: 'PLAY_ROAD_BUILDING',
                    yearOfPlenty: 'PLAY_YEAR_OF_PLENTY',
                    monopoly: 'PLAY_MONOPOLY',
                  };
                  const actionType = actionMap[card.type];
                  if (!actionType) return;
                  dispatch({
                    type: actionType as Parameters<typeof dispatch>[0]['type'],
                    playerId: currentPlayer.id,
                    payload: { cardIndex, ...payload },
                    timestamp: nextTimestamp(),
                  });
                }}
              />
            </div>
          </>
        )}

        {debugEnabled && liveGameState && (
          <>
            <ActionTimeline
              actionLog={liveGameState.actionLog}
              isReplayMode={isReplayMode}
              timelineIndex={timelineIndex}
              onJumpTo={setTimelineIndex}
              onResumeFromHere={resumeLiveFromReplay}
              onReturnToLive={exitReplayMode}
            />

            <div style={{ marginTop: 10, borderTop: '1px solid #333', paddingTop: 8 }}>
              <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>Scenarios</div>
              <input
                value={scenarioName}
                onChange={e => setScenarioName(e.target.value)}
                placeholder="Scenario name"
                style={{
                  width: '100%',
                  marginBottom: 6,
                  padding: '4px 6px',
                  borderRadius: 4,
                  border: '1px solid #444',
                  background: '#111',
                  color: '#fff',
                  fontSize: 11,
                }}
              />
              <button
                onClick={() => {
                  const result = saveScenario(scenarioName);
                  setDebugMessage(result.message);
                  if (result.ok) setScenarioName('');
                }}
                style={{
                  width: '100%',
                  marginBottom: 6,
                  padding: '5px 6px',
                  borderRadius: 4,
                  border: '1px solid #0d9488',
                  background: '#0f766e',
                  color: '#fff',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                Save Scenario
              </button>
              <input
                type="file"
                accept="application/json"
                onChange={handleScenarioImport}
                style={{ width: '100%', marginBottom: 6, fontSize: 10 }}
              />
              <button
                onClick={resetOnboarding}
                style={{
                  width: '100%',
                  marginBottom: 6,
                  padding: '4px 6px',
                  borderRadius: 4,
                  border: '1px solid #4b5563',
                  background: '#111827',
                  color: '#cbd5e1',
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                Reset Onboarding Tips
              </button>
              <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #222', borderRadius: 4, padding: 4 }}>
                {savedScenarios.length === 0 && (
                  <div style={{ fontSize: 11, color: '#777' }}>No saved scenarios.</div>
                )}
                {savedScenarios.map(snapshot => (
                  <div key={snapshot.id} style={{ borderBottom: '1px solid #1f2937', paddingBottom: 4, marginBottom: 4 }}>
                    <div style={{ fontSize: 10, color: '#cbd5e1' }}>{snapshot.name}</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                      <button
                        onClick={() => setDebugMessage(loadScenario(snapshot.id).message)}
                        style={{ flex: 1, fontSize: 10, padding: '2px 4px', borderRadius: 3, border: '1px solid #444', background: '#1f2937', color: '#e5e7eb', cursor: 'pointer' }}
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleScenarioExport(snapshot.id)}
                        style={{ flex: 1, fontSize: 10, padding: '2px 4px', borderRadius: 3, border: '1px solid #444', background: '#1f2937', color: '#e5e7eb', cursor: 'pointer' }}
                      >
                        Export
                      </button>
                      <button
                        onClick={() => deleteScenario(snapshot.id)}
                        style={{ flex: 1, fontSize: 10, padding: '2px 4px', borderRadius: 3, border: '1px solid #7f1d1d', background: '#450a0a', color: '#fecaca', cursor: 'pointer' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>

    {/* Discard dialog overlay */}
    {gameState.turnPhase === 'discarding' && gameState.pendingDiscards.length > 0 && !isReplayMode && (
      <DiscardDialogWrapper
        gameState={gameState}
        dispatch={dispatch}
      />
    )}

    {/* Steal dialog overlay */}
    {gameState.turnPhase === 'stealing' && currentPlayer && !isReplayMode && (() => {
      const targetIds = getStealTargets(gameState, currentPlayer.id);
      const targets = targetIds.map(id => gameState.players.find(p => p.id === id)!).filter(Boolean);
      return targets.length > 0 ? (
        <StealDialog
          targets={targets}
          onSteal={(targetPlayerId) => {
            dispatch({
              type: 'STEAL_RESOURCE',
              playerId: currentPlayer.id,
              payload: { targetPlayerId },
              timestamp: nextTimestamp(),
            });
          }}
        />
      ) : null;
    })()}

    {/* Trade dialog overlay */}
    {showTrade && currentPlayer && !isReplayMode && (
      <TradeDialog
        gameState={gameState}
        playerId={currentPlayer.id}
        onClose={() => setShowTrade(false)}
        onTradeBank={(give: ResourceType, receive: ResourceType) => {
          dispatch({
            type: 'TRADE_BANK',
            playerId: currentPlayer.id,
            payload: { give, receive },
            timestamp: nextTimestamp(),
          });
          setShowTrade(false);
        }}
        onTradePlayer={(targetId, give, receive) => {
          dispatch({
            type: 'TRADE_PLAYER',
            playerId: currentPlayer.id,
            payload: { targetPlayerId: targetId, give, receive },
            timestamp: nextTimestamp(),
          });
          setShowTrade(false);
        }}
      />
    )}

    {debugEnabled && debugConsoleOpen && (
      <div
        style={{
          position: 'fixed',
          left: 16,
          bottom: 16,
          width: 420,
          background: 'rgba(2,6,23,0.97)',
          border: '1px solid #334155',
          borderRadius: 10,
          padding: 10,
          zIndex: 70,
        }}
      >
        <div style={{ fontSize: 12, color: '#93c5fd', marginBottom: 6 }}>Debug Console</div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input
            value={debugInput}
            onChange={e => setDebugInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleDebugSubmit();
            }}
            placeholder="give player_0 wood 3"
            style={{
              flex: 1,
              padding: '6px 8px',
              borderRadius: 4,
              border: '1px solid #475569',
              background: '#0f172a',
              color: '#fff',
              fontSize: 12,
            }}
          />
          <button
            onClick={handleDebugSubmit}
            style={{ padding: '6px 10px', borderRadius: 4, border: 'none', background: '#1d4ed8', color: '#fff', fontSize: 12, cursor: 'pointer' }}
          >
            Run
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <button onClick={() => { setDebugInput('preset robber-test'); }} style={{ fontSize: 10, padding: '3px 6px', borderRadius: 4, border: '1px solid #444', background: '#111827', color: '#cbd5e1', cursor: 'pointer' }}>Robber test</button>
          <button onClick={() => { setDebugInput('preset trade-test'); }} style={{ fontSize: 10, padding: '3px 6px', borderRadius: 4, border: '1px solid #444', background: '#111827', color: '#cbd5e1', cursor: 'pointer' }}>Trade test</button>
          <button onClick={() => { setDebugInput('preset endgame-test'); }} style={{ fontSize: 10, padding: '3px 6px', borderRadius: 4, border: '1px solid #444', background: '#111827', color: '#cbd5e1', cursor: 'pointer' }}>Endgame test</button>
        </div>
        {(debugMessage ?? lastDebugMessage) && (
          <div style={{ fontSize: 11, color: '#a7f3d0', marginBottom: 4 }}>{debugMessage ?? lastDebugMessage}</div>
        )}
        <div style={{ fontSize: 10, color: '#94a3b8' }}>
          Commands: <code>give</code>, <code>setvp</code>, <code>roll</code>, <code>devcard</code>, <code>nextphase</code>, <code>preset</code>
        </div>
      </div>
    )}

    {activeCoachmark && (
      <Coachmark
        title={activeCoachmark.title}
        message={activeCoachmark.message}
        onDismiss={() => dismissCoachmark(activeCoachmark.key)}
        onDontShowAgain={() => dismissCoachmark(activeCoachmark.key)}
      />
    )}
  </>
  );
}

type DiscardWrapperProps = {
  gameState: NonNullable<ReturnType<typeof useGameStore.getState>['gameState']>;
  dispatch: (action: ReturnType<typeof useGameStore.getState>['dispatch'] extends (a: infer A) => unknown ? A : never) => void;
};

function DiscardDialogWrapper({ gameState, dispatch }: DiscardWrapperProps) {
  const discardPlayerId = gameState.pendingDiscards[0];
  const discardPlayer = gameState.players.find(p => p.id === discardPlayerId);
  if (!discardPlayer) return null;
  const totalCards = Object.values(discardPlayer.resources).reduce((a, b) => a + b, 0);
  const mustDiscard = Math.floor(totalCards / 2);
  return (
    <DiscardDialog
      player={discardPlayer}
      mustDiscard={mustDiscard}
      onDiscard={(resources) => {
        dispatch({
          type: 'DISCARD_RESOURCES',
          playerId: discardPlayerId,
          payload: { resources },
          timestamp: nextTimestamp(),
        });
      }}
    />
  );
}

export default function App() {
  const { gameState, onboardingSeen, dismissCoachmark } = useGameStore();
  return gameState
    ? <GameBoard />
    : (
      <StartScreen
        showCoachmark={onboardingSeen.startScreen === false}
        dismissCoachmark={() => dismissCoachmark('startScreen')}
      />
    );
}
