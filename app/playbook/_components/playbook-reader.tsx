"use client";

import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  createTrackpadGesture,
  touchPageDirection,
} from "@/lib/playbook-gestures";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  List,
  RotateCcw,
  X,
  AlignLeft,
  ArrowUpRight,
} from "lucide-react";
import {
  paginateChapters,
  PLAYBOOK_PARTS,
  type BookPage,
  type PlaybookChapter,
} from "@/lib/playbook-pagination";
import styles from "./playbook-reader.module.css";

function subscribeViewport(callback: () => void) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}
function getCompact() {
  return window.innerWidth < 900;
}
function serverCompact() {
  return false;
}

function PageContent({
  page,
  number,
  total,
}: {
  page?: BookPage;
  number: number;
  total: number;
}) {
  return (
    <div className={styles.paper}>
      <div className={styles.runningHead}>
        <span>{page ? PLAYBOOK_PARTS[page.part - 1] : "A new chapter"}</span>
        <span>WHATELZ.AI</span>
      </div>
      <div
        className={styles.pageBody}
        tabIndex={0}
        aria-label={`Page ${number} text`}
      >
        {page ? (
          <>
            {page.opening && (
              <div className={styles.chapterOpening}>
                <span className={styles.chapterNumber}>
                  {String(page.chapter).padStart(2, "0")}
                </span>
                <h2>{page.title}</h2>
              </div>
            )}
            <div className={styles.prose}>
              <ReactMarkdown>{page.markdown}</ReactMarkdown>
            </div>
          </>
        ) : (
          <div className={styles.endPage}>
            <span className={styles.eyebrow}>The next move is yours</span>
            <h2>
              Close the book.
              <br />
              Build something.
            </h2>
            <p>
              Come back with a story. That’s how the next edition gets written.
            </p>
          </div>
        )}
      </div>
      <div className={styles.folio}>
        <span>The Money & AI Playbook</span>
        <span>{number <= total ? String(number).padStart(2, "0") : "—"}</span>
      </div>
    </div>
  );
}

