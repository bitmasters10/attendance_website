var defines = require("./defines");
const moment = require("moment");
var log = defines.log;
var googleMapsClient;
const geolib = require("geolib");
var utility_functions = require("./utility");

//-----------------------------------------------------------------------------
/**
 *
 * @param {String} origin
 * @param {String} destination
 * @param {String} mode
 */
async function getDistance(origin, destination, mode) {
  let result;
  try {
    let response = await googleMapsClient
      .distanceMatrix({
        origins: [origin],
        destinations: [destination],
        mode: mode
      })
      .asPromise();

    result = {
      distance: response.json.rows[0].elements[0],
      origin_address: response.json.origin_addresses[0],
      destination_address: response.json.destination_addresses[0]
    };
    defines.Globals.counters.apiCalls++;
  } catch (error) {
    log.error("Error: ", error);
  }

  return result;
}
//-----------------------------------------------------------------------------
/**
 * Updates the distance
 */
async function updateDistance() {
  let curLocation;
  let result;
  try {
    curLocation = await defines.Globals.options.getCurrentLocation();

    let now = moment().valueOf();
    let minutesBeforeNow =
      now -
      1000 * 1 * 60 * defines.Globals.options.locationCacheTimeoutInMinutes;

    if (
      defines.cache.distance[curLocation] &&
      defines.cache.distance[curLocation].value &&
      defines.cache.distance[curLocation].timestamp >= minutesBeforeNow
    ) {
      // Usae cache
      result = defines.cache.distance[curLocation].value;
      log.info("Used cache!".green);
    } else {
      // First calculate the bird-fly-distance without Google API
      // let shouldCallAPI = shouldCallAPIBasedOnDirectFlyDistance(curLocation);

      // Call google API
      result = await getDistance(
        curLocation,
        defines.Globals.locationSpecs.destination,
        defines.Globals.locationSpecs.mode
      );

      // Update cache
      defines.cache.distance[curLocation] = {
        value: result,
        timestamp: now
      };
    }
  } catch (error) {
    log.error("Error: ", error);
  }

  if (!result.distance.distance) {
    log.error("Distance was not found: ", `curLocation: ${curLocation}`);
  } else {
    log.info("Cur address:", result.origin_address.blue);
    log.info("Dest address:", result.destination_address.yellow);
    log.info("Mode: ", defines.Globals.locationSpecs.mode);
    log.info("cur distance: ", JSON.stringify(result.distance.distance.text));
    log.info("cur duration: ", JSON.stringify(result.distance.duration.text));
    log.info("apiCalls: ", defines.Globals.counters.apiCalls);

    let insideFence = false;
    if (
      result.distance.duration &&
      ["duration", "both", "either"].includes(
        defines.Globals.options.activateFenceOn
      ) &&
      result.distance.duration.value <=
        defines.Globals.options.fenceDurationValue
    ) {
      log.info(
        "Inside the fence based on duration: ",
        `${result.distance.duration.value} <= ${
          defines.Globals.options.fenceDurationValue
        }`
      );
      insideFence = true;
    }

    if (
      result.distance.distance &&
      ["distance", "both", "either"].includes(
        defines.Globals.options.activateFenceOn
      ) &&
      result.distance.distance.value <=
        defines.Globals.options.fenceDistanceValue
    ) {
      log.info(
        "Inside fence based on distance: ",
        `${result.distance.distance.value} <= ${
          defines.Globals.options.fenceDistanceValue
        }`
      );
      insideFence = true;
    }

    // Call updateDistanceResults
    if (defines.Globals.options.updateDistanceCallBack) {
      let updateDistanceResults = {
        curAddress: result.origin_address,
        destAddress: result.destination_address,
        mode: defines.Globals.locationSpecs.mode,
        curDistance: result.distance.distance,
        curDuration: result.distance.duration,
        activateFenceOn: defines.Globals.options.activateFenceOn,
        fenceDurationValue: defines.Globals.options.fenceDurationValue,
        fenceDistanceValue: defines.Globals.options.fenceDistanceValue,
        apiCalls: defines.Globals.counters.apiCalls,
        insideFence: insideFence
      };
      defines.Globals.options.updateDistanceCallBack(updateDistanceResults);
    }

    if (insideFence) {
      log.info("We are inside the fence!".green);
      if (defines.Globals.options.insideGeofenceCallBack) {
        defines.Globals.options.insideGeofenceCallBack();
      }
      if (!defines.Globals.options.loopForever) {
        stop("Ending geofencing.");
      }
    } else {
      log.info("We are NOT inside the fence!".red);
    }
  }

  log.info(
    "-----------------------------------------------------------------------------"
  );
}
//-----------------------------------------------------------------------------
/**
 * Using the bird-fly-distance, decides if we should call distance API.
 * This is based on the fact that if the bird-fly-distance is much higher than
 * the fence range, We already know that we are outside the fence, and
 * there is no point in calling the API.
 * Similarly, if the bird-fly-distance is much lower than the fence range,
 * we already know that we are inside the fence.
 * THIS FUNCTION IS NOT COMPLETE YET!
 * @param {String} curLocation
 * @returns {boolean}
 */
function shouldCallAPIBasedOnDirectFlyDistance(curLocation) {
  let result = true;
  if (defines.Globals.options.useBirdFlyDistanceOptimization) {
    let latLong = utility_functions.getLatLong(curLocation);
    if (latLong) {
      let birdDistance = geolib.getDistance(
        latLong,
        defines.Globals.options.destLatLong,
        (accuracy = 1)
      );
      console.log("birdDistance: ", JSON.stringify(birdDistance));
    }
  }
  return result;
}

//-----------------------------------------------------------------------------
async function main() {
  if (defines.Globals.options.useBirdFlyDistanceOptimization) {
    log.info("Geocoding the destination...");
    let geocode = await googleMapsClient
      .geocode({
        address: defines.Globals.locationSpecs.destination
      })
      .asPromise();

    defines.Globals.counters.apiCalls++;

    defines.Globals.internal.detinationGeocode = geocode;

    if (
      utility_functions.validChain(geocode, "json", "results") &&
      geocode.json.results[0].geometry
    ) {
      defines.Globals.options.destLatLong =
        geocode.json.results[0].geometry.location;
      log.info(
        "Destination Geocode: ",
        JSON.stringify(geocode.json.results[0].geometry.location)
      );
    }
  }

  defines.Globals.intervals.aggregatePriceInterval = setInterval(() => {
    if (defines.Globals.options.enable) {
      updateDistance();
    }
  }, defines.Globals.options.updateInterval * 1000);
}
//-----------------------------------------------------------------------------
/**
 * Starts geofencing
 */
async function start() {
  log.info("Start geofencing...");
  log.info(
    "-----------------------------------------------------------------------------"
  );
  defines.Globals.options.enable = true;
  await main();
}
//-----------------------------------------------------------------------------
/**
 * Stops geofencing
 * @param {String} message
 */
function stop(message = "Stop signal received. Please wait...") {
  log.info(message);
  defines.Globals.options.enable = false;
  process.exit();
}
//-----------------------------------------------------------------------------
module.exports = function(
  options = {},
  locationSpecs = defines.Globals.locationSpecs
) {
  Object.assign(defines.Globals.options, options);
  Object.assign(defines.Globals.locationSpecs, locationSpecs);

  googleMapsClient = require("@google/maps").createClient({
    key: defines.Globals.options.apiKey,
    Promise: Promise
  });

  return {
    stop: stop,
    start: start
  };
};
