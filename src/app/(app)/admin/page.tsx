import { getServerProfile } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ShoppingBagIcon, FlagIcon, BarChart3Icon } from 'lucide-react';

export default async function AdminPage() {
  const profile = await getServerProfile();
  if (!profile?.is_admin) redirect('/friends');

  const links = [
    { href: '/admin/listings', icon: ShoppingBagIcon, label: 'Anuncios pendientes', description: 'Aprobar o rechazar anuncios' },
    { href: '/admin/reports', icon: FlagIcon, label: 'Reportes', description: 'Revisar contenido reportado' },
    { href: '/admin/analytics', icon: BarChart3Icon, label: 'Analítica', description: 'KPIs y métricas de uso' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Administración</h1>
      <ul className="surface-card divide-y rounded-xl">
        {links.map(({ href, icon: Icon, label, description }) => (
          <li key={href}>
            <Link href={href} className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
