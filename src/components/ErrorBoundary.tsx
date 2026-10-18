import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  render() {
    if (!this.state.error) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;

    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <section
          role="alert"
          aria-labelledby="error-boundary-title"
          className="w-full max-w-lg space-y-6 rounded-sm border border-border bg-surface p-6 text-foreground sm:p-8"
        >
          <h1 id="error-boundary-title" className="text-3xl font-medium">
            Something went wrong
          </h1>
          <p className="text-muted">
            We couldn’t open this page. Reload it or return home to try again.
          </p>
          <details className="space-y-3 rounded-sm border border-border p-4">
            <summary className="cursor-pointer font-medium">Error details</summary>
            <pre className="whitespace-pre-wrap break-words text-sm">
              {this.state.error.message}
            </pre>
          </details>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-11 items-center justify-center rounded-sm bg-foreground px-4 py-2 font-medium text-background hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              Reload page
            </button>
            <a
              href="/the-portrait-edit-issue-02/"
              className="inline-flex min-h-11 items-center justify-center rounded-sm border border-border px-4 py-2 font-medium hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              Go home
            </a>
          </div>
        </section>
      </div>
    );
  }
}
