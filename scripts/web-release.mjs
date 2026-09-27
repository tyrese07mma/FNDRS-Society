import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { releaseConfigErrors } from './release-config.mjs';

const escapeHtml = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function deletionPage(env) {
  const errors = releaseConfigErrors(env);
  if (errors.length) throw new Error('Release configuration incomplete');
  const email = escapeHtml(env.EXPO_PUBLIC_SUPPORT_EMAIL);
  const mail = escapeHtml(`mailto:${env.EXPO_PUBLIC_SUPPORT_EMAIL}?subject=${encodeURIComponent('FNDRS Society — Kontolöschungsanfrage / Account deletion request')}`);
  const privacy = escapeHtml(env.EXPO_PUBLIC_PRIVACY_URL);
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><title>FNDRS Society – Konto löschen</title>
<style>body{font:1rem/1.65 system-ui,sans-serif;max-width:48rem;margin:auto;padding:2rem;background:#fafafa;color:#161619}a{color:#2449ac}a:focus-visible{outline:3px solid #2449ac;outline-offset:4px}section{margin:2rem 0}h1,h2{line-height:1.25}</style></head><body>
<main><h1>FNDRS Society – Konto löschen</h1>
<section aria-labelledby="de"><h2 id="de">Löschung in der App oder per Anfrage</h2>
<p>In der App: Einstellungen → Konto löschen. Folge der Passwortbestätigung und lies die angezeigten Hinweise vor der endgültigen Löschung.</p>
<p>Auch ohne installierte App kannst du eine Löschung anfragen: <a href="${mail}">${email}</a>. Schreibe möglichst von der E-Mail-Adresse deines FNDRS-Kontos und nenne FNDRS Society. Sende niemals dein Passwort, Anmeldecodes oder Ausweiskopien mit.</p>
<p>Das Öffnen des E-Mail-Programms oder Absenden einer Anfrage löscht noch keine Daten. Der Support muss die Kontoinhaberschaft sicher prüfen und dir das Ergebnis bestätigen.</p>
<p>Die Kontolöschung betrifft dein Konto und zugehörige Profil-, Beitrags-, Nachrichten-, Match- und Avatar-Daten. Angaben zu etwaigen Aufbewahrungspflichten und Fristen findest du in der <a href="${privacy}">Datenschutzerklärung</a>.</p></section>
<section lang="en" aria-labelledby="en"><h2 id="en">Delete your account</h2>
<p>In the app, open Settings → Delete account and follow the password confirmation. Read the confirmation before permanently deleting the account.</p>
<p>Without the app, email <a href="${mail}">${email}</a> to request deletion of your FNDRS Society account, preferably from its registered email address. Never send passwords, sign-in codes or identity documents.</p>
<p>Sending a request does not immediately delete data. Support must verify account ownership and confirm the outcome. Deletion covers the account and its associated profile, posts, messages, matches and avatar data. See the <a href="${privacy}">privacy policy</a> for any applicable retention obligations and periods.</p></section></main></body></html>`;
}

export async function prepareWebRelease(env, output = 'dist') {
  const html = deletionPage(env);
  await mkdir(resolve(output, 'account-deletion'), { recursive: true });
  await writeFile(resolve(output, 'account-deletion/index.html'), html);
  // These files are understood by compatible static hosts. Other hosts must apply equivalent rules.
  await writeFile(resolve(output, '_redirects'), '/account-deletion /account-deletion/ 301\n/* /index.html 200\n');
  await writeFile(resolve(output, '_headers'), '/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  X-Frame-Options: DENY\n  Cache-Control: no-cache\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await prepareWebRelease(process.env);
  console.log('Web release files prepared; hosting rules and support delivery still require live verification.');
}
