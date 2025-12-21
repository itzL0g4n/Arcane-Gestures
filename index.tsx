import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  // Removed StrictMode to prevent double-initialization of MediaPipe/Camera 
  // which can cause resource conflicts and performance issues in development.
  <App />
);