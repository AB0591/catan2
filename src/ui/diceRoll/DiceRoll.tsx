import React from 'react';
import type { DiceRoll as DiceRollType } from '../../state/gameState';

export type DiceRollProps = {
  lastRoll: DiceRollType | null;
  canRoll: boolean;
  onRoll: () => void;
};

const DIE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export const DiceRoll: React.FC<DiceRollProps> = ({ lastRoll, canRoll, onRoll }) => {
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
      {canRoll && (
        <button
          onClick={onRoll}
          style={{
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '8px 20px',
            fontSize: 14,
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          🎲 Roll Dice
        </button>
      )}
    </div>
  );
};
