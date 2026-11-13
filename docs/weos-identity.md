# weOS — Whatelz OS

The app at app.whatelz.ai is named **weOS**, expanded as **Whatelz OS**.
It shares Whatelz Admin's existing reviewed logo; it does not use Founder’s Club
as the product brand. Actual Founder’s Club communities, events and culture
records retain their names.

`components/brand/WeosBrand.tsx` combines the existing `WhatelzMark` vector and
weOS wordmark for the member header and first-login language dialog. Interface
copy, English/Chinese accessibility labels, browser metadata, Profile member
pass, installation controls and the assistant's identity use weOS.

The install manifest remains at `/fcos/app.webmanifest`, with the same
`https://app.whatelz.ai/` ID, start URL and scope. Its icon entries point directly
to the same versioned Admin PWA files. Apple touch icon and browser favicon
metadata also use the Admin/Whatelz assets. Legacy `/fcos/icon-*` files contain
identical artwork and the generator keeps them in sync. The network-only worker
and its registration path remain compatible with existing installations.

Internal `fcos` module/tool names, CSS hooks, cookies and stored content are not
renamed. Historical chats and release notes remain historical records. No
accounts, team links, preferences, private data or AI budgets are migrated.

Verification: existing PWA checks validate stable member app identity and shared
icons; language, routing and assistant checks cover the touched paths. Inspect
the actual mobile header/Profile/Chat and browser metadata after deployment.
