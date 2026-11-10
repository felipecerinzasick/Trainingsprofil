import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

// Blog pages are static files under /blog/…/. If the host serves the app for a
// blog address typed without the trailing slash, send the visitor to the page.
if (/^\/blog(\/[^/]+)?$/.test(window.location.pathname)) {
  window.location.replace(`${window.location.pathname}/${window.location.search}${window.location.hash}`);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
