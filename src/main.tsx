import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AdobeSplashScreen } from './components/AdobeSplashScreen';
import './styles/global.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  const isSplashWindow =
    window.location.search.includes('splash') ||
    window.location.hash.includes('splash') ||
    Boolean((window as any).api?.isSplashWindow?.()) ||
    Boolean((window as any).electronAPI?.isSplashWindow?.());

  if (isSplashWindow) {
    document.documentElement.classList.add('splash-mode');
    document.documentElement.style.background = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';
    document.body.classList.add('splash-mode');
    document.body.style.background = 'transparent';
    document.body.style.backgroundColor = 'transparent';
    root.render(
      <React.StrictMode>
        <AdobeSplashScreen isStandaloneWindow={true} isStandaloneSplash={true} />
      </React.StrictMode>
    );
  } else {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}
