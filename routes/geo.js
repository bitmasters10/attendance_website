const express = require('express');
const router = express.Router();
const geolib = require('geolib');

router.post('/data', (req, res) => {
    console.log(req.body)
    const geofence = { latitude: 19.07448, longitude: 72.8812877, radius: 500 };
    const userLocation = req.body; 

    const distance = geolib.getDistance(
        { latitude: userLocation.latitude, longitude: userLocation.longitude },
        { latitude: geofence.latitude, longitude: geofence.longitude }
    );

    if (distance <= geofence.radius) {
        console.log('Inside geofence');
        res.json({ message: 'Inside geofence' });
    } else {
        console.log('Outside geofence');
        res.json({ message: 'Outside geofence' });
    }
});

module.exports = router;
