import { useState } from 'react';
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
import type { VertexId, EdgeId } from './engine/board/boardTypes';
import type { HexCoord } from './engine/board/hexGrid';
import type { ResourceType } from './state/playerState';

const PLAYER_CSS_COLORS: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  orange: '#f97316',
  white: '#e5e7eb',
};

// Start screen component
function StartScreen() {
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
    </div>
  );
}

// Main game component
function GameBoard() {
  const {
    gameState,
    dispatch,
    selectedAction,
    setSelectedAction,
    lastPlacedSettlementVertexId,
    setLastPlacedSettlement,
    getCurrentPlayer,
    getValidPlacements,
    isAIThinking,
  } = useGameStore();

  const [showTrade, setShowTrade] = useState(false);

  if (!gameState) return null;

  const currentPlayer = getCurrentPlayer();
  const { vertices: validVertices, edges: validEdges } = getValidPlacements();

  const playerColors: Record<string, string> = {};
  for (const p of gameState.players) {
    playerColors[p.id] = PLAYER_CSS_COLORS[p.color] ?? '#fff';
  }

  const handleVertexClick = (vertexId: VertexId) => {
    if (!currentPlayer) return;

    if (gameState.phase === 'setup') {
      const settlementsPlaced = 5 - currentPlayer.settlements;
      const roadsPlaced = 15 - currentPlayer.roads;
      const needsRoad = settlementsPlaced > roadsPlaced;
      if (!needsRoad) {
        dispatch({
          type: 'PLACE_SETTLEMENT',
          playerId: currentPlayer.id,
          payload: { vertexId },
          timestamp: Date.now(),
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
        timestamp: Date.now(),
      });
      setSelectedAction(null);
    } else if (selectedAction === 'city') {
      dispatch({
        type: 'BUILD_CITY',
        playerId: currentPlayer.id,
        payload: { vertexId },
        timestamp: Date.now(),
      });
      setSelectedAction(null);
    }
  };

  const handleEdgeClick = (edgeId: EdgeId) => {
    if (!currentPlayer) return;

    if (gameState.phase === 'setup') {
      const settlementsPlaced = 5 - currentPlayer.settlements;
      const roadsPlaced = 15 - currentPlayer.roads;
      const needsRoad = settlementsPlaced > roadsPlaced;
      if (needsRoad) {
        dispatch({
          type: 'PLACE_ROAD',
          playerId: currentPlayer.id,
          payload: { edgeId, lastPlacedSettlementVertexId: lastPlacedSettlementVertexId ?? undefined },
          timestamp: Date.now(),
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
        timestamp: Date.now(),
      });
      setSelectedAction(null);
    }
  };

  const handleHexClick = (coord: HexCoord) => {
    if (!currentPlayer) return;
    if (gameState.turnPhase === 'robber') {
      dispatch({
        type: 'MOVE_ROBBER',
        playerId: currentPlayer.id,
        payload: { hexCoord: coord },
        timestamp: Date.now(),
      });
    }
  };

  const handleRoll = () => {
    if (!currentPlayer) return;
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    dispatch({
      type: 'ROLL_DICE',
      playerId: currentPlayer.id,
      payload: { die1, die2 },
      timestamp: Date.now(),
    });
  };

  const handleEndTurn = () => {
    if (!currentPlayer) return;
    dispatch({
      type: 'END_TURN',
      playerId: currentPlayer.id,
      payload: {},
      timestamp: Date.now(),
    });
    setSelectedAction(null);
  };

  const validHexes: HexCoord[] = gameState.turnPhase === 'robber'
    ? gameState.board.graph.hexes
        .map(h => h.coord)
        .filter(c => !(c.q === gameState.board.robberHex.q && c.r === gameState.board.robberHex.r))
    : [];

  const setupPhaseLabel = (() => {
    if (gameState.phase !== 'setup' || !currentPlayer) return '';
    const settlementsPlaced = 5 - currentPlayer.settlements;
    const roadsPlaced = 15 - currentPlayer.roads;
    return settlementsPlaced > roadsPlaced ? 'Place Road' : 'Place Settlement';
  })();

  const phaseLabel =
    gameState.phase === 'setup'
      ? `Setup: ${setupPhaseLabel}`
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
        {gameState.players.map((player, i) => (
          <PlayerPanel
            key={player.id}
            player={player}
            isCurrentPlayer={i === gameState.currentPlayerIndex}
            isLocalPlayer={true}
          />
        ))}
      </div>

      {/* Center: board */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <div style={{ background: 'rgba(0,0,0,0.5)', padding: '6px 16px', borderRadius: 20, marginBottom: 8, fontSize: 13, color: '#ffd700' }}>
          {currentPlayer && <span style={{ color: playerColors[currentPlayer.id] }}>{currentPlayer.name}</span>}
          {' — '}{phaseLabel}
        </div>

        {/* AI message */}
        {gameState.aiMessage && (
          <div style={{
            background: 'rgba(59,130,246,0.15)', border: '1px solid #3b82f6',
            borderRadius: 8, padding: '6px 16px', marginBottom: 8,
            fontSize: 13, color: '#93c5fd', maxWidth: 420, textAlign: 'center',
          }}>
            🤖 {gameState.aiMessage}
          </div>
        )}

        {/* Resource distribution after roll */}
        {gameState.lastDistribution && gameState.turnPhase === 'postRoll' &&
          Object.keys(gameState.lastDistribution).length > 0 && (
          <div style={{
            background: 'rgba(34,197,94,0.1)', border: '1px solid #22c55e',
            borderRadius: 8, padding: '8px 16px', marginBottom: 8,
            fontSize: 12, color: '#86efac', maxWidth: 420,
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>📦 Resources produced:</div>
            {Object.entries(gameState.lastDistribution).map(([pid, gains]) => {
              const player = gameState.players.find(p => p.id === pid);
              if (!player || !gains) return null;
              const gainStr = Object.entries(gains)
                .filter(([, v]) => (v ?? 0) > 0)
                .map(([r, v]) => `${v} ${r}`)
                .join(', ');
              if (!gainStr) return null;
              return (
                <div key={pid}>
                  <span style={{ color: playerColors[pid] ?? '#fff' }}>{player.name}</span>: {gainStr}
                </div>
              );
            })}
          </div>
        )}

        {/* Steal outcome */}
        {gameState.lastSteal && gameState.turnPhase === 'postRoll' && (() => {
          const thief = gameState.players.find(p => p.id === gameState.lastSteal!.thiefId);
          const victim = gameState.players.find(p => p.id === gameState.lastSteal!.victimId);
          return (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444',
              borderRadius: 8, padding: '6px 16px', marginBottom: 8,
              fontSize: 12, color: '#fca5a5', maxWidth: 420,
            }}>
              🦹 <span style={{ color: playerColors[thief?.id ?? ''] ?? '#fff' }}>{thief?.name}</span>
              {' '}stole 1 <strong>{gameState.lastSteal!.resource}</strong> from{' '}
              <span style={{ color: playerColors[victim?.id ?? ''] ?? '#fff' }}>{victim?.name}</span>
            </div>
          );
        })()}

        <HexBoard
          boardState={gameState.board}
          validVertices={validVertices}
          validEdges={validEdges}
          validHexes={validHexes}
          onVertexClick={handleVertexClick}
          onEdgeClick={handleEdgeClick}
          onHexClick={gameState.turnPhase === 'robber' ? handleHexClick : undefined}
          playerColors={playerColors}
        />

        {gameState.phase === 'finished' && gameState.winner && (
          <div style={{ background: '#ffd700', color: '#1a1a1a', padding: '12px 24px', borderRadius: 12, marginTop: 12, fontWeight: 'bold', fontSize: 18 }}>
            🏆 {gameState.players.find(p => p.id === gameState.winner)?.name ?? 'Unknown'} wins!
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
          canRoll={gameState.phase === 'playing' && gameState.turnPhase === 'preRoll'}
          onRoll={handleRoll}
        />

        {gameState.phase === 'playing' && currentPlayer && (
          <>
            <BuildMenu
              player={currentPlayer}
              turnPhase={gameState.turnPhase}
              onBuildSettlement={() => setSelectedAction(selectedAction === 'settlement' ? null : 'settlement')}
              onBuildRoad={() => setSelectedAction(selectedAction === 'road' ? null : 'road')}
              onBuildCity={() => setSelectedAction(selectedAction === 'city' ? null : 'city')}
              onBuyDevCard={() => {
                dispatch({
                  type: 'BUY_DEVELOPMENT_CARD',
                  playerId: currentPlayer.id,
                  payload: {},
                  timestamp: Date.now(),
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

            {gameState.turnPhase === 'postRoll' && (
              <>
                <button
                  onClick={() => setShowTrade(true)}
                  style={{
                    width: '100%', padding: '8px 0', background: '#0f766e',
                    color: '#fff', border: '1px solid #0d9488', borderRadius: 6, fontSize: 13, cursor: 'pointer', marginTop: 6,
                  }}
                >
                  🔄 Trade
                </button>
                <button
                  onClick={handleEndTurn}
                  style={{
                    width: '100%', padding: '8px 0', background: '#374151',
                    color: '#fff', border: '1px solid #555', borderRadius: 6, fontSize: 13, cursor: 'pointer', marginTop: 6,
                  }}
                >
                  End Turn →
                </button>
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
                canPlay={gameState.turnPhase === 'postRoll' || gameState.turnPhase === 'preRoll'}
                onPlayCard={(cardIndex, payload) => {
                  const card = currentPlayer.developmentCards[cardIndex];
                  if (!card) return;
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
                    timestamp: Date.now(),
                  });
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>

    {/* Discard dialog overlay */}
    {gameState.turnPhase === 'discarding' && gameState.pendingDiscards.length > 0 && (
      <DiscardDialogWrapper
        gameState={gameState}
        dispatch={dispatch}
      />
    )}

    {/* Steal dialog overlay */}
    {gameState.turnPhase === 'stealing' && currentPlayer && (() => {
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
              timestamp: Date.now(),
            });
          }}
        />
      ) : null;
    })()}

    {/* Trade dialog overlay */}
    {showTrade && currentPlayer && (
      <TradeDialog
        gameState={gameState}
        playerId={currentPlayer.id}
        onClose={() => setShowTrade(false)}
        onTradeBank={(give: ResourceType, receive: ResourceType) => {
          dispatch({
            type: 'TRADE_BANK',
            playerId: currentPlayer.id,
            payload: { give, receive },
            timestamp: Date.now(),
          });
          setShowTrade(false);
        }}
        onTradePlayer={(targetId, give, receive) => {
          dispatch({
            type: 'TRADE_PLAYER',
            playerId: currentPlayer.id,
            payload: { targetPlayerId: targetId, give, receive },
            timestamp: Date.now(),
          });
          setShowTrade(false);
        }}
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
          timestamp: Date.now(),
        });
      }}
    />
  );
}

export default function App() {
  const { gameState } = useGameStore();
  return gameState ? <GameBoard /> : <StartScreen />;
}
