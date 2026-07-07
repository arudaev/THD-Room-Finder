import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import './styles/index.css';

const shouldEnableVercelAnalytics = !Capacitor.isNativePlatform();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      {shouldEnableVercelAnalytics ? <Analytics /> : null}
    </BrowserRouter>
  </StrictMode>,
);
