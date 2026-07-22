"use strict";

const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
{
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true,
        index: true
    },

    senderId: {
        type: String,
        required: true,
        index: true
    },

    text: {
        type: String,
        default: "",
        trim: true,
        maxlength: 5000
    },

    type: {
        type: String,
        enum: [
            "text"
        ],
        default: "text"
    },

    seen: {
        type: Boolean,
        default: false
    }

},
{
    timestamps: true
});

module.exports = mongoose.model("Message", messageSchema);