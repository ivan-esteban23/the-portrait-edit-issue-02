import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { currentIssue, chapterAt, prompts } from "@/content";

export function usePageMeta() {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;

    // 1. Reader: /issues/:slug/pages/:page
    const readerMatch = path.match(/\/issues\/([^/]+)\/pages\/(\d+)/);
    if (readerMatch) {
      const pageNum = parseInt(readerMatch[2], 10);
      const chapter = chapterAt(currentIssue, pageNum);
      document.title = `Page ${pageNum} — ${chapter.title} | The Portrait Edit`;
      return;
    }

    // 2. Study detail: /prompts/:id
    const promptMatch = path.match(/\/prompts\/([a-z0-9-]+)/);
    if (promptMatch) {
      const studyId = promptMatch[1];
      const study = prompts.find((p) => p.id === studyId);
      if (study) {
        document.title = `Study #${study.studyNumber}: ${study.title} | The Portrait Edit`;
      } else {
        document.title = `Study | The Portrait Edit`;
      }
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }

    // 3. Archive: /prompts
    if (path.endsWith("/prompts") || path === "/prompts") {
      document.title = `Prompt Archive (${prompts.length} Studies) | The Portrait Edit`;
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }

    // 4. Issue Overview: /issues/:slug
    if (path.includes("/issues/")) {
      document.title = `Issue 02 — ${currentIssue.title} | The Portrait Edit`;
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }

    // 5. About: /about
    if (path.endsWith("/about") || path === "/about") {
      document.title = `About | The Portrait Edit`;
      window.scrollTo({ top: 0, behavior: "instant" });
      return;
    }

    // 6. Home: /
    document.title = `The Portrait Edit — Issue 02`;
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);
}
