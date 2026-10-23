'use client';

import { useTransition } from 'react';
import { MessageCircle, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { createFriendInvite } from '@/app/invite/actions';
import { Button, type ButtonProps } from '@/components/ui/button';

interface Props {
  displayName: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}

function drawCenteredText(
  context: CanvasRenderingContext2D,
  text: string,
  y: number,
  maxWidth: number,
  maxFontSize: number,
) {
  let fontSize = maxFontSize;
  do {
    context.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
    fontSize -= 2;
  } while (context.measureText(text).width > maxWidth && fontSize > 34);
  context.fillText(text, 540, y);
}

async function createInvitationImage(displayName: string): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const background = context.createLinearGradient(0, 0, 1080, 1350);
  background.addColorStop(0, '#2563EB');
  background.addColorStop(1, '#06B6D4');
  context.fillStyle = background;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.globalAlpha = 0.16;
  context.fillStyle = '#FFFFFF';
  context.beginPath();
  context.arc(950, 150, 270, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(90, 1220, 340, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;

  context.fillStyle = '#FFFFFF';
  roundedRect(context, 90, 90, 900, 1170, 44);

  context.fillStyle = '#0F172A';
  context.font = '600 52px system-ui, -apple-system, sans-serif';
  context.fillText('Lodge', 150, 190);
  const logoWidth = context.measureText('Lodge').width;
  const logoGradient = context.createLinearGradient(150 + logoWidth, 0, 500, 0);
  logoGradient.addColorStop(0, '#2563EB');
  logoGradient.addColorStop(1, '#06B6D4');
  context.fillStyle = logoGradient;
  context.fillText(' Market', 150 + logoWidth, 190);

  context.fillStyle = '#DBEAFE';
  context.beginPath();
  context.arc(540, 410, 126, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#2563EB';
  context.font = '600 116px system-ui, -apple-system, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(displayName.trim().charAt(0).toUpperCase(), 540, 414);

  context.fillStyle = '#0F172A';
  context.textBaseline = 'alphabetic';
  drawCenteredText(context, `${displayName} te invita`, 640, 780, 58);
  context.font = '600 58px system-ui, -apple-system, sans-serif';
  context.fillText('a Lodge Market', 540, 712);

  context.fillStyle = '#475569';
  context.font = '400 34px system-ui, -apple-system, sans-serif';
  context.fillText('Únete al mercado privado de residentes,', 540, 808);
  context.fillText('comparte lo que ya no usas y conecta.', 540, 854);

  const buttonGradient = context.createLinearGradient(300, 0, 780, 0);
  buttonGradient.addColorStop(0, '#2563EB');
  buttonGradient.addColorStop(1, '#06B6D4');
  context.fillStyle = buttonGradient;
  roundedRect(context, 250, 950, 580, 112, 24);
  context.fillStyle = '#FFFFFF';
  context.font = '600 34px system-ui, -apple-system, sans-serif';
  context.fillText('Acepta mi invitación', 540, 1022);

  context.fillStyle = '#64748B';
  context.font = '400 27px system-ui, -apple-system, sans-serif';
  context.fillText('Abre el enlace adjunto para registrarte', 540, 1160);
  context.textAlign = 'start';

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.92));
}

export default function InviteFriendsButton({
  displayName,
  variant = 'default',
  size = 'default',
  className,
}: Props) {
  const [isPending, startTransition] = useTransition();

  function invite() {
    startTransition(async () => {
      const invitation = await createFriendInvite();
      if (invitation.error || !invitation.token) {
        toast.error(invitation.error ?? 'No se pudo crear la invitación.');
        return;
      }

      const url = `${window.location.origin}/invite/${invitation.token}`;
      const text = `${displayName} te invita a Lodge Market. Regístrate con este enlace y seréis amigos automáticamente.`;

      try {
        const image = await createInvitationImage(displayName);
        const file = image
          ? new File([image], 'invitacion-lodge-market.png', { type: 'image/png' })
          : null;

        if (navigator.share) {
          const shareData: ShareData = { title: 'Invitación a Lodge Market', text, url };
          if (file && navigator.canShare?.({ files: [file] })) shareData.files = [file];
          try {
            await navigator.share(shareData);
            return;
          } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            if (shareData.files) {
              await navigator.share({ title: shareData.title, text, url });
              return;
            }
            throw error;
          }
        }

        window.location.assign(`https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;

        try {
          await navigator.clipboard.writeText(`${text}\n\n${url}`);
          toast.success('Invitación copiada. Ya puedes pegarla en WhatsApp.');
        } catch {
          toast.error('No se pudo compartir la invitación.');
        }
      }
    });
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      disabled={isPending}
      onClick={invite}
    >
      {variant === 'default' ? <MessageCircle /> : <Share2 />}
      {isPending ? 'Preparando…' : 'Invitar por WhatsApp'}
    </Button>
  );
}
