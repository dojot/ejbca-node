#!/bin/bash

# execute the RA (registration authority) configuration
/opt/app/init/config_ra.sh

# init the RA and the Rest api
node /opt/app/src/index.js