"use strict";
const bodyParser = require('body-parser');
const express = require('express');
const retryConnection = require('promise-retry');

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
        console.log(`Listening on port 5583.`);
        server.isInitialized = true;
    })

    retryConnection((retry, number) => {
        console.log(`Trying to connect to ejbca wsdl service.. retries: ${number}`);

        return clientEJBCA.createClient().catch(retry);
    }).then((ejbcaService) => {

        /* setting route */
        ejbcaRoute(server.app, ejbcaService);
        return true;

    }).catch(err => {
        console.log(err.toString());
        return false;
    })

}

function stopApp() {
    if (server.isInitialized) {
        server.isInitialized = false;
        server.httpServer.close();
    }
}

module.exports = {
    initApp,
    stopApp,
    server
}
