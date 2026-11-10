import React from 'react';

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error(error.message);
  }

  render(): React.ReactNode {
    if (this.state.error) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-sm font-semibold text-[#F1F3F9]">Something went wrong.</p>
          <p className="text-xs text-[#8A92A6]">{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="rounded-lg bg-[#a9dfc8] px-4 py-2 text-xs font-semibold"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
