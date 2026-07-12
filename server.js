"use strict";

require("dotenv").config();

const express = require("express");
const http = require("http");
const path = require("path");

const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const { Server } = require("socket.io");

const socketHandler = require("./socket/socketHandler");


const app = express();

const server = http.createServer(app);


const PORT = process.env.PORT || 3000;



const io = new Server(server, {

    cors: {

        origin: process.env.CLIENT_URL || "*",

        methods:["GET","POST"]

    },


    transports:[
        "websocket",
        "polling"
    ],


    pingTimeout:
    Number(process.env.PING_TIMEOUT) || 20000,


    pingInterval:
    Number(process.env.PING_INTERVAL) || 25000

});





app.disable("x-powered-by");



app.use(

    helmet({

        contentSecurityPolicy:false

    })

);



app.use(compression());



app.use(

    cors({

        origin:process.env.CLIENT_URL || "*"

    })

);



app.use(express.json());



const limiter = rateLimit({

    windowMs:60 * 1000,

    max:120

});



app.use("/api",limiter);



app.use(

    express.static(

        path.join(__dirname,"public")

    )

);






app.get("/api/health",(req,res)=>{


    res.json({

        status:"online",

        users:io.engine.clientsCount,

        uptime:process.uptime()

    });


});






app.get("/",(req,res)=>{


    res.sendFile(

        path.join(
            __dirname,
            "public",
            "index.html"
        )

    );


});






socketHandler(io);






app.use((req,res)=>{


    res.status(404).json({

        message:"Page not found"

    });


});






server.listen(PORT,()=>{


    console.log("");

    console.log("==============================");

    console.log(" Silk Road Server Started ");

    console.log("==============================");

    console.log(
        "URL: http://localhost:"+PORT
    );

    console.log("");

});