import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Top-level safety net for unexpected render errors anywhere in the tree.
 * React error boundaries must be class components — there's no hook
 * equivalent for catching errors during render. Without this, an
 * unhandled error in any page would blank the entire app to a white
 * screen instead of a recoverable message.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('Unhandled error in the app:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
          <div className="max-w-sm text-center">
            <h1 className="text-2xl font-bold text-slate-800">Something went wrong</h1>
            <p className="mt-2 text-slate-600">An unexpected error occurred. Try reloading the page.</p>
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Back to home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
