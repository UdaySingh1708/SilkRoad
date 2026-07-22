"use strict";

/*
======================================================
Silk Road Server
Production Version
======================================================
*/

require("dotenv").config();
const session = require("express-session");
const passport = require("passport");

require("./config/passport")(passport);

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
app.use(
    session({

        secret: process.env.SESSION_SECRET,

        resave: false,

        saveUninitialized: false,

        cookie: {

            secure: false,

            maxAge: 24 * 60 * 60 * 1000

        }

    })
);


app.use(passport.initialize());

app.use(passport.session());
/*
======================================================
Google Authentication
======================================================
*/

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

app.set("io", io);




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

app.use(express.json({
    limit:"5mb"
}));


app.use(
    express.urlencoded({
        extended:true,
        limit:"5mb"
    })
);


/*
======================================================
Google Authentication Routes
======================================================
*/

app.use(
    "/auth",
    require("./routes/google")
);



/*
======================================================
Friends Routes
======================================================
*/

const friendsRoutes = require("./routes/friends");

app.use("/friends", friendsRoutes);

/*
======================================================
Static Files
======================================================
*/

app.use(

    express.static(

        path.join(__dirname, "public")

    )

);


/*
======================================================
SEO Files
======================================================
*/

app.get("/robots.txt", (req, res) => {

    res.type("text/plain");

    res.send(
`User-agent: *
Allow: /

Sitemap: https://silkroadchat.onrender.com/sitemap.xml`
    );

});


app.get("/sitemap.xml", (req, res) => {

    res.type("application/xml");

    res.send(
`<?xml version="1.0" encoding="UTF-8"?>

<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

<url>
<loc>https://silkroadchat.onrender.com/</loc>
<lastmod>2026-07-13</lastmod>
<changefreq>daily</changefreq>
<priority>1.0</priority>
</url>

</urlset>`
    );

});


/*
======================================================
Admin Panel
======================================================
*/

app.use(
    "/admin",
    adminPanel
);


/*
======================================================
MongoDB
======================================================
*/

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
404 Handler
======================================================
*/

app.use((req, res) => {

    res.status(404).json({

        success: false,

        message: "Page not found"

    });

});



/*
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

});



/*
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



process.on("SIGINT", () => {

    shutdown("SIGINT");

});


process.on("SIGTERM", () => {

    shutdown("SIGTERM");

});


process.on("unhandledRejection", (reason) => {

    console.error(reason);

});


process.on("uncaughtException", (err) => {

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