const express = require('express');
const router = express.Router();
const geolib = require('geolib');
const mysql = require('mysql2');
const db = mysql.createConnection({
    host: 'sql12.freesqldatabase.com',
    user: 'sql12718865',
    password: '19WjXCRzvG',
    database: 'sql12718865',
    port: 3306
});

router.post('/data', (req, res) => {
    const geofence = { latitude: 19.07448, longitude: 72.8812877, radius: 500 };
    const userLocation = req.body;

    const distance = geolib.getDistance(
        { latitude: userLocation.latitude, longitude: userLocation.longitude },
        { latitude: geofence.latitude, longitude: geofence.longitude }
    );

    const userId = req.user.id;  
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toISOString().split('T')[1].split('.')[0];
    const t = new Date();
const currentHour = t.getHours();

const startHour = 9; 
const endHour = 17; 
let acc


if (currentHour >= startHour && currentHour < endHour) {
    acc="present"
    console.log('Current time is between 9 am and 5 pm.');
} else {
     acc="absent"
    console.log('Current time is outside 9 am to 5 pm range.');
}

    if (distance <= geofence.radius) {
        console.log('Inside geofence');
        db.query('SELECT * FROM attendance WHERE userid = ? AND date = ?', [userId, currentDate], (err, results) => {
            if (err) {
                console.error('Error executing query:', err);
                return res.status(500).json({ message: 'Server error' });
            }
            if (results.length === 0) {
                
                db.query('INSERT INTO attendance (userid, status, date, signin_time,accounted_for) VALUES (?, ?, ?, ?,?)', 
                [userId, 'online', currentDate, currentTime,acc], (err, results) => {
                    if (err) {
                        console.error('Error executing query:', err);
                        return res.status(500).json({ message: 'Server error' });
                    }
                    res.json({ message: 'Inside geofence, attendance recorded' });
                });
            } else {
                
                db.query('UPDATE attendance SET status = ?, signout_time = NULL WHERE userid = ? AND date = ?', 
                ['online', userId, currentDate], (err, results) => {
                    if (err) {
                        console.error('Error executing query:', err);
                        return res.status(500).json({ message: 'Server error' });
                    }
                    res.json({ message: 'Inside geofence, status updated' });
                });
            }
        });
    } else {
        console.log('Outside geofence');
        db.query('UPDATE attendance SET status = ?, signout_time = ? WHERE userid = ? AND date = ?', 
        ['offline', currentTime, userId, currentDate], (err, results) => {
            if (err) {
                console.error('Error executing query:', err);
                return res.status(500).json({ message: 'Server error' });
            }
            res.json({ message: 'Outside geofence, status updated' });
        });
    }
});

module.exports = router;
