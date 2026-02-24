import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-background p-6">
          <div className="text-center max-w-md space-y-4">
            <h2 className="text-xl font-bold text-foreground">Algo salió mal</h2>
            <p className="text-sm text-muted-foreground">
              Ocurrió un error inesperado. Por favor recarga la página.
            </p>
            {this.state.error && (
              <details className="text-left text-xs text-muted-foreground bg-muted/50 rounded-md p-3 max-h-40 overflow-auto">
                <summary className="cursor-pointer font-medium">Detalle del error</summary>
                <pre className="mt-2 whitespace-pre-wrap break-words">{this.state.error.message}</pre>
              </details>
            )}
            <button
              onClick={this.handleReload}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Recargar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
