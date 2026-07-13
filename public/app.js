"use strict";

/*
==========================================
Socket
==========================================
*/

const socket = io({
    transports: ["websocket", "polling"]
});

/*
==========================================
DOM
==========================================
*/

const startBtn = document.getElementById("startBtn");
const sendBtn = document.getElementById("sendBtn");
const nextBtn = document.getElementById("nextBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const reportBtn = document.getElementById("reportBtn");
const blockBtn = document.getElementById("blockBtn");

const home = document.getElementById("home");
const chat = document.getElementById("chat");

const status = document.getElementById("status");
const typing = document.getElementById("typing");
const messages = document.getElementById("messages");

const input = document.getElementById("messageInput");
const onlineCount = document.getElementById("onlineCount");

/*
==========================================
Video Elements
==========================================
*/

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");

let localStream = null;
let peer = null;

let connected = false;

const rtcConfig = {

    iceServers: [

        {
            urls: "stun:stun.l.google.com:19302"
        },
        {
            urls: "stun:stun1.l.google.com:19302"
        }

    ]

};

/*
==========================================
Helpers
==========================================
*/

function addMessage(text, type) {

    const div = document.createElement("div");

    div.className = "message " + type;

    div.textContent = text;

    messages.appendChild(div);

    messages.scrollTop = messages.scrollHeight;

}

function clearMessages() {

    messages.innerHTML = "";

}

function setStatus(text) {

    status.textContent = text;

}/*
==========================================
Camera + Microphone
==========================================
*/

async function startMedia() {

    try {

        localStream = await navigator.mediaDevices.getUserMedia({

            video: true,

            audio: true

        });

        if (localVideo) {

            localVideo.srcObject = localStream;

        }

    } catch (err) {

        console.error(err);

        alert("Camera or microphone permission denied.");

    }

}

/*
==========================================
Peer Connection
==========================================
*/

function createPeer() {

    peer = new RTCPeerConnection(rtcConfig);

    localStream.getTracks().forEach(track => {

        peer.addTrack(track, localStream);

    });

    peer.ontrack = (event) => {

        if (remoteVideo) {

            remoteVideo.srcObject = event.streams[0];

        }

    };

    peer.onicecandidate = (event) => {

        if (event.candidate) {

            socket.emit(
                "iceCandidate",
                event.candidate
            );

        }

    };

    peer.onconnectionstatechange = () => {

        console.log(
            "Peer:",
            peer.connectionState
        );

        if (

            peer.connectionState === "failed" ||

            peer.connectionState === "closed" ||

            peer.connectionState === "disconnected"

        ) {

            endPeer();

        }

    };

}

/*
==========================================
Offer
==========================================
*/

async function createOffer() {

    const offer = await peer.createOffer();

    await peer.setLocalDescription(offer);

    socket.emit(
        "offer",
        offer
    );

}

/*
==========================================
Answer
==========================================
*/

async function createAnswer(offer) {

    await peer.setRemoteDescription(

        new RTCSessionDescription(offer)

    );

    const answer = await peer.createAnswer();

    await peer.setLocalDescription(answer);

    socket.emit(
        "answer",
        answer
    );

}

/*
==========================================
Cleanup
==========================================
*/

function endPeer() {

    if (peer) {

        peer.close();

        peer = null;

    }

    if (remoteVideo) {

        remoteVideo.srcObject = null;

    }

}/*
==========================================
Socket Events
==========================================
*/

socket.on("matched", async () => {

    connected = true;

    clearMessages();

    typing.textContent = "";

    setStatus("Connected");

    try {

        if (!localStream) {

            await startMedia();

        }

        createPeer();

        await createOffer();

    } catch (err) {

        console.error(err);

    }

});

socket.on("waiting", () => {

    connected = false;

    setStatus("Looking for a stranger...");

});

socket.on("offer", async (offer) => {

    try {

        if (!localStream) {

            await startMedia();

        }

        if (!peer) {

            createPeer();

        }

        await createAnswer(offer);

    } catch (err) {

        console.error(err);

    }

});

socket.on("answer", async (answer) => {

    try {

        await peer.setRemoteDescription(

            new RTCSessionDescription(answer)

        );

    } catch (err) {

        console.error(err);

    }

});

socket.on("iceCandidate", async (candidate) => {

    try {

        if (peer) {

            await peer.addIceCandidate(

                new RTCIceCandidate(candidate)

            );

        }

    } catch (err) {

        console.error(err);

    }

});

socket.on("message", (data) => {

    const message =
        typeof data === "string"
            ? data
            : data.message;

    addMessage(message, "stranger");

});

socket.on("typing", () => {

    typing.textContent = "Stranger is typing...";

});

socket.on("stopTyping", () => {

    typing.textContent = "";

});

socket.on("partnerLeft", () => {

    connected = false;

    typing.textContent = "";

    endPeer();

    clearMessages();

    setStatus("Stranger disconnected");

});

socket.on("onlineCount", (count) => {

    onlineCount.textContent = "Online: " + count;

});

socket.on("pongServer", () => {

    console.log("Ping OK");

});/*
==========================================
Buttons
==========================================
*/

startBtn.addEventListener("click", async () => {

    home.classList.add("hidden");

    chat.classList.remove("hidden");

    setStatus("Connecting...");

    try {

        await startMedia();

    } catch (err) {

        console.error(err);

    }

    socket.emit("findPartner");

});

sendBtn.addEventListener("click", sendMessage);

input.addEventListener("keydown", (e) => {

    if (e.key === "Enter") {

        sendMessage();

    }

});

function sendMessage() {

    const message = input.value.trim();

    if (!message || !connected) return;

    socket.emit("message", {

        message

    });

    addMessage(message, "me");

    input.value = "";

    socket.emit("stopTyping");

}

input.addEventListener("input", () => {

    if (!connected) return;

    if (input.value.length > 0) {

        socket.emit("typing");

    } else {

        socket.emit("stopTyping");

    }

});

nextBtn.addEventListener("click", () => {

    endPeer();

    clearMessages();

    typing.textContent = "";

    setStatus("Searching for stranger...");

    socket.emit("next");

});

disconnectBtn.addEventListener("click", () => {

    endPeer();

    clearMessages();

    socket.emit("disconnectChat");

    connected = false;

    setStatus("Disconnected");

});

reportBtn.addEventListener("click", () => {

    socket.emit(
        "reportPartner",
        {
            reason: "User reported"
        }
    );

    alert("User reported.");

});


blockBtn.addEventListener("click", () => {

    socket.emit("blockPartner");

    endPeer();

    clearMessages();

    setStatus("User blocked.");

});

/*
==========================================
Keep Alive
==========================================
*/

setInterval(() => {

    socket.emit("pingServer");

}, 30000);

/*
==========================================
Window Close
==========================================
*/

window.addEventListener("beforeunload", () => {

    endPeer();

});

/*
==========================================
End
==========================================
*//*
==========================================
Camera Toggle
==========================================
*/

let cameraEnabled = true;

cameraBtn.addEventListener("click", () => {

    if (!localStream) return;

    const videoTrack = localStream.getVideoTracks()[0];

    if (!videoTrack) return;

    cameraEnabled = !cameraEnabled;

    videoTrack.enabled = cameraEnabled;

    cameraBtn.textContent = cameraEnabled
        ? "📷 Camera"
        : "📷 Camera Off";

});


/*
==========================================
Microphone Toggle
==========================================
*/

let microphoneEnabled = true;

muteBtn.addEventListener("click", () => {

    if (!localStream) return;

    const audioTrack = localStream.getAudioTracks()[0];

    if (!audioTrack) return;

    microphoneEnabled = !microphoneEnabled;

    audioTrack.enabled = microphoneEnabled;

    muteBtn.textContent = microphoneEnabled
        ? "🎤 Microphone"
        : "🔇 Muted";

});