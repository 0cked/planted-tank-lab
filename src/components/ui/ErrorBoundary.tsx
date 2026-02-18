"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryFallbackProps = {
  error: Error;
  reset: () => void;
  retry: () => void;
};

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode | ((props: ErrorBoundaryFallbackProps) => ReactNode);
  title?: string;
  description?: string;
  retryLabel?: string;
  className?: string;
  onRetry?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: ReadonlyArray<unknown>;
};

type ErrorBoundaryState = {
  error: Error | null;
};

function areResetKeysEqual(a?: ReadonlyArray<unknown>, b?: ReadonlyArray<unknown>): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;

  for (let index = 0; index < a.length; index += 1) {
    if (!Object.is(a[index], b[index])) {
      return false;
    }
  }

  return true;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (!this.state.error) {
      return;
    }

    if (areResetKeysEqual(prevProps.resetKeys, this.props.resetKeys)) {
      return;
    }

    this.resetBoundary();
  }

  private resetBoundary = () => {
    this.setState({ error: null });
  };

  private retryBoundary = () => {
    this.props.onRetry?.();
    this.resetBoundary();
  };

  private renderDefaultFallback(error: Error): ReactNode {
    const className = this.props.className ? ` ${this.props.className}` : "";

    return (
      <div
        role="alert"
        className={`rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-rose-900${className}`}
      >
        <div className="text-sm font-semibold">{this.props.title ?? "Failed to load"}</div>
        <p className="mt-1 text-sm text-rose-800">
          {this.props.description ?? "Something went wrong while loading this section."}
        </p>
        <button
          type="button"
          onClick={this.retryBoundary}
          className="mt-3 inline-flex min-h-9 items-center justify-center rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-900 transition hover:bg-rose-100"
        >
          {this.props.retryLabel ?? "Retry"}
        </button>

        {process.env.NODE_ENV !== "production" ? (
          <pre className="mt-3 overflow-auto rounded-lg bg-rose-100/70 p-2 text-[11px] text-rose-950">{error.message}</pre>
        ) : null}
      </div>
    );
  }

  private renderFallback(error: Error): ReactNode {
    if (typeof this.props.fallback === "function") {
      return this.props.fallback({
        error,
        reset: this.resetBoundary,
        retry: this.retryBoundary,
      });
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return this.renderDefaultFallback(error);
  }

  render() {
    if (this.state.error) {
      return this.renderFallback(this.state.error);
    }

    return this.props.children;
  }
}
