
//DOG IMAGE//
exports.index = function (req, res) {
    message = '';
    if (req.method == "POST") {
        const name = req.query.name;
        const email = req.query.email;
        const user_id = req.query.user_id;
        console.log(req.query);


        if (!req.files)
            return res.status(400).send('No files were uploaded.');

        // var file = req.files.uploaded_image;
        var img_name = req.files.sendimage.name;
        console.log(req.files.sendimage);
        console.log(req.files.sendimage.name);

        if (req.files.sendimage.mimetype == "multipart/form-data") {

            req.files.sendimage.mv('public/images/upload_images/' + img_name, function (err) {

                if (err)

                    return res.status(500).send(err);

                var sql = `UPDATE lostdog SET image = "${img_name}" WHERE name = "${name}" AND contactEmail = '${email}' AND user_id = ${user_id};`

                console.log("sql es " + sql);

                var query = db.query(sql, function (err, result) {
                    res.sendStatus(201);
                });
            });

        } else {
            message = "This format is not allowed";
            res.render('index.ejs', { message: message });
        }
    } else {
        res.render('index');
    }
};


//USER  IMAGE//
exports.userImage = function (req, res) {
    message = '';
    if (req.method == "POST") {
        const email = req.query.email;
        const user_id = req.query.user_id;
        console.log(req.query);


        if (!req.files)
            return res.status(400).send('No files were uploaded.');

        // var file = req.files.uploaded_image;
        var img_name = req.files.sendimage.name;
        console.log(req.files.sendimage);
        console.log(req.files.sendimage.name);

        if (req.files.sendimage.mimetype == "multipart/form-data") {

            req.files.sendimage.mv('public/images/upload_images/' + img_name, function (err) {

                if (err)

                    return res.status(500).send(err);

                var sql = `UPDATE users SET image = "${img_name}" WHERE email = '${email}' AND user_id = ${user_id};`

                var query = db.query(sql, function (err, result) {
                    res.sendStatus(201);
                });
            });

        } else {
            message = "This format is not allowed";
            res.render('index.ejs', { message: message });
        }
    } else {
        res.render('index');
    }
};


exports.profile = function (req, res) {
    var message = '';
    var id = 18;
    var sql = "SELECT * FROM `lostdog` WHERE `id`='" + id + "'";
    db.query(sql, function (err, result) {
        if (result.length <= 0)
            message = "Profile not found!";

        res.render('profile.ejs', { data: result, message: message });
    });
};