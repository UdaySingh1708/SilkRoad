"use strict";

const path = require("path");

const express = require("express");

const router = express.Router();

const Report = require("../models/Report");



function adminAuth(req, res, next) {


    const auth =
        req.headers.authorization;



    if (!auth) {


        res.setHeader(
            "WWW-Authenticate",
            "Basic"
        );


        return res
            .status(401)
            .send(
                "Authentication Required"
            );


    }



    const encoded =
        auth.split(" ")[1];



    if (!encoded) {


        return res
            .status(401)
            .send(
                "Authentication Required"
            );


    }



    const credentials =
        Buffer
            .from(
                encoded,
                "base64"
            )
            .toString()
            .split(":");



    const username =
        credentials[0];


    const password =
        credentials[1];



    if (

        username !==
        process.env.ADMIN_USERNAME

        ||

        password !==
        process.env.ADMIN_PASSWORD

    ) {


        return res
            .status(403)
            .send(
                "Access Denied"
            );


    }



    next();


}



/*
=====================================
Admin Frontend Page
=====================================
*/

router.get(
    "/",
    adminAuth,
    (req, res) => {


        res.sendFile(

            path.join(

                __dirname,

                "admin.html"

            )

        );


    }
);




/*
=====================================
Get Reports
=====================================
*/

router.get(
    "/reports",
    adminAuth,
    async (req, res) => {


        try {


            const reports =
                await Report
                    .find()
                    .sort({

                        createdAt: -1

                    })
                    .limit(100);



            res.json({

                success: true,

                count:
                    reports.length,

                reports

            });



        }

        catch (err) {


            console.error(
                "Admin Report Error:",
                err.message
            );


            res.status(500)
                .json({

                    success:false,

                    message:
                    "Database Error"

                });


        }


    }
);




/*
=====================================
Delete Report
=====================================
*/
/*
=====================================
Ban User
=====================================
*/

router.post(
    "/ban",
    adminAuth,
    async (req, res) => {


        try {


            const Ban =
                require("../models/Ban");


            await Ban.create({

                userId:
                    req.body.userId,


                reason:
                    req.body.reason ||
                    "Violation of rules"


            });


            res.json({

                success:true,

                message:
                "User banned"

            });


        }

        catch(err) {


            res.status(500)
                .json({

                    success:false,

                    message:
                    err.message

                });


        }


    }
);
router.delete(
    "/reports/:id",
    adminAuth,
    async (req, res) => {


        try {


            await Report
                .findByIdAndDelete(
                    req.params.id
                );



            res.json({

                success:true,

                message:
                "Report deleted"

            });



        }

        catch(err) {


            console.error(
                "Delete Error:",
                err.message
            );


            res.status(500)
                .json({

                    success:false,

                    message:
                    "Delete failed"

                });


        }


    }
);



module.exports = router;