//-----------------------------------------------------------------------------
/**
 * A function that mocks the current location
 * @returns {string}
 */
async function getCurrentLocation() {
  let items = [
    "Hayward, CA",
    "San Jose, CA",
    "41.43206,-81.38992",
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
function insideGeofenceCallBack(){
  console.log("WE ARE INSIDE THE FENCE!");
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
  destination: "Oakland, CA",
  mode: "driving"
};
//-----------------------------------------------------------------------------
var geofence = require("../index.js")(options, locationSepc);

geofence.start(options);
