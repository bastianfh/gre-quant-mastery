import React from 'react';
import ReactDOM from 'react-dom/client';
import 'katex/dist/katex.min.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import './styles.css';
import './styles/glass-theme.css';
import './styles/glass-app.css';
import App from './App';
import { initPwa } from './lib/pwa';
import { initSync } from './lib/sync';

initPwa();
initSync();

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch(err: Error) { console.error(err); }
  render() {
    if (this.state.err) return (
      <div className="content"><div className="card">
        <h2>Something went wrong</h2>
        <p className="muted mt8">Your progress is stored safely in this browser. Reload to continue.</p>
        <pre className="small" style={{ whiteSpace: 'pre-wrap' }}>{this.state.err.message}</pre>
        <button className="btn primary mt8" onClick={() => location.reload()}>Reload</button>
      </div></div>
    );
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><ErrorBoundary><App /></ErrorBoundary></React.StrictMode>,
);
