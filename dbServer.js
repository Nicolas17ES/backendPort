const express = require("express")
const app = express()
var session = require('express-session')
const cookieSession = require("cookie-session")
const mysql = require("mysql")
const bcrypt = require("bcrypt")
const cors = require('cors');
const generateAccessToken = require("./generateAccessToken")
const jwt = require("jsonwebtoken")
const { authorizationAdmin } = require('./authAdmin')
const { authorizationUser } = require('./userAuth')
const passport = require("passport");
var bodyParser = require('body-parser')
const cookieParser = require("cookie-parser")
const fetch = require('cross-fetch');
const fileUpload = require('express-fileupload');
const routes = require('./routes');
const path = require('path');

require('./passport-setup')
require("dotenv").config()

//ejs//
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

// DEPLOYMENT

app.use(express.json())
app.use(cookieParser())
app.use(cors({
    credentials: true,
    origin: ['http://localhost:3000']
}))
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());






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
})


global.db = db;

db.getConnection((err, connection) => {
    if (err) throw (err)
    console.log("DB connected successful: " + connection.threadId)
})

const port = process.env.PORT
app.listen(port,
    () => console.log(`Server Started on port ${port}...`))



//IMAGES//

//Upload Image Dog
app.get('/', routes.index);//call for main index page
app.post('/image', routes.index);//call for signup post 
app.get('/profile/:id', routes.profile);


//upload images user//
app.get('/image/user', routes.userImage);//call for main index page
app.post('/image/user', routes.userImage);//call for signup post 

// end image //


//REGISTER USER
app.post("/auth/register", async (req, res) => {
    const name = req.body.name;
    const username = req.body.username;
    const email = req.body.email;
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const role = req.body.role;
    const city = req.body.city;
    const country = req.body.country;
    const walkerBoolean = req.body.walker;
    const publicProfile = req.body.publicProfile;
    let walker = false;
    let public = false;

    if(walkerBoolean === "true"){
        walker = true;
    } else {
        walker = false;
    }
    
    if(publicProfile === "true"){
        public = true;
    } else {
        public = false;
    }

    db.getConnection(async (err, connection) => {
        if (err) throw (err)
        const sqlSearch = "SELECT * FROM users WHERE email = ?"
        const search_query = mysql.format(sqlSearch, [email])
        const sqlInsert = `INSERT INTO users (name, username, password, email, city, country, role, walker, publicProfile) VALUES ("${name}", "${username}","${hashedPassword}", "${email}", "${city}", "${country}", "${role}", ${walker}, ${public})`
        const insert_query = mysql.format(sqlInsert)
        await connection.query(search_query, async (err, result) => {
            if (err) throw (err)
            console.log("------> Search Results")
            if (result.length != 0) {
                connection.release()
                console.log("------> User already exists")
                res.sendStatus(409)
            }
            else {
                await connection.query(insert_query, async (err, result) => {
                    connection.release()
                    if (err) throw (err)
                    console.log("--------> Created new User")
                    await connection.query(search_query, async (err, result) => {
                        if (result) {
                            const token = generateAccessToken({ user: email, role: null })
                            const { password, ...data } = await result[0]
                            res.cookie('jwt', token, {
                                httpOnly: true,
                                maxAge: 24 * 60 * 60 * 1000
                            })
                            const id = data.user_id;
                            res.json({ accessToken: token, data, user_id: id });

                        } else {
                            throw (err);
                        }
                    })
                    // res.sendStatus(201)
                })
            }
        }) //end of connection.query()
    }) //end of db.getConnection()
}) //end of app.post()

//UPLOAD IMAGE//




// REGISTER USER GOOGLE STRATEGY//
app.get('/good', (req, res) => {
    res.send('hey')
})

