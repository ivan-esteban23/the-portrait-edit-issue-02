import { Link } from "react-router-dom";
import { assetUrl, currentIssue, readerPath } from "@/content";
import { Button } from "@/components/ui/button";
import { usePageMeta } from "@/hooks/usePageMeta";

export function NotFoundPage() {
  usePageMeta({
    title: "Page not found | The Portrait Edit",
    image: assetUrl(currentIssue.cover),
  });
  return (
    <section className="not-found">
      <p className="eyebrow">404 / Outside the issue</p>
      <h1>
        This page isn’t
        <br />
        in the archive.
      </h1>
      <p>The page or study may not exist. The magazine is still here.</p>
      <div className="not-found-actions">
        <Button asChild variant="default">
          <Link to={readerPath(currentIssue.slug)}>Back to the reader</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/prompts">Browse the archive</Link>
        </Button>
      </div>
    </section>
  );
}
