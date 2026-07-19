"use strict";

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

    userId: {

        type: String,

        required: true,

        unique: true

    },

    googleId: {

        type: String,

        default: null

    },

    email: {

        type: String,

        default: ""

    },

    displayName: {

        type: String,

        default: ""

    },

    avatar: {

        type: String,

        default: ""

    },

    accountType: {

        type: String,

        default: "guest"

    },

    isProfileComplete: {

        type: Boolean,

        default: false

    },

    createdAt: {

        type: Date,

        default: Date.now

    }

});

module.exports = mongoose.model(
    "User",
    userSchema
);