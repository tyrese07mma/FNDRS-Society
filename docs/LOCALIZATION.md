# DE/EN localization

`src/i18n/de.ts` maps explicit English interface copy to German. `useTranslation()` subscribes a component to the account's selected language. Translate interface strings at their point of use; never translate raw post bodies, profile descriptions, names or chat messages through this dictionary.

Use named placeholders, for example `t('Hello {{name}}', { name })`, when adding copy. Add both the English key and the German value. The test suite rejects missing entries for literal `t(...)` calls and mismatched placeholders. Dynamic labels must be reviewed separately; a passing test does not mean that all screens have been translated.

Language is stored with account preferences, initially selected from the device's language, and synchronized to `user_settings.language`. Anonymous visitors can switch languages on the welcome and sign-in screens. The Copilot receives the selected language as its default response language; members can explicitly request another language in a prompt.

Current translated areas: welcome, sign-in/sign-up, password reset, account security, settings, navigation labels and header accessibility labels. Date/time/number format helpers use the selected locale. The feed, discovery, matching, chat, onboarding, premium and other feature screens still require translation and visual validation.

Local type checking, lint and 25 tests passed for this initial localization pass. The local preview-server command was rejected by the environment's automatic approval policy, including after network permission was granted. No visual verification is claimed for this pass.
