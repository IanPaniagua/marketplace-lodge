import { ImageResponse } from 'next/og';
import { getFriendInvitePreview } from '@/lib/friend-invites';

export const alt = 'Invitación a Círculo Market';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function OpenGraphImage({ params }: Props) {
  const { token } = await params;
  const invitation = await getFriendInvitePreview(token);
  const displayName = invitation?.display_name ?? 'Un amigo';

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          padding: 54,
          width: '100%',
        }}
      >
        <div
          style={{
            alignItems: 'center',
            background: '#FFFFFF',
            borderRadius: 34,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            justifyContent: 'center',
            padding: '44px 76px',
            textAlign: 'center',
            width: '100%',
          }}
        >
          <div style={{ color: '#0F172A', display: 'flex', fontSize: 38, fontWeight: 600 }}>
            Círculo <span style={{ color: '#2563EB', marginLeft: 10 }}>Market</span>
          </div>
          <div style={{ color: '#0F172A', display: 'flex', fontSize: 62, fontWeight: 600, marginTop: 56 }}>
            {displayName} te invita
          </div>
          <div style={{ color: '#475569', display: 'flex', fontSize: 30, marginTop: 18 }}>
            Únete al marketplace personal para vender entre amigos
          </div>
          <div
            style={{
              background: 'linear-gradient(135deg, #2563EB 0%, #06B6D4 100%)',
              borderRadius: 16,
              color: '#FFFFFF',
              display: 'flex',
              fontSize: 26,
              fontWeight: 600,
              marginTop: 48,
              padding: '18px 34px',
            }}
          >
            Regístrate y conecta automáticamente
          </div>
        </div>
      </div>
    ),
    size,
  );
}