app.get('/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }), function (req, res) { });


app.get("/google/callback", function (req, res) {
    passport.authenticate("google", function (err, result, info) {
        if (err) {
            res.status(404).json(err);
            return;
        }

        if (result) {
            res.cookie('jwt', result, {
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000
            })
            res.redirect('http://localhost:3000')
        } else {
            res.status(401).json(info);
        }
    })(req, res);
});



//UPDATE USER DATA//
//basics//
app.post("/auth/user/update", (req, res) => {
    const user_id = req.body.user_id
    const name = req.body.name
    const email = req.body.email
    const city = req.body.city
    const country = req.body.country
    
    db.getConnection(async (err, connection) => {
        if (err) throw (err)
        const search_query = `UPDATE users SET name = "${name}", email = "${email}", city = "${city}", country = "${country}" where user_id = ${user_id};`
        await connection.query(search_query, async (err, result) => {
            connection.release()
            if (err) throw (err)
            else {
                res.send(result);
                console.log("updated")
            }//end of User exists i.e. results.length==0
        }) //end of connection.query()
    }) //end of db.connection()
}) //end of app.post()


//public & walker profile//
app.post("/auth/user/update/public&walker", (req, res) => {
    const user_id = req.body.user_id
    const walkerBoolean = req.body.walker;
    const publicProfile = req.body.publicProfile;
    let walker = false;
    let public = false;

    if (walkerBoolean === "true") {
        walker = true;
    } else {
        walker = false;
    }

    if (publicProfile === "true") {
        public = true;
    } else {
        public = false;
    }

    db.getConnection(async (err, connection) => {
        if (err) throw (err)
        const search_query = `UPDATE users SET walker = ${walker}, publicProfile = ${public} where user_id = ${user_id};`
        await connection.query(search_query, async (err, result) => {
            connection.release()
            if (err) throw (err)
            else {
                res.send(result);
                console.log("updated")
            }//end of User exists i.e. results.length==0
        }) //end of connection.query()
    }) //end of db.connection()
}) //end of app.post()

//Password//
app.post("/auth/user/update/password", (req, res) => {
    const user_id = req.body.user_id;
    const email = req.body.email
    const password = req.body.password
    const newPassword = req.body.newPassword
    db.getConnection(async (err, connection) => {
        if (err) throw (err)
        const sqlSearch = "Select * from users where email = ?"
        const search_query = mysql.format(sqlSearch, [email])
        await connection.query(search_query, async (err, result) => {
            if (err) throw (err)
            if (result.length == 0) {
                console.log("--------> User does not exist in login")
                res.sendStatus(404)
            }
            else {
                const hashedPassword = result[0].password
                if (await bcrypt.compare(password, hashedPassword)) {
                    let crypted = await bcrypt.hash(newPassword, 10);
                    const search_query2 = `UPDATE users SET password = "${crypted}" where email = "${email}" AND user_id = ${user_id};`
                    await connection.query(search_query2, async (err, result) => {
                        connection.release()
                        if (err) throw (err)
                        else {
                            res.send("Password changed");
                        }
                    })
                }
            }//end of User exists i.e. results.length==0
        }) //end of connection.query()
    }) //end of db.connection()
}) //end of app.post()


//LOGIN (AUTHENTICATE USER)
app.post("/auth/login", (req, res) => {
    const email = req.body.email
    const password = req.body.password
    db.getConnection(async (err, connection) => {
        if (err) throw (err)
        const sqlSearch = "Select * from users where email = ?"
        const search_query = mysql.format(sqlSearch, [email])
        await connection.query(search_query, async (err, result) => {
            connection.release()
            if (err) throw (err)
            if (result.length == 0) {
                console.log("--------> User does not exist in login")
                res.sendStatus(404)
            }
            else {
                const hashedPassword = result[0].password
                const userRole = result[0].role
                //get the hashedPassword from result
                if (await bcrypt.compare(password, hashedPassword)) {
                    const token = generateAccessToken({ user: email, role: userRole })
                    const { password, ...data } = await result[0]
                    res.cookie('jwt', token, {
                        httpOnly: true,
                        maxAge: 24 * 60 * 60 * 1000
                    })
                    const id = data.user_id;

                    res.json({ accessToken: token, data, user_id: id })

                }
                else {
                    console.log("---------> Password Incorrect")
                    res.send("Password incorrect!")
                } //end of bcrypt.compare()
            }//end of User exists i.e. results.length==0
        }) //end of connection.query()
    }) //end of db.connection()
}) //end of app.post()


//AUTHENTICATED USER

app.get("/auth/user", (req, res) => {
    try {
        const cookie = req.cookies['jwt']

        const claims = jwt.verify(cookie, process.env.ACCESS_TOKEN_SECRET)
        if (!claims) {
            return res.sendStatus(401)
        }
        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlSearch = "SELECT * FROM users WHERE email = ?"
            const search_query = mysql.format(sqlSearch, [claims.user])
            await connection.query(search_query, async (err, result) => {
                connection.release()

                if (err) throw (err)

                if (result.length == 0) {
                    console.log("--------> User does not exist")
                    res.sendStatus(404)
                }
                else {
                    const { password, created_at, ...data } = result[0]

                    res.send(data)

                }//end of User exists i.e. results.length==0
            }) //end of connection.query()
        })
    } catch (e) {
        return res.status(401).send({
            message: 'unauthenticated'
        })
    }

})

