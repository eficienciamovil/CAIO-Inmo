import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { StoreProvider } from './state/store';
import { ExplainProvider } from './components/ui';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StoreProvider>
      <ExplainProvider>
        <App />
      </ExplainProvider>
    </StoreProvider>
  </React.StrictMode>,
);
