import { releaseConfigErrors } from './release-config.mjs';

const errors = releaseConfigErrors(process.env);
if (errors.length) {
  console.error('Release configuration is incomplete:\n' + errors.map(e => '- ' + e).join('\n'));
  process.exitCode = 1;
} else {
  console.log('Public release configuration passed. Hosted journeys, SMTP, legal review and native signing still need release evidence.');
}
