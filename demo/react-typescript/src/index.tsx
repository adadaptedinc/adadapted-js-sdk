import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

// Polyfill to allow support for Promise in IE.
// eslint-disable-next-line @typescript-eslint/no-require-imports
require("es6-promise/auto");

/**
 * Renders the app.
 */
const container = document.getElementById("root");
const root = createRoot(container!);
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
