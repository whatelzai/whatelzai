# Whatelz Admin on your phone

Open https://admin.whatelz.ai on your phone and sign in with the owner account. In the menu or Settings, choose **Install Admin**. On iPhone/iPad, Safari → Share → Add to Home Screen → Add (keep Open as Web App enabled if offered). Android Chrome can show the native installer, or use its menu → Add to home screen → Install.

The yellow W icon is separate from fcOS. The installed app opens Today; Overview and every admin section remain available from the menu. The browser manages the installed app and its sign-in session; an expired or unavailable session returns through normal sign-in. Installation does not grant access, change account roles or connect any additional service. Physical-device installation and platform sign-in behaviour still require a phone check; desktop responsive verification cannot certify them.

The canonical manifest identity/scope use the admin origin, with Today as launch destination. Metadata is selected by verified request host: public pages do not acquire a manifest and fcOS retains its own manifest/worker/default install UI. Public manifest/icons contain no account data. Installation guidance is also available when a browser does not offer a native prompt. Installed standalone mode hides the install button.

The root-scoped admin worker forwards requests to the network, preserving the existing owner checks and no-store responses. It never writes Cache Storage or a private offline copy, never queues mutations and never runs inference. Network failures on navigation return a static, no-store reconnect screen with no private content. Other failed requests remain failures. An internet connection is required to read current briefs and operational data. No push notifications are added.

Verification covers manifest scope/start/icons, worker forwarding, offline navigation and API-error behaviour, owner-boundary regressions, build/type/lint checks and phone-width install-help controls. Live verification opens guidance only; it does not install software on the user's computer or submit an admin mutation.
