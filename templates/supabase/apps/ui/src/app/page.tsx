import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Dashboard } from '@/components/dashboard';

// Server Component: reads the current session via the server Supabase client.
// Unauthenticated -> minimal landing with a sign-in link.
// Authenticated   -> Dashboard demo (API call + realtime subscription + sign out).
export default async function Index() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="mx-auto mt-32 max-w-md p-6 text-center">
        <h1 className="mb-2 text-3xl font-semibold">appname</h1>
        <p className="mb-8 text-gray-600">
          A Supabase + Nest + Next.js starter template. Sign in to see the dashboard demo.
        </p>
        <Link
          href="/auth/sign-in"
          className="inline-block rounded bg-black px-6 py-2 text-white"
        >
          Sign in
        </Link>
      </main>
    );
  }

  return <Dashboard user={user} />;
}
