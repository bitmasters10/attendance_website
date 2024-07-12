/**
 * Should be run inside [Termux](https://termux.com/) in Android using GPS
 * First install the following apps:
 *  - https://play.google.com/store/apps/details?id=com.termux
 *  - https://play.google.com/store/apps/details?id=com.termux.api
 */

var defines = require("../defines");
const mri = require("mri");
const api = require("termux");
var utility_functions = require("../utility");
const spinners = Object.assign({}, require("./spinners.json"));

var log = defines.log;

if (!api.hasTermux) {
  log.error("Termux doesn't exits. Exit!");
}
var g_notification_id = 1;
let g_notification = { title: "Geofencing...", text: "Please Wait..." };
var g_updateCounter = 0;

//-----------------------------------------------------------------------------
/**
 * A function that mocks the current location
 * @returns {string}
 */
async function getCurrentLocation() {
  let result = await api
    .location()
    .provider("gps") // network/passive/gps (default)
    .request("last") // updates/last/once (default)
    .run();

  // log.info("current location result: ", JSON.stringify(result, null, 2));

  return `${result.latitude},${result.longitude}`;
}
//-----------------------------------------------------------------------------
/**
 * Our callback function once we get inside the fence
 */
async function insideGeofenceCallBack() {
  api
    .notification()
    .content("We are inside the geofence!")
    .id(g_notification_id + 1)
    .title("Geofencing done")
    //  .url('...')
    .run();
}
//-----------------------------------------------------------------------------
/**
 * @returns {object}
 */
function buildNotification(updateDistanceResults) {
  let notificationTitle = `
  curDist: ${updateDistanceResults.curDistance.text},
  curDur: ${updateDistanceResults.curDuration.text},
  in: ${updateDistanceResults.insideFence}`;

  let notificationText = `Activates on:
  ${updateDistanceResults.activateFenceOn},
  duration:${updateDistanceResults.fenceDurationValue},
  distance:${updateDistanceResults.fenceDistanceValue}
  `;
  return {
    title: notificationTitle,
    text: notificationText
  };
}
//-----------------------------------------------------------------------------
/**
 * Callback function to be called whenever the current location and distance
 * is updated
 * @param {Object} updateDistanceResults
 */
async function updateDistanceCallBack(updateDistanceResults) {
  g_notification = buildNotification(updateDistanceResults);
}
//-----------------------------------------------------------------------------
async function updateNotification() {
  g_updateCounter++;

  let frames = spinners.moon.frames;

  api
    .notification()
    .content(g_notification.text)
    .id(g_notification_id)
    .title(
      frames[g_updateCounter % frames.length].toString() + g_notification.title
    )
    //  .url('...')
    .run();
}
//-----------------------------------------------------------------------------
let options = {
  apiKey: "ENTER YOUR API HERE",
  updateInterval: 5,
  getCurrentLocation: getCurrentLocation,
  insideGeofenceCallBack: insideGeofenceCallBack,
  updateDistanceCallBack: updateDistanceCallBack,
  loopForever: true,

  activateFenceOn: "duration", // 'duration', 'distance', 'either'
  fenceDurationValue: 25 * 60, // range of the fence in seconds
  fenceDistanceValue: 1000 // range of the fence in meter
};

let locationSepc = {
  destination: "Oakland, CA"
};
//-----------------------------------------------------------------------------
const argv = process.argv.slice(2);
let cliArgs = mri(argv);
let optionKeys = [
  `apiKey`,
  `updateInterval`,
  `loopForever`,
  `fenceDurationValue`,
  `fenceDistanceValue`
];

let locationSepcKeys = [`destination`, `mode`, `origin`];
optionKeys.forEach(e => {
  if (cliArgs[e]) {
    options[e] = cliArgs[e];
    log.info(`${e}: ${options[e]}`);
  }
});

locationSepcKeys.forEach(e => {
  if (cliArgs[e]) {
    locationSepc[e] = cliArgs[e];
    log.info(`${e}: ${locationSepc[e]}`);
  }
});

g_notification_id = utility_functions.hashCode(locationSepc.destination);
var geofence = require("../index.js")(options, locationSepc);

geofence.start(options);

setInterval(() => {
  updateNotification();
}, 1 * 1000);
