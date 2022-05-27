require("dotenv").config()
const jwt = require("jsonwebtoken")

const authorizationUser = (req, res, next) => {
    const cookie = req.cookies['jwt']
    if (!cookie) {
        return res.sendStatus(403);
    }
    try {
        const data = jwt.verify(cookie, process.env.ACCESS_TOKEN_SECRET)
        req.userEmail = data.user;
        req.userRole = data.role;

        return next();

    } catch {

        return res.sendStatus(403);
    }
};

module.exports = {
    authorizationUser
}