export function PlaybookReader({
  chapters,
  initiallyOpened = false,
}: {
  chapters: PlaybookChapter[];
  initiallyOpened?: boolean;
}) {
  const pages = useMemo(() => paginateChapters(chapters), [chapters]);
  const compact = useSyncExternalStore(
    subscribeViewport,
    getCompact,
    serverCompact,
  );
  const [opened, setOpened] = useState(initiallyOpened);
  const [mode, setMode] = useState<"book" | "read">("book");
  const [index, setIndex] = useState(0);
  const [contentsOpen, setContentsOpen] = useState(false);
  const [turn, setTurn] = useState<{
    from: number;
    to: number;
    direction: "next" | "previous";
  } | null>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const contentsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const element = contentsRef.current;
    const close = (event: Event) => {
      event.preventDefault();
      setContentsOpen(false);
    };
    element?.addEventListener("cancel", close);
    return () => element?.removeEventListener("cancel", close);
  }, []);
  const touchStart = useRef<{ x: number; y: number; pointerId: number } | null>(
    null,
  );
  const step = compact ? 1 : 2;
  const currentPage = pages[index];
  const currentChapter = chapters.find(
    (chapter) => chapter.number === currentPage.chapter,
  )!;
  const readingIndex = chapters.findIndex(
    (chapter) => chapter.number === currentChapter.number,
  );
  const atStart = mode === "read" ? readingIndex === 0 : index === 0;
  const atEnd =
    mode === "read"
      ? readingIndex === chapters.length - 1
      : index + step >= pages.length;
  const progress = opened
    ? Math.min(100, Math.round(((index + step) / pages.length) * 100))
    : 0;
  const wordCount = chapters.reduce(
    (count, chapter) => count + chapter.body.split(/\s+/).length,
    0,
  );

  function focusReader() {
    requestAnimationFrame(() => {
      readerRef.current?.focus({ preventScroll: true });
      readerRef.current?.scrollIntoView({
        behavior: "instant",
        block: "start",
      });
    });
  }

  function toggleContents() {
    setContentsOpen(!contentsOpen);
    if (!contentsOpen) {
      requestAnimationFrame(() => {
        contentsRef.current?.scrollIntoView({
          behavior: "instant",
          block: "start",
        });
        contentsRef.current
          ?.querySelector("button")
          ?.focus({ preventScroll: true });
      });
    }
  }

  function openChapter(number: number) {
    const pageIndex = pages.findIndex((page) => page.chapter === number);
    setIndex(Math.max(0, pageIndex));
    setTurn(null);
    setOpened(true);
    setContentsOpen(false);
    focusReader();
  }

  function move(direction: "next" | "previous") {
    if (turn || (direction === "previous" ? atStart : atEnd)) return;
    if (mode === "read") {
      openChapter(
        chapters[readingIndex + (direction === "next" ? 1 : -1)].number,
      );
      readerRef.current?.scrollIntoView({
        behavior: "instant",
        block: "start",
      });
      return;
    }
    const to = Math.max(
      0,
      Math.min(pages.length - 1, index + (direction === "next" ? step : -step)),
    );
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      setIndex(to);
    else setTurn({ from: index, to, direction });
  }

  function switchMode() {
    setTurn(null);
    setMode(mode === "book" ? "read" : "book");
    setOpened(true);
    focusReader();
  }

  const turnFromTrackpad = useEffectEvent((direction: "next" | "previous") =>
    move(direction),
  );
  useEffect(() => {
    const reader = readerRef.current;
    if (!reader || !opened || mode !== "book") return;
    const gesture = createTrackpadGesture();
    function onWheel(event: WheelEvent) {
      // Trackpad pinch-to-zoom is delivered as ctrl+wheel by browsers.
      if (event.ctrlKey || event.metaKey) return;
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? reader!.clientWidth
            : 1;
      const result = gesture(
        event.deltaX * unit,
        event.deltaY * unit,
        event.timeStamp,
      );
      if (result.capture) event.preventDefault();
      if (result.direction) turnFromTrackpad(result.direction);
    }
    // React wheel handlers are passive. A native listener lets a horizontal
    // book gesture suppress browser history navigation without blocking scroll.
    reader.addEventListener("wheel", onWheel, { passive: false });
    return () => reader.removeEventListener("wheel", onWheel);
  }, [opened, mode]);

  // Under the turning leaf, expose the next right page / previous left page.
  const leftIndex = turn?.direction === "previous" ? turn.to : index;
  const rightIndex = turn?.direction === "next" ? turn.to + 1 : index + 1;
  const leafFront = turn
    ? turn.direction === "next"
      ? turn.from + (compact ? 0 : 1)
      : turn.from
    : 0;
  const leafBack = turn
    ? turn.direction === "next"
      ? turn.to
      : turn.to + (compact ? 0 : 1)
    : 0;

  return (
    <main className={styles.main}>
      <div className={styles.topline}>
        <span className={styles.eyebrow}>THE WHATELZ.AI LIBRARY / VOL. 01</span>
        <span className={styles.draft}>
          <span /> Work in progress
        </span>
      </div>
      <header className={styles.heading}>
        <div>
          <h1>
            The Money &amp; AI
            <br className={styles.mobileBreak} /> Playbook<span>.</span>
          </h1>
          <p>Money Mindset. AI Skillset. A business of your own.</p>
        </div>
        <button className={styles.modeButton} onClick={switchMode}>
          {mode === "book" ? <AlignLeft size={17} /> : <BookOpen size={17} />}
          {mode === "book" ? "Reading mode" : "Book mode"}
        </button>
      </header>

      <div className={styles.workspace}>
        <aside
          ref={contentsRef}
          className={`${styles.contents} ${contentsOpen ? styles.contentsExpanded : ""}`}
          aria-label="Table of contents"
          data-admin-overlay={contentsOpen ? "open" : undefined}
        >
          <div className={styles.contentsHeading}>
            <span className={styles.eyebrow}>Inside the playbook</span>
            <button
              className={styles.closeContents}
              aria-label="Close contents"
              onClick={() => setContentsOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          {PLAYBOOK_PARTS.map((part, partIndex) => (
            <div className={styles.part} key={part}>
              <p>
                <span>{String(partIndex + 1).padStart(2, "0")}</span>
                {part}
              </p>
              {chapters
                .filter((chapter) => chapter.part === partIndex + 1)
                .map((chapter) => (
                  <button
                    key={chapter.number}
                    aria-current={
                      opened && currentChapter.number === chapter.number
                        ? "page"
                        : undefined
                    }
                    onClick={() => openChapter(chapter.number)}
                  >
                    <span>{String(chapter.number).padStart(2, "0")}</span>
                    {chapter.title}
                  </button>
                ))}
            </div>
          ))}
          <div className={styles.authorNote}>
            <span>BY EDMUND LIN ZHENMING</span>
            <p>
              By a solopreneur.
              <br />
              For the one you’re becoming.
            </p>
          </div>
        </aside>

        <section className={styles.readerColumn} aria-label="Playbook reader">
          <div className={styles.readerToolbar}>
            <button
              className={styles.contentsToggle}
              aria-expanded={contentsOpen}
              onClick={toggleContents}
            >
              <List size={16} /> Contents
            </button>
            <span className={styles.edition}>
              FIRST EDITION · DRAFT PREVIEW
            </span>
            {opened && (
              <button
                onClick={() => {
                  setOpened(false);
                  setMode("book");
                  setTurn(null);
                }}
                className={styles.coverButton}
              >
                <RotateCcw size={13} /> Cover
              </button>
            )}
          </div>
          <div
            ref={readerRef}
            tabIndex={0}
            aria-label={
              mode === "read"
                ? `Reading chapter ${currentChapter.number}`
                : "Interactive book. Use left and right arrow keys to turn pages."
            }
            className={`${styles.stage} ${opened ? styles.stageOpen : ""} ${mode === "read" ? styles.readingStage : ""}`}
            onKeyDown={(event) => {
              if (
                (event.target as HTMLElement).closest(
                  "button, a, select, input",
                )
              )
                return;
              if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                event.preventDefault();
                if (!opened) {
                  setOpened(true);
                  return;
                }
                move(event.key === "ArrowRight" ? "next" : "previous");
              }
            }}
            onPointerDown={(event) => {
              if (event.pointerType !== "touch") return;
              if (!event.isPrimary || !opened || mode !== "book") {
                touchStart.current = null;
                return;
              }
              touchStart.current = {
                x: event.clientX,
                y: event.clientY,
                pointerId: event.pointerId,
              };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerCancel={() => {
              touchStart.current = null;
            }}
            onPointerUp={(event) => {
              const start = touchStart.current;
              touchStart.current = null;
              if (
                !start ||
                start.pointerId !== event.pointerId ||
                !opened ||
                mode !== "book"
              )
                return;
              const dx = event.clientX - start.x;
              const dy = event.clientY - start.y;
              const direction = touchPageDirection(dx, dy);
              if (direction) move(direction);
            }}
          >
            {!opened ? (
              <div className={styles.coverScene}>
                <button
                  className={styles.bookCover}
                  onClick={() => {
                    setOpened(true);
                    focusReader();
                  }}
                  aria-label="Open the playbook"
                >
                  <span className={styles.coverSpine} aria-hidden="true">
                    WHATELZ.AI / THE SOLOPRENEUR’S AI PLAYBOOK
                  </span>
                  <span className={styles.coverFace}>
                    <span className={styles.coverImprint}>
                      WHATELZ.AI <span>01 / THE PLAYBOOK</span>
                    </span>
                    <span className={styles.coverTitle}>
                      The
                      <br />
                      Money &amp; AI
                      <br />
                      <em>Playbook.</em>
                    </span>
                    <span className={styles.coverSubtitle}>
                      MONEY MINDSET.
                      <br />
                      AI SKILLSET.
                    </span>
                    <span className={styles.coverArt} aria-hidden="true">
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                      <b>×</b>
                    </span>
                    <span className={styles.coverFooter}>
                      <span>EDMUND LIN ZHENMING</span>
                      <ArrowUpRight size={22} />
                    </span>
                  </span>
                </button>
                <span className={styles.coverCaption}>
                  A field guide to building your own way.
                </span>
              </div>
            ) : mode === "read" ? (
              <article className={styles.readingArticle}>
                <span className={styles.eyebrow}>
                  PART {currentChapter.part} /{" "}
                  {PLAYBOOK_PARTS[currentChapter.part - 1]}
                </span>
                <h2>
                  <span>{String(currentChapter.number).padStart(2, "0")}</span>
                  {currentChapter.title}
                </h2>
                <div className={styles.prose}>
                  <ReactMarkdown>{currentChapter.body}</ReactMarkdown>
                </div>
              </article>
            ) : (
              <div
                className={`${styles.spread} ${compact ? styles.singlePage : ""}`}
              >
                <div
                  className={styles.leftPage}
                  key={`left-${compact ? (turn?.to ?? index) : leftIndex}`}
                >
                  <PageContent
                    page={pages[compact ? (turn?.to ?? index) : leftIndex]}
                    number={(compact ? (turn?.to ?? index) : leftIndex) + 1}
                    total={pages.length}
                  />
                </div>
                {!compact && (
                  <div className={styles.rightPage} key={`right-${rightIndex}`}>
                    <PageContent
                      page={pages[rightIndex]}
                      number={rightIndex + 1}
                      total={pages.length}
                    />
                  </div>
                )}
                {turn && (
                  <div
                    aria-hidden="true"
                    inert
                    className={`${styles.turningLeaf} ${turn.direction === "next" ? styles.turnNext : styles.turnPrevious}`}
                    onAnimationEnd={(event) => {
                      if (event.target === event.currentTarget) {
                        setIndex(turn.to);
                        setTurn(null);
                      }
                    }}
                  >
                    <div className={styles.leafFront}>
                      <PageContent
                        page={pages[leafFront]}
                        number={leafFront + 1}
                        total={pages.length}
                      />
                    </div>
                    <div className={styles.leafBack}>
                      <PageContent
                        page={pages[leafBack]}
                        number={leafBack + 1}
                        total={pages.length}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className={styles.controls}>
            {!opened ? (
              <>
                <span className={styles.bookFacts}>
                  {chapters.length} chapters <span>·</span>{" "}
                  {Math.ceil(wordCount / 220)} min read
                </span>
                <button
                  className={styles.openButton}
                  onClick={() => {
                    setOpened(true);
                    focusReader();
                  }}
                >
                  Open the playbook <ArrowRight size={18} />
                </button>
              </>
            ) : (
              <>
                <button
                  className={styles.pageButton}
                  onClick={() => move("previous")}
                  disabled={atStart || !!turn}
                  aria-label={
                    mode === "read" ? "Previous chapter" : "Previous page"
                  }
                >
                  <ArrowLeft size={18} />
                  <span>Previous</span>
                </button>
                <span
                  className={styles.pageStatus}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {mode === "read"
                    ? `Chapter ${currentChapter.number} of ${chapters.length}`
                    : `Page ${index + 1}${!compact && index + 1 < pages.length ? `–${index + 2}` : ""} of ${pages.length}`}
                </span>
                <button
                  className={styles.pageButton}
                  onClick={() => move("next")}
                  disabled={atEnd || !!turn}
                  aria-label={mode === "read" ? "Next chapter" : "Next page"}
                >
                  <span>Next</span>
                  <ArrowRight size={18} />
                </button>
              </>
            )}
          </div>
          {opened && (
            <div
              className={styles.progress}
              role="progressbar"
              aria-label="Reading position"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
          )}
          <p className={styles.readerHint}>
            {opened
              ? mode === "book"
                ? "Swipe left or right: two fingers on a trackpad, one on a touchscreen. Arrow keys work too."
                : "Take your time. Pick a chapter from the contents, or keep reading in order."
              : "Click the cover to begin. There’s no sign-up needed for this preview."}
          </p>
        </section>
      </div>
      <footer className={styles.previewNote}>
        <span className={styles.eyebrow}>An evolving playbook</span>
        <p>
          This is an early look at my first digital product. These chapters are
          still being refined as I build, test, and learn. Personal stories and
          supporting resources are being completed.
        </p>
        <span>EDMUND / WHATELZ.AI</span>
      </footer>
    </main>
  );
}
