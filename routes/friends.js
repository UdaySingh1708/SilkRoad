"use strict";

const express = require("express");
const router = express.Router();

const Friend = require("../models/Friend");
const User = require("../models/User");

const onlineUsers = require("../socket/onlineUsers");
const matchMaker = require("../socket/matchMaker");


/*
==========================================
Authentication
==========================================
*/

function requireGoogleUser(req, res, next) {

    if (!req.isAuthenticated || !req.isAuthenticated()) {

        return res.status(401).json({
            success:false,
            message:"Login required."
        });

    }


    if (req.user.accountType !== "google") {

        return res.status(403).json({
            success:false,
            message:"Google account required."
        });

    }


    next();

}



/*
==========================================
Send Friend Request
==========================================
*/

router.post("/request", requireGoogleUser, async (req, res) => {

    try {


        const mySocketId = onlineUsers.get(
            req.user.userId
        );


        if (!mySocketId) {

            return res.status(400).json({

                success:false,
                message:"You are not connected."

            });

        }



        const partnerSocketId = matchMaker.getPartner(
            mySocketId
        );



        if (!partnerSocketId) {

            return res.status(400).json({

                success:false,
                message:"No active stranger."

            });

        }



        const io = req.app.get("io");


        const partnerSocket = io.sockets.sockets.get(
            partnerSocketId
        );



        if (!partnerSocket) {

            return res.status(400).json({

                success:false,
                message:"Partner disconnected."

            });

        }



        const receiverId = partnerSocket.userId;



        if (!receiverId || receiverId === req.user.userId) {

            return res.status(400).json({

                success:false,
                message:"Invalid request."

            });

        }




        const receiver = await User.findOne({

            userId: receiverId

        });




        if (!receiver || receiver.accountType !== "google") {

            return res.status(400).json({

                success:false,
                message:"This user cannot receive friend requests."

            });

        }





        const existing = await Friend.findOne({

            $or:[

                {
                    senderId:req.user.userId,
                    receiverId
                },

                {
                    senderId:receiverId,
                    receiverId:req.user.userId
                }

            ]

        });





        if (existing) {

            return res.status(400).json({

                success:false,
                message:"Friend request already exists."

            });

        }





        const newRequest = await Friend.create({

    senderId: req.user.userId,

    receiverId,

    status: "pending"

});


// notify receiver instantly
const receiverSocketId = onlineUsers.get(receiverId);

if (receiverSocketId) {

console.log(
"Sending friend request notification to:",
receiverId,
receiverSocketId
);

    io.to(receiverSocketId).emit(
        "friendRequest",
        {
            requestId:newRequest._id,
            senderId:req.user.userId
        }
    );


}





        return res.json({

            success:true,

            message:"Friend request sent."

        });



    } catch(err) {


        console.error(
            "FRIEND REQUEST ERROR:",
            err
        );



        return res.status(500).json({

            success:false,

            message:"Server error."

        });


    }


});




/*
==========================================
Get Friend Requests
==========================================
*/

router.get("/", requireGoogleUser, async(req,res)=>{

    try {

        const friends = await Friend.find({

            $or:[

                {
                    senderId:req.user.userId,
                    status:"accepted"
                },

                {
                    receiverId:req.user.userId,
                    status:"accepted"
                }

            ]

        });


        const result = [];


        for(const friend of friends){


            const friendId =
            friend.senderId === req.user.userId
            ? friend.receiverId
            : friend.senderId;



            const user = await User.findOne({

                userId: friendId

            });



            result.push({

                friendId,

                displayName:
                user?.displayName || "Unknown User",

                avatar:
                user?.avatar || "/favicon.ico",

                onlineStatus:
                onlineUsers.has(friendId)

            });


        }



        res.json({

            success:true,

            friends:result

        });



    } catch(err){


        console.error(
            "FRIENDS FETCH ERROR:",
            err
        );


        res.status(500).json({

            success:false,

            message:"Server error."

        });


    }

});

router.get("/requests", requireGoogleUser, async(req,res)=>{

    try {

        const requests = await Friend.find({

            receiverId:req.user.userId,
            status:"pending"

        });


        const result = [];


        for(const request of requests){

            const sender = await User.findOne({

                userId: request.senderId

            });


            result.push({

                _id: request._id,

                displayName:
                sender?.displayName || "Unknown User",

                avatar:
                sender?.avatar || "/favicon.ico",

                senderId:
                request.senderId

            });

        }


        res.json({

            success:true,

            requests:result

        });


    } catch(err){

        console.error(err);

        res.status(500).json({

            success:false,

            message:"Server error"

        });

    }

});


/*
==========================================
Accept Friend Request
==========================================
*/

router.post("/accept/:id", requireGoogleUser, async (req, res) => {

    try {

        const request = await Friend.findOne({

            _id: req.params.id,
            receiverId: req.user.userId,
            status: "pending"

        });

        if (!request) {

            return res.status(404).json({

                success: false,
                message: "Request not found."

            });

        }

        const senderId = request.senderId;
        const receiverId = request.receiverId;

        await request.deleteOne();

        await Friend.create({

            senderId,
            receiverId,
            status: "accepted"

        });

        const io = req.app.get("io");

        const senderSocketId = onlineUsers.get(senderId);

        if (senderSocketId) {

            io.to(senderSocketId).emit("friendAccepted");

        }

        const receiverSocketId = onlineUsers.get(receiverId);

        if (receiverSocketId) {

            io.to(receiverSocketId).emit("friendAccepted");

        }

        res.json({

            success: true,
            message: "Friend accepted."

        });

    } catch (err) {

        console.error("ACCEPT FRIEND ERROR:", err);

        res.status(500).json({

            success: false,
            message: "Server error."

        });

    }

});




router.post("/decline/:id", requireGoogleUser, async (req, res) => {

    try {

        const request = await Friend.findOne({

            _id: req.params.id,

            receiverId: req.user.userId,

            status: "pending"

        });

        if (!request) {

            return res.status(404).json({

                success: false,

                message: "Request not found."

            });

        }

        await request.deleteOne();

        res.json({

            success: true,

            message: "Friend request declined."

        });

    } catch (err) {

        console.error(err);

        res.status(500).json({

            success: false,

            message: "Server error."

        });

    }

});


module.exports = router;