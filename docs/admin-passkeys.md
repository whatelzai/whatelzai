# Admin passkeys — SPR-172

Native Supabase WebAuthn, not a local cosmetic PWA lock. Google recovery and the existing stable users.id/stored-role owner gates remain. No custom credential storage, new authentication provider or database migration. The installed lockfile resolves supabase-js2.117.2, compatible with the documented2.105+ experimental API. Explicit opt-in applies only on the canonical Admin host in browser/server clients; existing shared session cookie behavior is retained.

## Configuration and rollout

Supabase Authentication → Passkeys must enable native passkey authentication with display name `Whatelz Admin`, RP ID `admin.whatelz.ai` and the sole allowed origin `https://admin.whatelz.ai`. Do not use the root whatelz.ai RP or include member/public/preview origins. Inspect existing configuration before replacing anything. Dashboard Save is an authentication configuration change requiring browser action-time confirmation. Physical credential enrollment is performed by Edmund on his phone, not by the agent. Native support is experimental and may change upstream.

Only Admin sign-in shows Sign in with a passkey. Its discoverable-credential ceremony requests userVerification required and checks the configured RP before prompting. Supabase verifies challenge/signature/origin and issues the ordinary session. The server finish route separately rechecks sole owner and confines redirects to safe Admin destinations. Foreign signed-in users get403; no role or member activation is granted.

Settings links to an owner-only Security page. Listing returns only current-user credential metadata with no-store. Enrollment POST requires canonical Admin origin, same-origin JSON, stable owner authorization and a verified signed-session AMR oauth/passkey/webauthn event within10minutes. A refreshed JWT issue time or account-global last_sign_in_at is insufficient. Start and verify both enforce freshness; challenges are bound and consumed by Supabase. Request size and credential shape are bounded. Keys remain in the authenticator; biometric templates never reach Whatelz.

The browser uses native credential JSON methods available in current browsers; unsupported browsers retain Google and explain the requirement. No automatic prompt occurs. Device verification may be fingerprint, face or PIN, selected by the platform. This is ordinary native Supabase passkey sign-in, not a claimed AAL2/MFA replacement; the hosted provider also exposes its own passkey endpoints under its native policy. Google authentication, existing MFA policies and server permissions are not disabled.

## User steps

On the installed Admin PWA: Settings → Security → Confirm with Google if requested → Add passkey → approve the system prompt. Next sign-in: Sign in with a passkey. Keep Google as recovery. It does not lock every PWA reopen. Credential deletion/renaming is intentionally outside this first enrollment feature.

## Validation

Actual route execution tests cover owner/foreign-admin checks, wrong/cross/member origins, signed-session freshness, bad claims, RP mismatch, malformed/oversized inputs, provider delegation, finish owner checks and redirect confinement. Existing auth-routing and owner-gate regressions run alongside these. Typecheck, focused ESLint, format and production build required. Browser review covers owner Settings/metadata, canonical Admin sign-in control and anonymous enrollment rejection without logging out the owner or creating a desktop credential. Actual phone enrollment/sign-in remains a user-device validation step.
