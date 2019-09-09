"use strict";

let fakeSoap = require('../../lib/dojot_soap');
let server = require('../../src/app');
const express = require("express");

jest.mock('../../lib/dojot_soap');
jest.mock('../../utils/ejbcaUtils');
jest.mock('../../routes/ejbcaRoute');

jest.mock("express");

describe("Testing app client", () => {

    describe("Test initApp function", () => {

        let use = jest.fn();

        beforeEach(() => {
            jest.resetModules();
            jest.resetAllMocks();
            express.mockReturnValue({
                use: use
            });

            express().listen = jest.fn(((port, callback) => ({
                callback: callback(),
                close: jest.fn()
            })));

        });

        it("Should initApp fail", () => {
            server.initApp(null).catch(() => {
                expect(server.server.isInitialized).toEqual(true);
            })
        })

        it("Should httpServer be defined", () => {

            let fakeClient = new fakeSoap.SoapClient('test', 'test', 'test', 'test');
            fakeClient.createClient = jest.fn(() => Promise.resolve('test'));

            server.initApp(fakeClient);

            expect(express().use).toBeCalled();
            expect(server.server.isInitialized).toEqual(true);
        })

        it("Should initApp fail", () => {
            server.server.isInitialized = true;
            server.stopApp();
            expect(server.server.isInitialized).toEqual(false);
        })


    })
});