import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import App from "./App";
import { ThemeProvider } from "./store/ui.store";
import "@fontsource-variable/inter";
import "@fontsource-variable/plus-jakarta-sans";
import { i18nReady } from "./i18n";
import "./index.css";

void i18nReady.then(() =>
  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <BrowserRouter>
        <ThemeProvider>
          <App />
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </BrowserRouter>
    </React.StrictMode>
  )
);
