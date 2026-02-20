import { useState } from 'react';
import type { FC, CSSProperties } from 'react';
import type { GameState } from '../../state/gameState';
import type { ResourceType } from '../../state/playerState';
import { getTradeRatio } from '../../engine/trading/tradingActions';

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

const RESOURCES: ResourceType[] = ['wood', 'brick', 'sheep', 'wheat', 'ore'];
const RESOURCE_LABELS: Record<ResourceType, string> = {
  wood: '🌲 Wood', brick: '🧱 Brick', sheep: '🐑 Sheep', wheat: '🌾 Wheat', ore: '⛰️ Ore',
};

function tabStyle(active: boolean): CSSProperties {
  return {
    padding: '6px 16px', cursor: 'pointer', borderRadius: '4px 4px 0 0',
    background: active ? '#1e293b' : '#0f172a', color: active ? '#fff' : '#aaa',
    border: 'none', fontSize: 13,
  };
}

export const TradeDialog: FC<TradeDialogProps> = ({
  gameState, playerId, onClose, onTradeBank, onTradePlayer,
}) => {
  const [tab, setTab] = useState<'bank' | 'player'>('bank');
  const [giveRes, setGiveRes] = useState<ResourceType>('wood');
  const [receiveRes, setReceiveRes] = useState<ResourceType>('brick');
  const [targetId, setTargetId] = useState('');
  const [playerGive, setPlayerGive] = useState<Record<ResourceType, number>>({
    wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0,
  });
  const [playerReceive, setPlayerReceive] = useState<Record<ResourceType, number>>({
    wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0,
  });

  const player = gameState.players.find(p => p.id === playerId);
  if (!player) return null;

  const bankRatio = getTradeRatio(gameState, playerId, giveRes);
  const canBankTrade = player.resources[giveRes] >= bankRatio && giveRes !== receiveRes;
  const otherPlayers = gameState.players.filter(p => p.id !== playerId);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{ background: '#1e293b', border: '2px solid #3b82f6', borderRadius: 12, padding: 24, minWidth: 360 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ color: '#3b82f6', margin: 0 }}>Trade</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        <div style={{ display: 'flex', marginBottom: 16 }}>
          <button onClick={() => setTab('bank')} style={tabStyle(tab === 'bank')}>Bank</button>
          <button onClick={() => setTab('player')} style={tabStyle(tab === 'player')}>Player</button>
        </div>

        {tab === 'bank' && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 4 }}>
                Give (ratio: {bankRatio}:1)
              </label>
              <select value={giveRes} onChange={e => setGiveRes(e.target.value as ResourceType)}
                style={{ width: '100%', padding: '6px', background: '#334155', color: '#fff', border: '1px solid #475569', borderRadius: 4 }}>
                {RESOURCES.map(r => (
                  <option key={r} value={r}>{RESOURCE_LABELS[r]} ({player.resources[r]})</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 4 }}>Receive</label>
              <select value={receiveRes} onChange={e => setReceiveRes(e.target.value as ResourceType)}
                style={{ width: '100%', padding: '6px', background: '#334155', color: '#fff', border: '1px solid #475569', borderRadius: 4 }}>
                {RESOURCES.filter(r => r !== giveRes).map(r => (
                  <option key={r} value={r}>{RESOURCE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <button onClick={() => onTradeBank(giveRes, receiveRes)} disabled={!canBankTrade}
              style={{
                width: '100%', padding: '10px',
                background: canBankTrade ? '#3b82f6' : '#374151',
                color: canBankTrade ? '#fff' : '#666', border: 'none', borderRadius: 6, fontSize: 14,
                cursor: canBankTrade ? 'pointer' : 'not-allowed',
              }}>
              Trade {bankRatio} {giveRes} → 1 {receiveRes}
            </button>
          </div>
        )}

        {tab === 'player' && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#aaa', display: 'block', marginBottom: 4 }}>Trade with</label>
              <select value={targetId} onChange={e => setTargetId(e.target.value)}
                style={{ width: '100%', padding: '6px', background: '#334155', color: '#fff', border: '1px solid #475569', borderRadius: 4 }}>
                <option value="">Select player...</option>
                {otherPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>You give:</div>
                {RESOURCES.map(res => (
                  <div key={res} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <span style={{ flex: 1, fontSize: 11 }}>{res}</span>
                    <button onClick={() => setPlayerGive({ ...playerGive, [res]: Math.max(0, playerGive[res] - 1) })}
                      style={{ width: 20, height: 20, background: '#374151', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}>-</button>
                    <span style={{ width: 16, textAlign: 'center', fontSize: 11 }}>{playerGive[res]}</span>
                    <button onClick={() => setPlayerGive({ ...playerGive, [res]: Math.min(player.resources[res], playerGive[res] + 1) })}
                      style={{ width: 20, height: 20, background: '#374151', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}>+</button>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>You receive:</div>
                {RESOURCES.map(res => {
                  const targetPlayer = gameState.players.find(p => p.id === targetId);
                  const maxReceive = targetPlayer ? targetPlayer.resources[res] : 0;
                  return (
                    <div key={res} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <span style={{ flex: 1, fontSize: 11 }}>{res}</span>
                      <button onClick={() => setPlayerReceive({ ...playerReceive, [res]: Math.max(0, playerReceive[res] - 1) })}
                        style={{ width: 20, height: 20, background: '#374151', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}>-</button>
                      <span style={{ width: 16, textAlign: 'center', fontSize: 11 }}>{playerReceive[res]}</span>
                      <button onClick={() => setPlayerReceive({ ...playerReceive, [res]: Math.min(maxReceive, playerReceive[res] + 1) })}
                        style={{ width: 20, height: 20, background: '#374151', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}>+</button>
                    </div>
                  );
                })}
              </div>
            </div>

            <button onClick={() => { if (targetId) onTradePlayer(targetId, playerGive, playerReceive); }}
              disabled={!targetId}
              style={{
                width: '100%', padding: '10px',
                background: targetId ? '#3b82f6' : '#374151',
                color: targetId ? '#fff' : '#666', border: 'none', borderRadius: 6, fontSize: 14,
                cursor: targetId ? 'pointer' : 'not-allowed',
              }}>
              Propose Trade
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
