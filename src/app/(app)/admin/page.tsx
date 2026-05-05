import { getServerProfile } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { UsersIcon, ShoppingBagIcon, FlagIcon } from 'lucide-react';

export default async function AdminPage() {
  const profile = await getServerProfile();
  if (!profile?.is_admin) redirect('/');

  const links = [
    { href: '/admin/users', icon: UsersIcon, label: 'Pending users', description: 'Approve new registrations' },
    { href: '/admin/listings', icon: ShoppingBagIcon, label: 'Pending listings', description: 'Approve or reject listings' },
    { href: '/admin/reports', icon: FlagIcon, label: 'Reports', description: 'Review flagged content' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <ul className="divide-y rounded-lg border">
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
