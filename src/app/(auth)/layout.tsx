export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="relative mb-8 text-center">
        <span className="text-3xl font-semibold tracking-tight">
          Lodge<span className="brand-gradient-text"> Market</span>
        </span>
      </div>
      <div className="surface-card relative w-full max-w-sm rounded-2xl p-6 md:p-8">{children}</div>
    </main>
  );
}
