const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const bodyParser = require('body-parser');
const passport = require('passport');

const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql  = require('mysql2')
dotenv.config();

const app = express();
const db = mysql.createConnection({
    host: 'sql12.freesqldatabase.com',
    user: 'sql12718865',
    password: '19WjXCRzvG',
    database: 'sql12718865',
    port: 3306
});

// Predefined admin credentials
const adminEmail = 'sushantchoco@gmail.com';
const adminPassword = 'kamatipura';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
const sessionStore = new MySQLStore({}, db.promise());

app.use(session({ secret: 'your-secret-key', resave: false, saveUninitialized: false , store: sessionStore}));
app.use(passport.initialize());
app.use(passport.session());
app.use(cors());
app.use('/admin', require('./routes/admin'))
app.use('/geo', require('./routes/geo'))

// app.use(express.static(path.join(__dirname, 'views')));
app.use(express.static('public'));


db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MySQL database');
});

passport.use('user-local', new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'password'
    },
    (email, password, done) => {
        const query = 'SELECT * FROM users WHERE email = ?';
        db.query(query, [email], (err, results) => {
            if (err) return done(err);
            if (results.length === 0) return done(null, false, { message: 'Incorrect email.' });

            const user = results[0];
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) return done(err);
                if (isMatch) {
                    return done(null, user);
                } else {
                    return done(null, false, { message: 'Incorrect password.' });
                }
            });
        });
    }
));

passport.use('admin-local', new LocalStrategy(
    {
        usernameField: 'email',
        passwordField: 'password'
    },
    (email, password, done) => {
        if (email === adminEmail && password === adminPassword) {
            return done(null, { id: 1, email: adminEmail, type: 'admin' });
        } else {
            return done(null, false, { message: 'Incorrect admin credentials.' });
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, { id: user.id, type: user.type || 'user' });
});

passport.deserializeUser((obj, done) => {
    if (obj.type === 'admin') {
        done(null, { id: obj.id, email: adminEmail, type: 'admin' });
    } else {
        const query = 'SELECT * FROM users WHERE id = ?';
        db.query(query, [obj.id], (err, results) => {
            if (err) return done(err);
            done(null, results[0]);
        });
    }
});

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

function isAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.type === 'admin') {
        return next();
    }
    res.redirect('/admin/login');
}

app.get('/', (req, res) => {
    res.render('register');
});

app.get('/login', (req, res) => {
    res.render('login');
});



app.get('/home',isAuthenticated, (req, res) => {
const admin = req.user.type === 'admin';
const onlineUsersQuery = "SELECT COUNT(DISTINCT userid) as count FROM attendance WHERE status = 'online'";
const offlineUsersQuery = "SELECT COUNT(DISTINCT userid) as count FROM attendance WHERE status = 'offline'";

        db.query(onlineUsersQuery, (err, onlineUsersResults) => {
            if (err) {
                console.error('Error fetching online users:', err);
                res.status(500).send('Server Error');
                return;
            }
            const onlineUsers = onlineUsersResults[0].count;
           
            db.query(offlineUsersQuery, (err, offUsersResults) => {
                if (err) {
                    console.error('Error fetching online users:', err);
                    res.status(500).send('Server Error');
                    return;
                }
                const offlineUsers = offUsersResults[0].count;
                
                res.render('home',{admin,  offlineUsers, onlineUsers });

            });
            
        });
   

});


app.post('/signup', (req, res) => {
    const { username, eid, email, password } = req.body;
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            console.error('Error hashing password:', err);
            res.status(500).send('Server Error');
            return;
        }
        const query = 'INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)';
        db.query(query, [eid, username, email, hashedPassword], (err, results) => {
            if (err) {
                console.error('Error executing query:', err);
                res.status(500).send('Server Error');
                return;
            }
            console.log(results);
            res.redirect('/login');
        });
    });
});

app.post('/login', (req, res, next) => {
    passport.authenticate('user-local', (err, user, info) => {
        if (err) {
            console.error('Authentication error:', err);
            return next(err);
        }
        if (!user) {
            console.log('Authentication failed:', info.message);
            return res.redirect('/login');
        }
        req.logIn(user, (err) => {
            if (err) {
                console.error('Login error:', err);
                return next(err);
            }
            console.log('Authentication successful, redirecting to home');
            return res.redirect('/home');
        });
    })(req, res, next);
});

app.post('/admin-login', passport.authenticate('admin-local', {
    successRedirect: '/admin/dashboard',
    failureRedirect: '/admin/login'
}));

app.post('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Error logging out:', err);
            res.status(500).send('Server Error');
            return;
        }
        res.redirect('/');
    });
});

process.on('SIGINT', () => {
    db.end((err) => {
        if (err) {
            console.error('Error closing the database connection:', err);
        }
        console.log('Database connection closed');
        process.exit();
    });
});

app.get('/users', (req, res) => {
    const q = "SELECT * FROM attendance;";
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    
    const currentTime =`${hours}:${minutes}:${seconds}`;
    db.query(q, (err, results) => {
        if (err) {
            res.send("Error: " + err);
        }
        res.json(results);
        console.log(currentTime);
    });
});

app.get('/loc/:lat/:long', async (req, res) => {
    const { lat, long } = req.params;
    const id = req.user.id;
    function checkProximity(lat, lon, centerLat, centerLon, radiusInMeters) {
        const R = 6371000;
        const latDiff = deg2rad(lat - centerLat);
        const lonDiff = deg2rad(lon - centerLon);
        const a =
            Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
            Math.cos(deg2rad(centerLat)) * Math.cos(deg2rad(lat)) *
            Math.sin(lonDiff / 2) * Math.sin(lonDiff / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return distance <= radiusInMeters;
    }

    function deg2rad(deg) {
        return deg * (Math.PI / 180);
    }

    const centerLat = 19.0748;
    const centerLon = 72.8856;
    const radiusInMeters = 100;

    let present = await checkProximity(lat, long, centerLat, centerLon, radiusInMeters);
    console.log(lat, long);

    console.log('Is within 100 meters:', present);
    if (present) {
        let attend = "present";
        const seletq = "SELECT * FROM attendance WHERE iuserid = ? and date = ?;";
        db.query(seletq, [id, Date()], (err, results) => {
            if (err) {
                res.send("Error while saving: " + err);
            }
            console.log(results);

            if (results.length === 0) {
                const insq = "INSERT INTO attendance (iuserid, date, attend) VALUES (?, ?, ?);";
                db.query(insq, [id, Date(), attend], (err, results) => {
                    if (err) {
                        res.send("Error saving: " + err);
                    }
                    res.send(results);
                })
            } else {
                console.log(results);
                res.send("Cannot update at the moment");
            }
        })

    } else {
        res.send("You are not in range of the college, try moving a bit closer.");
    }

    console.log("Received");
    console.log(`id=${id}`);
})

const port = 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
