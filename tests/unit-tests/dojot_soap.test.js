/* Mocks */
const fs = require('fs');
const forge = require('node-forge');
const soap = require('soap');

jest.mock('fs');
jest.mock('soap');
jest.mock('node-forge');
jest.mock('request');


let dojotSoap = require('../../lib/dojot_soap');


/* test certs file */
let caCrt = '../test_certs/ca.crt';
let p12 = '../test_certs/ca.crt';

function manualMocks() {

    /* Manual mocks */

    /* forge mock */
    let bags = ['MOCKEDBAG'];
    let oidMock = 0;
    forge.pki.oids.certBag = oidMock;
    forge.pki.oids.pkcs8ShroudedKeyBag = oidMock;

    p12 = {
        getBags: jest.fn(function () {
            return bags;
        })
    }
    forge.pkcs12.pkcs12FromAsn1 = jest.fn().mockReturnValue(p12);
    forge.pki.certificateToPem = jest.fn().mockReturnValue('certificate');
    forge.pki.privateKeyToPem = jest.fn().mockReturnValue('key');

    /* fs mock */
    fs.existsSync = jest.fn().mockReturnValue(true);
}

describe("Testing Dojot soap class", () => {

    describe("Testing _createPEMfromP12", () => {
        beforeEach(() => {
            jest.resetAllMocks();
        });

        it("Should create with success the certs buffer", () => {

            /* soap client */
            let soapClient = new dojotSoap.SoapClient('url', caCrt, p12, 'secret');

            manualMocks();
            soapClient._createPEMfromP12();

            expect(soapClient.bufferedCert).toBeDefined();
            expect(soapClient.caPem).toBeDefined();
            expect(soapClient.myPem).toBeDefined();
            expect(soapClient.key).toBeDefined();
        });

        it("Should fail read the file", () => {
            let soapClient = new dojotSoap.SoapClient('url', caCrt, p12, 'secret');

            fs.existsSync = jest.fn().mockReturnValue(false);
            soapClient._createPEMfromP12();

            expect(soapClient.bufferedCert).toEqual(null);

        })

        it("Should certs not be defined", () => {

            /* soap client */
            let soapClient = new dojotSoap.SoapClient('url', caCrt, p12, 'secret');
            fs.existsSync = jest.fn().mockReturnValue(true);

            /* here we dont mock the calls to our forge dependency returns undef*/
            try {
                soapClient._createPEMfromP12();
            } catch (error) {
                expect(soapClient.bufferedCert).toEqual(null);
                expect(soapClient.caPem).toEqual(null);
                expect(soapClient.myPem).toEqual(null);
                expect(soapClient.key).toEqual(null);
                expect(error).toBeDefined();
            }

        })
    })

    describe("Testing createClient", () => {

        beforeEach(() => {
            jest.resetAllMocks();
        });

        it("Should return soap string client instance", async () => {
            soap.createClient = jest.fn((arg1, arg2, callback) => callback(null, 'client'));

            manualMocks();

            let soapClient = new dojotSoap.SoapClient('url', caCrt, p12, 'secret');

            let result = await soapClient.createClient();

            expect(result).toEqual('client');

        })

        it("Should return error because pem not created", async () => {
            soap.createClient = jest.fn((arg1, arg2, callback) => callback(null, 'client'));

            let soapClient = new dojotSoap.SoapClient('url', caCrt, p12, 'secret');
            fs.existsSync = jest.fn().mockReturnValue(true);
            let result;
            try {
                result = await soapClient.createClient();

            } catch (error) {
                expect(result).toEqual(undefined);

            }


        })

        it("Should return error because soap client was not created", async () => {
            soap.createClient = jest.fn((arg1, arg2, callback) => callback('error', null));
            manualMocks();

            let soapClient = new dojotSoap.SoapClient('url', caCrt, p12, 'secret');
            fs.existsSync = jest.fn().mockReturnValue(true);

            try {
                await soapClient.createClient();

            } catch (error) {
                expect(error).toEqual('error');

            }


        })

        it("Should not create a new buffered cert", async () => {
            soap.createClient = jest.fn((arg1, arg2, callback) => callback(null, 'client'));

            manualMocks();

            let soapClient = new dojotSoap.SoapClient('url', caCrt, p12, 'secret');
            soapClient.bufferedCert = 'data';
            soapClient.key = 'key';
            let result = await soapClient.createClient();

            expect(result).toEqual('client');


        })
    })
})