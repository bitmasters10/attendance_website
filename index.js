const express = require('express');
const mysql = require('mysql2');
const session = require('express-session');
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const path = require('path');
const cors = require('cors');

const app = express();

const db = mysql.createConnection({
    host: 'sql12.freesqldatabase.com',
    user: 'sql12718865',
    password: '19WjXCRzvG',
    database: 'sql12718865',
    port: 3306
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the MySQL database');
});


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({ secret: 'your-secret-key', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
app.use(cors());
app.use(express.static(path.join(__dirname, 'view'))); 

passport.use(new LocalStrategy(
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

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser((id, done) => {
    const query = 'SELECT * FROM users WHERE id = ?';
    db.query(query, [id], (err, results) => {
        if (err) return done(err);
        done(null, results[0]);
    });
});


function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login.html');
}


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'view', 'login.html'));
});

app.get('/home', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'view', 'home.html'));
});

app.post('/signup', (req, res) => {
    const { username,eid, email, password } = req.body;
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            console.error('Error hashing password:', err);
            res.status(500).send('Server Error');
            return;
        }
        const query = 'INSERT INTO users (id,username, email, password) VALUES (?,?, ?, ?)';
        db.query(query, [ eid,username, email, hashedPassword], (err, results) => {
            if (err) {
                console.error('Error executing query:', err);
                res.status(500).send('Server Error');
                return;
            }
            res.redirect('/login.html');
            console.log(results);
        });
    });
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/home',
    failureRedirect: '/login.html'
    
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
app.get("/users",(req,res)=>{
    const q="SELECT * FROM attendance;"
    db.query(q,(err,results)=>{
        if(err){
            res.send("err milla  "+err)
        }
        res.json(results)
    })
    
})
app.get("/loc/:lat/:long", async (req,res)=>{
    const { lat, long } = req.params;
    const id=req.user.id;
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
    
    let present= await checkProximity(lat, long, centerLat, centerLon, radiusInMeters);
    console.log(lat, long,); 
   

    console.log('Is within 100 meters:',present );
    if(present==true){
        let attend="present"
          const seletq="SELECT * FROM attendance WHERE iuserid= ? and date=?;"
          db.query(seletq,[id,Date()],(err,results)=>{
            if(err){
                res.send("err while save ")
            }
            console.log(results);
            
            if(results === null){
                const insq="INSERT INTO attendance (iuserid, date,attend) VALUES (?,?,?);"
                db.query(insq,[id,Date(),attend],(err,results)=>{
                    if(err){
                        res.send("saving error")
                    }
                    res.send(results)
                })
            }
            else{
                console.log(results);
                res.send("cant update at the movement")//badme update querry dalne hai 
            }
          })
        
    }else{
        res.send("you are not in range of college try again maving a bit close")
    }
 
    console.log("recive");
    console.log(`id=${id}`);
})

const port = 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
