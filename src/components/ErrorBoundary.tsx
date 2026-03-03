// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Call optional error handler (for analytics/logging services)
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="px-5 py-10 text-center bg-red-500/10 border border-red-500/30 rounded-xl m-5">
          <div className="text-5xl mb-4">
            ⚠️
          </div>
          <h2 className="text-xl font-semibold text-red-500 mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-5">
            An unexpected error occurred while loading this section. Please try
            again or refresh the page.
          </p>
          {this.state.error && (
            <details className="text-left bg-black/20 p-3 rounded-lg max-w-lg mx-auto mb-5">
              <summary className="cursor-pointer text-muted-foreground text-xs">
                Error details
              </summary>
              <pre className="mt-2 text-xs text-red-500 whitespace-pre-wrap break-words">
                {this.state.error.message}
              </pre>
            </details>
          )}
          <button
            onClick={this.handleRetry}
            className="bg-red-500 text-white px-6 py-2.5 rounded-full border-none cursor-pointer font-semibold text-sm transition-colors hover:bg-red-600"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use with hooks context
interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  section?: string;
}

export const SectionErrorBoundary: React.FC<ErrorBoundaryWrapperProps> = ({
  children,
  section = "section",
}) => {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-5 text-center bg-red-500/5 border border-red-500/20 rounded-xl">
          <p className="text-muted-foreground text-sm">
            Unable to load {section}. Please refresh the page.
          </p>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundary;
