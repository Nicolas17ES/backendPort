const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require("passport");
const generateAccessToken = require("./generateAccessToken")
const mysql = require("mysql")
const express = require("express")
const app = express()
const cookieParser = require("cookie-parser")

app.use(express.json())
app.use(cookieParser())

require("dotenv").config()

const DB_HOST = process.env.DB_HOST
const DB_USER = process.env.DB_USER
const DB_PASSWORD = process.env.DB_PASSWORD
const DB_DATABASE = process.env.DB_DATABASE
const DB_PORT = process.env.DB_PORT

const db = mysql.createPool({
    connectionLimit: 100,
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_DATABASE,
    port: DB_PORT
})

db.getConnection((err, connection) => {
    if (err) throw (err)
    console.log("DB connected successful: " + connection.threadId)
})



passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID_GG,
    clientSecret: process.env.CLIENT_SECRET_GG,
    callbackURL: "http://localhost:3001/google/callback",

}, function (accessToken, refreshToken, profile, done) {
    db.getConnection(async (err, connection) => {
        if (err) throw (err)
        const sqlSearch = "SELECT * FROM users WHERE email = ?"
        const email = profile.emails[0].value
        const name = profile.name.givenName
        const search_query = mysql.format(sqlSearch, [email])
        const sqlInsert = `INSERT INTO users (name, email, role) VALUES ("${name}", "${email}", "user")`
        const insert_query = mysql.format(sqlInsert)

        await connection.query(search_query, async (err, result) => {
            if (err) throw (err)
            console.log("------> Search Results")

            if (result.length != 0) {
                connection.release()
                const userRole = result[0].role
                const token = generateAccessToken({ user: email, role: userRole })
                return done(err, token);


            }
            else {
                await connection.query(insert_query, async (err, result) => {
                    connection.release()
                    if (err) throw (err)
                    const token = generateAccessToken({ user: email, role: 'user' })
                    return done(err, token);
                })
            }
        }) //end of connection.query()
    }) //end of db.getConnection()
}));


passport.serializeUser(function (result, done) {
    done(null, result);
});

passport.deserializeUser(function (email, done) {
    db.getConnection(async (err, connection) => {
        if (err) throw (err)
        const sqlSearch = "SELECT * FROM users WHERE email = ?"
        const search_query = mysql.format(sqlSearch, [email])

        await connection.query(search_query, async (err, result) => {
            if (err) throw (err)
            done(null, result)
        }) //end of connection.query()
    }) //end of db.getConnection()
});