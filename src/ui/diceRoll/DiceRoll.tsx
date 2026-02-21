import React from 'react';
import type { DiceRoll as DiceRollType } from '../../state/gameState';

export type DiceRollProps = {
  lastRoll: DiceRollType | null;
  canRoll: boolean;
  disabledReason?: string | null;
  onRoll: () => void;
};

const DIE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export const DiceRoll: React.FC<DiceRollProps> = ({ lastRoll, canRoll, disabledReason, onRoll }) => {
  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{ fontSize: 40, marginBottom: 6 }}>
        {lastRoll ? (
          <>
            <span>{DIE_FACES[lastRoll.die1]}</span>
            {' '}
            <span>{DIE_FACES[lastRoll.die2]}</span>
          </>
        ) : (
          <span style={{ color: '#666', fontSize: 20 }}>No roll yet</span>
        )}
      </div>
      {lastRoll && (
        <div style={{ fontSize: 16, fontWeight: 'bold', color: '#ffd700', marginBottom: 6 }}>
          Total: {lastRoll.total}
        </div>
      )}
      <button
        onClick={onRoll}
        disabled={!canRoll}
        title={!canRoll ? (disabledReason ?? 'Roll is currently unavailable.') : 'Roll dice'}
        style={{
          background: canRoll ? '#3b82f6' : '#2a3342',
          color: canRoll ? '#fff' : '#7f8a9c',
          border: 'none',
          borderRadius: 6,
          padding: '8px 20px',
          fontSize: 14,
          fontWeight: 'bold',
          cursor: canRoll ? 'pointer' : 'not-allowed',
        }}
      >
        🎲 Roll Dice
      </button>
      {!canRoll && disabledReason && (
        <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>{disabledReason}</div>
      )}
    </div>
  );
};
