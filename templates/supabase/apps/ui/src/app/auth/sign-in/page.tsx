'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/browser';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setStatus('error');
      setErrorMessage(error.message);
      return;
    }
    setStatus('sent');
  }

  return (
    <main className="mx-auto mt-32 max-w-md p-6">
      <h1 className="mb-2 text-2xl font-semibold">Sign in</h1>
      <p className="mb-6 text-sm text-gray-600">
        Enter your email to receive a magic link. Locally,
        emails are captured by Inbucket at{' '}
        <a href="http://localhost:54324" className="underline" target="_blank" rel="noreferrer">
          http://localhost:54324
        </a>
        .
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="email"
          required
          autoFocus
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2"
        />
        <button
          type="submit"
          disabled={status === 'sending' || status === 'sent'}
          className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {status === 'sending' ? 'Sending…' : status === 'sent' ? 'Check your inbox' : 'Send magic link'}
        </button>
      </form>

      {status === 'sent' && (
        <p className="mt-4 text-sm text-green-700">
          Magic link sent. Open the email and click the link to finish signing in.
        </p>
      )}
      {status === 'error' && (
        <p className="mt-4 text-sm text-red-700">Error: {errorMessage}</p>
      )}
    </main>
  );
}
