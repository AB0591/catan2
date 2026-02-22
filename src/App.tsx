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
import { CkProgressDialog } from './ui/ckProgressDialog';
import { CkBarbarianModal } from './ui/ckBarbarianModal';
import {
  getBuildDisabledReason,
  getDevCardPlayReason,
  getEndTurnDisabledReason,
  getRollDisabledReason,
} from './ui/reasons/actionReasons';
import type { VertexId, EdgeId } from './engine/board/boardTypes';
import type { HexCoord } from './engine/board/hexGrid';
import type { CommodityType, ResourceType, ImprovementTrack } from './state/playerState';
import type { DistributionCards, ExpansionRules, ProgressCard } from './state/gameState';
import {
  getDriveAwayRobberTargets,
  getValidKnightBuildVertices,
  getValidKnightMoveTargets,
} from './engine/citiesAndKnights/knightActions';
import { getValidCityWallVertices } from './engine/citiesAndKnights/cityWallActions';

const PLAYER_CSS_COLORS: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  orange: '#f97316',
  white: '#e5e7eb',
};

type ProgressDeckKey = 'politics' | 'science' | 'trade';

const PROGRESS_DECK_META: Record<ProgressDeckKey, { label: string; accent: string }> = {
  politics: { label: 'Politics', accent: '#60a5fa' },
  science: { label: 'Science', accent: '#4ade80' },
  trade: { label: 'Trade', accent: '#facc15' },
};

function nextTimestamp(): number {
  return Date.now();
}

function rollDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function hasPositiveGains(gains: DistributionCards | null | undefined): boolean {
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
  const [expansionRules, setExpansionRules] = useState<ExpansionRules>('base');
  const { startGame } = useGameStore();

  const handleStart = () => {
    const names = playerNames.slice(0, numPlayers);
    const aiIds = names
      .map((_, i) => `player_${i}`)
      .filter((_, i) => aiFlags[i]);
    startGame(names, aiIds, expansionRules);
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

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, color: '#aaa', fontSize: 13 }}>
            Ruleset
          </label>
          <select
            value={expansionRules}
            onChange={e => setExpansionRules(e.target.value as ExpansionRules)}
            style={{ width: '100%', padding: '6px 10px', borderRadius: 4, background: '#222', color: '#fff', border: '1px solid #444' }}
          >
            <option value="base">Base Catan</option>
            <option value="cities_and_knights">Cities &amp; Knights</option>
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
  const [selectedKnightId, setSelectedKnightId] = useState<string | null>(null);
  const [knightMode, setKnightMode] = useState<'none' | 'build' | 'move' | 'driveRobber'>('none');
  const [ckBuildCityWallMode, setCkBuildCityWallMode] = useState(false);
  const [progressDialogCard, setProgressDialogCard] = useState<ProgressCard | null>(null);
  const [dismissedBarbarianSignature, setDismissedBarbarianSignature] = useState<string | null>(null);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  const [debugConsoleOpen, setDebugConsoleOpen] = useState(false);
  const [debugInput, setDebugInput] = useState('');
  const [scenarioName, setScenarioName] = useState('');
  const [debugMessage, setDebugMessage] = useState<string | null>(null);

  const currentPlayer = getCurrentPlayer();
  const { vertices: baseValidVertices, edges: validEdges } = getValidPlacements();

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

  useEffect(() => {
    if (!gameState || !currentPlayer || isReplayMode) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName.toLowerCase();
      const inTextInput = tagName === 'input' || tagName === 'textarea' || tagName === 'select' || Boolean(target?.isContentEditable);
      if (inTextInput) return;

      if (event.key === '?') {
        event.preventDefault();
        setShowShortcutHelp(prev => !prev);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedAction(null);
        setKnightMode('none');
        setPendingKnightCardIndex(null);
        setCkBuildCityWallMode(false);
        setProgressDialogCard(null);
        return;
      }

      if (progressDialogCard) return;

      const isCurrentPlayer = gameState.players[gameState.currentPlayerIndex]?.id === currentPlayer.id;
      if (!isCurrentPlayer || gameState.phase !== 'playing') return;

      if ((event.key === 'r' || event.key === 'R') && gameState.turnPhase === 'preRoll') {
        event.preventDefault();
        const die1 = rollDie();
        const die2 = rollDie();
        dispatch({
          type: 'ROLL_DICE',
          playerId: currentPlayer.id,
          payload: { die1, die2 },
          timestamp: nextTimestamp(),
        });
        return;
      }

      if ((event.key === 'e' || event.key === 'E') && gameState.turnPhase === 'postRoll') {
        event.preventDefault();
        dispatch({
          type: 'END_TURN',
          playerId: currentPlayer.id,
          payload: {},
          timestamp: nextTimestamp(),
        });
        setSelectedAction(null);
        setKnightMode('none');
        setPendingKnightCardIndex(null);
        setCkBuildCityWallMode(false);
        setProgressDialogCard(null);
        return;
      }

      if (gameState.turnPhase !== 'postRoll') return;

      if (event.key === '1') {
        event.preventDefault();
        setSelectedAction(selectedAction === 'settlement' ? null : 'settlement');
        setKnightMode('none');
        setCkBuildCityWallMode(false);
      } else if (event.key === '2') {
        event.preventDefault();
        setSelectedAction(selectedAction === 'road' ? null : 'road');
        setKnightMode('none');
        setCkBuildCityWallMode(false);
      } else if (event.key === '3') {
        event.preventDefault();
        setSelectedAction(selectedAction === 'city' ? null : 'city');
        setKnightMode('none');
        setCkBuildCityWallMode(false);
      } else if ((event.key === 'k' || event.key === 'K') && gameState.expansionRules === 'cities_and_knights') {
        event.preventDefault();
        setKnightMode(prev => (prev === 'build' ? 'none' : 'build'));
        setSelectedAction(null);
        setCkBuildCityWallMode(false);
      } else if ((event.key === 'w' || event.key === 'W') && gameState.expansionRules === 'cities_and_knights') {
        event.preventDefault();
        setCkBuildCityWallMode(prev => !prev);
        setSelectedAction(null);
        setKnightMode('none');
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, currentPlayer, isReplayMode, progressDialogCard, dispatch, selectedAction, setSelectedAction]);

  if (!gameState) return null;

  const ownedKnights = currentPlayer
    ? Object.values(gameState.board.knights).filter(k => k.ownerId === currentPlayer.id)
    : [];
  const selectedKnight = selectedKnightId
    ? (ownedKnights.find(k => k.id === selectedKnightId) ?? null)
    : null;
  const knightBuildVertices = currentPlayer ? getValidKnightBuildVertices(gameState, currentPlayer.id) : [];
  const knightMoveVertices = selectedKnight ? getValidKnightMoveTargets(gameState, selectedKnight.id) : [];
  const knightDriveTargets = selectedKnight ? getDriveAwayRobberTargets(gameState, selectedKnight.id) : [];
  const cityWallVertices = currentPlayer ? getValidCityWallVertices(gameState, currentPlayer.id) : [];
  const progressHand: ProgressCard[] = (
    gameState.expansionRules === 'cities_and_knights' && gameState.ck && currentPlayer
      ? (gameState.ck.progressHands[currentPlayer.id] ?? [])
      : []
  );
  const progressHandCounts: Record<string, number> = gameState.expansionRules === 'cities_and_knights' && gameState.ck
    ? Object.fromEntries(gameState.players.map(player => [player.id, gameState.ck?.progressHands[player.id]?.length ?? 0]))
    : {};
  const progressByDeck: Record<ProgressDeckKey, ProgressCard[]> = {
    politics: progressHand.filter(card => card.deck === 'politics'),
    science: progressHand.filter(card => card.deck === 'science'),
    trade: progressHand.filter(card => card.deck === 'trade'),
  };
  const lastBarbarianAttack = gameState.expansionRules === 'cities_and_knights' && gameState.ck
    ? gameState.ck.lastBarbarianAttack
    : null;
  const barbarianSignature = lastBarbarianAttack
    ? `${gameState.currentTurn}:${lastBarbarianAttack.cityStrength}:${lastBarbarianAttack.defenseStrength}:${lastBarbarianAttack.losers.join(',')}:${lastBarbarianAttack.rewarded.join(',')}:${lastBarbarianAttack.citiesDowngraded.map(item => `${item.playerId}@${item.vertexId}`).join('|')}`
    : null;
  const showBarbarianModal = !isReplayMode && barbarianSignature !== null && barbarianSignature !== dismissedBarbarianSignature;
  const metropolisByVertex: Record<string, 'politics' | 'science' | 'trade'> = {};
  if (gameState.expansionRules === 'cities_and_knights' && gameState.ck) {
    (['politics', 'science', 'trade'] as const).forEach(track => {
      const cityVertexId = gameState.ck?.metropolises[track].cityVertexId;
      if (cityVertexId) metropolisByVertex[cityVertexId] = track;
    });
  }

  const validVertices = ckBuildCityWallMode
    ? cityWallVertices
    : knightMode === 'build'
    ? knightBuildVertices
    : knightMode === 'move'
      ? knightMoveVertices
      : baseValidVertices;

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

    if (knightMode === 'build') {
      dispatch({
        type: 'CK_BUILD_KNIGHT',
        playerId: currentPlayer.id,
        payload: { vertexId },
        timestamp: nextTimestamp(),
      });
      setKnightMode('none');
      return;
    }

    if (ckBuildCityWallMode) {
      dispatch({
        type: 'CK_BUILD_CITY_WALL',
        playerId: currentPlayer.id,
        payload: { cityVertexId: vertexId },
        timestamp: nextTimestamp(),
      });
      setCkBuildCityWallMode(false);
      return;
    }

    if (knightMode === 'move' && selectedKnight) {
      dispatch({
        type: 'CK_MOVE_KNIGHT',
        playerId: currentPlayer.id,
        payload: { knightId: selectedKnight.id, toVertexId: vertexId },
        timestamp: nextTimestamp(),
      });
      setKnightMode('none');
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

  const handleKnightClick = (knightId: string) => {
    if (!currentPlayer) return;
    if (isReplayMode) return;
    const knight = gameState.board.knights[knightId];
    if (!knight || knight.ownerId !== currentPlayer.id) return;

    setSelectedKnightId(prev => (prev === knightId ? null : knightId));
    setKnightMode('none');
    setCkBuildCityWallMode(false);
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
    if (knightMode === 'driveRobber' && selectedKnight) {
      dispatch({
        type: 'CK_DRIVE_AWAY_ROBBER',
        playerId: currentPlayer.id,
        payload: { knightId: selectedKnight.id, hexCoord: coord },
        timestamp: nextTimestamp(),
      });
      setKnightMode('none');
      return;
    }
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
    setSelectedKnightId(null);
    setKnightMode('none');
    setCkBuildCityWallMode(false);
    setProgressDialogCard(null);
  };

  const validHexes: HexCoord[] = (() => {
    if (isReplayMode) return [];
    if (knightMode === 'driveRobber') return knightDriveTargets;
    if (gameState.turnPhase === 'robber' || pendingKnightCardIndex !== null) {
      return gameState.board.graph.hexes
        .map(h => h.coord)
        .filter(c => !(c.q === gameState.board.robberHex.q && c.r === gameState.board.robberHex.r));
    }
    return [];
  })();

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

  const improvementMeta: Record<ImprovementTrack, { label: string; icon: string; commodity: string }> = {
    politics: { label: 'Politics', icon: '🔵', commodity: 'coin' },
    science: { label: 'Science', icon: '🟢', commodity: 'paper' },
    trade: { label: 'Trade', icon: '🟡', commodity: 'cloth' },
  };

  const getImproveCityDisabledReason = (track: ImprovementTrack): string | null => {
    if (!currentPlayer) return 'No active player.';
    if (isReplayMode) return 'Replay mode active. Return to live play to improve cities.';
    if (gameState.expansionRules !== 'cities_and_knights' || !gameState.ck) return 'Only available in Cities & Knights.';
    if (gameState.phase !== 'playing' || gameState.turnPhase !== 'postRoll') return 'Only available in post-roll phase.';
    if (gameState.players[gameState.currentPlayerIndex]?.id !== currentPlayer.id) return 'Not your turn.';

    const level = currentPlayer.cityImprovements[track];
    if (level >= 5) return 'Already at maximum level.';

    const ownsCity = Object.values(gameState.board.buildings).some(
      b => b.playerId === currentPlayer.id && b.type === 'city'
    );
    if (!ownsCity) return 'Build at least one city first.';

    const cost = level + 1;
    const commodity = improvementMeta[track].commodity as keyof typeof currentPlayer.commodities;
    if ((currentPlayer.commodities[commodity] ?? 0) < cost) {
      return `Need ${cost} ${commodity}.`;
    }

    return null;
  };

  const getBuildKnightDisabledReason = (): string | null => {
    if (!currentPlayer) return 'No active player.';
    if (isReplayMode) return 'Replay mode active.';
    if (gameState.expansionRules !== 'cities_and_knights' || !gameState.ck) return 'Only available in Cities & Knights.';
    if (gameState.phase !== 'playing' || gameState.turnPhase !== 'postRoll') return 'Only available in post-roll phase.';
    if (gameState.players[gameState.currentPlayerIndex]?.id !== currentPlayer.id) return 'Not your turn.';
    if (currentPlayer.resources.sheep < 1 || currentPlayer.resources.ore < 1) return 'Need 1 sheep and 1 ore.';
    if (knightBuildVertices.length === 0) return 'No valid vertex connected to your roads.';
    return null;
  };

  const getActivateKnightDisabledReason = (): string | null => {
    if (!currentPlayer) return 'No active player.';
    if (gameState.expansionRules !== 'cities_and_knights' || !gameState.ck) return 'Only available in Cities & Knights.';
    if (!selectedKnight) return 'Select one of your knights.';
    if (selectedKnight.ownerId !== currentPlayer.id) return 'Select one of your knights.';
    if (gameState.phase !== 'playing' || gameState.turnPhase !== 'postRoll') return 'Only available in post-roll phase.';
    if (selectedKnight.active) return 'Knight is already active.';
    if (currentPlayer.resources.wheat < 1) return 'Need 1 wheat.';
    return null;
  };

  const getMoveKnightDisabledReason = (): string | null => {
    if (!currentPlayer) return 'No active player.';
    if (gameState.expansionRules !== 'cities_and_knights' || !gameState.ck) return 'Only available in Cities & Knights.';
    if (!selectedKnight) return 'Select one of your knights.';
    if (selectedKnight.ownerId !== currentPlayer.id) return 'Select one of your knights.';
    if (gameState.phase !== 'playing' || gameState.turnPhase !== 'postRoll') return 'Only available in post-roll phase.';
    if (!selectedKnight.active) return 'Knight must be active.';
    if (selectedKnight.hasActedThisTurn) return 'Knight already acted this turn.';
    if (knightMoveVertices.length === 0) return 'No valid adjacent destination.';
    return null;
  };

  const getPromoteKnightDisabledReason = (): string | null => {
    if (!currentPlayer) return 'No active player.';
    if (gameState.expansionRules !== 'cities_and_knights' || !gameState.ck) return 'Only available in Cities & Knights.';
    if (!selectedKnight) return 'Select one of your knights.';
    if (selectedKnight.ownerId !== currentPlayer.id) return 'Select one of your knights.';
    if (gameState.phase !== 'playing' || gameState.turnPhase !== 'postRoll') return 'Only available in post-roll phase.';
    if (!selectedKnight.active) return 'Knight must be active.';
    if (selectedKnight.hasActedThisTurn) return 'Knight already acted this turn.';
    if (selectedKnight.level >= 3) return 'Knight is already mighty.';
    const politics = currentPlayer.cityImprovements.politics;
    if (selectedKnight.level === 1 && politics < 2) return 'Need Politics level 2 for strong knights.';
    if (selectedKnight.level === 2 && politics < 4) return 'Need Politics level 4 for mighty knights.';
    if (currentPlayer.commodities.coin < 1) return 'Need 1 coin.';
    return null;
  };

  const getDriveRobberDisabledReason = (): string | null => {
    if (!currentPlayer) return 'No active player.';
    if (gameState.expansionRules !== 'cities_and_knights' || !gameState.ck) return 'Only available in Cities & Knights.';
    if (gameState.phase !== 'playing') return 'Only available during playing phase.';
    if (gameState.turnPhase !== 'preRoll' && gameState.turnPhase !== 'postRoll') return 'Only available in pre-roll or post-roll.';
    if (!selectedKnight) return 'Select one of your knights.';
    if (selectedKnight.ownerId !== currentPlayer.id) return 'Select one of your knights.';
    if (!selectedKnight.active) return 'Knight must be active.';
    if (selectedKnight.hasActedThisTurn) return 'Knight already acted this turn.';
    if (knightDriveTargets.length === 0) return 'Knight is not adjacent to the robber.';
    return null;
  };

  const getBuildCityWallDisabledReason = (): string | null => {
    if (!currentPlayer) return 'No active player.';
    if (isReplayMode) return 'Replay mode active.';
    if (gameState.expansionRules !== 'cities_and_knights' || !gameState.ck) return 'Only available in Cities & Knights.';
    if (gameState.phase !== 'playing' || gameState.turnPhase !== 'postRoll') return 'Only available in post-roll phase.';
    if (gameState.players[gameState.currentPlayerIndex]?.id !== currentPlayer.id) return 'Not your turn.';
    if (currentPlayer.resources.brick < 2) return 'Need 2 brick.';
    if (cityWallVertices.length === 0) return 'No eligible city without a wall, or wall limit reached.';
    return null;
  };

  const progressCardDisabledReason = (() => {
    if (!currentPlayer) return 'No active player.';
    if (isReplayMode) return 'Replay mode active. Return to live play to use progress cards.';
    if (gameState.expansionRules !== 'cities_and_knights' || !gameState.ck) return 'Only available in Cities & Knights.';
    if (gameState.phase !== 'playing' || gameState.turnPhase !== 'postRoll') return 'Only available in post-roll phase.';
    if (gameState.players[gameState.currentPlayerIndex]?.id !== currentPlayer.id) return 'Not your turn.';
    return null;
  })();

  const canPlayProgressCards = progressCardDisabledReason === null;

  const playProgressCard = (card: ProgressCard) => {
    if (!currentPlayer) return;
    if (card.type === 'resourceMonopoly' || card.type === 'merchantFleet' || card.type === 'tradeMonopoly' || card.type === 'spy') {
      setProgressDialogCard(card);
      return;
    }
    dispatch({
      type: 'CK_PLAY_PROGRESS_CARD',
      playerId: currentPlayer.id,
      payload: { cardId: card.id },
      timestamp: nextTimestamp(),
    });
  };

  const handleProgressDialogConfirm = (params: { resource?: ResourceType; commodity?: CommodityType; targetPlayerId?: string }) => {
    if (!currentPlayer || !progressDialogCard) return;
    dispatch({
      type: 'CK_PLAY_PROGRESS_CARD',
      playerId: currentPlayer.id,
      payload: {
        cardId: progressDialogCard.id,
        ...params,
      },
      timestamp: nextTimestamp(),
    });
    setProgressDialogCard(null);
  };

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
      : ckBuildCityWallMode ? '🧱 Select a city for city wall'
      : knightMode === 'build' ? '🛡️ Select a vertex to build a knight'
      : knightMode === 'move' ? '🧭 Select destination vertex for knight'
      : knightMode === 'driveRobber' ? '🦹 Select new robber hex'
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
      <div style={{ width: 340, padding: 10, overflowY: 'auto', background: 'rgba(0,0,0,0.3)' }}>
        <h2 style={{ fontSize: 14, color: '#ffd700', marginBottom: 8, marginTop: 0 }}>Players</h2>
        {gameState.players.map((player, i) => {
          const gains = gameState.lastDistribution?.[player.id];
          const showOverlay = distributionOverlayKey !== null && hasPositiveGains(gains);
          const cityWallCount = Object.values(gameState.board.cityWalls).filter(ownerId => ownerId === player.id).length;
          const metropolisCount = gameState.expansionRules === 'cities_and_knights' && gameState.ck
            ? (['politics', 'science', 'trade'] as const).filter(track => gameState.ck?.metropolises[track].playerId === player.id).length
            : 0;
          return (
            <div
              key={player.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <div style={{ width: 180, flexShrink: 0 }}>
                <PlayerPanel
                  player={player}
                  isCurrentPlayer={i === gameState.currentPlayerIndex}
                  isLocalPlayer={true}
                  expansionRules={gameState.expansionRules}
                  cityWallCount={cityWallCount}
                  metropolisCount={metropolisCount}
                />
              </div>
              <div
                style={{
                  width: 132,
                  height: 188,
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                {showOverlay && (
                  <ResourceGainOverlay
                    key={`${player.id}-${distributionOverlayKey}`}
                    gains={gains}
                    durationMs={8000}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Center: board */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
        {/* Fixed-height notification area — reserved space so the board never moves */}
        <div style={{ height: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', width: '100%', paddingBottom: 4 }}>
          <div
            style={{ background: 'rgba(0,0,0,0.5)', padding: '6px 16px', borderRadius: 20, marginBottom: 6, fontSize: 13, color: '#ffd700' }}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
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
          selectedKnightId={selectedKnight?.id ?? null}
          validKnightIds={!isReplayMode ? ownedKnights.map(k => k.id) : []}
          metropolisByVertex={metropolisByVertex}
          onVertexClick={handleVertexClick}
          onEdgeClick={handleEdgeClick}
          onKnightClick={handleKnightClick}
          onHexClick={gameState.turnPhase === 'robber' || pendingKnightCardIndex !== null || knightMode === 'driveRobber' ? handleHexClick : undefined}
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
        <div
          style={{
            marginBottom: 8,
            border: '1px solid #334155',
            borderRadius: 8,
            background: 'rgba(15,23,42,0.75)',
            padding: 8,
            position: 'sticky',
            top: 10,
            zIndex: 20,
          }}
        >
          <div style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 700, marginBottom: 4 }}>
            Turn Actions
          </div>
          <DiceRoll
            lastRoll={gameState.lastDiceRoll}
            canRoll={canRoll}
            disabledReason={rollDisabledReason}
            onRoll={handleRoll}
          />
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
        </div>
        <div style={{ marginBottom: 8, border: '1px solid #334155', borderRadius: 6, background: 'rgba(15,23,42,0.6)' }}>
          <button
            onClick={() => setShowShortcutHelp(prev => !prev)}
            aria-expanded={showShortcutHelp}
            aria-controls="shortcut-help-panel"
            style={{
              width: '100%',
              border: 'none',
              borderRadius: 6,
              background: 'transparent',
              color: '#cbd5e1',
              cursor: 'pointer',
              padding: '6px 8px',
              textAlign: 'left',
              fontSize: 11,
              fontWeight: 700,
            }}
            title="Toggle keyboard shortcut help"
          >
            ⌨️ Shortcuts {showShortcutHelp ? '▲' : '▼'} (?)
          </button>
          {showShortcutHelp && (
            <div
              id="shortcut-help-panel"
              style={{ borderTop: '1px solid #334155', padding: '6px 8px', fontSize: 10, color: '#94a3b8', lineHeight: 1.5 }}
            >
              <div><strong>?</strong> toggle this panel</div>
              <div><strong>Esc</strong> clear active build/mode</div>
              <div><strong>R</strong> roll dice (pre-roll)</div>
              <div><strong>E</strong> end turn (post-roll)</div>
              <div><strong>1 / 2 / 3</strong> settlement / road / city</div>
              <div><strong>K</strong> knight build mode (C&amp;K)</div>
              <div><strong>W</strong> city wall mode (C&amp;K)</div>
            </div>
          )}
        </div>
        {gameState.expansionRules === 'cities_and_knights' && gameState.ck && (
          <div style={{ marginBottom: 8, padding: 8, borderRadius: 6, background: 'rgba(59,130,246,0.12)', border: '1px solid #3b82f6' }}>
            <div style={{ fontSize: 11, color: '#93c5fd', marginBottom: 4 }}>
              Barbarians: {gameState.ck.barbarians.position}/{gameState.ck.barbarians.stepsToAttack}
            </div>
            {gameState.ck.lastBarbarianAttack && (
              <div style={{ fontSize: 10, color: '#bfdbfe' }}>
                Attack {gameState.ck.lastBarbarianAttack.defenseStrength >= gameState.ck.lastBarbarianAttack.cityStrength ? 'defended' : 'breached'}
              </div>
            )}
          </div>
        )}
        {gameState.phase === 'playing' && currentPlayer && (
          <>
            <BuildMenu
              player={currentPlayer}
              turnPhase={gameState.turnPhase}
              disabledReasons={buildDisabledReasons}
              onBuildSettlement={() => {
                setSelectedAction(selectedAction === 'settlement' ? null : 'settlement');
                setKnightMode('none');
                setCkBuildCityWallMode(false);
              }}
              onBuildRoad={() => {
                setSelectedAction(selectedAction === 'road' ? null : 'road');
                setKnightMode('none');
                setCkBuildCityWallMode(false);
              }}
              onBuildCity={() => {
                setSelectedAction(selectedAction === 'city' ? null : 'city');
                setKnightMode('none');
                setCkBuildCityWallMode(false);
              }}
              onBuyDevCard={() => {
                dispatch({
                  type: 'BUY_DEVELOPMENT_CARD',
                  playerId: currentPlayer.id,
                  payload: {},
                  timestamp: nextTimestamp(),
                });
              }}
            />

            {gameState.expansionRules === 'cities_and_knights' && gameState.ck && (
              <div style={{ paddingBottom: 8, borderBottom: '1px solid #333', marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>City Improvements</div>
                {(['politics', 'science', 'trade'] as const).map(track => {
                  const info = improvementMeta[track];
                  const level = currentPlayer.cityImprovements[track];
                  const reason = getImproveCityDisabledReason(track);
                  const canImprove = reason === null;
                  const nextCost = level < 5 ? level + 1 : null;

                  return (
                    <div key={track} style={{ marginBottom: 6 }}>
                      <button
                        onClick={() => {
                          dispatch({
                            type: 'CK_IMPROVE_CITY',
                            playerId: currentPlayer.id,
                            payload: { area: track },
                            timestamp: nextTimestamp(),
                          });
                        }}
                        disabled={!canImprove}
                        title={reason ?? `Upgrade to level ${level + 1} (${nextCost} ${info.commodity})`}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: 5,
                          border: 'none',
                          fontSize: 12,
                          fontWeight: 'bold',
                          cursor: canImprove ? 'pointer' : 'not-allowed',
                          textAlign: 'left',
                          background: canImprove ? '#334155' : '#333',
                          color: canImprove ? '#fff' : '#777',
                        }}
                      >
                        {info.icon} {info.label} Lv {level}/5
                        {nextCost ? <span style={{ fontWeight: 400 }}> · Cost: {nextCost} {info.commodity}</span> : <span style={{ fontWeight: 400 }}> · Maxed</span>}
                      </button>
                      {!canImprove && reason && (
                        <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{reason}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {gameState.expansionRules === 'cities_and_knights' && gameState.ck && (
              <div style={{ paddingBottom: 8, borderBottom: '1px solid #333', marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>City Walls</div>
                <button
                  onClick={() => {
                    setCkBuildCityWallMode(prev => !prev);
                    setSelectedAction(null);
                    setKnightMode('none');
                    setPendingKnightCardIndex(null);
                  }}
                  disabled={getBuildCityWallDisabledReason() !== null}
                  title={getBuildCityWallDisabledReason() ?? 'Build city wall (2 brick)'}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 5,
                    border: 'none',
                    fontSize: 12,
                    cursor: getBuildCityWallDisabledReason() === null ? 'pointer' : 'not-allowed',
                    textAlign: 'left',
                    background: getBuildCityWallDisabledReason() === null ? '#7c2d12' : '#333',
                    color: getBuildCityWallDisabledReason() === null ? '#ffedd5' : '#777',
                  }}
                >
                  🧱 Build City Wall
                </button>
              </div>
            )}

            {gameState.expansionRules === 'cities_and_knights' && gameState.ck && (
              <div style={{ paddingBottom: 8, borderBottom: '1px solid #333', marginBottom: 8 }}>
                <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>Knights</div>
                <button
                  onClick={() => {
                    setKnightMode(prev => (prev === 'build' ? 'none' : 'build'));
                    setSelectedAction(null);
                    setPendingKnightCardIndex(null);
                    setCkBuildCityWallMode(false);
                  }}
                  disabled={getBuildKnightDisabledReason() !== null}
                  title={getBuildKnightDisabledReason() ?? 'Build knight (1 sheep + 1 ore)'}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 5,
                    border: 'none',
                    fontSize: 12,
                    fontWeight: 'bold',
                    cursor: getBuildKnightDisabledReason() === null ? 'pointer' : 'not-allowed',
                    textAlign: 'left',
                    background: getBuildKnightDisabledReason() === null ? '#1f4a3d' : '#333',
                    color: getBuildKnightDisabledReason() === null ? '#eafff7' : '#777',
                    marginBottom: 6,
                  }}
                >
                  🛡️ Build Knight
                </button>
                {selectedKnight && (
                  <div style={{ fontSize: 10, color: '#a5b4fc', marginBottom: 6 }}>
                    Selected {selectedKnight.id} · Lv {selectedKnight.level} · {selectedKnight.active ? 'Active' : 'Inactive'}{selectedKnight.hasActedThisTurn ? ' · Acted' : ''}
                  </div>
                )}
                <button
                  onClick={() => {
                    if (!selectedKnight) return;
                    dispatch({
                      type: 'CK_ACTIVATE_KNIGHT',
                      playerId: currentPlayer.id,
                      payload: { knightId: selectedKnight.id },
                      timestamp: nextTimestamp(),
                    });
                  }}
                  disabled={getActivateKnightDisabledReason() !== null}
                  title={getActivateKnightDisabledReason() ?? 'Activate selected knight (1 wheat)'}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 5,
                    border: 'none',
                    fontSize: 12,
                    cursor: getActivateKnightDisabledReason() === null ? 'pointer' : 'not-allowed',
                    textAlign: 'left',
                    background: getActivateKnightDisabledReason() === null ? '#374151' : '#333',
                    color: getActivateKnightDisabledReason() === null ? '#fff' : '#777',
                    marginBottom: 6,
                  }}
                >
                  ⚡ Activate Knight
                </button>
                <button
                  onClick={() => {
                    setKnightMode(prev => (prev === 'move' ? 'none' : 'move'));
                    setSelectedAction(null);
                    setPendingKnightCardIndex(null);
                    setCkBuildCityWallMode(false);
                  }}
                  disabled={getMoveKnightDisabledReason() !== null}
                  title={getMoveKnightDisabledReason() ?? 'Move selected knight'}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 5,
                    border: 'none',
                    fontSize: 12,
                    cursor: getMoveKnightDisabledReason() === null ? 'pointer' : 'not-allowed',
                    textAlign: 'left',
                    background: getMoveKnightDisabledReason() === null ? '#374151' : '#333',
                    color: getMoveKnightDisabledReason() === null ? '#fff' : '#777',
                    marginBottom: 6,
                  }}
                >
                  🧭 Move Knight
                </button>
                <button
                  onClick={() => {
                    if (!selectedKnight) return;
                    dispatch({
                      type: 'CK_PROMOTE_KNIGHT',
                      playerId: currentPlayer.id,
                      payload: { knightId: selectedKnight.id },
                      timestamp: nextTimestamp(),
                    });
                  }}
                  disabled={getPromoteKnightDisabledReason() !== null}
                  title={getPromoteKnightDisabledReason() ?? 'Promote selected knight (1 coin)'}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 5,
                    border: 'none',
                    fontSize: 12,
                    cursor: getPromoteKnightDisabledReason() === null ? 'pointer' : 'not-allowed',
                    textAlign: 'left',
                    background: getPromoteKnightDisabledReason() === null ? '#374151' : '#333',
                    color: getPromoteKnightDisabledReason() === null ? '#fff' : '#777',
                    marginBottom: 6,
                  }}
                >
                  ⬆️ Promote Knight
                </button>
                <button
                  onClick={() => {
                    setKnightMode(prev => (prev === 'driveRobber' ? 'none' : 'driveRobber'));
                    setSelectedAction(null);
                    setPendingKnightCardIndex(null);
                    setCkBuildCityWallMode(false);
                  }}
                  disabled={getDriveRobberDisabledReason() !== null}
                  title={getDriveRobberDisabledReason() ?? 'Drive robber with selected knight'}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: 5,
                    border: 'none',
                    fontSize: 12,
                    cursor: getDriveRobberDisabledReason() === null ? 'pointer' : 'not-allowed',
                    textAlign: 'left',
                    background: getDriveRobberDisabledReason() === null ? '#374151' : '#333',
                    color: getDriveRobberDisabledReason() === null ? '#fff' : '#777',
                  }}
                >
                  🦹 Drive Away Robber
                </button>
              </div>
            )}

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
            {ckBuildCityWallMode && (
              <div style={{ fontSize: 12, color: '#fdba74', marginBottom: 8, padding: '4px 8px', background: 'rgba(251,146,60,0.12)', borderRadius: 4 }}>
                Click a highlighted city to build a city wall
                <button
                  onClick={() => setCkBuildCityWallMode(false)}
                  style={{ marginLeft: 6, background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 12 }}
                >
                  ✕
                </button>
              </div>
            )}
            {knightMode === 'build' && (
              <div style={{ fontSize: 12, color: '#a7f3d0', marginBottom: 8, padding: '4px 8px', background: 'rgba(16,185,129,0.12)', borderRadius: 4 }}>
                Click a highlighted vertex to build a knight
                <button
                  onClick={() => setKnightMode('none')}
                  style={{ marginLeft: 6, background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 12 }}
                >
                  ✕
                </button>
              </div>
            )}
            {knightMode === 'move' && (
              <div style={{ fontSize: 12, color: '#bfdbfe', marginBottom: 8, padding: '4px 8px', background: 'rgba(59,130,246,0.12)', borderRadius: 4 }}>
                Click a highlighted destination to move the selected knight
                <button
                  onClick={() => setKnightMode('none')}
                  style={{ marginLeft: 6, background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 12 }}
                >
                  ✕
                </button>
              </div>
            )}
            {knightMode === 'driveRobber' && (
              <div style={{ fontSize: 12, color: '#fca5a5', marginBottom: 8, padding: '4px 8px', background: 'rgba(239,68,68,0.12)', borderRadius: 4 }}>
                Click a hex to move the robber with the selected knight
                <button
                  onClick={() => setKnightMode('none')}
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

            {gameState.turnPhase === 'discarding' && gameState.pendingDiscards.length > 0 && (
              <div style={{ fontSize: 12, color: '#f97316', padding: 8, background: 'rgba(249,115,22,0.1)', borderRadius: 4 }}>
                ⚠️ {gameState.pendingDiscards.map(id => gameState.players.find(p => p.id === id)?.name).join(', ')} must discard
              </div>
            )}

            {gameState.expansionRules === 'cities_and_knights' && gameState.ck && (
              <div style={{ marginTop: 8, borderTop: '1px solid #333', paddingTop: 8 }}>
                <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>
                  Progress Cards ({progressHand.length})
                </div>
                {progressHand.length === 0 && (
                  <div style={{ fontSize: 10, color: '#888' }}>No progress cards in hand.</div>
                )}
                {(['politics', 'science', 'trade'] as const).map(deck => {
                  const cards = progressByDeck[deck];
                  if (cards.length === 0) return null;
                  const meta = PROGRESS_DECK_META[deck];
                  return (
                    <div key={deck} style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 10, color: meta.accent, fontWeight: 700, marginBottom: 3 }}>
                        {meta.label} ({cards.length})
                      </div>
                      {cards.map(card => (
                        <button
                          key={card.id}
                          onClick={() => playProgressCard(card)}
                          disabled={!canPlayProgressCards}
                          title={progressCardDisabledReason ?? `Play ${card.type} (${card.deck})`}
                          style={{
                            width: '100%',
                            marginBottom: 4,
                            padding: '4px 6px',
                            borderRadius: 4,
                            border: `1px solid ${meta.accent}`,
                            background: canPlayProgressCards ? '#0f172a' : '#1f2937',
                            color: canPlayProgressCards ? '#e2e8f0' : '#6b7280',
                            fontSize: 11,
                            textAlign: 'left',
                            cursor: canPlayProgressCards ? 'pointer' : 'not-allowed',
                            textTransform: 'capitalize',
                          }}
                        >
                          {card.type}
                        </button>
                      ))}
                    </div>
                  );
                })}
                {!canPlayProgressCards && progressCardDisabledReason && (
                  <div style={{ fontSize: 10, color: '#888' }}>{progressCardDisabledReason}</div>
                )}
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
                    setKnightMode('none');
                    setCkBuildCityWallMode(false);
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

    {progressDialogCard && currentPlayer && !isReplayMode && (
      <CkProgressDialog
        card={progressDialogCard}
        players={gameState.players}
        currentPlayerId={currentPlayer.id}
        progressHandCounts={progressHandCounts}
        onCancel={() => setProgressDialogCard(null)}
        onConfirm={handleProgressDialogConfirm}
      />
    )}

    {showBarbarianModal && lastBarbarianAttack && (
      <CkBarbarianModal
        summary={lastBarbarianAttack}
        players={gameState.players}
        onClose={() => setDismissedBarbarianSignature(barbarianSignature ?? null)}
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
