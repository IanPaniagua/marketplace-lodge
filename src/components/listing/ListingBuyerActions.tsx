'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HandCoins, LoaderCircle, Minus, Plus, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { sendListingIntent } from '@/app/(app)/chats/actions';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MessageSellerButton from '@/components/chat/MessageSellerButton';

interface Props {
  listingId: string;
  sellerId: string;
  listingTitle: string;
  price: number | null;
  isGift: boolean;
}

type PendingAction = 'buy' | 'offer' | null;

function formatEuro(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function defaultOffer(price: number): number {
  const discounted = Math.round(price * 0.9 * 100) / 100;
  return Math.max(0.01, Math.min(price - 0.01, discounted));
}

export default function ListingBuyerActions({
  listingId,
  sellerId,
  listingTitle,
  price,
  isGift,
}: Props) {
  const router = useRouter();
  const canMakeOffer = !isGift && price != null && price > 0.01;
  const initialOffer = useMemo(() => (price != null ? defaultOffer(price) : 0.01), [price]);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerValue, setOfferValue] = useState(String(initialOffer));
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const parsedOffer = Number(offerValue.replace(',', '.'));
  const offerIsValid =
    canMakeOffer &&
    Number.isFinite(parsedOffer) &&
    parsedOffer > 0 &&
    price != null &&
    parsedOffer < price;

  async function sendIntent(intent: Exclude<PendingAction, null>, offeredPrice?: number) {
    if (pendingAction) return;
    setPendingAction(intent);

    const { data, error } = await sendListingIntent(listingId, intent, offeredPrice);
    if (error || !data) {
      toast.error(error ?? 'No se pudo enviar el mensaje');
      setPendingAction(null);
      return;
    }

    // The message is already persisted. Push delivery is best-effort and must not
    // prevent the buyer from entering the conversation.
    void fetch('/api/notify/new-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: data.message.id }),
    }).catch(() => undefined);

    if (intent === 'offer') setOfferOpen(false);
    toast.success(intent === 'offer' ? 'Oferta enviada' : 'Mensaje enviado');
    router.push(`/chats/${data.conversationId}`);
  }

  function changeOffer(delta: number) {
    if (price == null) return;
    const current = Number.isFinite(parsedOffer) ? parsedOffer : initialOffer;
    const next = Math.min(price - 0.01, Math.max(0.01, current + delta));
    setOfferValue(String(Math.round(next * 100) / 100));
  }

  return (
    <>
      <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:justify-end">
        <Button
          size="sm"
          className="col-span-2 sm:col-span-1"
          disabled={pendingAction !== null}
          onClick={() => void sendIntent('buy')}
        >
          {pendingAction === 'buy' ? (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          ) : (
            <ShoppingBag aria-hidden="true" />
          )}
          {pendingAction === 'buy' ? 'Enviando…' : '¡Te lo compro!'}
        </Button>

        {canMakeOffer && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pendingAction !== null}
            onClick={() => setOfferOpen(true)}
          >
            <HandCoins aria-hidden="true" />
            Hacer oferta
          </Button>
        )}

        <MessageSellerButton
          listingId={listingId}
          sellerId={sellerId}
          className={canMakeOffer ? undefined : 'col-span-2 sm:col-span-1'}
        />
      </div>

      <Dialog open={offerOpen} onOpenChange={(open) => !pendingAction && setOfferOpen(open)}>
        <DialogContent className="w-[calc(100%-2rem)] rounded-lg sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Haz una oferta</DialogTitle>
            <DialogDescription>
              Elige cuánto quieres ofrecer por “{listingTitle}”. Al confirmar, enviaremos el mensaje
              al vendedor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Precio anunciado
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                {price != null ? formatEuro(price) : '—'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="offer-price">Tu oferta</Label>
              <div className="grid grid-cols-[44px_1fr_44px] items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => changeOffer(-1)}
                  disabled={pendingAction !== null || parsedOffer <= 0.01}
                  aria-label="Restar un euro"
                >
                  <Minus aria-hidden="true" />
                </Button>
                <div className="relative">
                  <Input
                    id="offer-price"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    max={price != null ? Math.max(0.01, price - 0.01) : undefined}
                    step="0.01"
                    value={offerValue}
                    onChange={(event) => setOfferValue(event.target.value)}
                    disabled={pendingAction !== null}
                    className="h-11 pr-9 text-center text-lg font-semibold tabular-nums"
                    aria-describedby={
                      !offerIsValid && offerValue !== ''
                        ? 'offer-help offer-error'
                        : 'offer-help'
                    }
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">
                    €
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => changeOffer(1)}
                  disabled={
                    pendingAction !== null || (price != null && parsedOffer >= price - 0.01)
                  }
                  aria-label="Sumar un euro"
                >
                  <Plus aria-hidden="true" />
                </Button>
              </div>
              <p id="offer-help" className="text-xs text-muted-foreground">
                La oferta debe ser menor que el precio anunciado.
              </p>
              {!offerIsValid && offerValue !== '' && (
                <p id="offer-error" className="text-xs text-destructive" role="alert">
                  Introduce un importe mayor que 0 € y menor que{' '}
                  {price != null ? formatEuro(price) : 'el precio anunciado'}.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOfferOpen(false)}
              disabled={pendingAction !== null}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!offerIsValid || pendingAction !== null}
              onClick={() => void sendIntent('offer', parsedOffer)}
            >
              {pendingAction === 'offer' ? (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              ) : (
                <HandCoins aria-hidden="true" />
              )}
              {pendingAction === 'offer'
                ? 'Enviando…'
                : offerIsValid
                  ? `Ofrecer ${formatEuro(parsedOffer)}`
                  : 'Enviar oferta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
