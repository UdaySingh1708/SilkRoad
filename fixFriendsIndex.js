"use strict";

require("dotenv").config();

const mongoose = require("mongoose");

async function fix(){

    try{

        await mongoose.connect(process.env.MONGODB_URI);

        console.log("MongoDB connected");

        const db = mongoose.connection.db;
        const friends = db.collection("friends");

        const indexes = await friends.indexes();

        console.log("Current indexes:");
        console.log(indexes);

        try{

            await friends.dropIndex("ownerId_1_friendId_1");

            console.log("Old index removed");

        }catch(err){

            console.log("Old index not found");

        }

        await friends.deleteMany({
            ownerId:null,
            friendId:null
        });

        console.log("Broken records removed");

        await mongoose.disconnect();

        console.log("Done");

    }catch(err){

        console.error(err);
        process.exit(1);

    }

}

fix();
