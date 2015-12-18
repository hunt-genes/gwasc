import Iso from "iso";
import React from "react";
import ReactDOM from "react-dom";
import { Router } from "react-router";
import createBrowserHistory from "history/lib/createBrowserHistory";
import routes from "./routes";
import alt from "./alt";

Iso.bootstrap((state, _, container) => {
    alt.bootstrap(state);
    ReactDOM.render(<Router history={createBrowserHistory()}>{routes}</Router>, container);
});
