# DE/EN localization

`src/i18n/de.ts` maps explicit English interface copy to German. `useTranslation()` subscribes a component to the account's selected language. Translate interface strings at their point of use; never translate raw post bodies, profile descriptions, names or chat messages through this dictionary.

Use named placeholders, for example `t('Hello {{name}}', { name })`, when adding copy. Add both the English key and the German value. The test suite rejects missing entries for literal `t(...)` calls and mismatched placeholders. Dynamic labels must be reviewed separately; a passing test does not mean that all screens have been translated.

Language is stored with account preferences, initially selected from the device's language, and synchronized to `user_settings.language`. Anonymous visitors can switch languages on the welcome and sign-in screens. The Copilot receives the selected language as its default response language; members can explicitly request another language in a prompt.

Current translated areas: welcome, sign-in/sign-up, password reset, account security, settings, navigation labels and header accessibility labels. Feed, discovery, matching/filter sheets and chat now include translated interface copy and dynamic messages. New-message search, post menus, reporting dialogs, default confirmation buttons and password visibility controls also follow the selected language. Report reason values and filter values remain stable when sent to the backend. Date/time/number format helpers use the selected locale. Remaining nested components, server-generated matching reasons, notifications, onboarding, premium and other feature screens still require translation and visual validation.

Onboarding, public profiles and profile editing now also use the selected language for interface text and predefined selections. Stored role/stage/skill values remain unchanged. Some nested feature cards and server-generated matching reasons still need translation.

The test suite contains 32 passing tests as of the privacy implementation, including translation placeholders and explicit translation calls. On 13 September the local preview started successfully and the German unavailable-service state was visually verified in the browser. Supabase configuration is still missing, so no full authenticated screen walkthrough is claimed.
