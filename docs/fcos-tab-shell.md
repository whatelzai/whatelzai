# Five-tab fcOS shell

Baobeis, Chat, Home, Resources and Profile use `AppHeader`: one title, identical safe-area/height/spacing and optional left/right controls. Chat supplies history and new chat; Baobeis supplies add; Profile supplies sign out. Existing per-page data/access/usage logic is unchanged.

On these roots, the header and bottom tabs remain visible while content scrolls. Normal pages use document scrolling; no global body overflow lock or overscroll suppression is introduced. Other member subpages keep their existing layouts. Chat retains its fixed visual-viewport shell, own transcript scroll, streaming and hidden bottom navigation while the keyboard is shown.

Browser pages retain native pull-to-refresh. Standalone display mode and Chat's contained transcript have a custom fallback: a deliberate downward single-finger pull of at least 84px, released at scroll top, refreshes server-rendered data through Next router.refresh. It does not reload the document or create conversations, send messages, accept commitments, invoke providers or mutate saved data. Horizontal pans, pinch zoom, multiple touches, open dialogs, focused editors, streaming replies and cancelled/short pulls do not refresh. Moving back under threshold cancels. Listeners are cleaned up when leaving the page. The status indicator appears only during the gesture/refresh.

Build/typecheck/focused lint/format, pull gesture/handler tests and existing keyboard viewport tests cover the implementation. Browser checks verify header/navigation positions before/after scrolling on all five roots, Chat menu and add modal. Desktop viewport emulation cannot establish the actual iOS/Android finger gesture; real handset/PWA validation remains necessary. Native browser gesture support follows the browser; the app fallback covers installed mode and Chat.

References consulted: [MDN overscroll behaviour](https://developer.mozilla.org/en-US/docs/Web/CSS/overscroll-behavior), [passive event listeners](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener).
