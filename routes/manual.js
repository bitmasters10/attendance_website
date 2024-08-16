const express = require('express');
const Router = express.Router();
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const methodOverride = require('method-override');
const mysql = require('mysql2');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// Middleware setup
Router.use(methodOverride('_method'));

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
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
                return reject(err);
            }

            if (rows.length === 0) {
                return resolve(id);
            } else {
                // Recursively call idmake until a unique ID is found
                idmake(table, column).then(resolve).catch(reject);
            }
        });
    });
}

const now = new Date();
const year = now.getFullYear();
const month = now.getMonth() + 1;
const day = now.getDate();
const ourdate = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

Router.post("/new/temp-geo", async (req, res) => {
    const { longitude, latitude, description } = req.body;
    const userid = req.user.id;
    try {
        let id = await idmake("request", "reqid");
        const query = `SELECT * FROM request WHERE latitude = ? AND longitude = ? AND date = ?`;
        db.query(query, [latitude, longitude, ourdate], (err, rows) => {
            if (err) {
                console.log('Error:', err);
                res.sendStatus(500);
            } else {
                const insertQuery = `INSERT INTO request (reqid, userid, latitude, longitude, date, description) VALUES (?, ?, ?, ?, ?, ?)`;
                db.query(insertQuery, [id, userid, latitude, longitude, ourdate, description], (err) => {
                    if (err) {
                        console.log('Error:', err);
                        res.sendStatus(500);
                    } else {
                        res.send("Request created successfully");
                    }
                });
            }
        });
    } catch (error) {
        console.error('Error:', error);
        res.sendStatus(500);
    }
});

Router.get("/new/temp", (req, res) => {
    res.render("new-temp");
});

Router.post("/show/temp", (req, res) => {
    db.query("SELECT r.*, u.username FROM users u JOIN request r ON u.id = r.userid WHERE r.date = ?", [ourdate], (err, rows) => {
        if (err) {
            console.log("Error:", err);
            res.sendStatus(500);
        } else {
            res.status(200).json(rows);
        }
    });
});

Router.get("/show/temp-geo", async (req, res) => {
    try {
        const { data: requests } = await axios.post("http://localhost:3000/user/show/temp");
        res.render("show-temp", { requests });
    } catch (error) {
        console.error("Error fetching data:", error);
        res.sendStatus(500);
    }
});
Router.post("/find/:id",async(req,res)=>{
    const {id}=req.params;
    db.query("select * from request where reqid=?",[id],(err,rows)=>{
        if(err){
            console.log("pranav tp mat kar"+err);
        }
        res.send(rows)
    })
})
Router.post("/admin/requests/:id/accept", async (req, res) => {
    const { id } = req.params;
    let r= await axios.post(`http://localhost:3000/user/find/${id}`)
    let temp=r.data
    db.query("UPDATE request SET status = 'accepted' WHERE reqid = ?", [id], (err) => {
        if (err) {
            console.log("Error updating request status:", err);
            res.sendStatus(500);
        } else {
           const query="select *"
            res.redirect("/admin/requests");
        }
    });
});

Router.post("/admin/requests/:id/reject", async (req, res) => {
    const { id } = req.params;
    db.query("UPDATE request SET status = 'rejected' WHERE reqid = ?", [id], (err) => {
        if (err) {
            console.log("Error updating request status:", err);
            res.sendStatus(500);
        } else {
            res.redirect("/admin/requests");
        }
    });
});

module.exports = Router;
