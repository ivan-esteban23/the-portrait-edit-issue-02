import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { assetUrl, prompts } from "@/content";
import { editorialSelections } from "@/content/editorialSelections";
import { useBookmarks } from "@/hooks/useBookmarks";
import {
  matchesArchiveScope,
  rankSearchResults,
  searchExcerpt,
  searchTerms,
  searchTopics,
} from "@/lib/archiveSearch";
import { responsiveImageProps } from "@/lib/responsiveImages";

function Highlight({ text, query }: { text: string; query: string }) {
  const terms = searchTerms(query.trim().replace(/^#/, "")).sort(
    (a, b) => b.length - a.length,
  );
  if (!terms.length) return <>{text}</>;
  const pattern = terms
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  return (
    <>
      {text
        .split(new RegExp(`(${pattern})`, "gi"))
        .map((part, index) =>
          index % 2 ? <mark key={index}>{part}</mark> : part,
        )}
    </>
  );
}

export function StudySearch({
  initialQuery,
  onClose,
  onOpenCommands,
}: {
  initialQuery?: string;
  onClose: () => void;
  onOpenCommands: () => void;
}) {
  const location = useLocation(),
    navigate = useNavigate();
  const isArchive = /^\/prompts\/?$/.test(location.pathname);
  const [query, setQuery] = useState(
    initialQuery ??
      (isArchive ? new URLSearchParams(location.search).get("q") || "" : ""),
  );
  const [scope, setScope] = useState(() => {
    const params = new URLSearchParams(isArchive ? location.search : "");
    params.delete("q");
    params.delete("focus");
    return params;
  });
  const input = useRef<HTMLInputElement>(null),
    content = useRef<HTMLDivElement>(null),
    opener = useRef<HTMLElement | null>(null),
    navigating = useRef(false);
  const formId = useId(),
    resultsId = useId(),
    scopeId = useId(),
    helpId = useId();
  const { isSaved, activeCollection } = useBookmarks();
  const scoped = useMemo(
    () =>
      prompts.filter((prompt) => matchesArchiveScope(prompt, scope, isSaved)),
    [scope, isSaved],
  );
  const matches = useMemo(
    () => rankSearchResults(scoped, query),
    [scoped, query],
  );
  const names: string[] = [];
  const selection = editorialSelections.find(
    (selection) => selection.id === scope.get("selection"),
  );
  if (selection) names.push(selection.title);
  if (scope.get("tag")) names.push("#" + scope.get("tag"));
  if (scope.get("model")) names.push("Model: " + scope.get("model"));
  if (scope.get("ar"))
    names.push(
      scope.get("ar") === "none"
        ? "aspect ratio not recorded"
        : "aspect ratio " + scope.get("ar"),
    );
  if (scope.get("saved") === "1")
    names.push(`saved studies (${activeCollection})`);
  const scopeLabel = names.length
    ? "Searching within " + names.join(" · ")
    : `Across all ${prompts.length} studies`;
  function paramsForQuery() {
    const params = new URLSearchParams(scope);
    if (query.trim()) params.set("q", query.trim());
    else params.delete("q");
    return params;
  }
  function go(path: string, state?: unknown) {
    navigating.current = true;
    navigate(path, { state });
    onClose();
  }
  function selectStudy(id: string) {
    const params = paramsForQuery();
    go(`/prompts/${id}`, {
      archiveContext: {
        search: params.size ? "?" + params : "",
        scrollY: isArchive ? window.scrollY : 0,
        studyId: id,
        tagsExpanded: Boolean(
          document.querySelector(
            '.archive-tag-pills button[aria-expanded="true"]',
          ),
        ),
      },
    });
  }
  function keyboard(event: KeyboardEvent) {
    const links = [
      ...(content.current?.querySelectorAll<HTMLAnchorElement>(
        "[data-search-study]",
      ) ?? []),
    ];
    const target = event.target as HTMLElement,
      index = links.indexOf(target as HTMLAnchorElement);
    if (event.key === "ArrowDown" && (target === input.current || index >= 0)) {
      event.preventDefault();
      links[(index + 1) % links.length]?.focus();
    }
    if (event.key === "ArrowUp" && index >= 0) {
      event.preventDefault();
      if (index === 0) input.current?.focus();
      else links[index - 1].focus();
    }
  }
  const topics = (
    <div className="study-search-topics">
      {searchTopics.map((group) => (
        <section key={group.title} aria-label={`${group.title} suggestions`}>
          <h3>{group.title}</h3>
          {group.items.map(([label, term]) => {
            const count = rankSearchResults(scoped, term).length;
            return (
              <button
                type="button"
                key={term}
                disabled={!count}
                onClick={() => {
                  setQuery(term);
                  input.current?.focus();
                }}
              >
                {label}
                <span>{count}</span>
              </button>
            );
          })}
        </section>
      ))}
    </div>
  );
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="study-search-overlay" />
        <Dialog.Content
          ref={content}
          className="study-search-dialog"
          aria-describedby={undefined}
          onKeyDown={keyboard}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            opener.current =
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
            input.current?.focus();
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            (navigating.current
              ? document.getElementById("main")
              : opener.current?.isConnected
                ? opener.current
                : document.getElementById("main")
            )?.focus({ preventScroll: true });
          }}
        >
          <header className="study-search-head">
            <div>
              <p className="eyebrow">
                The Portrait Edit / {prompts.length} studies
              </p>
              <Dialog.Title>Find a starting point.</Dialog.Title>
            </div>
            <Dialog.Close
              className="study-search-close"
              aria-label="Close search"
            >
              Close ×
            </Dialog.Close>
          </header>
          <form
            id={formId}
            className="study-search-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (query.trim() && !matches.length) return;
              const params = paramsForQuery();
              go("/prompts" + (params.size ? "?" + params : ""));
            }}
          >
            <label className="sr-only" htmlFor={`${formId}-input`}>
              Search studies
            </label>
            <div className="study-search-field">
              <input
                ref={input}
                id={`${formId}-input`}
                type="search"
                placeholder="Light, a mood, a detail…"
                autoComplete="off"
                maxLength={120}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-describedby={`${scopeId} ${helpId}`}
                aria-controls={resultsId}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    input.current?.focus();
                  }}
                >
                  Clear
                </button>
              )}
            </div>
            <div className="study-search-meta">
              <p id={scopeId}>{scopeLabel}</p>
              <p role="status">
                {matches.length} {matches.length === 1 ? "study" : "studies"}{" "}
                {query.trim() ? "match your search" : "to explore"}
              </p>
            </div>
          </form>
          <div className="study-search-results" id={resultsId}>
            {!query.trim() && topics}
            {matches.length ? (
              <>
                <p className="eyebrow study-search-results-label">
                  {query.trim() ? "Matching studies" : "A few starting points"}{" "}
                  / {Math.min(5, matches.length)} of {matches.length}
                </p>
                <ul>
                  {matches.slice(0, 5).map((prompt) => (
                    <li key={prompt.id}>
                      <Link
                        to={`/prompts/${prompt.id}`}
                        data-search-study={prompt.id}
                        className="study-search-result"
                        onClick={(event) => {
                          if (
                            !event.metaKey &&
                            !event.ctrlKey &&
                            !event.shiftKey &&
                            !event.altKey &&
                            event.button === 0
                          ) {
                            event.preventDefault();
                            selectStudy(prompt.id);
                          }
                        }}
                      >
                        <span className="study-search-image">
                          <img
                            src={assetUrl(prompt.referenceImage)}
                            {...responsiveImageProps(
                              prompt.referenceImage,
                              "search",
                            )}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        </span>
                        <span className="study-search-copy">
                          <span className="eyebrow">
                            Study {String(prompt.studyNumber).padStart(3, "0")}
                          </span>
                          <span className="study-search-title">
                            <Highlight text={prompt.title} query={query} />
                          </span>
                          <span className="study-search-excerpt">
                            <Highlight
                              text={searchExcerpt(prompt, query)}
                              query={query}
                            />
                          </span>
                        </span>
                        <span aria-hidden="true">↗</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <div className="study-search-empty">
                  <h3>No matching studies.</h3>
                  <p>Try fewer words, another mood, or a study number.</p>
                  {Boolean(names.length) && (
                    <button
                      type="button"
                      onClick={() => {
                        setScope(new URLSearchParams());
                        input.current?.focus();
                      }}
                    >
                      Search all studies instead ↗
                    </button>
                  )}
                </div>
                {topics}
              </>
            )}
          </div>
          <footer className="study-search-footer">
            <div>
              <p id={helpId}>
                ↓ Browse suggestions · Enter all results · Esc close
              </p>
              <button
                type="button"
                className="study-search-commands"
                onClick={() => {
                  navigating.current = true;
                  onOpenCommands();
                }}
              >
                Commands and page jumps ↗
              </button>
            </div>
            <button
              className="button button-primary"
              type="submit"
              form={formId}
              disabled={Boolean(query.trim() && !matches.length)}
            >
              {query.trim()
                ? `View all ${matches.length} results ↗`
                : "Browse the archive ↗"}
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
