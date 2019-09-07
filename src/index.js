"use strict";
const app = require("./app");
const soap = require('../lib/dojot_soap');
const config = require('../src/config')

const { logger } = require('@dojot/dojot-module-logger');

const TAG = { filename: "index" };

const dojotModule = require('@dojot/dojot-module');
let dojotConfig = dojotModule.Config;

/* Creating the client */
/* WSDL url */
let url = config.soap.wsdlAddr;
let caCrt = config.soap.caCrt;
let p12File = config.soap.clientP12;
let password = config.soap.clientPass;

let clientEJBCA = new soap.SoapClient(url, caCrt, p12File, password);
let messenger = new dojotModule.Messenger("ejbca", dojotConfig);

app.initApp(clientEJBCA, messenger, dojotConfig).catch((err) => {
    logger.error(`Caught an error: ${err}`, TAG)
    app.stopApp();
});