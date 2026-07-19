"use strict";

const express = require("express");
const router = express.Router();

const passport = require("passport");
const multer = require("multer");
const path = require("path");
const User = require("../models/User");


/*
================================
Multer
================================
*/

const storage = multer.diskStorage({

    destination: function(req, file, cb){

    cb(null, path.join(__dirname, "..", "public", "uploads"));

},

    filename: function(req, file, cb){

        const ext = path.extname(file.originalname);

        cb(null, Date.now() + ext);

    }

});

const upload = multer({

    storage

});

/*
================================
Google Login
================================
*/

router.get("/google", (req, res, next) => {

    console.log("GOOGLE ROUTE HIT");

    passport.authenticate("google", {

        scope: [
            "profile",
            "email"
        ]

    })(req, res, next);

});


/*
================================
Google Callback
================================
*/

router.get(

    "/google/callback",

    (req, res, next) => {

        console.log("GOOGLE CALLBACK HIT");

        next();

    },

    passport.authenticate("google", {

        failureRedirect: "/auth/failed"

    }),

    (req, res) => {

        console.log("GOOGLE LOGIN SUCCESS");


        if (
            req.user &&
            req.user.isProfileComplete === false
        ) {

            return res.redirect("/profile-setup.html");

        }


        res.redirect("/");

    }

);


/*
================================
Google Failed
================================
*/

router.get("/failed", (req, res) => {

    res.status(500).send(
        "Google authentication failed. Check terminal logs."
    );

});


/*
================================
Current User
================================
*/

router.get("/user", (req, res) => {

    if (!req.isAuthenticated || !req.isAuthenticated()) {

        return res.json({
            loggedIn: false
        });

    }

    return res.json({

        loggedIn: true,

        user: {

            id: req.user.userId,

            name: req.user.displayName,

            email: req.user.email,

            picture: req.user.avatar,

            accountType: req.user.accountType

        }

    });

});


/*
================================
Logout
================================
*/

router.post("/logout", (req, res) => {

    req.logout(function (err) {

        if (err) {

            console.log(err);

            return res.status(500).json({
                success: false
            });

        }

        req.session.destroy(() => {

            res.clearCookie("connect.sid");

            res.json({
                success: true
            });

        });

    });

});

/*
================================
Update Profile
================================
*/

router.post(
    "/profile-update",
    upload.single("avatar"),
    async (req, res) => {

        try {

            if (!req.isAuthenticated()) {

                return res.status(401).json({

                    success: false,

                    message: "Not logged in"

                });

            }

            const displayName = req.body.displayName;

            let avatar = req.user.avatar;

if (req.file) {

    avatar = "/uploads/" + req.file.filename;

}

            await User.findByIdAndUpdate(

                req.user._id,

                {

                    displayName,

                    avatar,

                    isProfileComplete: true

                }

            );

            res.json({

                success: true

            });

        }

        catch (error) {

            console.log(error);

            res.status(500).json({

                success: false,

                message: "Profile update failed"

            });

        }

    }
);

module.exports = router;