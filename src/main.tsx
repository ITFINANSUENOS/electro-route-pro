import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Global unhandled rejection handler to prevent blank pages
window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
  event.preventDefault();
});

window.addEventListener("error", (event) => {
  console.error("Unhandled error:", event.error);
});

createRoot(document.getElementById("root")!).render(<App />);