//user by id//
app.get("/auth/userid/:id", (req, res) => {
    try {
        const id = req.params.id;
        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlSearch = "SELECT * FROM users WHERE user_id = ?"
            const search_query = mysql.format(sqlSearch, [id])
            await connection.query(search_query, async (err, result) => {
                connection.release()

                if (err) throw (err)

                if (result.length == 0) {
                    console.log("--------> User does not exist")
                    res.sendStatus(404)
                }
                else {
                    const { password, created_at, role, username, ...data } = result[0]
                    res.send(data)

                }//end of User exists i.e. results.length==0
            }) //end of connection.query()
        })
    } catch (e) {
        return res.status(401).send({
            message: 'unauthenticated'
        })
    }
})

// GET walkers users   SELECT * FROM users WHERE walker = true;//
app.get("/auth/walkers", (req, res) => {
    let info = []
   
    try {

        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlSearch = "SELECT * FROM users WHERE walker = true"
            const search_query = mysql.format(sqlSearch)
            await connection.query(search_query, async (err, result) => {
                connection.release()

                if (err) throw (err)

                if (result.length == 0) {
                    console.log("--------> No walkers available")
                    res.sendStatus(404)
                }
                else {
                    for(let i = 0; i < result.length; i++){
                        console.log("lenght is " + result.length);
                        const { password, created_at, role, username, ...data } = result[i];
                        info.push(data);
                    }
                    res.send(info);
                    console.log(info);
                    

                }//end of User exists i.e. results.length==0
            }) //end of connection.query()
        })
    } catch (e) {
        return res.status(401).send({
            message: 'unauthenticated'
        })
    }

})

//User profile//
app.get("/auth/profile/:id", (req, res) => {
    try {
        const user_id = req.params.id;
        const friends = [];
        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlSearch = `SELECT * from users WHERE users.user_id = ${ user_id }`;
            const search_query = mysql.format(sqlSearch);

            // const sqlSearch2 = `SELECT * FROM lostdog WHERE lostdog.user_id= ${user_id}`;
            // const search_query2 = mysql.format(sqlSearch2);
            await connection.query(search_query, async (err, result) => {

                if (err) throw (err)

                if (result.length == 0) {
                    console.log("--------> User does not exist")
                  
                }
                else {
                    const { password, created_at, role, username, ...data } = result[0];
                    friends.push(data);
                    res.send(friends)
                }//end of User exists i.e. results.length==0
            }) //end of connection.query()
        })
    } catch (e) {
        return res.status(401).send({
            message: 'unauthenticated'
        })
    }
})


// GET public users   SELECT * FROM users WHERE public = true;//
app.get("/auth/public/:id", (req, res) => {
    let info = []
    const id = req.params.id;

    try {

        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlSearch = "SELECT * FROM users WHERE publicProfile = true"
            const search_query = mysql.format(sqlSearch)
            await connection.query(search_query, async (err, result) => {
                connection.release()

                if (err) throw (err)

                if (result.length == 0) {
                    console.log("--------> No walkers available")
                    res.sendStatus(404)
                }
                else {
                    for (let i = 0; i < result.length; i++) {
                        const { password, created_at, role, username, ...data } = result[i];
                        if(data.user_id != id){
                            info.push(data);
                        }
                        
                    }
                    res.send(info);

                }//end of User exists i.e. results.length==0
            }) //end of connection.query()
        })
    } catch (e) {
        return res.status(401).send({
            message: 'unauthenticated'
        })
    }

})

