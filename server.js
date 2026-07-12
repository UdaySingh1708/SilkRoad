"use strict";

require("dns").setServers([
    "8.8.8.8",
    "1.1.1.1"
]);

require("dotenv").config();

const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const socketHandler = require("./socket/socketHandler");

const app = express();


/*
=====================================
MongoDB Connection
=====================================
*/

async function connectDatabase() {

    try {

        await mongoose.connect(process.env.MONGODB_URI);

        console.log("MongoDB Connected");

    } catch (err) {

        console.error("MongoDB Error:");
        console.error(err.message);

        console.log("Running without MongoDB...");
    }

}

connectDatabase();


/*
=====================================
Security
=====================================
*/

app.use(
    helmet({
        contentSecurityPolicy: false
    })
);

app.use(compression());

app.use(cors());

app.use(express.json());


/*
=====================================
Rate Limiter
=====================================
*/

const limiter = rateLimit({

    windowMs: 60 * 1000,

    max: 100,

    message: {
        error: "Too many requests."
    }

});

app.use(limiter);


/*
=====================================
Static Files
=====================================
*/

app.use(express.static("public"));


/*
=====================================
Health Route
=====================================
*/

app.get("/health", (req, res) => {

    res.json({

        status: "online",

        database:
            mongoose.connection.readyState === 1
                ? "connected"
                : "disconnected",

        service: "Silk Road",

        uptime: process.uptime(),

        time: new Date()

    });

});


/*
=====================================
HTTP Server
=====================================
*/

const server = http.createServer(app);


/*
=====================================
Socket.IO
=====================================
*/

const io = new Server(server, {

    cors: {

        origin: "*",

        methods: [
            "GET",
            "POST"
        ]

    },

    transports: [
        "websocket",
        "polling"
    ]

});


socketHandler(io);


/*
=====================================
Start Server
=====================================
*/

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {

    console.log(`
====================================
 Silk Road Server Started
====================================

URL:
http://localhost:${PORT}

Mode:
${process.env.NODE_ENV || "development"}

====================================
`);

});


/*
=====================================
Graceful Shutdown
=====================================
*/

process.on("SIGINT", async () => {

    console.log("Closing server...");

    try {

        await mongoose.connection.close();

    } catch (err) {

        console.log("Database already closed");

    }


    server.close(() => {

        console.log("Server Closed");

        process.exit(0);

    });

});