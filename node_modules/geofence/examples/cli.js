/**
 * Gets API key from command line
 */
var defines = require("../defines");
const mri = require("mri");

log = defines.log;
//-----------------------------------------------------------------------------
/**
 * A function that mocks the current location
 * @returns {string}
 */
async function getCurrentLocation() {
  let items = [
    "Hayward, CA",
    "San Jose, CA",
    "Berkely, CA",
    "Cupertino, CA",
    "41.43206,-81.38992",
    "Sunnyvale, CA",
    "Mountain View, CA",
    "San Francisco, CA"
  ];

  // Return a random value
  var item = items[Math.floor(Math.random() * items.length)];
  return item;
}
//-----------------------------------------------------------------------------
/**
 * Our callback function once we get inside the fence
 */
function insideGeofenceCallBack() {
  log.info("WE ARE INSIDE THE FENCE!".green);
}
//-----------------------------------------------------------------------------
let options = {
  apiKey: "ENTER YOUR API HERE",
  updateInterval: 5,
  getCurrentLocation: getCurrentLocation,
  insideGeofenceCallBack: insideGeofenceCallBack,
  loopForever: false
};

let locationSepc = {
  destination: "Sacramento, CA"
};
//-----------------------------------------------------------------------------

const argv = process.argv.slice(2);
let cliArgs = mri(argv);
log.info(
  "-----------------------------------------------------------------------------"
);
// Setting options based on command line arguments
[
  `apiKey`,
  `updateInterval`,
  `loopForever`,
  `fenceDurationValue`,
  `fenceDistanceValue`
].forEach(e => {
  if (cliArgs[e]) {
    options[e] = cliArgs[e];
    if (e !== `apiKey`) {
      log.info(`${e}: ${options[e]}`);
    }
  }
});

// Setting locationSepc based on command line arguments
[`destination`, `mode`, `origin`].forEach(e => {
  if (cliArgs[e]) {
    locationSepc[e] = cliArgs[e];
    log.info(`${e}: ${locationSepc[e]}`);
  }
});

var geofence = require("../index.js")(options, locationSepc);

geofence.start(options);
