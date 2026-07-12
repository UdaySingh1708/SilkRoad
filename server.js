"use strict";

require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const socketHandler = require("./socket/socketHandler");


const app = express();


// Security middleware
app.use(
    helmet({
        contentSecurityPolicy: false
    })
);

app.use(compression());

app.use(cors());

app.use(express.json());


// Rate limiting
const limiter = rateLimit({

    windowMs: 60 * 1000,

    max: 100,

    message: {
        error: "Too many requests. Try again later."
    }

});


app.use(limiter);


// Static files
app.use(
    express.static("public")
);


// Health check
app.get("/health", (req, res)=>{

    res.json({

        status: "online",

        service: "Silk Road",

        time: new Date()

    });

});


// Create server
const server = http.createServer(app);


// Socket.io
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


// Load socket system
socketHandler(io);


// Port
const PORT = process.env.PORT || 3000;


// Start server
server.listen(PORT, ()=>{

    console.log(`
==============================
 Silk Road Server Started
==============================

URL:
http://localhost:${PORT}

Mode:
${process.env.NODE_ENV || "development"}

==============================
`);

});


// Shutdown handling
process.on("SIGINT", ()=>{

    console.log(
        "Server shutting down..."
    );


    server.close(()=>{

        console.log(
            "HTTP server closed."
        );

        process.exit(0);

    });

});