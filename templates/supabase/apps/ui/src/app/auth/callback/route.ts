import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Handles the magic-link / OAuth callback: ?code=<authorization_code> is
// exchanged for a session and the user is redirected to `next` (defaults to /).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(
      `${origin}/auth/sign-in?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}/auth/sign-in?error=missing_code`);
}
