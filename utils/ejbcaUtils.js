"use strict";
const { execSync } = require('child_process');
const { check, validationResult } = require('express-validator');

let reasons = {
    'AACOMPROMISE': 10,
    'AFFILIATIONCHANGED': 3,
    'CACOMPROMISE': 2,
    'CERTIFICATEHOLD': 6,
    'CESSATIONOFOPERATION': 5,
    'KEYCOMPROMISE': 1,
    'PRIVILEGESWITHDRAWN': 9,
    'REMOVEFROMCRL': 8,
    'SUPERSEDED': 4,
    'UNSPECIFIED': 0,
    'NOTREVOKED': -1
}

function crlRenew(caname) {
    let output = execSync(`/opt/primekey/bin/ejbca.sh ca createcrl --caname ${caname}`);
    return output;
}

function errorValidator(req) {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return {
            errors: errors.array(),
            hasError: true
        };
    }

    return {
        errors: undefined,
        hasError: false
    };
}

function deleteUser(soapClient, user, deleteAfter, reason) {
    let args = {
        arg0: user,
        arg1: deleteAfter,
        arg2: reason
    }

    return new Promise((resolve, reject) => {
        soapClient.revokeUser(args, (err) => {
            if (err) {

                let error = {
                    err: err,
                    hasError: true
                }
                return reject(error);
            }

            return resolve({
                err: undefined,
                hasError: false
            });
        });
    })
}

function findUserandReset(soapClient, username) {

    let query = {
        "matchtype": 0,
        "matchvalue": username,
        "matchwith": 0
    }

    let args = { arg0: query }

    return new Promise((resolve, reject) => {
        soapClient.findUser(args, (error, user) => {

            if (error) {
                let errors = {
                    error,
                    hasError: true
                }

                return reject(errors);
            }

            if (!user) {
                let errors = {
                    error: 'No user found',
                    hasError: true
                }

                return reject(errors);

            }

            // NEW = 10
            if (user.return[0].status != 10) {
                user.return[0].status = 10;

                args = { arg0: user.return[0] }
                soapClient.editUser(args, (err) => {

                    if (err) {
                        let errors = {
                            err,
                            hasError: true
                        }

                        return reject(errors);
                    }

                    return resolve({
                        error: undefined,
                        hasError: false
                    });
                })
            }
            else {
                return resolve({
                    error: undefined,
                    hasError: false
                });
            }
        })


    })
}

function updateUser(user) {

    /* here we check non-required fields and add default value for them*/
    let defaultFields = {
        'caName': 'IOTmidCA',
        'certificateProfileName': 'CFREE',
        'clearPwd': true,
        'endEntityProfileName': 'EMPTY_CFREE',
        'keyRecoverable': false,
        'password': 'dojot',
        'tokenType': 'USERGENERATED',
        'subjectDN': `CN=${user.username}`,
        'sendNotification': false,
        'status': 10
    }

    for (const key in defaultFields) {
        if (!user.hasOwnProperty(key)) {
            user[key] = defaultFields[key];
        }
    }

    return user;
}

function convertCerttoX509(rawCert) {
    let bufferedData = Buffer.from(rawCert
        .match(/.{1,64}/g)
        .join('\n'), 'base64').toString('utf-8')

    return bufferedData;
}

// validators
let userValidator = [check('username').isString({ min: 3 })];

let certificateValidator = [
    check('passwd').isString({ min: 3 }),
    check('certificate').isBase64()
];

let validators = {
    userValidator,
    certificateValidator
}

module.exports = {
    reasons,
    crlRenew,
    validators,
    errorValidator,
    updateUser,
    deleteUser,
    findUserandReset,
    convertCerttoX509
}