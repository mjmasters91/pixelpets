import "@fontsource/fraunces/600.css";
import "@fontsource/fraunces/700.css";
import "@fontsource/nunito/500.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { assertSafeEnv } from "./lib/supabase";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing root.");

try {
  assertSafeEnv();
  const basename = import.meta.env.BASE_URL.replace(/\/$/, "");
  createRoot(root).render(
    <StrictMode>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
} catch (error) {
  const message = error instanceof Error ? error.message : "The quay could not open.";
  root.innerHTML = `<div class="boot-error card"><h1>PixelPets</h1><p>${message}</p></div>`;
}
