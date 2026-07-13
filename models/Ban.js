"use strict";

const mongoose = require("mongoose");


const banSchema = new mongoose.Schema({


    userId: {

        type: String,

        required: true,

        unique: true

    },


    reason: {

        type: String,

        default: "Violation of rules"

    },


    bannedBy: {

        type: String,

        default: "admin"

    },


    createdAt: {

        type: Date,

        default: Date.now

    }


});



module.exports = mongoose.model(
    "Ban",
    banSchema
);