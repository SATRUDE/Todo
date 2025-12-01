
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (registration) {
      console.log(`Service worker registered: ${swUrl}`);
    } else {
      console.warn("Service worker registration pending.");
    }
  },
  onRegisterError(error) {
    console.error("Service worker registration failed:", error);
  },
});

createRoot(document.getElementById("root")!).render(<App />);
  