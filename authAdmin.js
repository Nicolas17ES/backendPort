require("dotenv").config()
const jwt = require("jsonwebtoken")

const authorizationAdmin = (req, res, next) => {
    const cookie = req.cookies['jwt']
    console.log(cookie)
    if (!cookie) {
        return res.sendStatus(403);
    }
    try {
        const data = jwt.verify(cookie, process.env.ACCESS_TOKEN_SECRET)
        req.userEmail = data.user;
        req.userRole = data.role;
        console.log(req.userRole)
        if (req.userRole == 'admin') {
            return next();
        } else {
            return res.sendStatus(403);
        }

    } catch {

        return res.sendStatus(403);
    }
};

module.exports = {
    authorizationAdmin
}



