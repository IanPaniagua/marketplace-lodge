import { CalendarDays } from 'lucide-react';

export const metadata = { title: 'Events — Lodge Market' };

export default function EventsPage() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <CalendarDays className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold">Events — Coming Soon</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        Lodge Market events will be available in a future update. Stay tuned.
      </p>
    </main>
  );
}
