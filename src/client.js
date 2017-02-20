import 'babel-polyfill';
import React from 'react';
import ReactDOM from 'react-dom';
import Relay from 'react-relay';
import IsomorphicRelay from 'isomorphic-relay';
import IsomorphicRouter from 'isomorphic-relay-router';
import { match, Router, browserHistory } from 'react-router';
import injectTapEventPlugin from 'react-tap-event-plugin';
import moment from 'moment';
import prefix from './prefix';
import routes from './routes';
import './scss/stylesheet.scss';
injectTapEventPlugin();

const environment = new Relay.Environment();
environment.injectNetworkLayer(new Relay.DefaultNetworkLayer(`${prefix}/graphql`, {
    credentials: 'same-origin',
}));
IsomorphicRelay.injectPreparedData(environment, window.__INITIAL_STATE__);

// Even if this site is written in english, we are mostly used to norwegian formats
moment.locale('nb');

match({ routes, history: browserHistory }, (error, redirectLocation, renderProps) => {
    IsomorphicRouter.prepareInitialRender(environment, renderProps).then(props => {
        ReactDOM.render(<Router {...props} />, document.getElementById('app'));
    });
});
