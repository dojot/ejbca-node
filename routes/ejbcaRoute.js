const ejbcaUtils = require('../utils/ejbcaUtils')

/* EJBCA ROUTES */
let ejbcaRoute = (app, client) => {

    /* CA routes */

    app.get("/ca", (req, res) => {
        client.getAvailableCAs((err, caList) => {
            if (err) {
                return res.status(400).send({ 'soap error': err.toString() });
            }

            return res.status(200).send({ 'CAs': caList });
        });

    });

    app.get("/ca/:cacn", (req, res) => {
        let cacn = req.params.cacn;
        let args = { arg0: cacn };

        client.getLastCAChain(args, (err, cert) => {
            if (err) {
                return res.status(400).send({ 'soap error': err.toString() });
            }

            let responseParse = {
                certificateData: ejbcaUtils.convertCerttoX509(cert.return[0].certificateData)
            }


            console.log(responseParse.certificateData)
            return res.status(200).send({'certificate': responseParse.certificateData});
        });

    });

    app.get("/ca/:cacn/certificate/:certsn", (req, res) => {

        let cacn = req.params.cacn;
        let certsn = req.params.certsn;
        let args = { arg0: cacn, arg1: certsn };

        client.getCertificate(args, (err, cert) => {
            if (err) {
                return res.status(400).send({ 'soap error': err.toString() });
            }

            if (!cert) {
                return res.status(404).send({ 'response': 'No certificate found' });
            }

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
                return res.status(404).send({ 'reason error': 'Inexistent reason' });

            }
        }
        let args = { arg0: cacn, arg1: certsn, arg2: reasonCode };

        client.revokeCert(args, (err) => {
            if (err) {
                return res.status(400).send({ 'soap error': err.toString() });
            }

            return res.status(200).send();
        })
    })

    app.get('/ca/:cacn/certificate/:certsn/status', (req, res) => {

        let cacn = req.params.cacn;
        let certsn = req.params.certsn;
        let args = { arg0: cacn, arg1: certsn };

        client.checkRevokationStatus(args, (err, status) => {
            if (err) {
                return res.status(400).send({ 'soap error': err.toString() });
            }
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
            ejbcaUtils.crlRenew(caname);
        }

        let args = { arg0: caname, arg1: delta };

        client.getLatestCRL(args, (err, crl) => {
            if (err) {
                return res.status(400).send({ 'soap error': err.toString() });
            }

            return res.status(200).send({ 'CRL': crl.return });


        })

    })

    app.put('/ca/:caname/crl', (req, res) => {
        let caname = req.params.caname;
        let args = { arg0: caname };

        client.createCRL(args, (err) => {
            if (err) {
                return res.status(400).send({ 'soap error': err.toString() });
            }

            return res.status(200).send();
        })
    })

    /* USER Routes  */

    app.post('/user', ejbcaUtils.validators.userValidator, (req, res) => {

        /* validate errors */
        let result = ejbcaUtils.errorValidator(req, res);
        if (result.hasError) {
            return res.status(422).json({ 'errors': result.errors });
        }

        /* update user with default fields */
        let userData = req.body;
        userData = ejbcaUtils.updateUser(userData);

        let args = { arg0: userData };

        client.editUser(args, (err) => {
            if (err) {
                return res.status(400).send({ 'soap error': err.toString() });
            }

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
                return res.status(400).send({ 'soap error': error.toString() });
            }

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
                return res.status(404).send({ 'reason error': 'Inexistent reason' });

            }
        }

        if (req.query.delete && req.query.delete.toLowerCase() == 'true') {
            deleteAfter = true;
        }

        try {
            await ejbcaUtils.deleteUser(client, req.params.username, reasonCode, deleteAfter);
        } catch (error) {
            return res.status(400).send({ 'soap error': error.err.toString() });
        }

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
                return res.status(400).send({ 'soap error': err.toString() });
            }

            if (!certs) {
                return res.status(404).send('No certificate found');

            }


            let responseParse = {
                data: ejbcaUtils.convertCerttoX509(certs.return[0].certificateData)
            }

            return res.status(200).send(responseParse);
        });
    })

    /* sign routes (for now, only pkcs10 is accepted) */

    app.post('/sign/:username/pkcs10', ejbcaUtils.validators.certificateValidator, async (req, res) => {

        /* validate errors */
        let result = ejbcaUtils.errorValidator(req, res);
        if (result.hasError) {
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
                return res.status(400).send({ 'soap error': error.toString() });
            }

            let responseParse = {
                data: ejbcaUtils.convertCerttoX509(response.return.data)
            }

            return res.status(200).send({ 'status': responseParse });
        })
    })


    /* EJBCA version */
    app.get("/ejbca/version", (req, res) => {
        client.getEjbcaVersion((err, version) => {
            if (err) {
                return res.status(400).send({ 'soap error': err.toString() });
            }

            return res.status(200).send({ 'version': version });
        });

    });
}

module.exports = ejbcaRoute;