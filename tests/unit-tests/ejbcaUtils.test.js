"use strict";
jest.mock('child_process');
let validator = require('express-validator');

validator.check = jest.fn(() => ({
    isString: jest.fn(),
    isBase64: jest.fn()
}))

jest.mock('express-validator');

const utils = require('../../utils/ejbcaUtils')
let { execSync } = require('child_process');

describe("Testing EJBCA Utils functionalities", () => {

    describe("Testing crl renew", () => {
        it("Should execSync be called", () => {

            utils.crlRenew('test')
            expect(execSync).toBeCalled();
        })
    })

    describe("Testing errorValidator", () => {
        it("Should not return error", () => {


            validator.validationResult.mockReturnValue({
                isEmpty: jest.fn(() => true),
                array: jest.fn()
            })


            let result = utils.errorValidator('test');

            expect(result.hasError).toEqual(false);

            expect(validator.validationResult).toBeCalled();
        })

        it("Should return error", () => {


            validator.validationResult.mockReturnValue({
                isEmpty: jest.fn(() => false),
                array: jest.fn()
            })


            let result = utils.errorValidator('test');

            expect(result.hasError).toEqual(true);

            expect(validator.validationResult).toBeCalled();
        })
    })

    describe("Testing deleteUser", () => {
        it("Should return error", async () => {

            let soapClient = {revokeUser: jest.fn((args, callback) => callback('error'))}

            try {
                await utils.deleteUser(soapClient, 'test', 'test', 'test');

            } catch (error) {
                expect(error.hasError).toEqual(true);
                expect(soapClient.revokeUser).toBeCalled();

            }

        })


        it("Should not return error", async () => {

            let soapClient = {revokeUser: jest.fn((args, callback) => callback(null))}


            let result = await utils.deleteUser(soapClient, 'test', 'test', 'test');
            expect(result.hasError).toEqual(false);
            expect(soapClient.revokeUser).toBeCalled();

        })


    })

    describe("Testing findUserandReset", () => {
        it("Should return error (soap error)", async () => {

            let soapClient = {
                findUser: jest.fn((args, callback) => callback('error', null)),
                editUser: jest.fn((args, callback) => callback(null))
            }

            try {
                await utils.findUserandReset(soapClient, 'test');

            } catch (error) {
                expect(error.hasError).toEqual(true);
                expect(soapClient.findUser).toBeCalled();
                expect(soapClient.editUser).not.toBeCalled();

            }

        })

        it("Should return error (no user found)", async () => {

            let soapClient = {
                findUser: jest.fn((args, callback) => callback(null, null)),
                editUser: jest.fn((args, callback) => callback(null))
            }

            try {
                await utils.findUserandReset(soapClient, 'test');

            } catch (error) {
                expect(error.hasError).toEqual(true);
                expect(soapClient.findUser).toBeCalled();
                expect(soapClient.editUser).not.toBeCalled();

            }

        })

        it("Should return error (user found, but can't edit)", async () => {

            let mockUser = {
                return: [
                    { status: 11 },
                    { status: 22 }
                ]
            }

            let soapClient = {
                findUser: jest.fn((args, callback) => callback(null, mockUser)),
                editUser: jest.fn((args, callback) => callback('error'))
            }

            try {
                await utils.findUserandReset(soapClient, 'test');

            } catch (error) {
                expect(error.hasError).toEqual(true);
                expect(soapClient.findUser).toBeCalled();
                expect(soapClient.editUser).toBeCalled();

            }

        })

        it("Should not return error (user found and edited)", async () => {

            let mockUser = {
                return: [
                    { status: 11 },
                    { status: 11 }
                ]
            }

            let soapClient = {
                findUser: jest.fn((args, callback) => callback(null, mockUser)),
                editUser: jest.fn((args, callback) => callback(null))
            }

            let result = await utils.findUserandReset(soapClient, 'test');

            expect(result.hasError).toEqual(false);
            expect(soapClient.findUser).toBeCalled();
            expect(soapClient.editUser).toBeCalled();

        })


        it("Should not return error (user found but not edited)", async () => {

            let mockUser = {
                return: [
                    { status: 10 },
                    { status: 10 }
                ]
            };

            let soapClient = {
                findUser: jest.fn((args, callback) => callback(null, mockUser)),
                editUser: jest.fn((args, callback) => callback(null))
            }

            let result = await utils.findUserandReset(soapClient, 'test');

            expect(result.hasError).toEqual(false);
            expect(soapClient.findUser).toBeCalled();
            expect(soapClient.editUser).not.toBeCalled();

        })
    })

    describe("Testing updateUser", () => {
        it("Should user default field be created if not exists", () => {

            let user = { username: 'test' };

            user = utils.updateUser(user);

            expect(user.tokenType).toEqual('USERGENERATED');
        })

        it("Should user default field not be created if already exists", () => {

            let user = { username: 'test', tokenType: 'NEW' };

            user = utils.updateUser(user);

            expect(user.tokenType).toEqual('NEW');
        })
    })

    describe("Testing convertCerttoX509", () => {
        it("Should Buffer from be called", () => {

            let data = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
            let value = utils.convertCerttoX509(data);

            let mockedValue = Buffer.from(data, 'base64').toString('utf8');

            expect(value).toEqual(mockedValue);
        })
    })

    describe("Testing createMessenger", () => {
        it("Should fail creating a messenger", () => {
            let error = 'error';
            let mockedMessenger = { init: jest.fn(() => Promise.reject(error)) }

            utils.createMessenger(mockedMessenger, null, null).catch((err) => {
                expect(err).toEqual(error);
            })
        })

        it("Should create a messenger and set listeners ", () => {
            let dojotConfigMock = {dojot: {subjects: {devices: 'device'}}}
            let mockedSoap = {editUser: jest.fn((args, callback) => callback(null))}

            let mockedDeviceUser = {
                event: 'event',
                meta: {service: 'service'},
                data: {id: 'id'}
            }

            let mockedMessenger = {
                init: jest.fn(() => Promise.resolve()),
                createChannel: jest.fn(),
                generateDeviceCreateEventForActiveDevices: jest.fn(),
                on: jest.fn((arg1, arg2, callback) => callback('data', mockedDeviceUser))
            }

            utils.createMessenger(mockedMessenger, dojotConfigMock, mockedSoap).then(() => {
                expect(mockedMessenger.createChannel).toBeCalled();
                expect(mockedMessenger.on).toBeCalled();
                expect(mockedMessenger.generateDeviceCreateEventForActiveDevices).toBeCalled();
            })
        })

        it("Should create a messenger and not set listeners ", () => {
            let dojotConfigMock = {dojot: {subjects: {devices: 'device'}}}
            let mockedSoap = {editUser: jest.fn((args, callback) => callback('err'))}

            let mockedDeviceUser = {
                event: 'event',
                meta: {service: 'service'},
                data: {id: 'id'}
            }

            let mockedMessenger = {
                init: jest.fn(() => Promise.resolve()),
                createChannel: jest.fn(),
                generateDeviceCreateEventForActiveDevices: jest.fn(),
                on: jest.fn((arg1, arg2, callback) => callback('data', mockedDeviceUser))
            }

            utils.createMessenger(mockedMessenger, dojotConfigMock, mockedSoap).then(() => {
                expect(mockedMessenger.createChannel).toBeCalled();
                expect(mockedMessenger.on).toBeCalled();
            })
        })
    })
})