const soap = {
    wsdlAddr: process.env.EJBCA_WSDL_ADDR || 'https://localhost:8443/ejbca/ejbcaws/ejbcaws?wsdl',
    caCrt: process.env.EJBCA_CA_CRT_DIR || '/opt/p12/ca.crt',
    clientP12: process.env.EJBCA_VA_P12_DIR || '/opt/p12/soap_client.p12',
    clientPass: process.env.EJBCA_PASS || 'secret'
};

module.exports = {
    soap
};