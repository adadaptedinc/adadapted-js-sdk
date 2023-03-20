import * as React from "react";
import * as ReactDOM from "react-dom";
import { App } from "./App";

// Polyfill to allow support for Promise in IE.
require("es6-promise/auto");

/**
 * Renders the app.
 */
const render = () => {
    ReactDOM.render(<App />, document.getElementById("root"));
};

render();
