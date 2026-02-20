import React from 'react';
import type { PlayerState } from '../../state/playerState';

export type PlayerPanelProps = {
  player: PlayerState;
  isCurrentPlayer: boolean;
  isLocalPlayer: boolean;
};

const RESOURCE_LABELS: Record<string, string> = {
  wood: '🌲',
  brick: '🧱',
  sheep: '🐑',
  wheat: '🌾',
  ore: '⛰️',
};

export const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player,
  isCurrentPlayer,
  isLocalPlayer,
}) => {

  return (
    <div
      style={{
        border: `2px solid ${isCurrentPlayer ? '#ffff00' : '#444'}`,
        borderRadius: 8,
        padding: 8,
        marginBottom: 8,
        background: isCurrentPlayer ? 'rgba(255,255,0,0.08)' : 'rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: '50%',
            background: player.color,
            border: '1px solid #fff',
            flexShrink: 0,
          }}
        />
        <span style={{ fontWeight: 'bold', fontSize: 13 }}>{player.name}</span>
        {isCurrentPlayer && (
          <span style={{ fontSize: 11, color: '#ffff00', marginLeft: 'auto' }}>
            ▶ Turn
          </span>
        )}
        {isLocalPlayer && !isCurrentPlayer && (
          <span style={{ fontSize: 10, color: '#aaa', marginLeft: 'auto' }}>You</span>
        )}
      </div>

      <div style={{ fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: '#ffd700', fontWeight: 'bold' }}>⭐ {player.victoryPoints} VP</span>
      </div>

      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
        {Object.entries(player.resources).map(([res, count]) => (
          <div
            key={res}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: count > 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
              padding: '4px 6px',
              borderRadius: 6,
              minWidth: 34,
              opacity: count > 0 ? 1 : 0.4,
            }}
          >
            <span style={{ fontSize: 18 }}>{RESOURCE_LABELS[res]}</span>
            <span style={{ fontSize: 12, fontWeight: 'bold', color: count > 0 ? '#fff' : '#888' }}>{count}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: '#aaa', display: 'flex', gap: 6 }}>
        <span>🏠 {player.settlements}</span>
        <span>🏙️ {player.cities}</span>
        <span>🛣️ {player.roads}</span>
        <span>🃏 {player.developmentCards.length}</span>
      </div>

      {player.hasLargestArmy && (
        <div style={{ fontSize: 11, color: '#f97316', marginTop: 2 }}>⚔️ Largest Army</div>
      )}
      {player.hasLongestRoad && (
        <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 2 }}>🛣️ Longest Road</div>
      )}
    </div>
  );
};