//SEND FRIEND REQUEST //
app.post('/friends/send', async (req, res) => {
    try {
        const user_id_one = req.body.user_id_one;
        const user_id_two = req.body.user_id_two;
        const status = "send";
       
        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlInsert = `INSERT INTO friends (user_id_one, user_id_two, status) VALUES (${user_id_one}, ${user_id_two}, "${status}")`
            const insert_query = mysql.format(sqlInsert)
            await connection.query(insert_query, (err, result) => {
                connection.release()
                if (err) throw (err)
                console.log(result)

                res.send("Success");            })
        }) //end of connection.query()
    } catch (e) {
        console.log(e)
    }

})


//CHECK IF THERES FRIEND REQUEST  SELECT * FROM friends INNER JOIN users ON user_id_one = users.user_id WHERE user_id_two LIKE "%57%" AND status LIKE "%send%";//

app.get("/friends/received/:id", (req, res) => {
    try {
        const user_id_two = req.params.id;
        const status = "send";
        const info = [];
        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlSearch = `SELECT users.user_id, users.name, users.city, users.country, users.walker FROM friends INNER JOIN users ON user_id_one = users.user_id WHERE user_id_two LIKE "${user_id_two}" AND status LIKE "${status}"`;
            const search_query = mysql.format(sqlSearch)
            await connection.query(search_query, async (err, result) => {
                connection.release()

                if (err) throw (err)

                if (result.length == 0) {
                    console.log("--------> User does not exist")
                    res.sendStatus(404)
                }
                else {
                    for (let i = 0; i < result.length; i++) {
                        const { password, created_at, role, username, ...data } = result[i];
                        info.push(data);
                    }
                    res.send(info);

                }//end of User exists i.e. results.length==0
            }) //end of connection.query()
        })
    } catch (e) {
        return res.status(401).send({
            message: 'unauthenticated'
        })
    }

})

//ACCEPT FRIEND REQUEST //
app.post('/friends/accept', async (req, res) => {
    try {
        const user_id_one = req.body.user_id_one;
        const user_id_two = req.body.user_id_two;
        console.log(req.body);

        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlInsert = `UPDATE friends SET status = "accept" where user_id_one = ${user_id_one} AND user_id_two = ${user_id_two};`
            const insert_query = mysql.format(sqlInsert)
            await connection.query(insert_query, (err, result) => {
                connection.release()
                if (err) throw (err)

                res.send("Success");
            })
        }) //end of dconnection.dquery()
    } catch (e) {
        console.log(e)
    }
})


//REJECT friend request//
app.post('/friends/reject', async (req, res) => {
    try {
        const user_id_one = req.body.user_id_one;
        const user_id_two = req.body.user_id_two;
        console.log(req.body);

        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlInsert = `UPDATE friends SET status = "reject" where user_id_one = ${user_id_one} AND user_id_two = ${user_id_two};`
            const insert_query = mysql.format(sqlInsert)
            await connection.query(insert_query, (err, result) => {
                connection.release()
                if (err) throw (err)

                res.send("Success");
            })
        }) //end of dconnection.dquery()
    } catch (e) {
        console.log(e)
    }
})

//ELIMINATE FRIEND
app.post('/friends/eliminate', async (req, res) => {
    try {
        const user_id_one = req.body.user_id_one;
        const user_id_two = req.body.user_id_two;

        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlInsert = `UPDATE friends SET status = "eliminated" where user_id_one = ${user_id_one} AND user_id_two = ${user_id_two};`
            const insert_query = mysql.format(sqlInsert)
            await connection.query(insert_query, (err, result) => {
                connection.release()
                if (err) throw (err)

                res.send("Success");
            })
        }) //end of dconnection.dquery()
    } catch (e) {
        console.log(e)
    }
})


