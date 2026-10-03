/** Validate only public deployment values. Never include their contents in errors. */
export function releaseConfigErrors(env) {
  const errors = [];
  function https(name, originOnly = false) {
    try {
      const url = new URL(env[name]);
      if (url.protocol !== 'https:' || url.username || url.password ||
          /(^localhost$|\.localhost$|\.local$|\.test$|\.invalid$|^127\.|^0\.|^\[::1\]$|^example\.|\.example\.)/i.test(url.hostname) ||
          (originOnly && (url.pathname !== '/' || url.search || url.hash))) throw new Error();
    } catch { errors.push(`${name}: a real public HTTPS ${originOnly ? 'origin' : 'URL'} is required.`); }
  }
  https('EXPO_PUBLIC_SUPABASE_URL', true);
  https('EXPO_PUBLIC_WEB_ORIGIN', true);
  for (const name of ['EXPO_PUBLIC_TERMS_URL', 'EXPO_PUBLIC_PRIVACY_URL', 'EXPO_PUBLIC_IMPRINT_URL', 'EXPO_PUBLIC_GUIDELINES_URL']) https(name);
  const key = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  let publicKey = key.startsWith('sb_publishable_') && key.length > 20;
  if (key.startsWith('eyJ')) {
    try { publicKey = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon'; } catch { /* Invalid key. */ }
  }
  if (!publicKey) errors.push('EXPO_PUBLIC_SUPABASE_ANON_KEY: a publishable or anon key is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.EXPO_PUBLIC_SUPPORT_EMAIL ?? '')) errors.push('EXPO_PUBLIC_SUPPORT_EMAIL: an operator-owned support address is required.');
  if (env.EXPO_PUBLIC_LOCAL_PREVIEW === 'true') errors.push('Local preview must be disabled for a release.');
  for (const name of Object.keys(env)) {
    if (name.startsWith('EXPO_PUBLIC_') && /SECRET|SERVICE_ROLE|PRIVATE_KEY|ANTHROPIC|ACCESS_TOKEN/.test(name) && env[name]) {
      errors.push(`${name}: server credentials must not use a public variable.`);
    }
  }
  for (const name of ['EXPO_PUBLIC_AI_ENABLED', 'EXPO_PUBLIC_BILLING_ENABLED']) {
    if (env[name] && !['true', 'false'].includes(env[name])) errors.push(`${name}: use true or false.`);
  }
  return errors;
}
