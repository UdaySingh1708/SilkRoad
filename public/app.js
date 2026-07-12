"use strict";

const socket = io();

const home = document.getElementById("home");
const chat = document.getElementById("chat");

const startBtn = document.getElementById("startBtn");
const nextBtn = document.getElementById("nextBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const reportBtn = document.getElementById("reportBtn");
const blockBtn = document.getElementById("blockBtn");
const sendBtn = document.getElementById("sendBtn");

const input = document.getElementById("messageInput");

const messages = document.getElementById("messages");
const status = document.getElementById("status");
const typing = document.getElementById("typing");
const onlineCount = document.getElementById("onlineCount");

let connected = false;

function addMessage(text, type) {

    const div = document.createElement("div");

    div.className = "message " + type;

    div.textContent = text;

    messages.appendChild(div);

    messages.scrollTop = messages.scrollHeight;

}

function clearChat() {

    messages.innerHTML = "";

    typing.textContent = "";

}

function startSearching() {

    home.classList.add("hidden");

    chat.classList.remove("hidden");

    clearChat();

    connected = false;

    status.textContent = "Searching for a stranger...";

    socket.emit("findPartner");

}

function sendMessage() {

    const text = input.value.trim();

    if (!connected || text === "") return;

    socket.emit("message", text);

    addMessage(text, "me");

    input.value = "";

    socket.emit("stopTyping");

}

startBtn.addEventListener("click", startSearching);

sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keydown", function (e) {

    if (e.key === "Enter") {

        e.preventDefault();

        sendMessage();

    }

});

input.addEventListener("input", function () {

    if (!connected) return;

    if (input.value.length > 0) {

        socket.emit("typing");

    } else {

        socket.emit("stopTyping");

    }

});

nextBtn.addEventListener("click", function () {

    clearChat();

    connected = false;

    status.textContent = "Searching for a new stranger...";

    socket.emit("next");

});

disconnectBtn.addEventListener("click", function () {

    location.reload();

});

reportBtn.addEventListener("click", function () {

    if (!connected) {

        alert("You are not connected to anyone.");

        return;

    }

    socket.emit("reportPartner");

    alert("Thank you. This user has been reported.");

});

blockBtn.addEventListener("click", function () {

    if (!connected) {

        alert("You are not connected to anyone.");

        return;

    }

    socket.emit("blockPartner");

    connected = false;

    clearChat();

    status.textContent = "Blocked. Searching for another stranger...";

    socket.emit("next");

});

socket.on("matched", function () {

    connected = true;

    status.textContent = "Connected to a stranger";

});

socket.on("waiting", function () {

    connected = false;

    status.textContent = "Waiting for a stranger...";

});

socket.on("message", function (data) {

    if (typeof data === "string") {

        addMessage(data, "stranger");

    } else if (data && data.message) {

        addMessage(data.message, "stranger");

    }

});

socket.on("typing", function () {

    typing.textContent = "Stranger is typing...";

});

socket.on("stopTyping", function () {

    typing.textContent = "";

});

socket.on("partnerLeft", function () {

    connected = false;

    clearChat();

    status.textContent = "Stranger disconnected. Searching again...";

});

socket.on("onlineCount", function (count) {

    onlineCount.textContent = "Online: " + count;

});

socket.on("connect", function () {

    console.log("Connected:", socket.id);

});

socket.on("disconnect", function () {

    connected = false;

    status.textContent = "Disconnected from server.";

});