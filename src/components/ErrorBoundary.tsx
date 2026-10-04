/**
 * ErrorBoundary.tsx
 *
 * FIX 9: Without this, any unhandled render error (null listing, bad image,
 * network failure mid-render) unmounts the entire app and shows a white screen.
 *
 * Wrap App in this component in main.tsx:
 *   import { ErrorBoundary } from "@/components/ErrorBoundary";
 *   <ErrorBoundary><App /></ErrorBoundary>
 */
import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("TerraMap render error:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle size={28} className="text-destructive" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-card-foreground mb-2">
              Something went wrong
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              The page encountered an unexpected error. Your data is safe.
            </p>
            {this.state.error && (
              <p className="text-xs text-muted-foreground mt-3 font-mono bg-muted px-3 py-2 rounded-lg">
                {this.state.error.message}
              </p>
            )}
          </div>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-semibold hover:bg-primary/90 transition"
          >
            <RefreshCw size={16} /> Reload page
          </button>
        </div>
      </div>
    );
  }
}
