"use strict";

const mongoose = require("mongoose");


const friendSchema = new mongoose.Schema({

    senderId:{
        type:String,
        required:true
    },


    receiverId:{
        type:String,
        required:true
    },


    status:{
        type:String,
        enum:[
            "pending",
            "accepted",
            "rejected"
        ],
        default:"pending"
    }


},{
    timestamps:true
});



friendSchema.index({
    senderId:1,
    receiverId:1
});


module.exports = mongoose.model(
    "Friend",
    friendSchema
);