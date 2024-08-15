const express = require('express');
const Router = express.Router();
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const methodOverride = require('method-override');
const mysql = require('mysql2');
const { v4: uuidv4 } = require('uuid');

// Middleware setup
Router.use(methodOverride('_method'));

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: "",
    database: "sql12718865",
    port: process.env.DB_PORT 
   
});

const sessionStore = new MySQLStore({}, db.promise());

// Middleware to check if user is admin
function isAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.type === 'admin') {
        return next();
    }
    res.redirect('/admin/login');
}
async function idmake(table, column) {
    let id = uuidv4();
    const query = `SELECT * FROM ${table} WHERE ${column} = ?`;

    return new Promise((resolve, reject) => {
        db.query(query, [id], (err, rows) => {
            if (err) {
                console.error('Error executing query:', err);
                return reject(err);  // Reject the promise if there's an error
            }

            if (rows.length === 0) {
                return resolve(id);  // Resolve the promise with the unique ID
            } else {
                // Recursively call idmake until a unique ID is found
                idmake(table, column).then(resolve).catch(reject);
            }
        });
    });
}
Router.post("/create-geo", async(req,res)=>{
const {latitude,longitude,radius,name}=req.body;
let ide= await idmake("geofence","geoid");

const query = `SELECT * FROM geofence WHERE latitude = ? and longitude=?`;
db.query(query, [latitude,longitude], (err, rows)=>{
    if(err){
        console.log(`some error has occured ${err}`);
    }
    if (rows.length === 0) {
        
        const query = `insert into geofence (geoid,latitude,longitude, radius,name) values (?,?,?,?,?)`;
db.query(query,[ide,latitude,longitude,radius,name],(err,results)=>{
    if(err){
        console.log(`error while inserting${err}`);
    }
    console.log(results);
    res.send("hogya")
})
    }
    else{
        res.send("geo exsits")
    }
})
})
Router.post("/curr-geos",async(req,res)=>{
    const query=`select * from geofence`;
    db.query(query,(err,rows)=>{
        if(err){
            console.log(err);
            res.send("sory bhai mil nhi rah db").status(404)
        }
        console.log(rows);
        res.send(rows).status(200)
    })
})
Router.patch("/")
module.exports = Router;
