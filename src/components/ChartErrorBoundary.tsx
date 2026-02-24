import React from 'react';

interface State {
  hasError: boolean;
}

export class ChartErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // Ignore known Recharts DOM manipulation errors
    if (error.message?.includes('removeChild') || error.message?.includes('insertBefore')) {
      console.warn('Chart rendering error (non-critical):', error.message);
      // Auto-recover after a brief delay
      setTimeout(() => this.setState({ hasError: false }), 100);
      return;
    }
    console.error('Chart error:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-64 bg-muted/20 rounded-xl">
          <p className="text-sm text-muted-foreground">Cargando gráfico...</p>
        </div>
      );
    }
    return this.props.children;
  }
}
