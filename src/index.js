"use strict";
const app = require("./app");
const soap = require('../lib/dojot_soap');

/* Creating the client */
/* WSDL url */
let url = 'https://localhost:8443/ejbca/ejbcaws/ejbcaws?wsdl'
let caCrt = '/opt/p12/ca.crt';
let p12File = '/opt/p12/soap_client.p12';
let password = 'secret';

let clientEJBCA = new soap.SoapClient(url, caCrt, p12File, password);

try {
    app.initApp(clientEJBCA);
} catch (error) {
    console.error(`Caught an error: ${error}`);
    app.stopApp();
}