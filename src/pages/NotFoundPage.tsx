import { Link } from "react-router-dom";
import { currentIssue, readerPath } from "@/content";
import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <section className="not-found">
      <p className="eyebrow">404 / Outside the issue</p>
      <h1>
        This page isn’t
        <br />
        in the archive.
      </h1>
      <p>The page or study may not exist. The magazine is still here.</p>
      <Button asChild variant="default">
        <Link to={readerPath(currentIssue.slug)}>Back to the reader</Link>
      </Button>
    </section>
  );
}
