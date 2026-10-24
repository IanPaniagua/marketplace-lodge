import type { Metadata } from 'next';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  Armchair,
  BookOpen,
  Check,
  LampDesk,
  Leaf,
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

const listings: Array<{
  title: string;
  price: string;
  owner: string;
  Icon: LucideIcon;
  featured?: boolean;
}> = [
  { title: 'Lámpara de escritorio', price: '12 €', owner: 'Marta', Icon: LampDesk },
  { title: 'Sillón de lectura', price: 'Gratis', owner: 'Leo', Icon: Armchair, featured: true },
  { title: 'Pack de novelas', price: '8 €', owner: 'Sofía', Icon: BookOpen },
  { title: 'Planta con maceta', price: '5 €', owner: 'Álex', Icon: Leaf },
];

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
            <div className="absolute -left-3 top-14 hidden rounded-lg border bg-card px-3 py-2 shadow-md sm:block lg:-left-8">
              <p className="text-xs text-muted-foreground">Visibilidad</p>
              <p className="text-sm font-medium text-foreground">Solo amigos</p>
            </div>

            <div className="surface-card relative overflow-hidden rounded-[1.25rem] p-3 sm:p-5">
              <div className="mb-4 flex items-center justify-between px-1">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Catálogo de Ana</p>
                  <h2 className="mt-1 text-lg font-semibold tracking-tight">Lo que estoy vendiendo</h2>
                </div>
                <div className="flex -space-x-2" aria-label="Tres amigos con acceso">
                  {['M', 'L', 'S'].map((letter, index) => (
                    <span
                      key={letter}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-xs font-medium text-muted-foreground"
                      style={{ zIndex: 3 - index }}
                    >
                      {letter}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {listings.map(({ title, price, owner, Icon, featured }) => (
                  <article key={title} className="overflow-hidden rounded-lg border bg-card shadow-sm">
                    <div className="relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-primary/10 to-cyan-400/10">
                      <Icon className="h-10 w-10 text-primary/70 sm:h-12 sm:w-12" strokeWidth={1.6} />
                      {featured && (
                        <span className="brand-gradient absolute left-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                          GRATIS
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 p-3">
                      <h3 className="truncate text-sm font-medium">{title}</h3>
                      <div className="flex items-end justify-between gap-2">
                        <p className="text-sm font-semibold tabular-nums text-primary">{price}</p>
                        <p className="text-[10px] text-muted-foreground">{owner}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="absolute -bottom-5 -right-2 flex items-center gap-2 rounded-lg border bg-card px-3 py-2 shadow-md sm:-right-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <MessageCircle className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-medium">¡Me interesa!</p>
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
            <div className="overflow-hidden rounded-[1.25rem] bg-foreground p-7 text-background shadow-xl sm:p-10">
              <p className="text-sm text-background/60">Dos formas de compartir. Siempre bajo tu control.</p>
              <div className="mt-8 grid grid-cols-2 gap-6">
                <div>
                  <p className="text-2xl font-semibold tracking-tight">Amigos</p>
                  <p className="mt-2 text-sm leading-6 text-background/60">Solo las personas que aceptes ven tus productos privados.</p>
                </div>
                <div>
                  <p className="text-2xl font-semibold tracking-tight">Enlace público</p>
                  <p className="mt-2 text-sm leading-6 text-background/60">Abre un producto y compártelo fuera de tu círculo cuando te convenga.</p>
                </div>
              </div>
              <div className="mt-9 border-t border-background/15 pt-6">
                <p className="max-w-md text-base leading-7 text-background/80">
                  “No todo lo que vendes necesita acabar delante de miles de desconocidos.”
                </p>
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
          <div className="grid gap-8 rounded-[1.25rem] border bg-card p-7 sm:p-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:p-12">
            <div>
              <span className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">Privacidad que se entiende.</h2>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <h3 className="text-base font-medium">Tu círculo, tus decisiones</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Acepta a tus amigos y reserva para ellos los productos que no quieres publicar fuera.
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium">Público cuando tú quieras</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Cada producto puede abrirse mediante enlace sin convertir todo tu perfil en público.
                </p>
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
