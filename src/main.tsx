import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Surface any uncaught errors at startup as visible text, so a blank screen
// never hides a real cause (esp. on mobile Safari without dev tools).
window.addEventListener("error", (e) => {
  const el = document.getElementById("startup-error");
  if (el) el.textContent = `Startup error: ${e.message}\n${e.error?.stack ?? ""}`;
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
