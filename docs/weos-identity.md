# weOS — Whatelz OS

The app at app.whatelz.ai is named **weOS**, expanded as **Whatelz OS**.
It shares Whatelz Admin's reviewed W vector; its installed icon reverses the
colours to a brand-black background with a yellow W. It does not use Founder’s Club
as the product brand. Actual Founder’s Club communities, events and culture
records retain their names.

`components/brand/WeosBrand.tsx` combines the existing `WhatelzMark` vector and
weOS wordmark for the member header and first-login language dialog. Interface
copy, English/Chinese accessibility labels, browser metadata, Profile member
pass, installation controls and the assistant's identity use weOS.

The install manifest remains at `/fcos/app.webmanifest`, with the same
`https://app.whatelz.ai/` ID, start URL and scope. Its icon entries use versioned `/weos/` files with the inverted colours. Apple
touch icon and browser favicon metadata use that same inverted variant. Legacy
`/fcos/icon-*` files contain identical inverted artwork. Regenerate with
`node scripts/generate-weos-icons.mjs`; the full brand generator also runs it.
Admin’s yellow-background/black-W assets retain their existing colours. The network-only worker
and its registration path remain compatible with existing installations.

Internal `fcos` module/tool names, CSS hooks, cookies and stored content are not
renamed. Historical chats and release notes remain historical records. No
accounts, team links, preferences, private data or AI budgets are migrated.

Verification: existing PWA checks validate stable member app identity and shared
icons; language, routing and assistant checks cover the touched paths. Inspect
the actual mobile header/Profile/Chat and browser metadata after deployment.

## Palette

The app uses yellow **#FACC15**, ink **#18181B** and paper **#FFFCF5** from the
same identity JSON as Whatelz Admin's artwork. The member shell scopes these
values to `.weos-theme`; shared utilities have the same reviewed fallback values.
Profile and Baobei surfaces no longer introduce an orange brand variant.
The member pass uses a flat yellow field and ink lettering. Navigation, install
and Chat actions share the yellow; the usage bar uses ink for clear contrast.
Warning/error statuses retain their semantic colours.
