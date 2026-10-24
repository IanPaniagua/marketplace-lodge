import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Círculo Market — Vende entre los tuyos',
  description:
    'Crea tu catálogo personal y decide quién puede verlo: solo tus amigos o cualquiera con tu enlace.',
  openGraph: {
    title: 'Círculo Market',
    description: 'Tu catálogo. Tu gente. Tus reglas.',
    type: 'website',
  },
};

const steps = [
  {
    number: '01',
    title: 'Crea tu catálogo',
    copy: 'Sube lo que quieres vender, fija el precio o regálalo. Todo queda ordenado en tu perfil.',
    Icon: Sparkles,
  },
  {
    number: '02',
    title: 'Elige quién puede verlo',
    copy: 'Publica para tus amigos o abre un producto a cualquiera que reciba tu enlace.',
    Icon: ShieldCheck,
  },
  {
    number: '03',
    title: 'Compártelo y vende',
    copy: 'Envía tu catálogo, habla por chat y cierra la venta con alguien de confianza.',
    Icon: MessageCircle,
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-dvh overflow-hidden bg-background">
      <header className="sticky top-0 z-50 border-b border-white/70 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-semibold tracking-tight" aria-label="Círculo Market, inicio">
            Círculo<span className="brand-gradient-text"> Market</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex" aria-label="Navegación principal">
            <a href="#como-funciona" className="transition-colors duration-150 hover:text-foreground">
              Cómo funciona
            </a>
            <a href="#comunidad" className="transition-colors duration-150 hover:text-foreground">
              Comunidad
            </a>
            <a href="#seguridad" className="transition-colors duration-150 hover:text-foreground">
              Seguridad
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/login">Iniciar sesión</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Unirme</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="relative">
        <div className="pointer-events-none absolute -left-32 top-4 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 top-40 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 sm:pt-20 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-md border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary">
              <Users className="h-4 w-4" />
              Tu marketplace personal
            </div>
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Vende de todo, sin tener que enseñárselo{' '}
              <span className="brand-gradient-text">a todo el mundo.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Crea tu catálogo y decide quién entra: solo tus amigos o cualquiera con tu enlace. Más personal que un marketplace masivo, más fácil que vender por mensajes.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/signup">
                  Crear mi catálogo
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link href="#como-funciona">Ver cómo funciona</Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground">
              {['Tú eliges la privacidad', 'Comparte con un enlace', 'Chat directo'].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3 w-3" />
                  </span>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:mx-0">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] border bg-muted shadow-xl sm:aspect-[5/4]">
              <Image
                src="/images/landing/friends-lamp-handoff.jpg"
                alt="Tres amigos compartiendo una lámpara en casa"
                fill
                priority
                unoptimized
                sizes="(min-width: 1024px) 560px, (min-width: 640px) 80vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-slate-950/55 to-transparent" />
              <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md border border-white/60 bg-white/90 px-2.5 py-1.5 text-xs font-medium text-primary shadow-sm backdrop-blur sm:left-4 sm:top-4">
                <LockKeyhole className="h-3.5 w-3.5" />
                Compartido solo con amigos
              </div>
              <div className="absolute bottom-4 left-4 right-4 text-white sm:bottom-5 sm:left-5">
                <p className="text-xs font-medium uppercase tracking-wider text-white/70">De Marta para Ana</p>
                <p className="mt-1 max-w-sm text-lg font-semibold tracking-tight sm:text-xl">Una lámpara con historia encuentra otra casa.</p>
              </div>
            </div>

            <div className="absolute -bottom-5 -right-2 flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-md sm:-right-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <MessageCircle className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-medium">Ana: Me encanta, me la quedo</p>
                <p className="text-[10px] text-muted-foreground">Conversación privada</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="border-y bg-card/70 py-20 sm:py-24">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-wider text-primary">Tú tienes el control</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Publicar es fácil. Elegir la audiencia también.</h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Un mismo espacio para vender con calma, compartir con intención y mantener cada anuncio tan privado —o tan abierto— como quieras.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {steps.map(({ number, title, copy, Icon }) => (
              <article key={number} className="rounded-lg border bg-background p-6 transition-shadow duration-150 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium tabular-nums text-muted-foreground">{number}</span>
                </div>
                <h3 className="mt-6 text-lg font-medium">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="comunidad" className="py-20 sm:py-28">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8">
          <div className="relative order-2 lg:order-1">
            <div className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] border bg-muted shadow-xl">
              <Image
                src="/images/landing/friends-browsing-together.jpg"
                alt="Un grupo de amigos compartiendo libros, ropa y una cámara"
                fill
                unoptimized
                sizes="(min-width: 1024px) 520px, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-950/70 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 text-white sm:bottom-7 sm:left-7">
                <p className="text-xs font-medium uppercase tracking-wider text-white/70">Lo bueno empieza cerca</p>
                <p className="mt-1 max-w-md text-xl font-semibold tracking-tight sm:text-2xl">Cosas que cambian de manos. Historias que siguen en el círculo.</p>
              </div>
            </div>
            <div className="brand-gradient absolute -bottom-3 -left-3 h-20 w-20 rounded-lg opacity-20 blur-xl" />
          </div>

          <div className="order-1 lg:order-2">
            <p className="text-xs font-medium uppercase tracking-wider text-primary">Más personal por diseño</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Empieza por la gente que ya confía en ti.</h2>
            <p className="mt-5 text-base leading-7 text-muted-foreground">
              Las plataformas masivas te obligan a vender a desconocidos. Círculo Market pone primero tus relaciones: tu perfil funciona como un pequeño escaparate que puedes compartir con amigos, familia, compañeros o grupos privados.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-card p-4">
                <LockKeyhole className="h-5 w-5 text-primary" />
                <h3 className="mt-3 text-base font-medium">Solo amigos</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Las personas que aceptes ven tu catálogo privado.</p>
              </div>
              <div className="rounded-lg border bg-card p-4">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="mt-3 text-base font-medium">Con enlace</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">Abre solo el producto que quieras compartir fuera.</p>
              </div>
            </div>
            <ul className="mt-7 space-y-4">
              {[
                'Vende ropa, muebles, tecnología, libros o cualquier otra cosa.',
                'Agrupa todos tus anuncios en un catálogo personal fácil de compartir.',
                'Haz público solo aquello que quieras mover más allá de tus amigos.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-6">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Check className="h-3 w-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="seguridad" className="pb-20 sm:pb-28">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid overflow-hidden rounded-[1.25rem] border bg-card lg:grid-cols-[0.9fr_1.1fr] lg:items-stretch">
            <div className="relative min-h-80 bg-muted lg:min-h-[30rem]">
              <Image
                src="/images/landing/friends-trusted-handoff.jpg"
                alt="Dos amigas intercambiando un casco de bicicleta con confianza"
                fill
                unoptimized
                sizes="(min-width: 1024px) 480px, 100vw"
                className="object-cover object-center"
              />
            </div>
            <div className="p-7 sm:p-10 lg:flex lg:flex-col lg:justify-center lg:p-12">
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <p className="mt-6 text-xs font-medium uppercase tracking-wider text-primary">La confianza cambia la experiencia</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Vender se siente distinto cuando sabes quién está al otro lado.</h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Tú decides si algo se queda entre amigos o viaja más lejos mediante un enlace. Sin exponer todo tu catálogo y sin perder el control.
              </p>
              <div className="mt-7 grid gap-5 border-t pt-7 sm:grid-cols-2">
                <div>
                  <h3 className="text-base font-medium">Tu círculo, tus decisiones</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Acepta a tus amigos y reserva para ellos lo que prefieras mantener cerca.</p>
                </div>
                <div>
                  <h3 className="text-base font-medium">Público cuando tú quieras</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Comparte una pieza concreta sin convertir todo tu perfil en público.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20 sm:px-6 sm:pb-24 lg:px-8">
        <div className="brand-gradient relative mx-auto max-w-6xl overflow-hidden rounded-[1.25rem] px-6 py-12 text-center text-primary-foreground sm:px-10 sm:py-16">
          <div className="pointer-events-none absolute -right-12 -top-20 h-56 w-56 rounded-full border border-white/20" />
          <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full border border-white/20" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Tu próximo comprador puede estar en tu círculo.</h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-white/80">
              Crea un catálogo personal, invita a tus amigos y abre cada producto solo cuando tú decidas.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-8 w-full bg-white text-foreground hover:bg-white/90 sm:w-auto">
              <Link href="/signup">
                Crear mi catálogo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t bg-card/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="font-medium text-foreground">
            Círculo<span className="brand-gradient-text"> Market</span>
          </p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="transition-colors duration-150 hover:text-foreground">Privacidad</Link>
            <Link href="/login" className="transition-colors duration-150 hover:text-foreground">Iniciar sesión</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