//SEE FRIENDS LIST //

app.get("/friends/show/:id", (req, res) => {
    try {
        const user_id = req.params.id;
        const status = "accept";
        const friends = [];
        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlSearch = `SELECT users.user_id, users.name, users.email, users.city, users.country, users.walker, users.image FROM friends INNER JOIN users ON user_id_two = users.user_id WHERE user_id_one LIKE "${user_id}" AND status LIKE "${status}"`;
            const search_query = mysql.format(sqlSearch);

            const sqlSearch2 = `SELECT users.user_id, users.name, users.email, users.city, users.country, users.walker, users.image FROM friends INNER JOIN users ON user_id_one = users.user_id WHERE user_id_two LIKE "${user_id}" AND status LIKE "${status}"`;
            const search_query2 = mysql.format(sqlSearch2);
            await connection.query(search_query, async (err, result) => {

                if (err) throw (err)

                if (result.length == 0) {
                    console.log("--------> User does not exist")
                  
                }
                else {
                    const { password, created_at, role, username, ...data } = result
                   
                    for(let i = 0; i < result.length; i++){
                        if (data[i].user_id != user_id) {
                            friends.push(data[i]);
                        }
                    }
                    
                }//end of User exists i.e. results.length==0
            }) //end of connection.query()

            await connection.query(search_query2, async (err, result) => {
                connection.release()

                if (err) throw (err)

                if (result.length == 0) {
                    console.log("--------> User does not exist")
                    res.sendStatus(404)
                }
                else {
                    const { password, created_at, role, username, ...data } = result
         

                    for (let i = 0; i < result.length; i++) {
                        if (data[i].user_id != user_id) {
                            friends.push(data[i]);
                        }
                    }

                }//end of User exists i.e. results.length==0
                res.send(friends)
            }) //end of connection.query()
        })
    } catch (e) {
        return res.status(401).send({
            message: 'unauthenticated'
        })
    }

})


//LOGOUT USER

app.post("/auth/logout", (req, res) => {
    res.cookie('jwt', '', {
        maxAge: 0
    })
    res.send({
        message: 'succesful logout'
    })
})


// SERVICES
app.get('/services', (req, res) => {
    res.send('Show all services')
})

app.post('/services', authorizationAdmin, (req, res) => {
    try {
        const name = req.body.name;
        const permission = req.body.permission;
        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlInsert = `INSERT INTO services (name, permission) VALUES ("${name}", "${permission}")`
            const insert_query = mysql.format(sqlInsert)
            await connection.query(insert_query, (err, result) => {
                connection.release()
                if (err) throw (err)
                console.log("--------> Created new Service")

                res.sendStatus(201)
            })
        }) //end of connection.query()
    } catch (e) {
        console.log(e)
    }

}) //end of db.getConnection()



//PERSONAL DASHBOARD

//Get users services

app.get('/user/dashboard/:user_id', authorizationUser, (req, res) => {
    try {
        const user_id = req.params.user_id;
        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlSearch = "SELECT services.name FROM services INNER JOIN user_services ON services.service_id = user_services.service_id WHERE user_services.user_id = ?;"
            const search_query = mysql.format(sqlSearch, [user_id])
            await connection.query(search_query, (err, result) => {
                connection.release()
                if (err) throw (err)
                console.log("--------> Service sended")

                res.send(result)
            })
        }) //end of connection.query()

    } catch (e) {
        console.log(e)

    }
})

//ADD SERVICE TO USER DASHBOARD

app.post('/user/dashboard', authorizationUser, (req, res) => {
    try {
        const user_id = req.body.user_id;
        const service_id = req.body.service_id;
        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlInsert = `INSERT INTO user_services (user_id, service_id) VALUES (${user_id}, ${service_id})`
            const insert_query = mysql.format(sqlInsert)
            await connection.query(insert_query, (err, result) => {
                connection.release()
                if (err) throw (err)
                console.log("--------> Added Service to User")

                res.sendStatus(201)
            })
        }) //end of connection.query()
    } catch (e) {
        console.log(e)
    }
})


