import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { gateway } from './gateway';
import './styles.css';
import './production.css';
import './motion.css';
import { installMotion } from './motion';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="landing"><div className="auth-box"><h3>Something went wrong.</h3><p>Your saved data is safe. Reload to reopen Recruider.</p><button className="btn btn-primary" onClick={()=>location.reload()}>Reload app</button></div></div> : this.props.children;
  }
}
async function start() {
  // Demo code and fixtures are eliminated from the production bundle.
  const api = import.meta.env.MODE === 'demo' ? (await import('./demo')).demoGateway : gateway;
  const root = document.getElementById('root')!;
  installMotion(root);
  createRoot(root).render(<ErrorBoundary><App api={api}/></ErrorBoundary>);
}
void start();



