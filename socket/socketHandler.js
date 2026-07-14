"use strict";

const User = require("../models/User");
const Ban = require("../models/Ban");
const Report = require("../models/Report");

const matchMaker = require("./matchMaker");

module.exports = function (io) {

    const messageCooldown = new Map();

    io.on("connection", async (socket) => {

        let userId = socket.handshake.auth.userId;

        if (!userId) {
            userId =
                "user_" +
                Math.random()
                    .toString(36)
                    .substring(2, 15);
        }

        socket.userId = userId;

        socket.preferences = {
            language: "Any",
            mode: "Video",
            interest: "Any"
        };

        try {
            await User.findOneAndUpdate(
                { userId },
                { userId },
                { upsert: true, new: true }
            );
        } catch (err) {
            console.error("User save error:", err.message);
        }

        console.log("User connected:", socket.id, socket.userId);

        try {

            const bannedUser = await Ban.findOne({
                userId: socket.userId
            });

            if (bannedUser) {
                socket.emit("banned", {
                    reason: bannedUser.reason
                });

                socket.disconnect(true);
                return;
            }

        } catch (err) {
            console.error("Ban check error:", err.message);
        }

        io.emit("onlineCount", io.engine.clientsCount);

        function cleanText(text) {

            if (typeof text !== "string") {
                return "";
            }

            return text
                .replace(/[<>]/g, "")
                .replace(/\s+/g, " ")
                .trim()
                .substring(0, 500);
        }

        function canSendMessage() {

            const now = Date.now();

            const last =
                messageCooldown.get(socket.id) || 0;

            if (now - last < 800) {
                return false;
            }

            messageCooldown.set(socket.id, now);

            return true;
        };

        /*
        =====================================
        User Preferences
        =====================================
        */

        socket.on("setPreferences", (data) => {

            if (!data || typeof data !== "object") {
                return;
            }

            socket.preferences = {

                language:
                    typeof data.language === "string"
                        ? data.language.substring(0, 30)
                        : "Any",

                mode:
                    typeof data.mode === "string"
                        ? data.mode.substring(0, 30)
                        : "Video",

                interest:
                    typeof data.interest === "string"
                        ? data.interest.substring(0, 30)
                        : "Any"
            };

            console.log(
                "Preferences:",
                socket.userId,
                socket.preferences
            );

        });

        /*
        =====================================
        Find Partner
        =====================================
        */

        socket.on("findPartner", () => {

            matchMaker.remove(socket.id);

            const partner = matchMaker.find(
                socket.id,
                io.sockets.sockets
            );

            if (partner) {

                matchMaker.setPartner(
                    socket.id,
                    partner
                );

                socket.emit("matched", {
                    initiator: true
                });

                io.to(partner).emit("matched", {
                    initiator: false
                });

                return;
            }

            matchMaker.wait(socket.id);

            socket.emit("waiting");

        });

        /*
        =====================================
        Next Stranger
        =====================================
        */

        socket.on("next", () => {

            const partner = matchMaker.remove(socket.id);

            if (partner) {

                const partnerSocket =
                    io.sockets.sockets.get(partner);

                if (partnerSocket) {

                    matchMaker.wait(partner);

                    io.to(partner).emit("partnerLeft");
                    io.to(partner).emit("waiting");

                    const newPartner = matchMaker.find(
                        partner,
                        io.sockets.sockets
                    );

                    if (newPartner) {

                        matchMaker.setPartner(
                            partner,
                            newPartner
                        );

                        io.to(partner).emit("matched", {
                            initiator: true
                        });

                        io.to(newPartner).emit("matched", {
                            initiator: false
                        });

                    }
                }
            }

            matchMaker.wait(socket.id);

            socket.emit("waiting");

            const myPartner = matchMaker.find(
                socket.id,
                io.sockets.sockets
            );

            if (myPartner) {

                matchMaker.setPartner(
                    socket.id,
                    myPartner
                );

                socket.emit("matched", {
                    initiator: true
                });

                io.to(myPartner).emit("matched", {
                    initiator: false
                });

            }

        });        /*
        =====================================
        Messages
        =====================================
        */

        socket.on("message", (data) => {

            if (!canSendMessage()) {
                socket.emit("errorMessage", "Slow down");
                return;
            }

            const partner = matchMaker.getPartner(socket.id);

            if (!partner) {
                return;
            }

            let message = "";

            if (typeof data === "string") {
                message = data;
            } else if (
                data &&
                typeof data === "object" &&
                typeof data.message === "string"
            ) {
                message = data.message;
            }

            message = cleanText(message);

            if (!message.length) {
                return;
            }

            io.to(partner).emit("message", {
                message
            });

        });

        /*
        =====================================
        WebRTC Signaling
        =====================================
        */

        socket.on("offer", (offer) => {

            const partner = matchMaker.getPartner(socket.id);

            if (!partner) {
                return;
            }

            io.to(partner).emit("offer", offer);

        });

        socket.on("answer", (answer) => {

            const partner = matchMaker.getPartner(socket.id);

            if (!partner) {
                return;
            }

            io.to(partner).emit("answer", answer);

        });

        socket.on("iceCandidate", (candidate) => {

            const partner = matchMaker.getPartner(socket.id);

            if (!partner) {
                return;
            }

            io.to(partner).emit("iceCandidate", candidate);

        });

        /*
        =====================================
        Typing Indicator
        =====================================
        */

        socket.on("typing", () => {

            const partner = matchMaker.getPartner(socket.id);

            if (!partner) {
                return;
            }

            io.to(partner).emit("typing");

        });

        socket.on("stopTyping", () => {

            const partner = matchMaker.getPartner(socket.id);

            if (!partner) {
                return;
            }

            io.to(partner).emit("stopTyping");

        });

        /*
        =====================================
        Report User
        =====================================
        */

        socket.on("reportPartner", async (data) => {

            const partner = matchMaker.getPartner(socket.id);

            if (!partner) {
                return;
            }

            const partnerSocket =
                io.sockets.sockets.get(partner);

            if (!partnerSocket) {
                return;
            }

            let reason = "Unknown";

            if (
                data &&
                typeof data === "object" &&
                typeof data.reason === "string"
            ) {
                reason = data.reason
                    .trim()
                    .substring(0, 100);
            }

            try {

                await Report.create({

                    reporter: socket.userId,

                    reportedUser: partnerSocket.userId,

                    reason

                });

                socket.emit("reportSubmitted");

                console.log(
                    "Report:",
                    socket.userId,
                    "->",
                    partnerSocket.userId
                );

            } catch (err) {

                console.error(
                    "Report error:",
                    err.message
                );

            }

        });

        /*
        =====================================
        Block Partner
        =====================================
        */

        socket.on("blockPartner", () => {

            const partner = matchMaker.getPartner(socket.id);

            if (!partner) {
                return;
            }

            matchMaker.block(socket.id, partner);

            matchMaker.remove(socket.id);

            io.to(partner).emit("partnerLeft");

            socket.emit("partnerLeft");

            matchMaker.wait(socket.id);

            socket.emit("waiting");

        });        /*
        =====================================
        Disconnect
        =====================================
        */

        socket.on("disconnect", () => {

            messageCooldown.delete(socket.id);

            const partner = matchMaker.remove(socket.id);

            if (partner) {

                const partnerSocket =
                    io.sockets.sockets.get(partner);

                if (partnerSocket) {

                    io.to(partner).emit("partnerLeft");

                    matchMaker.wait(partner);

                    io.to(partner).emit("waiting");

                    const newPartner = matchMaker.find(
                        partner,
                        io.sockets.sockets
                    );

                    if (newPartner) {

                        matchMaker.setPartner(
                            partner,
                            newPartner
                        );

                        io.to(partner).emit("matched", {
                            initiator: true
                        });

                        io.to(newPartner).emit("matched", {
                            initiator: false
                        });

                    }

                }

            }

            io.emit(
                "onlineCount",
                io.engine.clientsCount
            );

            console.log(
                "Disconnected:",
                socket.userId
            );

        });

    });

};