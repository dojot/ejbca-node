"use strict";

const express = require("express");
const request = require('supertest');
const stopApp = require("../../src/app").stopApp;
const ejbcaUtils = require("../../utils/ejbcaUtils");
const ejbcaRoutes = require('../../routes/ejbcaRoute');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.json());

jest.mock('../../utils/ejbcaUtils');

/* Fake soap client => template */
let client = {
    getAvailableCAs: jest.fn(),
    getLastCAChain: jest.fn(),
    getCertificate: jest.fn(),
    revokeCert: jest.fn(),
    checkRevokationStatus: jest.fn(),
    getLatestCRL: jest.fn(),
    createCRL: jest.fn(),
    getEjbcaVersion: jest.fn(),
    editUser: jest.fn(),
    findUser: jest.fn(),
    revokeUser: jest.fn(),
    findCerts: jest.fn(),
    pkcs10Request: jest.fn()
}

/* requests (put, get, post, delete) mock */

function put(url, body, query) {
    const httpRequest = request(app).put(url);
    httpRequest.send(body);
    httpRequest.query(query);
    httpRequest.set('Accept', 'application/json');
    return httpRequest;
}

function get(url, body, query) {
    const httpRequest = request(app).get(url);
    httpRequest.send(body);
    httpRequest.query(query);
    httpRequest.set('Accept', 'application/json');
    return httpRequest;
}

function post(url, body, query) {
    const httpRequest = request(app).post(url);
    httpRequest.send(body);
    httpRequest.query(query);
    httpRequest.set('Accept', 'application/json');
    return httpRequest;
}

function deleteRoute(url, body, query) {
    const httpRequest = request(app).del(url);
    httpRequest.send(body);
    httpRequest.query(query);
    httpRequest.set('Accept', 'application/json');
    return httpRequest;
}

