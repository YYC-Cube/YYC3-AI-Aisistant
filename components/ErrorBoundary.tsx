import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    console.error("[YYC3 ErrorBoundary]", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleHardReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = import.meta.env?.DEV ?? false;

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            backgroundColor: "#000",
            color: "#ef4444",
            fontFamily: "monospace",
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              border: "1px solid #ef4444",
              padding: "2rem",
              maxWidth: "600px",
              width: "100%",
            }}
          >
            <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
              ⚠ YYC³ SYSTEM ERROR
            </h1>
            <p style={{ color: "#888", marginBottom: "1rem" }}>
              An unexpected error occurred in the application.
            </p>

            {isDev && this.state.error && (
              <pre
                style={{
                  textAlign: "left",
                  fontSize: "0.75rem",
                  color: "#666",
                  overflow: "auto",
                  maxHeight: "200px",
                  border: "1px solid #333",
                  padding: "1rem",
                  marginBottom: "1rem",
                }}
              >
                {this.state.error.message}
                {"\n\n"}
                {this.state.error.stack}
                {this.state.errorInfo?.componentStack && (
                  <>
                    {"\n\nComponent Stack:\n"}
                    {this.state.errorInfo.componentStack}
                  </>
                )}
              </pre>
            )}

            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <button
                onClick={this.handleReload}
                style={{
                  border: "1px solid #ef4444",
                  background: "transparent",
                  color: "#ef4444",
                  padding: "0.5rem 1.5rem",
                  cursor: "pointer",
                  fontFamily: "monospace",
                }}
              >
                TRY RECOVER
              </button>
              <button
                onClick={this.handleHardReload}
                style={{
                  border: "1px solid #888",
                  background: "transparent",
                  color: "#888",
                  padding: "0.5rem 1.5rem",
                  cursor: "pointer",
                  fontFamily: "monospace",
                }}
              >
                RELOAD PAGE
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
