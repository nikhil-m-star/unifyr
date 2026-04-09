import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err, info) { console.error('[ErrorBoundary]', err, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#000', color: '#fff' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', fontWeight: 900 }}>Something went wrong.</h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem', maxWidth: '400px' }}>
            The application encountered an unexpected error. We've been notified and are looking into it.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="btn-primary"
            style={{ padding: '14px 32px', borderRadius: '16px', background: '#fff', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer' }}
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
