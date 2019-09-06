"use strict";
const bodyParser = require('body-parser');
const express = require('express');
const retryConnection = require('promise-retry');
const {logger} = require('@dojot/dojot-module-logger');

const TAG = { filename: "app" };

let app = null;

let server = {
    isInitialized: false,
    httpServer: null,
    app: null
}

/* EJBCA Routes */
const ejbcaRoute = require('../routes/ejbcaRoute');

function initApp(clientEJBCA) {

    server.app = express();
    server.app.use(bodyParser.json({ type: "*/*" }));
    server.app.use(bodyParser.urlencoded({ extended: true }));

    /* Starting the server */
    server.httpServer = server.app.listen(5583, () => {
        logger.debug('Listening on port 5583.', TAG);
        server.isInitialized = true;
    })

    retryConnection((retry, number) => {
        logger.debug(`Trying to connect to ejbca wsdl service.. retries: ${number}`, TAG);

        return clientEJBCA.createClient().catch(retry);
    }).then((ejbcaService) => {
        logger.debug('Connected to wsdl service', TAG);

        /* setting route */
        ejbcaRoute(server.app, ejbcaService);
        return true;

    }).catch(err => {
        logger.error(err.toString(), TAG);
        return false;
    })

}

function stopApp() {
    if (server.isInitialized) {
        logger.debug('Stoping the server.');
        server.isInitialized = false;
        server.httpServer.close();
    }
}

module.exports = {
    initApp,
    stopApp,
    server
}