//DELETE SERVICE FROM USER DASHBOARD
app.delete('/user/dashboard', authorizationUser, (req, res) => {
    try {
        const user_id = req.body.user_id;
        const service_id = req.body.service_id;
        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlDelete = `DELETE FROM user_services WHERE user_id = ${user_id} AND service_id = ${service_id}`
            const delete_query = mysql.format(sqlDelete)
            await connection.query(delete_query, (err, result) => {
                connection.release()
                if (err) throw (err)
                console.log("--------> Deleted Service from User")
                res.sendStatus(202)
            })
        }) //end of connection.query()
    } catch (e) {
        console.log(e)
    }
})


//GET SERVICE BY NAME

app.get('/services/:name', (req, res) => {
    try {
        const name = req.params.name;
        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlSearch = "SELECT * FROM services WHERE name = ?"
            const search_query = mysql.format(sqlSearch, [name])
            await connection.query(search_query, (err, result) => {
                connection.release()
                if (err) throw (err)
                console.log("--------> Service sended")

                res.send(result[0])
            })
        }) //end of connection.query()

    } catch (e) {
        console.log(e)

    }
})







///LOST DOG GET AND POST//

//POST DOG//

app.post('/dogs', async (req, res) => {
    try {
        const name = req.body.name;
        const description = req.body.description;
        const type = req.body.type;
        const breed = req.body.breed;
        const city = req.body.city;
        const street = req.body.street.trim();
        const contactEmail = req.body.contactEmail;
        const contactPhone = req.body.contactPhone;
        const date = req.body.date;
        const image = req.body.image;
        const user_id = req.body.user_id;
        const geoKey = process.env.GEOCODING
        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${street}+${city}&key=${geoKey}`);
        const data = await response.json();
        const lat = data.results[0].geometry.location.lat;
        const lng = data.results[0].geometry.location.lng;
        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlInsert = `INSERT INTO LostDog (name, description, type, breed, lat, lng, contactEmail, contactPhone, city, date, image, user_id, street) VALUES ("${name}", "${description}", "${type}", "${breed}", "${lat}", "${lng}", "${contactEmail}", "${contactPhone}", "${city}", "${date}", "${image}", "${user_id}", "${street}")`
            const insert_query = mysql.format(sqlInsert)
            await connection.query(insert_query, (err, result) => {
                connection.release()
                if (err) throw (err)
                console.log(result)

                res.sendStatus(201)
            })
        }) //end of connection.query()
    } catch (e) {
        console.log(e)
    }

})





//GET DOG//
app.get('/dogs', (req, res) => {
    try {
        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlSearch = "SELECT * from LostDog;"
            const search_query = mysql.format(sqlSearch)
            await connection.query(search_query, (err, result) => {
                connection.release()
                if (err) throw (err)
                console.log("--------> Service sended")
                res.send(result)
            })
        }) //end of connection.query()

    } catch (e) {
        console.log(e)

    }
})

// GET ONE DOG BY USER ID//
app.get('/dogs/:id', (req, res) => {
    const user_id = req.params.id;
    try {
        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlSearch = `SELECT * from LostDog where user_id = ${user_id};`
            const search_query = mysql.format(sqlSearch)
            await connection.query(search_query, (err, result) => {
                connection.release()
                if (err) throw (err)
                console.log("--------> Service sended")
                res.send(result)
            })
        }) //end of connection.query()

    } catch (e) {
        console.log(e)

    }
})

//DELETE DOG BY ID //

app.delete('/dogs/:id', (req, res) => {
    try {
        const user_id = req.params.user_id;
        const dog_id = req.params.id;
        
        db.getConnection(async (err, connection) => {
            if (err) throw (err)
            const sqlDelete = `DELETE FROM LostDog WHERE id = ${dog_id} AND user_id = ${user_id};`
            const delete_query = mysql.format(sqlDelete)
            await connection.query(delete_query, (err, result) => {
                connection.release()
                if (err) throw (err)
                console.log("--------> Deleted Service from User")
                res.sendStatus(202)
            })
        }) 
    } catch (e) {
        console.log(e)
    }
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