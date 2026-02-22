import React from 'react';
import type { PlayerState } from '../../state/playerState';
import type { ExpansionRules } from '../../state/gameState';
import { RESOURCE_ICONS, RESOURCE_NAMES, COMMODITY_ICONS, COMMODITY_NAMES } from '../resourceMeta';

export type PlayerPanelProps = {
  player: PlayerState;
  isCurrentPlayer: boolean;
  isLocalPlayer: boolean;
  expansionRules: ExpansionRules;
  cityWallCount?: number;
  metropolisCount?: number;
};

export const PlayerPanel: React.FC<PlayerPanelProps> = ({
  player,
  isCurrentPlayer,
  isLocalPlayer,
  expansionRules,
  cityWallCount = 0,
  metropolisCount = 0,
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
            title={RESOURCE_NAMES[res as keyof typeof RESOURCE_NAMES] ?? res}
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
            <span style={{ fontSize: 18 }}>{RESOURCE_ICONS[res as keyof typeof RESOURCE_ICONS]}</span>
            <span style={{ fontSize: 12, fontWeight: 'bold', color: count > 0 ? '#fff' : '#888' }}>{count}</span>
          </div>
        ))}
      </div>

      {expansionRules === 'cities_and_knights' && (
        <>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
            {Object.entries(player.commodities).map(([commodity, count]) => (
              <div
                key={commodity}
                title={COMMODITY_NAMES[commodity as keyof typeof COMMODITY_NAMES] ?? commodity}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: count > 0 ? 'rgba(59,130,246,0.18)' : 'rgba(255,255,255,0.05)',
                  padding: '3px 6px',
                  borderRadius: 6,
                  minWidth: 34,
                  opacity: count > 0 ? 1 : 0.45,
                }}
              >
                <span style={{ fontSize: 17 }}>{COMMODITY_ICONS[commodity as keyof typeof COMMODITY_ICONS]}</span>
                <span style={{ fontSize: 12, fontWeight: 'bold', color: count > 0 ? '#dbeafe' : '#78889c' }}>{count}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: '#93c5fd', marginBottom: 6 }}>
            🔵 Pol {player.cityImprovements.politics}/5 · 🟢 Sci {player.cityImprovements.science}/5 · 🟡 Tra {player.cityImprovements.trade}/5
          </div>
          <div style={{ fontSize: 10, color: '#fcd34d', marginBottom: 6 }}>
            🧱 Walls {cityWallCount} · ★ Metropolis {metropolisCount}
          </div>
        </>
      )}

      <div style={{ fontSize: 11, color: '#aaa', display: 'flex', gap: 6 }}>
        <span>🏠 {player.settlements}</span>
        <span>🏙️ {player.cities}</span>
        <span>🛣️ {player.roads}</span>
        <span>🃏 {player.developmentCards.length}</span>
        <span title="Knights played">⚔️ {player.knightsPlayed}</span>
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
