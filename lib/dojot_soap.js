const forge = require('node-forge');
const soap = require('soap');
const fs = require('fs');
const request = require('request');

class SoapClient {
    constructor(url, caCrt, p12File, password) {
        this.url = url;
        this.caCrt = caCrt;
        this.p12File = p12File;
        this.password = password;
        this.myPem = null;
        this.caPem = null;
        this.key = null;
        this.bufferedCert = null;
    }

    _createPEMfromP12() {
        try {
            if (fs.existsSync(this.p12File)) {

                let file = fs.readFileSync(this.p12File, 'binary');

                // get p12 as ASN.1 object
                //here buffer is a result for readFileSync pkcs12 file
                let p12Asn1 = forge.asn1.fromDer(file);
                // decrypt p12 using the password 'password'
                let p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, this.password);
                // get bags by type
                let certBags = p12.getBags({ bagType: forge.pki.oids.certBag });

                // fetching certBag
                let myCertBag = certBags[forge.pki.oids.certBag][0];
                let caCertBag = certBags[forge.pki.oids.certBag][1];

                let pkeyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });

                // fetching keyBag
                let keybag = pkeyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0];

                // generate pem from private key
                var privateKeyPem = forge.pki.privateKeyToPem(keybag.key);

                // generate pem from cert
                let myCertificate = forge.pki.certificateToPem(myCertBag.cert);
                let caCertificate = forge.pki.certificateToPem(caCertBag.cert);


                console.log("certificate created");

                this.caPem = caCertificate;
                this.myPem = myCertificate;
                this.key = privateKeyPem;

                /* create buffers for each cert */
                let buffer1 = Buffer.from(this.caPem, 'utf8');
                let buffer2 = Buffer.from(this.myPem, 'utf8');

                let arrayof = [
                    buffer2,
                    buffer1
                ];

                this.bufferedCert = Buffer.concat(arrayof);
                return true;
            }
        } catch (error) {
            return false;
        }
    }

    createClient() {
        return new Promise((resolve, reject) => {

            if (!this.bufferedCert) {
                console.log('creating pem..');

                if (!this._createPEMfromP12()) {
                    let error = 'Failed to create pem';
                    return reject(error);
                }
            }

            const auth = request.defaults({
                ca: fs.readFileSync(this.caCrt),
                key: Buffer.from(this.key, 'utf8'),
                cert: this.bufferedCert
            })

            soap.createClient(this.url, {
                request: auth
            }, (err, client) => {
                if (err) {
                    console.log(err);
                    return reject(err);
                }

                return resolve(client);
            })

        })
    }
}

module.exports = {
    SoapClient
}