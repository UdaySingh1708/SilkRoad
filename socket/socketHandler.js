"use strict";

const matchMaker = require("./matchMaker");

module.exports = function (io) {

    io.on("connection", (socket) => {

        console.log("User connected:", socket.id);

        io.emit("onlineCount", io.engine.clientsCount);

        socket.on("findPartner", () => {

            const partner = matchMaker.find(socket.id);

            if (partner) {

                matchMaker.setPartner(socket.id, partner);

                socket.emit("matched");

                io.to(partner).emit("matched");

                console.log(
                    "Matched:",
                    socket.id,
                    partner
                );

            } else {

                matchMaker.wait(socket.id);

                socket.emit("waiting");

            }

        });

        socket.on("next", () => {

            const oldPartner = matchMaker.remove(socket.id);

            if (oldPartner) {

                io.to(oldPartner).emit("partnerLeft");

            }

            matchMaker.wait(socket.id);

            socket.emit("waiting");

        });

        socket.on("message", (data) => {

            const partner = matchMaker.getPartner(socket.id);

            if (!partner) return;

            let message = "";

            if (typeof data === "string") {

                message = data;

            } else {

                message = data.message || "";

            }

            message = message
                .trim()
                .substring(0, 500);

            if (!message) return;

            io.to(partner).emit(
                "message",
                {
                    message
                }
            );

        });

        socket.on("typing", () => {

            const partner = matchMaker.getPartner(socket.id);

            if (partner) {

                io.to(partner).emit("typing");

            }

        });

        socket.on("stopTyping", () => {

            const partner = matchMaker.getPartner(socket.id);

            if (partner) {

                io.to(partner).emit("stopTyping");

            }

        });

        socket.on("reportPartner", () => {

            const partner = matchMaker.getPartner(socket.id);

            if (!partner) return;

            console.log(
                "REPORT:",
                socket.id,
                "reported",
                partner
            );

        });

        socket.on("blockPartner", () => {

            const partner = matchMaker.getPartner(socket.id);

            if (!partner) return;

            matchMaker.block(
                socket.id,
                partner
            );

            matchMaker.remove(socket.id);            io.to(partner).emit("partnerLeft");

            socket.emit("partnerLeft");

            matchMaker.wait(socket.id);

            socket.emit("waiting");

        });

        socket.on("disconnect", () => {

            console.log(
                "User disconnected:",
                socket.id
            );

            const partner =
                matchMaker.remove(socket.id);

            if (partner) {

                io.to(partner).emit(
                    "partnerLeft"
                );

            }

            io.emit(
                "onlineCount",
                io.engine.clientsCount
            );

        });

    });

};