import type { FC } from 'react';
import type { ResourceType } from '../../state/playerState';
import { RESOURCE_ICONS, RESOURCE_NAMES } from '../resourceMeta';

type ResourceGainOverlayProps = {
  gains: Partial<Record<ResourceType, number>> | null | undefined;
  durationMs?: number;
};

const ANIMATION_NAME = 'resourceGainFade';

export const ResourceGainOverlay: FC<ResourceGainOverlayProps> = ({
  gains,
  durationMs = 2500,
}) => {
  const entries = (Object.entries(gains ?? {}) as [ResourceType, number][])
    .filter(([, amount]) => (amount ?? 0) > 0);

  if (entries.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes ${ANIMATION_NAME} {
          0% {
            opacity: 0;
            transform: translate(-50%, 8px) scale(0.96);
          }
          12% {
            opacity: 1;
            transform: translate(-50%, 0) scale(1);
          }
          84% {
            opacity: 1;
            transform: translate(-50%, -2px) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -6px) scale(0.97);
          }
        }
      `}</style>
      <div
        data-testid="resource-gain-overlay"
        style={{
          position: 'absolute',
          left: '50%',
          top: 4,
          transform: 'translateX(-50%)',
          zIndex: 12,
          pointerEvents: 'none',
          animation: `${ANIMATION_NAME} ${durationMs}ms ease-out forwards`,
        }}
      >
        <div style={{ fontSize: 10, color: '#a7f3d0', textAlign: 'center', marginBottom: 4, fontWeight: 700 }}>
          Gained
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {entries.map(([resource, amount], index) => (
            <div
              key={resource}
              title={`${amount} ${RESOURCE_NAMES[resource]}`}
              style={{
                width: 58,
                height: 74,
                marginLeft: index === 0 ? 0 : -14,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.4)',
                background: 'linear-gradient(180deg, rgba(30,41,59,0.96), rgba(15,23,42,0.96))',
                boxShadow: '0 6px 12px rgba(0,0,0,0.35)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{RESOURCE_ICONS[resource]}</span>
              <span style={{ fontSize: 15, fontWeight: 800, marginTop: 4 }}>+{amount}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
