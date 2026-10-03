/** Accept web destinations only; never interpret profile content as an app URI. */
export function webUrl(input: string): string {
  const value = input.trim();
  if (!value || /[\u0000-\u0020\u007f\\]/.test(value)) throw new Error('Invalid web address');
  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(value);
  const url = new URL(hasScheme ? value : `https://${value}`);
  if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) {
    throw new Error('Invalid web address');
  }
  return url.href;
}

/** Keep URL generation inside the error boundary as well (e.g. calendar dates). */
export async function openWebDestination(
  input: string | (() => string),
  open: (url: string) => Promise<unknown>,
  onError: () => void,
): Promise<boolean> {
  try {
    await open(webUrl(typeof input === 'function' ? input() : input));
    return true;
  } catch {
    onError();
    return false;
  }
}
