import { Component, ReactNode } from 'react';

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50 p-6">
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-4">🌻</div>
            <h1 className="text-xl font-bold text-amber-900 mb-2">Something went wrong</h1>
            <p className="text-sm text-amber-700 mb-6">
              The app hit an unexpected error. Try reloading — if it persists, clear your browser cache for this site.
            </p>
            <button
              onClick={this.handleReload}
              className="px-6 py-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-white font-semibold rounded-xl shadow-lg active:scale-95 transition-transform"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
