import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/cascadia-mono/400.css";
import "@fontsource/cascadia-mono/600.css";
import "@fontsource/cascadia-mono/700.css";
import App from "./App";
import { ThemeProvider } from "./hooks/useTheme";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
