import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// ✅ Service Worker logic
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    // Production: register the custom SW
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('✅ Service Worker registered successfully:', registration.scope);
        })
        .catch(error => {
          console.log('❌ Service Worker registration failed:', error);
        });
    });
  } else {
    // Development: unregister any existing SW and clear caches
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((reg) => reg.unregister());
    });
    if ('caches' in window) {
      caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
    }
  }
}

createRoot(document.getElementById("root")!).render(<App />);