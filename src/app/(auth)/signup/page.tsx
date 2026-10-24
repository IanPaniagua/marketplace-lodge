import SignupForm from '@/components/auth/SignupForm';

interface Props {
  searchParams: Promise<{ invite?: string }>;
}

export const metadata = { title: 'Crear una cuenta — Círculo Market' };

export default async function SignupPage({ searchParams }: Props) {
  const { invite } = await searchParams;
  return <SignupForm inviteToken={typeof invite === 'string' ? invite : undefined} />;
}
