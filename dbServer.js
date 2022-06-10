const express = require("express")
const app = express()

// const cookieSession = require("cookie-session")
const mysql = require("mysql")

const cors = require('cors');
// const generateAccessToken = require("./generateAccessToken")
// const jwt = require("jsonwebtoken")
// const { authorizationAdmin } = require('./authAdmin')
// const { authorizationUser } = require('./userAuth')
// const passport = require("passport");
var bodyParser = require('body-parser')
const cookieParser = require("cookie-parser")
// const fetch = require('cross-fetch');
const fileUpload = require('express-fileupload');
// const routes = require('./routes');
const path = require('path');

// require('./passport-setup')
require("dotenv").config()

//ejs//
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// DEPLOYMENT

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    credentials: true,
    origin: ['https://nicolas-luque.netlify.app']
}))
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());






const DB_HOST = "eu-cdbr-west-02.cleardb.net"
const DB_USER = "b1f218c43bd0f9"
const DB_PASSWORD = "f5ec4035"
const DB_DATABASE = "heroku_71937ca96dbdc2c"
// const DB_PORT = 3306
// mysql://b1f218c43bd0f9:f5ec4035@eu-cdbr-west-02.cleardb.net/heroku_71937ca96dbdc2c?reconnect=true
const db = mysql.createPool({
    // connectionLimit: 100,
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_DATABASE,
})


// global.db = db;

db.getConnection((err, connection) => {
    if (err) throw (err)
    console.log("DB connected successful: ")
})

const port = 3001
app.listen(process.env.PORT || port, () => {
    console.log(`Server Started on port ${port}...`);
})









//PORTFOLIO//

//get feedback//

app.get("/feedback", (req, res) => {
    try {
        
        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sql = "SELECT * FROM feedback"
            const select_query = mysql.format(sql)
            await connection.query(select_query, (err, result) => {
                connection.release()
                if (err) throw (err)
                console.log("--------> Deleted Service from User")
                res.send(result)
            })
        }) 
    } catch (e) {
        console.log(e)
    }
})

//post feedback//
app.post('/feedback', async (req, res) => {
    try {
        const text = req.body.text;
        const rating = req.body.rating;
        const questionNumber = req.body.questionNumber;
      
        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlInsert = `INSERT INTO feedback (text, rating, questionNumber) VALUES ("${text}", ${rating}, ${questionNumber})`
            const insert_query = mysql.format(sqlInsert)
            await connection.query(insert_query, (err, result) => {
                connection.release()
                if (err) throw (err)
        
                return res.status(200).json({"status": 200,"err": null,"response": result});

            })
        }) //end of connection.query()
    } catch (e) {
        console.log(e)
    }
})

//EDIT FEEDBACK//
app.put('/feedback/:id', async (req, res) => {
    try {
        const feedback_id = req.params.id;
        const text = req.body.text;
        const rating = req.body.rating;
        

        
      
        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlInsert = `UPDATE feedback SET text = "${text}", rating = ${rating} WHERE feedback_id = ${feedback_id}`
            const insert_query = mysql.format(sqlInsert)
            await connection.query(insert_query, (err, result) => {
                connection.release()
                if (err) throw (err)
        
                return res.status(200).json({"status": 200,"err": null,"response": result});

            })
        }) //end of connection.query()
    } catch (e) {
        console.log(e)
    }

})


//DELETE FEEDBACK

app.delete('/feedback/:id', async (req, res) => {
    try {
        const feedback_id = req.params.id;        
      
        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlInsert = `DELETE FROM feedback WHERE feedback_id = ${feedback_id}`
            const insert_query = mysql.format(sqlInsert)
            await connection.query(insert_query, (err, result) => {
                connection.release()
                if (err) throw (err)
        
                return res.send(result)

            })
        }) //end of connection.query()
    } catch (e) {
        console.log(e)
    }
})


//FEEDBACK LIKES//

//get likes//

app.get("/portfolio/likes", (req, res) => {
    try {

                
        
        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sql = `SELECT * from feedback_agree;`
            const select_query = mysql.format(sql)
            await connection.query(select_query, (err, result) => {
                connection.release()
                if (err) throw (err)
                console.log("--------> got your likes")
                res.send(result)
            })
        }) 
    } catch (e) {
        console.log(e)
    }
})

//post like// 
app.post('/portfolio/likes', async (req, res) => {
    try {
        console.log(req.body)
        const id = req.body.feedback_id;
        
        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlInsert = `INSERT INTO feedback_agree (feedback_id) VALUES (${id})`
            
            const insert_query = mysql.format(sqlInsert)
            await connection.query(insert_query, (err, result) => {
                connection.release()
                if (err) throw (err)
                console.log("added likes")
                return res.status(200).json({"status": 200,"err": null,"response": result});

            })
        }) //end of connection.query()
    } catch (e) {
        console.log(e)
    }
})

// FEEDBACK REPLIES //

//GET COMMENTS //
app.get("/portfolio/comments", (req, res) => {
    try {

                
        
        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sql = `SELECT * from feedback_reply;`
            const select_query = mysql.format(sql)
            await connection.query(select_query, (err, result) => {
                connection.release()
                if (err) throw (err)
                console.log("--------> got your comments")
                res.send(result)
            })
        }) 
    } catch (e) {
        console.log(e)
    }
})

//POST COMMNETS//

app.post('/portfolio/comments', async (req, res) => {
    try {
        
        const id = req.body.feedback_id;
        const comment = req.body.comment;
        
        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlInsert = `INSERT INTO feedback_reply (feedback_id, comment) VALUES (${id}, "${comment}")`
            
            const insert_query = mysql.format(sqlInsert)
            await connection.query(insert_query, (err, result) => {
                connection.release()
                if (err) throw (err)
                console.log("added likes")
                return res.status(200).json({"status": 200,"err": null,"response": result});

            })
        }) //end of connection.query()
    } catch (e) {
        console.log(e)
    }
})