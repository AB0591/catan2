import { useMemo, useState } from 'react';
import type { FC } from 'react';
import type { GameAction } from '../../state/gameState';

type ActionCategory = 'setup' | 'build' | 'trade' | 'robber' | 'dev' | 'turn';

const CATEGORY_ORDER: ActionCategory[] = ['setup', 'build', 'trade', 'robber', 'dev', 'turn'];

function categorizeAction(type: GameAction['type']): ActionCategory {
  if (type === 'PLACE_SETTLEMENT' || type === 'PLACE_ROAD' || type === 'PLACE_CITY') return 'setup';
  if (
    type === 'BUILD_SETTLEMENT'
    || type === 'BUILD_ROAD'
    || type === 'BUILD_CITY'
    || type === 'BUY_DEVELOPMENT_CARD'
    || type === 'CK_BUILD_KNIGHT'
    || type === 'CK_ACTIVATE_KNIGHT'
    || type === 'CK_MOVE_KNIGHT'
    || type === 'CK_PROMOTE_KNIGHT'
    || type === 'CK_IMPROVE_CITY'
    || type === 'CK_BUILD_CITY_WALL'
  ) return 'build';
  if (type === 'TRADE_BANK' || type === 'TRADE_PORT' || type === 'TRADE_PLAYER') return 'trade';
  if (type === 'MOVE_ROBBER' || type === 'STEAL_RESOURCE' || type === 'DISCARD_RESOURCES' || type === 'CK_DRIVE_AWAY_ROBBER') return 'robber';
  if (type === 'PLAY_KNIGHT' || type === 'PLAY_ROAD_BUILDING' || type === 'PLAY_YEAR_OF_PLENTY' || type === 'PLAY_MONOPOLY' || type === 'CK_PLAY_PROGRESS_CARD') return 'dev';
  return 'turn';
}

type ActionTimelineProps = {
  actionLog: GameAction[];
  isReplayMode: boolean;
  timelineIndex: number | null;
  onJumpTo: (index: number | null) => void;
  onResumeFromHere: () => void;
  onReturnToLive: () => void;
};

export const ActionTimeline: FC<ActionTimelineProps> = ({
  actionLog,
  isReplayMode,
  timelineIndex,
  onJumpTo,
  onResumeFromHere,
  onReturnToLive,
}) => {
  const [filters, setFilters] = useState<Record<ActionCategory, boolean>>({
    setup: true,
    build: true,
    trade: true,
    robber: true,
    dev: true,
    turn: true,
  });

  const selectedIndex = timelineIndex ?? actionLog.length;

  const filteredEntries = useMemo(() => {
    return actionLog
      .map((action, index) => ({ action, index, category: categorizeAction(action.type) }))
      .filter(entry => filters[entry.category]);
  }, [actionLog, filters]);

  return (
    <div style={{ marginTop: 10, borderTop: '1px solid #333', paddingTop: 8 }}>
      <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>Timeline</div>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
        {CATEGORY_ORDER.map(category => (
          <button
            key={category}
            onClick={() => setFilters(prev => ({ ...prev, [category]: !prev[category] }))}
            style={{
              fontSize: 10,
              padding: '2px 6px',
              borderRadius: 10,
              border: '1px solid #555',
              background: filters[category] ? '#1f2937' : '#111827',
              color: filters[category] ? '#cbd5e1' : '#6b7280',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {category}
          </button>
        ))}
      </div>

      <input
        type="range"
        min={0}
        max={actionLog.length}
        value={selectedIndex}
        onChange={e => {
          const value = Number(e.target.value);
          if (value >= actionLog.length) {
            onJumpTo(null);
          } else {
            onJumpTo(value);
          }
        }}
        style={{ width: '100%' }}
      />
      <div style={{ fontSize: 10, color: '#888', marginTop: 2, marginBottom: 6 }}>
        Step {selectedIndex} / {actionLog.length} {isReplayMode ? '(Replay)' : '(Live)'}
      </div>

      {isReplayMode && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <button
            onClick={onResumeFromHere}
            style={{
              flex: 1,
              background: '#065f46',
              color: '#d1fae5',
              border: '1px solid #10b981',
              borderRadius: 4,
              fontSize: 11,
              padding: '4px 6px',
              cursor: 'pointer',
            }}
          >
            Resume From Here
          </button>
          <button
            onClick={onReturnToLive}
            style={{
              flex: 1,
              background: '#1f2937',
              color: '#cbd5e1',
              border: '1px solid #4b5563',
              borderRadius: 4,
              fontSize: 11,
              padding: '4px 6px',
              cursor: 'pointer',
            }}
          >
            Return to Live
          </button>
        </div>
      )}

      <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid #222', borderRadius: 4, padding: 4 }}>
        {filteredEntries.length === 0 && (
          <div style={{ fontSize: 11, color: '#777' }}>No actions for selected filters.</div>
        )}
        {filteredEntries.map(({ action, index }) => (
          <button
            key={`${action.timestamp}_${index}`}
            onClick={() => onJumpTo(index + 1)}
            style={{
              width: '100%',
              textAlign: 'left',
              background: (index + 1) === selectedIndex ? 'rgba(59,130,246,0.2)' : 'transparent',
              color: (index + 1) === selectedIndex ? '#bfdbfe' : '#cbd5e1',
              border: 'none',
              padding: '3px 4px',
              borderRadius: 3,
              fontSize: 11,
              cursor: 'pointer',
              marginBottom: 2,
            }}
            title={`${action.type} by ${action.playerId}`}
          >
            #{index + 1} {action.type}
          </button>
        ))}
      </div>
    </div>
  );
};
