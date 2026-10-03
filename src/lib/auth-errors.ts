/** Stable interface copy instead of raw provider errors. Never include credentials. */
export function authErrorMessage(code?: string): string {
 switch(code) {
  case 'invalid_credentials': return 'Email or password is incorrect.';
  case 'email_not_confirmed': return 'Confirm your email address before signing in.';
  case 'over_request_rate_limit': case 'over_email_send_rate_limit': return 'Please wait a moment before trying again.';
  case 'weak_password': return 'This password does not meet the requirements.';
  case 'user_already_exists': return 'This account already exists. Please sign in.';
  default: return 'The authentication request could not be completed. Please try again.';
 }
}
