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
const util = require("util");
const prompt = require("prompt");
const promptGet = util.promisify(prompt.get);

var log = defines.log;

// if (!api.hasTermux) {
//   log.error("Termux doesn't exits. Exit!");
//   process.exit();
// }
var g_notification_id = 1;

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
  inside: ${updateDistanceResults.insideFence}`;

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
  let notification = buildNotification(updateDistanceResults);

  api
    .notification()
    .content(notification.text)
    .id(g_notification_id)
    .title(notification.title)
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
  destination: "Oakland, CA",
  mode: "driving"
};
//-----------------------------------------------------------------------------
async function init() {
  let optionKeys = [
    `apiKey`,
    `activateFenceOn`,
    `updateInterval`,
    `loopForever`,
    `fenceDurationValue`,
    `fenceDistanceValue`
  ];

  let locationSepcKeys = [`destination`, `mode`, `origin`];

  var schema = {
    properties: {
      apiKey: {
        description: "Enter your API key",
        type: "string",
        pattern: /[a-zA-Z0-9_]+$/,
        message: "Value should only be alphanumberical",
        // default: 10,
        required: true
      },
      destination: {
        description: "Enter destination (Address or lat,long)",
        type: "string",
        // pattern: /[a-zA-Z0-9_]+$/,
        // message: "Value should only be alphanumberical",
        default: "340 Main Street, Venice, CA, USA",
        required: true
      },
      activateFenceOn: {
        description: "Fence on 'duration' or 'distance' or 'either'?",
        type: "string",
        pattern: /\b(duration|distance|either)\b/,
        message: "Value should only be duration|distance|either",
        default: 'duration',
        required: true
      },
      updateInterval: {
        description: "Enter your update interval in seconds",
        type: "number",
        pattern: /^[0-9]+$/,
        message: "Value should only be numerical",
        default: 10,
        required: true
      },
      fenceDurationValue: {
        description: "Enter range of fence in seconds",
        type: "number",
        pattern: /^[0-9]+$/,
        message: "Value should only be numerical",
        default: 600,
        required: true
      },
      fenceDistanceValue: {
        description: "Enter range of fence in meters",
        type: "number",
        pattern: /^[0-9]+$/,
        message: "Value should only be numerical",
        default: 5000,
        required: true
      },
      fenceDurationValue: {
        description: "Enter range of fence in seconds",
        type: "number",
        pattern: /^[0-9]+$/,
        message: "Value should only be numerical",
        default: 600,
        required: true
      },
      mode: {
        description: "Mode (driving, biking, walking, ...)",
        type: "string",
        pattern: /[a-zA-Z]+$/,
        message: "Value should only be characters",
        default: "driving",
        required: true
      },
      loopForever: {
        description: "Keep the geofence active once getting inside the fence?",
        type: "boolean",
        pattern: /\b(true|false)\b/,
        message: "Value should be Boolean",
        default: true,
        required: true
      }
    }
  };

  prompt.start();

  let result = await promptGet(schema);

  log.info("Command-line input received:");
  optionKeys.forEach(e => {
    if (result[e]) {
      options[e] = result[e];
      log.info(`${e}: ${options[e]}`);
    }
  });

  locationSepcKeys.forEach(e => {
    if (result[e]) {
      locationSepc[e] = result[e];
      log.info(`${e}: ${locationSepc[e]}`);
    }
  });
}

async function main(){
  await init();

  g_notification_id = utility_functions.hashCode(locationSepc.destination);
  var geofence = require("../index.js")(options, locationSepc);
  geofence.start(options);

}

main();

