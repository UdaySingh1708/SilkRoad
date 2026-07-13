"use strict";

/*
======================================================
Silk Road Server
Production Version
======================================================
*/

require("dotenv").config();

const path = require("path");
const http = require("http");

const express = require("express");
const compression = require("compression");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const mongoose = require("mongoose");

const { Server } = require("socket.io");

const socketHandler = require("./socket/socketHandler");
const adminPanel = require("./dashboard/panel");
/*
======================================================
Express
======================================================
*/

const app = express();

const server = http.createServer(app);

/*
======================================================
Socket.IO
======================================================
*/

const io = new Server(server, {

    cors: {

        origin: process.env.CLIENT_URL || "*",

        methods: ["GET", "POST"]

    },

    transports: [

        "websocket",

        "polling"

    ],

    pingTimeout:

        Number(process.env.PING_TIMEOUT) || 20000,

    pingInterval:

        Number(process.env.PING_INTERVAL) || 25000

});

/*
======================================================
Security
======================================================
*/

app.use(

    helmet({

        contentSecurityPolicy: false,

        crossOriginEmbedderPolicy: false

    })

);

app.use(compression());

app.use(cors());

/*
======================================================
Rate Limiter
======================================================
*/

const limiter = rateLimit({

    windowMs: 60 * 1000,

    max: 300,

    standardHeaders: true,

    legacyHeaders: false

});

app.use(limiter);

/*
======================================================
Parsers
======================================================
*/

app.use(express.json());

app.use(

    express.urlencoded({

        extended: true

    })

);

/*
======================================================
Static Files
======================================================
*/

app.use(

    express.static(

        path.join(__dirname, "public")

    )

);/*
======================================================
MongoDB
======================================================
*/
app.use(
    "/admin",
    adminPanel
);
async function connectDatabase() {

    try {

        if (!process.env.MONGODB_URI) {

            console.log("Running without MongoDB...");

            return;

        }

        await mongoose.connect(

            process.env.MONGODB_URI,

            {

                autoIndex: true,

                serverSelectionTimeoutMS: 10000

            }

        );

        console.log("MongoDB Connected");

    }

    catch (err) {

        console.error("MongoDB Error:");

        console.error(err.message);

        console.log("Running without MongoDB...");

    }

}

connectDatabase();

/*
======================================================
Socket Handler
======================================================
*/

socketHandler(io);

/*
======================================================
Health Check
======================================================
*/

app.get("/health", (req, res) => {

    res.status(200).json({

        status: "ok",

        uptime: process.uptime(),

        users: io.engine.clientsCount,

        database:

            mongoose.connection.readyState === 1

                ? "connected"

                : "disconnected",

        timestamp: new Date()

    });

});

/*
======================================================
Home
======================================================
*/

app.get("/", (req, res) => {

    res.sendFile(

        path.join(

            __dirname,

            "public",

            "index.html"

        )

    );

});

/*
======================================================
404
======================================================
*/

app.use((req, res) => {

    res.status(404).json({

        success: false,

        message: "Page not found"

    });

});/*
======================================================
Error Handler
======================================================
*/

app.use((err, req, res, next) => {

    console.error("Server Error:");

    console.error(err);

    res.status(500).json({

        success: false,

        message: "Internal Server Error"

    });

});

/*
======================================================
Port
======================================================
*/

const PORT =

    Number(process.env.PORT) ||

    3000;

/*
======================================================
Start Server
======================================================
*/

server.listen(PORT, () => {

    console.log("");

    console.log("====================================");

    console.log(" Silk Road Server Started");

    console.log("====================================");

    console.log("");

    console.log("URL:");

    console.log(

        `http://localhost:${PORT}`

    );

    console.log("");

    console.log("Mode:");

    console.log(

        process.env.NODE_ENV ||

        "development"

    );

    console.log("");

    console.log("====================================");

    console.log("");

});

/*
======================================================
Socket.IO Errors
======================================================
*/

io.engine.on("connection_error", (err) => {

    console.error(

        "Socket.IO Connection Error:"

    );

    console.error(err.message);

});/*
======================================================
Graceful Shutdown
======================================================
*/

let shuttingDown = false;

async function shutdown(signal) {

    if (shuttingDown) return;

    shuttingDown = true;

    console.log("");

    console.log("====================================");

    console.log(`Received ${signal}`);

    console.log("Closing server...");

    console.log("====================================");

    try {

        server.close(() => {

            console.log("HTTP Server Closed");

        });

        if (mongoose.connection.readyState === 1) {

            await mongoose.connection.close();

            console.log("MongoDB Connection Closed");

        }

        console.log("Shutdown Complete");

        process.exit(0);

    }

    catch (err) {

        console.error("Shutdown Error:");

        console.error(err);

        process.exit(1);

    }

}

/*
======================================================
Process Events
======================================================
*/

process.on("SIGINT", () => {

    shutdown("SIGINT");

});

process.on("SIGTERM", () => {

    shutdown("SIGTERM");

});

process.on("unhandledRejection", (reason) => {

    console.error("");

    console.error("Unhandled Promise Rejection");

    console.error(reason);

});

process.on("uncaughtException", (err) => {

    console.error("");

    console.error("Uncaught Exception");

    console.error(err);

    shutdown("uncaughtException");

});

/*
======================================================
Keep Render Awake
======================================================
*/

app.get("/ping", (req, res) => {

    res.json({

        success: true,

        message: "Silk Road Server Running",

        users: io.engine.clientsCount,

        uptime: process.uptime()

    });

});

/*
======================================================
End
======================================================
*/