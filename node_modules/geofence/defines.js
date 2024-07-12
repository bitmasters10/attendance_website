require("ansicolor").nice;

const log = require("ololog").configure({
  // time: { yes: true, print: x => x.toLocaleString().bright.cyan + " " },
  time: {yes: false},
  locate: false,
  tag: true
});

var Globals = {
  options: {
    apiKey: "ENTER API KEY HERE",
    provider: "google",
    // Optional depending on the providers
    httpAdapter: "https", // Default
    formatter: null, // 'gpx', 'string', ...
    updateInterval: 5,
    fenceDurationValue: 25 * 60, //seconds
    fenceDistanceValue: 1000, //meter
    activateFenceOn: "duration", // 'duration', 'distance', 'either'
    loopForever: true,
    locationCacheTimeoutInMinutes: 10,
    useBirdFlyDistanceOptimization: true,
    insideGeofenceCallBack: null,
    updateDistanceCallBack: null,
    // control
    enable: true // Used for start/stop
  },
  startTime: 0,

  intervals: {
    locationCheck: null
  },

  locationSpecs: {
    curLocation: "",
    origin: "41.43206,-81.38992",
    destination: "san francisco, ca",
    mode: "driving"
  },
  counters:{
    apiCalls: 0
  },
  internal:{
    detinationGeocode: {}
  }
};

var cache = {
  distance: {}
};

var exports = (module.exports = {
  Globals: Globals,
  // options: options,
  log: log,
  cache: cache
});
