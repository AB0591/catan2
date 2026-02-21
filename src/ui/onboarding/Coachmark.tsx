import type { FC } from 'react';

type CoachmarkProps = {
  title: string;
  message: string;
  onDismiss: () => void;
  onDontShowAgain?: () => void;
};

export const Coachmark: FC<CoachmarkProps> = ({ title, message, onDismiss, onDontShowAgain }) => {
  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        width: 320,
        background: 'rgba(15,23,42,0.96)',
        border: '1px solid #334155',
        borderRadius: 10,
        padding: 12,
        zIndex: 60,
        boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
      }}
    >
      <div style={{ fontSize: 12, color: '#facc15', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#e2e8f0', lineHeight: 1.4, marginBottom: 10 }}>{message}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onDismiss}
          style={{
            flex: 1,
            background: '#1d4ed8',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 12,
            padding: '6px 8px',
            cursor: 'pointer',
          }}
        >
          Got it
        </button>
        {onDontShowAgain && (
          <button
            onClick={onDontShowAgain}
            style={{
              flex: 1,
              background: 'transparent',
              color: '#94a3b8',
              border: '1px solid #475569',
              borderRadius: 6,
              fontSize: 12,
              padding: '6px 8px',
              cursor: 'pointer',
            }}
          >
            Don&apos;t show again
          </button>
        )}
      </div>
    </div>
  );
};
