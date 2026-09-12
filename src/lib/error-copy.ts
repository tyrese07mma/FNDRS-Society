/** Only reviewed interface copy may reach the UI; provider details are never echoed. */
const MESSAGES = [
  'Your export is too large for this device. Please contact support for a complete export.',
  'File sharing is not available on this device.',
  'Email or password is incorrect.',
  'Confirm your email address before signing in.',
  'Please wait a moment before trying again.',
  'This password does not meet the requirements.',
  'This account already exists. Please sign in.',
  'The authentication request could not be completed. Please try again.',
  'Use at least 12 characters.',
  'That handle is already taken.',
  'That already exists.',
  'That slot was just taken — pick another one.',
  'You already applied.',
] as const;
const SAFE_MESSAGES: ReadonlySet<string> = new Set(MESSAGES);
const CODE_COPY: Record<string, string> = {
  PRO_REQUIRED: 'This is part of FNDRS Pro.',
  SWIPE_LIMIT: 'You have used today’s free swipes.',
  NOT_FOUND: 'This item is no longer available.',
  FORBIDDEN: 'This action is not available for your account.',
  AUTH: 'Please sign in again and retry.',
  VALIDATION: 'Please check your input.',
};
export function safeErrorCopy(error: unknown): string {
  if (error && typeof error === 'object') {
    const message = 'message' in error ? error.message : undefined;
    if (typeof message === 'string' && SAFE_MESSAGES.has(message)) return message;
    const code = 'code' in error ? error.code : undefined;
    if (typeof code === 'string' && Object.hasOwn(CODE_COPY, code)) return CODE_COPY[code];
  }
  return 'The request could not be completed. Please try again.';
}
