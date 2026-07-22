"use strict";

const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
{
    participants: {
        type: [String],
        required: true,
        validate: {
            validator: function (value) {
                return value.length === 2;
            },
            message: "Conversation must contain exactly two participants."
        }
    },

    lastMessage: {
        type: String,
        default: ""
    },

    lastMessageAt: {
        type: Date,
        default: Date.now
    }

},
{
    timestamps: true
});

// Prevent duplicate conversations
conversationSchema.index(
{
    participants: 1
},
{
    unique: true
});

module.exports = mongoose.model("Conversation", conversationSchema);