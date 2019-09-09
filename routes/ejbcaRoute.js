const ejbcaUtils = require('../utils/ejbcaUtils')
const {logger} = require('@dojot/dojot-module-logger');

const TAG = { filename: "ejbca_routes" };

/* EJBCA ROUTES */
let ejbcaRoute = (app, client) => {

    /* CA routes */

    app.get("/ca", (req, res) => {
        client.getAvailableCAs((err, caList) => {
            if (err) {
                logger.error('Error getting CA data.', TAG);
                return res.status(400).send({ 'soap error': err.toString() });
            }
            logger.debug('CA data retrieved.', TAG);
            return res.status(200).send({ 'CAs': caList });
        });

    });

    app.get("/ca/:cacn", (req, res) => {
        let cacn = req.params.cacn;
        let args = { arg0: cacn };

        client.getLastCAChain(args, (err, cert) => {
            if (err) {
                logger.error('Error retrieving certificates', TAG);
                return res.status(400).send({ 'soap error': err.toString() });
            }

            let responseParse = {
                certificateData: ejbcaUtils.convertCerttoX509(cert.return[0].certificateData)
            }


            logger.debug('Certificates retrieved', TAG);
            return res.status(200).send({'certificate': responseParse.certificateData});
        });

    });

    app.get("/ca/:cacn/certificate/:certsn", (req, res) => {

        let cacn = req.params.cacn;
        let certsn = req.params.certsn;
        let args = { arg0: cacn, arg1: certsn };

        client.getCertificate(args, (err, cert) => {
            if (err) {
                logger.error('Error retrieving ca certificate', TAG);

                return res.status(400).send({ 'soap error': err.toString() });
            }

            if (!cert) {
                return res.status(404).send({ 'response': 'No certificate found' });
            }

            logger.debug('CA certificate retrieved', TAG);
            return res.status(200).send({ 'certificate': cert });
        })
    })

    app.delete("/ca/:cacn/certificate/:certsn", (req, res) => {

        let cacn = req.params.cacn;
        let certsn = req.params.certsn;

        let reasonCode = ejbcaUtils.reasons.UNSPECIFIED;

        if (req.query.reason) {
            if (req.query.reason in ejbcaUtils.reasons) {
                reasonCode = ejbcaUtils.reasons[req.query.reason];
            }
            else {
                logger.error('Inexistent reason', TAG);
                return res.status(404).send({ 'reason error': 'Inexistent reason' });

            }
        }
        let args = { arg0: cacn, arg1: certsn, arg2: reasonCode };

        client.revokeCert(args, (err) => {
            if (err) {
                return res.status(400).send({ 'soap error': err.toString() });
            }
            logger.debug('Certificate revoked', TAG);
            return res.status(200).send();
        })
    })

    app.get('/ca/:cacn/certificate/:certsn/status', (req, res) => {

        let cacn = req.params.cacn;
        let certsn = req.params.certsn;
        let args = { arg0: cacn, arg1: certsn };

        client.checkRevokationStatus(args, (err, status) => {
            if (err) {
                logger.error('Error checking certificate status', TAG);
                return res.status(400).send({ 'soap error': err.toString() });
            }
            logger.debug('Certificate status retrieved', TAG);
            return res.status(200).send({ 'status': status });


        })

    })

    app.get('/ca/:caname/crl', (req, res) => {

        let caname = req.params.caname;

        let delta = false;

        if (req.query.update && req.query.delta.toLowerCase() == 'true') {
            delta = true;
        }

        if (req.query.update && req.query.update.toLowerCase() == 'true') {
            //renew the CRL
            logger.debug('Renewing the CRL.', TAG);
            ejbcaUtils.crlRenew(caname);
        }

        let args = { arg0: caname, arg1: delta };

        client.getLatestCRL(args, (err, crl) => {
            if (err) {
                logger.error('Error retrieving CRL', TAG);
                return res.status(400).send({ 'soap error': err.toString() });
            }
            logger.debug('Retrieved CRL.', TAG);
            return res.status(200).send({ 'CRL': crl.return });


        })

    })

    app.put('/ca/:caname/crl', (req, res) => {
        let caname = req.params.caname;
        let args = { arg0: caname };

        client.createCRL(args, (err) => {
            if (err) {
                logger.error('Error creating CRL', TAG);
                return res.status(400).send({ 'soap error': err.toString() });
            }
            logger.debug('CRL Created.', TAG);
            return res.status(200).send();
        })
    })

    /* USER Routes  */

    app.post('/user', ejbcaUtils.validators.userValidator, (req, res) => {

        /* validate errors */
        let result = ejbcaUtils.errorValidator(req, res);
        if (result.hasError) {
            logger.error('Error validating user request', TAG);
            return res.status(422).json({ 'errors': result.errors });
        }

        /* update user with default fields */
        let userData = req.body;
        userData = ejbcaUtils.updateUser(userData);

        let args = { arg0: userData };

        client.editUser(args, (err) => {
            if (err) {
                logger.error('Error creating user', TAG);
                return res.status(400).send({ 'soap error': err.toString() });
            }
            logger.debug('User created.', TAG);
            return res.status(200).send('user created/edited with success.');
        });
    });

    app.get('/user/:username', (req, res) => {

        let query = {
            "matchtype": 0,
            "matchvalue": req.params.username,
            "matchwith": 0
        }

        let args = { arg0: query };

        client.findUser(args, (error, user) => {
            if (error) {
                logger.error('Error finding user', TAG);
                return res.status(400).send({ 'soap error': error.toString() });
            }
            logger.debug('User found.', TAG);
            return res.status(200).send({ 'user': user.return });
        })
    })

    app.delete('/user/:username', async (req, res) => {

        let deleteAfter = false;

        let reasonCode = ejbcaUtils.reasons.UNSPECIFIED;

        if (req.query.reason) {
            if (req.query.reason in ejbcaUtils.reasons) {
                reasonCode = ejbcaUtils.reasons[req.query.reason];
            }
            else {
                logger.error('Inexistent reason', TAG);
                return res.status(404).send({ 'reason error': 'Inexistent reason' });

            }
        }

        if (req.query.delete && req.query.delete.toLowerCase() == 'true') {
            deleteAfter = true;
        }

        try {
            await ejbcaUtils.deleteUser(client, req.params.username, reasonCode, deleteAfter);
        } catch (error) {
            logger.error('Error trying delete the user', TAG);
            return res.status(400).send({ 'soap error': error.err.toString() });
        }
        logger.debug('User deleted.', TAG);
        return res.status(200).send('user deleted with success.');

    })

    app.get('/user/:username/find', (req, res) => {

        let onlyValid = true;

        if (req.query.valid && req.query.valid.toLowerCase() == 'false') {
            onlyValid = false;
        }

        let args = {
            arg0: req.params.username,
            arg1: onlyValid
        }

        client.findCerts(args, (err, certs) => {
            if (err) {
                logger.error('Error trying to find the user', TAG);

                return res.status(400).send({ 'soap error': err.toString() });
            }

            if (!certs) {
                logger.error("User don't have certificate", TAG);
                return res.status(404).send('No certificate found');

            }


            let responseParse = {
                data: ejbcaUtils.convertCerttoX509(certs.return[0].certificateData)
            }
            logger.debug('User certificate found.', TAG);
            return res.status(200).send(responseParse);
        });
    })

    /* sign routes (for now, only pkcs10 is accepted) */

    app.post('/sign/:username/pkcs10', ejbcaUtils.validators.certificateValidator, async (req, res) => {

        /* validate errors */
        let result = ejbcaUtils.errorValidator(req, res);
        if (result.hasError) {
            logger.error("Error trying to validate user", TAG);
            return res.status(422).json({ 'errors': result.errors });
        }

        let username = req.params.username;
        let info = req.body;

        // First we need to set the user status to new
        // (the cert can only be obtained if the user have NEW status)
        // reference: https://araschnia.unam.mx/doc/ws/index.html

        try {
            await ejbcaUtils.findUserandReset(client, username);
        } catch (error) {
            logger.error("Error trying to find the user", TAG);
            return res.status(404).send({ 'soap error': error });
        }

        let args = {
            arg0: username,
            arg1: info.passwd,
            arg2: info.certificate,
            arg3: null,
            arg4: 'CERTIFICATE'
        }

        client.pkcs10Request(args, (error, response) => {
            if (error) {
                logger.error("Error signing the user", TAG);
                return res.status(400).send({ 'soap error': error.toString() });
            }

            let responseParse = {
                data: ejbcaUtils.convertCerttoX509(response.return.data)
            }
            logger.debug('User certificate signed with success.', TAG);
            return res.status(200).send({ 'status': responseParse });
        })
    })


    /* EJBCA version */
    app.get("/ejbca/version", (req, res) => {
        client.getEjbcaVersion((err, version) => {
            if (err) {
                logger.error('Error retrieving ejbca version.', TAG);
                return res.status(400).send({ 'soap error': err.toString() });
            }
            logger.debug('EJBCA version retrieved.', TAG);
            return res.status(200).send({ 'version': version });
        });

    });
}

module.exports = ejbcaRoute;