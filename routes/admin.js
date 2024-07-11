const express = require('express');
const Router = express.Router();
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const methodOverride = require('method-override');


Router.use(methodOverride('_method'));
const mysql  = require('mysql2')
const db = mysql.createConnection({
    host: 'sql12.freesqldatabase.com',
    user: 'sql12718865',
    password: '19WjXCRzvG',
    database: 'sql12718865',
    port: 3306
});
const sessionStore = new MySQLStore({}, db.promise());


function isAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.type === 'admin') {
        return next();
    }
    res.redirect('/admin/login');
}



Router.get('/login', (req,res)=>{
    res.render('admin-login');
})



Router.get('/dashboard',isAdmin,(req,res)=>{
    const query = 'SELECT count(*) as no FROM users';

    sessionStore.all((err, sessions) => {
        if (err) {
            console.error('Error fetching sessions:', err);
            res.status(500).send('Server Error');
            return;
        }
        const loggedInUsers = Object.values(sessions).filter(session => session.passport && session.passport.user).length;
        const totalUsersQuery = "SELECT COUNT(*) as count FROM users";

        db.query(query,  (err, results) => {
            if (err) return err;
            const nou = results[0].no;
           

            db.query(totalUsersQuery, (err, results) => {
                if (err) {
                    console.error('Error fetching total users:', err);
                    res.status(500).send('Server Error');
                    return;
                }
                const totalUsers = results[0].count;
                const loggedOutUsers = totalUsers - loggedInUsers ;
                res.render('dashboard',{nou ,loggedInUsers , loggedOutUsers});
               
            });
            
        });
    
        });
       
})





Router.get('/users', isAdmin, (req, res) => {
    const query = "SELECT * FROM users;";
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching users:', err);
            res.status(500).send('Server Error');
            return;
        }
        res.render('user', {users: results})
    
});

});


Router.get('/users/:id',isAdmin,(req,res)=>{
    const {id} = req.params
    const query = "SELECT * FROM users where id = ?;";
    db.query(query,id, (err, results) => {
        if (err) {
            console.error('Error fetching users:', err);
            res.status(500).send('Server Error');
            return;
        }
       
        res.render('update', {users: results[0]})
    
});
    
})

Router.patch('/users/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    const { username, email } = req.body;
        const query = 'UPDATE users SET username = ?, email = ? WHERE id = ?';
        db.query(query, [username, email, id], (err, results) => {
            if (err) {
                console.error('Error updating user:', err);
                res.status(500).send('Server Error');
                return;
            }
           
            res.redirect('/admin/users')
        });
    });
// });

Router.delete('/users/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM users WHERE id = ?';
    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('Error deleting user:', err);
            res.status(500).send('Server Error');
            return;
        }
        res.redirect('/admin/users');
    });
});

Router.get('/geo', (req,res)=>{
    res.redirect('/home');
})




module.exports = Router;