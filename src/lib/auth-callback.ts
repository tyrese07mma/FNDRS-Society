/** Parse only expected auth fields. Never log a callback URL containing tokens. */
export function authCallbackParams(url: string) {
  const parsed = new URL(url);
  const hash = new URLSearchParams(parsed.hash.slice(1));
  return {
    code: parsed.searchParams.get('code'),
    accessToken: hash.get('access_token'),
    refreshToken: hash.get('refresh_token'),
    recovery: hash.get('type') === 'recovery' || parsed.searchParams.get('next') === 'reset-password',
    error: hash.has('error') || parsed.searchParams.has('error'),
  };
}
