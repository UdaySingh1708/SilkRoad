"use strict";

const mongoose = require("mongoose");


const reportSchema = new mongoose.Schema({

    reporter: {

        type: String,

        required: true,

        trim: true

    },


    reportedUser: {

        type: String,

        required: true,

        trim: true

    },


    reason: {

        type: String,

        required: true,

        enum: [

            "Harassment",

            "Nudity / Sexual Content",

            "Spam",

            "Hate Speech",

            "Fake Identity",

            "Underage User",

            "Other"

        ],

        default: "Other"

    },


    status: {

        type: String,

        enum: [

            "pending",

            "reviewed",

            "resolved",

            "dismissed"

        ],

        default: "pending"

    },


    adminNote: {

        type: String,

        default: ""

    },


    createdAt: {

        type: Date,

        default: Date.now

    }


});



module.exports = mongoose.model(

    "Report",

    reportSchema

);