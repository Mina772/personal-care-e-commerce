import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application render failure', { message: error.message, componentStack: info.componentStack });
  }

  render() {
    if (this.state.failed) return <main className="empty"><p className="eyebrow">Something went wrong</p><h1>We could not display this page.</h1><p>Your account and order data have not been changed.</p><button className="button" onClick={() => window.location.assign('/')}>Return home</button></main>;
    return this.props.children;
  }
}