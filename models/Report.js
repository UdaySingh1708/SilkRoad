"use strict";

const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({

    reporter: {
        type: String,
        required: true
    },

    reportedUser: {
        type: String,
        required: true
    },

    reason: {
        type: String,
        default: "Unknown"
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