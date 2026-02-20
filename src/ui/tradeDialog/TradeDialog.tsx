import type { FC } from 'react';
import type { GameState } from '../../state/gameState';
import type { ResourceType } from '../../state/playerState';

export type TradeDialogProps = {
  gameState: GameState;
  playerId: string;
  onClose: () => void;
  onTradeBank: (give: ResourceType, receive: ResourceType) => void;
  onTradePlayer: (
    targetId: string,
    give: Partial<Record<ResourceType, number>>,
    receive: Partial<Record<ResourceType, number>>
  ) => void;
};

// Stub — full implementation in Step 12
export const TradeDialog: FC<TradeDialogProps> = ({ onClose }) => {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{ background: '#1e293b', border: '2px solid #3b82f6', borderRadius: 12, padding: 24, minWidth: 300 }}>
        <h3 style={{ color: '#3b82f6', marginTop: 0 }}>Trade</h3>
        <p style={{ color: '#aaa', fontSize: 13 }}>Trading will be implemented in Step 12.</p>
        <button onClick={onClose} style={{ background: '#374151', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' }}>
          Close
        </button>
      </div>
    </div>
  );
};