describe("Testing EJBCA Routes functionalities", () => {

    describe("Testing CA endpoints", () => {
        beforeEach(() => {
            jest.resetModules();
            ejbcaRoutes(app, client);
        });

        afterEach(() => {
            stopApp();
        });
        it('Should /ca route return 200 status and "test" json', async () => {

            client.getAvailableCAs = jest.fn((callback) => callback(null, 'test'));

            let response = await get('/ca');

            expect(response.status).toEqual(200);
            expect(JSON.parse(response.text)).toEqual({
                'CAs': 'test'
            })
        });

        it('Should /ca route return 400 status and "error" json', async () => {

            client.getAvailableCAs = jest.fn((callback) => callback('error', null));

            let response = await get('/ca');

            expect(response.status).toEqual(400);
            expect(JSON.parse(response.text)).toEqual({
                'soap error': 'error'
            })
        });

        it('Should /ca/:cacn route return 200 status and "test" json', async () => {

            let cert = {
                return: [
                    {
                        certificateData: 'data'
                    }
                ]
            }

            client.getLastCAChain = jest.fn((args, callback) => callback(null, cert));

            ejbcaUtils.convertCerttoX509 = jest.fn(() => 'return');

            let response = await get('/ca/test');

            expect(response.status).toEqual(200);
            expect(ejbcaUtils.convertCerttoX509).toBeCalled();
        });

        it('Should /ca/:cacn route return 400 status and "error" json', async () => {

            client.getLastCAChain = jest.fn((args, callback) => callback('error', null));

            ejbcaUtils.convertCerttoX509 = jest.fn();

            let response = await get('/ca/test');

            expect(response.status).toEqual(400);
            expect(JSON.parse(response.text)).toEqual({
                'soap error': 'error'
            })
        });

        it('Should get /ca/:cacn/certificate/:certsn route return 200 status and "test" json', async () => {

            client.getCertificate = jest.fn((args, callback) => callback(null, 'test'));

            let response = await get('/ca/test/certificate/test');
            expect(response.status).toEqual(200);
            expect(JSON.parse(response.text)).toEqual({
                'certificate': 'test'
            })
        });

        it('Should get /ca/:cacn/certificate/:certsn route return 400 status and "error" json', async () => {

            client.getCertificate = jest.fn((args, callback) => callback('error', null));

            let response = await get('/ca/test/certificate/test');

            expect(response.status).toEqual(400);
            expect(JSON.parse(response.text)).toEqual({
                'soap error': 'error'
            })
        });

        it('Should get /ca/:cacn/certificate/:certsn route return 404 status and "no certificate found" json', async () => {

            client.getCertificate = jest.fn((args, callback) => callback(null, null));

            let response = await get('/ca/test/certificate/test');

            expect(response.status).toEqual(404);
            expect(JSON.parse(response.text)).toEqual({
                'response': 'No certificate found'
            })
        });

        it('Should delete /ca/:cacn/certificate/:certsn route return 200 status', async () => {

            client.revokeCert = jest.fn((args, callback) => callback(null));

            let response = await deleteRoute('/ca/test/certificate/test', null, { reason: 'CERTIFICATEHOLD' });
            expect(response.status).toEqual(200);

        });

        it('Should delete /ca/:cacn/certificate/:certsn route return 400 status and "no certificate found" json', async () => {

            client.revokeCert = jest.fn((args, callback) => callback('error'));

            let response = await deleteRoute('/ca/test/certificate/test');

            expect(response.status).toEqual(400);
            expect(JSON.parse(response.text)).toEqual({
                'soap error': 'error'
            })
        });

        it('Should delete /ca/:cacn/certificate/:certsn route return 404 status and "Inexistent reason" json', async () => {

            client.revokeCert = jest.fn((args, callback) => callback('error'));

            let response = await deleteRoute('/ca/test/certificate/test', null, { reason: 'TESTTEST' });

            expect(response.status).toEqual(404);
            expect(JSON.parse(response.text)).toEqual({
                'reason error': 'Inexistent reason'
            })
        });

        it('Should /ca/:cacn/certificate/:certsn/status route return 200 status and "test" json', async () => {

            client.checkRevokationStatus = jest.fn((args, callback) => callback(null, 'test'));

            let response = await get('/ca/test/certificate/test/status');

            expect(response.status).toEqual(200);
            expect(JSON.parse(response.text)).toEqual({
                'status': 'test'
            })
        });

        it('Should /ca/:cacn/certificate/:certsn/status route return 400 status and "error" json', async () => {

            client.checkRevokationStatus = jest.fn((args, callback) => callback('error', null));

            let response = await get('/ca/test/certificate/test/status');

            expect(response.status).toEqual(400);
            expect(JSON.parse(response.text)).toEqual({
                'soap error': 'error'
            })
        });

        it('Should /ca/:caname/crl route return 200 status and "json" json', async () => {
            let crl = {return: 'test'}
            client.getLatestCRL = jest.fn((args, callback) => callback(null, crl));

            let response = await get('/ca/test/crl', null, { delta: 'true', update: 'true' });

            expect(response.status).toEqual(200);
            expect(JSON.parse(response.text)).toEqual({
                'CRL': 'test'
            })
        });

        it('Should /ca/:caname/crl route return 400 status and "error" json', async () => {

            client.getLatestCRL = jest.fn((args, callback) => callback('error', null));

            let response = await get('/ca/test/crl', null, { delta: 'false', update: 'false' });

            expect(response.status).toEqual(400);
            expect(JSON.parse(response.text)).toEqual({
                'soap error': 'error'
            })
        });

        it('Should /ca/:caname/crl route return 200 status', async () => {

            client.createCRL = jest.fn((args, callback) => callback(null));

            let response = await put('/ca/test/crl');

            expect(response.status).toEqual(200);
        });

        it('Should /ca/:caname/crl route return 400 status and "error" json', async () => {

            client.createCRL = jest.fn((args, callback) => callback('error'));

            let response = await put('/ca/test/crl');

            expect(response.status).toEqual(400);
            expect(JSON.parse(response.text)).toEqual({
                'soap error': 'error'
            })
        });

        it('Should /user route return 200 status', async () => {

            client.editUser = jest.fn((args, callback) => callback(null));

            let error = { errors: undefined, hasError: false };

            ejbcaUtils.errorValidator = jest.fn(() => error);

            let response = await post('/user', { 'username': "data" });
            expect(response.status).toEqual(200);

        })

        it('Should /user route return 422 status', async () => {

            client.editUser = jest.fn((args, callback) => callback(null));

            let error = { errors: 'error', hasError: true };

            ejbcaUtils.errorValidator = jest.fn(() => error);

            let response = await post('/user', { 'username': "data" });
            expect(response.status).toEqual(422);

        })

        it('Should /user route return 400 status', async () => {

            client.editUser = jest.fn((args, callback) => callback('error'));

            let error = { errors: undefined, hasError: false };

            ejbcaUtils.errorValidator = jest.fn(() => error);

            let response = await post('/user', { 'username': "data" });
            expect(response.status).toEqual(400);

        })

        it('Should /user/:username route return 200 status', async () => {

            let user = {
                return: 'user'
            }
            client.findUser = jest.fn((args, callback) => callback(null, user));


            let response = await get('/user/:username');
            expect(response.status).toEqual(200);
            expect(JSON.parse(response.text)).toEqual({
                'user': user.return
            })

        })

        it('Should /user/:username route return 400 status', async () => {

            client.findUser = jest.fn((args, callback) => callback('error', null));


            let response = await get('/user/:username');
            expect(response.status).toEqual(400);

        })

        it('Should /user/:username delete route return 200 status', async () => {

            client.revokeUser = jest.fn((args, callback) => callback(null));
            let error = { err: undefined, hasError: false };

            ejbcaUtils.deleteUser = jest.fn(() => error)
            let response = await deleteRoute('/user/:username', null, { delete: 'false' });
            expect(response.status).toEqual(200);

        })

        it('Should /user/:username delete route return 404 status', async () => {

            client.revokeUser = jest.fn((args, callback) => callback(null));
            let error = { err: undefined, hasError: false };

            ejbcaUtils.deleteUser = jest.fn(() => Promise.resolve(error))
            let response = await deleteRoute('/user/:username', null, { reason: 'NOREASON', delete: 'true' });
            expect(response.status).toEqual(404);

        })

        it('Should /user/:username delete route return 400 status', async () => {

            client.revokeUser = jest.fn((args, callback) => callback('ERROR'));
            let error = { err: 'ERROR', hasError: true };

            ejbcaUtils.deleteUser = jest.fn(() => Promise.reject(error))


            let result = await deleteRoute('/user/:username', null, { reason: 'UNSPECIFIED', delete: 'true' });
            expect(result.status).toEqual(400);
            expect(ejbcaUtils.deleteUser).toBeCalled();
        })

        it('Should /user/:username/find route return 200 status', async () => {

            let cert = {
                return:
                [
                    {
                        certificateData: 'data'
                    }
                ]


            }
            ejbcaUtils.convertCerttoX509 = jest.fn();

            client.findCerts = jest.fn((args, callback) => callback(null, cert));

            let response = await get('/user/:username/find', null, { valid: 'true' });
            expect(response.status).toEqual(200);
            expect(ejbcaUtils.convertCerttoX509).toBeCalled();

        })


        it('Should /user/:username/find delete route return 400 status', async () => {

            client.findCerts = jest.fn((args, callback) => callback('error', null));

            let response = await get('/user/:username/find', null, { valid: 'false' });
            expect(response.status).toEqual(400);

        })


        it('Should /user/:username/find delete route return 404 status', async () => {

            client.findCerts = jest.fn((args, callback) => callback(null, null));

            let response = await get('/user/:username/find', null, { valid: 'false' });
            expect(response.status).toEqual(404);

        })

        it('Should /sign/:username/pkcs10 route return 200 status', async () => {

            let responseData = {
                return: {
                    data: 'data'
                }
            }

            client.pkcs10Request = jest.fn((args, callback) => callback(null, responseData));

            let error = { errors: undefined, hasError: false };

            ejbcaUtils.errorValidator = jest.fn(() => error);
            ejbcaUtils.findUserandReset = jest.fn(() => error);

            let info = { passwd: 'data', certificate: 'data' }
            let response = await post('/sign/:username/pkcs10', info);
            expect(response.status).toEqual(200);

        })

        it('Should /sign/:username/pkcs10 route return 400 status', async () => {

            client.pkcs10Request = jest.fn((args, callback) => callback('error', null));

            let error = { errors: undefined, hasError: false };

            ejbcaUtils.errorValidator = jest.fn(() => error);
            ejbcaUtils.findUserandReset = jest.fn(() => error);

            let info = { passwd: 'data', certificate: 'data' }
            let response = await post('/sign/:username/pkcs10', info);
            expect(response.status).toEqual(400);

        })

        it('Should /sign/:username/pkcs10 route return 422 status', async () => {

            client.pkcs10Request = jest.fn((args, callback) => callback('error', null));

            let error = { errors: null, hasError: false };
            let errorValidator = { errors: 'error', hasError: true };

            ejbcaUtils.errorValidator = jest.fn(() => errorValidator);
            ejbcaUtils.findUserandReset = jest.fn(() => Promise.reject(error));

            let info = { passwd: 'data', certificate: 'data' }
            let response = await post('/sign/:username/pkcs10', info);
            expect(response.status).toEqual(422);

        })

        it('Should /sign/:username/pkcs10 route return 404 status', async () => {

            client.pkcs10Request = jest.fn((args, callback) => callback('error', null));

            let error = { errors: 'error', hasError: true };
            let errorValidator = { errors: null, hasError: false };

            ejbcaUtils.errorValidator = jest.fn(() => errorValidator);
            ejbcaUtils.findUserandReset = jest.fn(() => Promise.reject(error));

            let info = { passwd: 'data', certificate: 'data' }
            let response = await post('/sign/:username/pkcs10', info);
            expect(response.status).toEqual(404);

        })

    })


    describe("Testing EJBCA endpoints", () => {

        it('Should /ejbca/version route return 200 status and "test" json', async () => {


            client.getEjbcaVersion = jest.fn((callback) => callback(null, 'test'));

            let response = await get('/ejbca/version');

            expect(response.status).toEqual(200);
            expect(JSON.parse(response.text)).toEqual({
                'version': 'test'
            })
        });

        it('Should /ejbca/version route return 400 status and "error" json', async () => {

            client.getEjbcaVersion = jest.fn((callback) => callback('error', null));

            let response = await get('/ejbca/version');

            expect(response.status).toEqual(400);
            expect(JSON.parse(response.text)).toEqual({
                'soap error': 'error'
            })
        });
    })

})