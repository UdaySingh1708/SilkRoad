"use strict";

const User = require("../models/User");
const Ban = require("../models/Ban");
const Report = require("../models/Report");

const matchMaker = require("./matchMaker");


module.exports = function (io) {


    const messageCooldown = new Map();



    io.on("connection", async (socket) => {



        let userId =
            socket.handshake.auth.userId;



        if (!userId) {

            userId =
                "user_" +
                Math.random()
                .toString(36)
                .substring(2,15);

        }



        socket.userId = userId;



        try {


            await User.findOneAndUpdate(

                {
                    userId
                },

                {
                    userId
                },

                {
                    upsert:true
                }

            );


        }

        catch(err) {

            console.error(
                "User save error:",
                err.message
            );

        }



        console.log(
            "User connected:",
            socket.id,
            socket.userId
        );



        const bannedUser =
            await Ban.findOne({

                userId:
                socket.userId

            });



        if (bannedUser) {


            socket.emit(
                "banned",
                {

                    reason:
                    bannedUser.reason

                }
            );


            socket.disconnect(true);


            return;

        }



        io.emit(
            "onlineCount",
            io.engine.clientsCount
        );




        function cleanText(text) {


            if (
                typeof text !== "string"
            ) {

                return "";

            }


            return text
                .replace(/[<>]/g,"")
                .trim()
                .replace(/\s+/g," ")
                .substring(0,500);


        }



        function canSendMessage() {


            const now =
                Date.now();


            const last =
                messageCooldown.get(
                    socket.id
                )
                || 0;



            if (
                now - last < 800
            ) {

                return false;

            }



            messageCooldown.set(
                socket.id,
                now
            );


            return true;

        }



        /*
        =====================================
        Find Partner
        =====================================
        */


        socket.on(
            "findPartner",
            () => {


                const partner =
                    matchMaker.find(
                        socket.id
                    );



                if (partner) {


                    matchMaker.setPartner(
                        socket.id,
                        partner
                    );


                    socket.emit(
                        "matched"
                    );


                    io.to(partner)
                        .emit(
                            "matched"
                        );


                }

                else {


                    matchMaker.wait(
                        socket.id
                    );


                    socket.emit(
                        "waiting"
                    );


                }


            }
        );



        /*
        =====================================
        Next Stranger
        =====================================
        */


        socket.on(
            "next",
            () => {


                const partner =
                    matchMaker.remove(
                        socket.id
                    );


                if (partner) {


                    io.to(partner)
                        .emit(
                            "partnerLeft"
                        );


                }



                matchMaker.wait(
                    socket.id
                );


                socket.emit(
                    "waiting"
                );


            }
        );



        /*
        =====================================
        Messages
        =====================================
        */


        socket.on(
            "message",
            (data) => {


                if (
                    !canSendMessage()
                ) {


                    socket.emit(
                        "errorMessage",
                        "Slow down"
                    );


                    return;


                }



                const partner =
                    matchMaker.getPartner(
                        socket.id
                    );



                if (!partner) return;



                let message = "";



                if (
                    typeof data === "string"
                ) {

                    message = data;

                }

                else if (
                    data &&
                    typeof data === "object"
                ) {

                    message =
                        data.message || "";

                }



                message =
                    cleanText(
                        message
                    );



                if (!message) return;



                io.to(partner)
                    .emit(
                        "message",
                        {
                            message
                        }
                    );


            }
        );        /*
        =====================================
        WebRTC
        =====================================
        */


        socket.on(
            "offer",
            (offer) => {


                const partner =
                    matchMaker.getPartner(
                        socket.id
                    );


                if (!partner) return;


                io.to(partner)
                    .emit(
                        "offer",
                        offer
                    );


            }
        );



        socket.on(
            "answer",
            (answer) => {


                const partner =
                    matchMaker.getPartner(
                        socket.id
                    );


                if (!partner) return;


                io.to(partner)
                    .emit(
                        "answer",
                        answer
                    );


            }
        );



        socket.on(
            "iceCandidate",
            (candidate) => {


                const partner =
                    matchMaker.getPartner(
                        socket.id
                    );


                if (!partner) return;


                io.to(partner)
                    .emit(
                        "iceCandidate",
                        candidate
                    );


            }
        );



        /*
        =====================================
        Report User
        =====================================
        */


        socket.on(
            "reportPartner",
            async (data) => {


                const partner =
                    matchMaker.getPartner(
                        socket.id
                    );


                if (!partner) return;



                const reportedSocket =
                    io.sockets.sockets.get(
                        partner
                    );



                if (!reportedSocket)
                    return;



                let reason =
                    "Unknown";



                if (
                    data &&
                    typeof data === "object" &&
                    typeof data.reason === "string"
                ) {


                    reason =
                        data.reason
                        .trim()
                        .substring(0,100);


                }



                try {


                    await Report.create({

                        reporter:
                            socket.userId,


                        reportedUser:
                            reportedSocket.userId,


                        reason


                    });



                    console.log(
                        "Report saved:",
                        socket.userId,
                        reportedSocket.userId
                    );


                    socket.emit(
                        "reportSubmitted"
                    );


                }

                catch(err) {


                    console.error(
                        "Report error:",
                        err.message
                    );


                }


            }
        );



        /*
        =====================================
        Block User
        =====================================
        */


        socket.on(
            "blockPartner",
            () => {


                const partner =
                    matchMaker.getPartner(
                        socket.id
                    );


                if (!partner) return;



                matchMaker.block(
                    socket.id,
                    partner
                );


                matchMaker.remove(
                    socket.id
                );


                io.to(partner)
                    .emit(
                        "partnerLeft"
                    );


                socket.emit(
                    "partnerLeft"
                );


                matchMaker.wait(
                    socket.id
                );


                socket.emit(
                    "waiting"
                );


            }
        );



        /*
        =====================================
        Typing
        =====================================
        */


        socket.on(
            "typing",
            () => {


                const partner =
                    matchMaker.getPartner(
                        socket.id
                    );


                if (!partner) return;


                io.to(partner)
                    .emit(
                        "typing"
                    );


            }
        );



        socket.on(
            "stopTyping",
            () => {


                const partner =
                    matchMaker.getPartner(
                        socket.id
                    );


                if (!partner) return;


                io.to(partner)
                    .emit(
                        "stopTyping"
                    );


            }
        );



        /*
        =====================================
        Disconnect
        =====================================
        */


        socket.on(
            "disconnect",
            () => {


                messageCooldown.delete(
                    socket.id
                );



                const partner =
                    matchMaker.remove(
                        socket.id
                    );



                if (partner) {


                    io.to(partner)
                        .emit(
                            "partnerLeft"
                        );


                }



                io.emit(
                    "onlineCount",
                    io.engine.clientsCount
                );


                console.log(
                    "Disconnected:",
                    socket.userId
                );


            }
        );



    });


};