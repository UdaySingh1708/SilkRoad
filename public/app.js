"use strict";


/*
=====================================
Silk Road Login System
=====================================
*/


let loginModal;
let googleLoginBtn;
let guestLoginBtn;
let userProfile;
let userAvatar;
let userName;
let logoutBtn;


function hideLogin(){

    if(loginModal){

        loginModal.classList.add("hidden");

    }

}



function initLogin(){


    loginModal =
    document.getElementById("loginModal");


    googleLoginBtn =
    document.getElementById("googleLoginBtn");


    guestLoginBtn =
    document.getElementById("guestLoginBtn");


    userProfile =
document.getElementById("userProfile");

userAvatar =
document.getElementById("userAvatar");

userName =
document.getElementById("userName");

logoutBtn =
document.getElementById("logoutBtn");



    if(googleLoginBtn){

        googleLoginBtn.addEventListener(
            "click",
            ()=>{

                window.location.href =
                "/auth/google";

            }
        );
if (logoutBtn) {

    logoutBtn.addEventListener("click", async () => {

        try {

            await fetch("/auth/logout", {
                method: "POST"
            });

        } catch (err) {

            console.log(err);

        }

        localStorage.removeItem("silkGoogleUser");
        localStorage.removeItem("silkGuestId");

        window.location.reload();

    });

}
    }



    if(guestLoginBtn){

        guestLoginBtn.addEventListener(
            "click",
            ()=>{


                const guestId =
                "guest_" +
                Math.random()
                .toString(36)
                .substring(2,12);



                localStorage.setItem(
                    "silkGuestId",
                    guestId
                );


                hideLogin();


            }
        );

    }



    checkLogin();


}



async function checkLogin(){


    try{


        const response =
        await fetch("/auth/user");



        const data =
        await response.json();



        if (data.loggedIn) {

    localStorage.setItem(
        "silkGoogleUser",
        JSON.stringify(data.user)
    );

    hideLogin();

    userProfile.classList.remove("hidden");

    userAvatar.src = data.user.picture || "/favicon.ico";

userName.textContent = data.user.name;

    return;
}



        const guest =
        localStorage.getItem(
            "silkGuestId"
        );



        if(guest){

            hideLogin();

        }


    }

    catch(err){

        console.log(
            "Login check error",
            err
        );

    }


}



window.addEventListener("load", () => {

    initLogin();

});
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

const ageModal = document.getElementById("ageModal");
const ageConfirm = document.getElementById("ageConfirm");
const continueBtn = document.getElementById("continueBtn");

const cameraBtn = document.getElementById("cameraBtn");
const muteBtn = document.getElementById("muteBtn");

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");


/*
==========================================
Variables
==========================================
*/

let localStream = null;

let peer = null;

let connected = false;


const rtcConfig = {
    iceServers: [
        {
            urls: "stun:stun.relay.metered.ca:80"
        },
        {
            urls: "turn:global.relay.metered.ca:80",
            username: "78001c7ee6131328e3e4d9b8",
            credential: "xLHzTJwh9GA7Emsw"
        },
        {
            urls: "turn:global.relay.metered.ca:80?transport=tcp",
            username: "78001c7ee6131328e3e4d9b8",
            credential: "xLHzTJwh9GA7Emsw"
        },
        {
            urls: "turn:global.relay.metered.ca:443",
            username: "78001c7ee6131328e3e4d9b8",
            credential: "xLHzTJwh9GA7Emsw"
        },
        {
            urls: "turns:global.relay.metered.ca:443?transport=tcp",
            username: "78001c7ee6131328e3e4d9b8",
            credential: "xLHzTJwh9GA7Emsw"
        }
    ]
};



/*
==========================================
Helpers
==========================================
*/


function addMessage(text,type){

    const div=document.createElement("div");

    div.className="message "+type;

    div.textContent=text;

    messages.appendChild(div);

    messages.scrollTop=messages.scrollHeight;

}



function clearMessages(){

    messages.innerHTML="";

}



function setStatus(text){

    status.textContent=text;

}



/*
==========================================
Camera + Microphone
==========================================
*/


async function startMedia(){

    try{


        if(localStream){

            return;

        }


        localStream = await navigator.mediaDevices.getUserMedia({
    video: {
        facingMode: "user",
        width: { ideal: 1280 },
        height: { ideal: 720 }
    },
    audio: true
});

localVideo.srcObject = localStream;

// Force no CSS transform
localVideo.style.transform = "none";
remoteVideo.style.transform = "none";



        if(localVideo){

            localVideo.srcObject=localStream;

        }


    }

    catch(err){

        console.error(err);

        alert(
            "Camera or microphone permission denied."
        );

    }

}



function stopMedia(){


    if(localStream){


        localStream.getTracks().forEach(track=>{

            track.stop();

        });


        localStream=null;


    }


    if(localVideo){

        localVideo.srcObject=null;

    }


}



/*
==========================================
Peer Connection
==========================================
*/


function createPeer(){


    peer = new RTCPeerConnection(
        rtcConfig
    );


    if(localStream){


        localStream.getTracks().forEach(track=>{


            peer.addTrack(
                track,
                localStream
            );


        });


    }



    peer.ontrack=(event)=>{


        if(remoteVideo){

            remoteVideo.srcObject =
            event.streams[0];

        }


    };



    peer.onicecandidate=(event)=>{


        if(event.candidate){


            socket.emit(
                "iceCandidate",
                event.candidate
            );


        }


    };



    peer.onconnectionstatechange=()=>{


        console.log(
            "Peer:",
            peer.connectionState
        );



        if(

            peer.connectionState==="failed" ||

            peer.connectionState==="closed" ||

            peer.connectionState==="disconnected"

        ){

            endPeer();

        }


    };


}/*
==========================================
WebRTC Offer / Answer
==========================================
*/


async function createOffer(){


    const offer = await peer.createOffer();


    await peer.setLocalDescription(
        offer
    );


    socket.emit(
        "offer",
        offer
    );


}




async function createAnswer(offer){


    await peer.setRemoteDescription(

        new RTCSessionDescription(offer)

    );


    const answer = await peer.createAnswer();


    await peer.setLocalDescription(
        answer
    );


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


function endPeer(){


    if(peer){


        peer.close();

        peer=null;


    }



    if(remoteVideo){


        remoteVideo.srcObject=null;


    }


}





/*
==========================================
Socket Events
==========================================
*/


socket.on("matched", async ({initiator})=>{


    connected=true;


    clearMessages();


    typing.textContent="";


    setStatus(
        "Connected"
    );



    try{


        if(!localStream){

            await startMedia();

        }



        if(!peer){

            createPeer();

        }



        if(initiator){


            await createOffer();


        }



    }

    catch(err){

        console.error(err);

    }



});





socket.on("waiting",()=>{


    connected=false;


    setStatus(
        "Looking for a stranger..."
    );


});






socket.on("offer",async(offer)=>{


    try{


        if(!localStream){

            await startMedia();

        }



        if(!peer){

            createPeer();

        }



        await peer.setRemoteDescription(

            new RTCSessionDescription(offer)

        );



        const answer =
        await peer.createAnswer();



        await peer.setLocalDescription(
            answer
        );



        socket.emit(
            "answer",
            answer
        );


    }

    catch(err){

        console.error(err);

    }



});







socket.on("answer",async(answer)=>{


    try{


        if(peer){


            await peer.setRemoteDescription(

                new RTCSessionDescription(answer)

            );


        }


    }

    catch(err){

        console.error(err);

    }


});







socket.on("iceCandidate",async(candidate)=>{


    try{


        if(peer){


            await peer.addIceCandidate(

                new RTCIceCandidate(candidate)

            );


        }


    }

    catch(err){

        console.error(err);

    }


});







socket.on("message",(data)=>{


    const message =
    typeof data==="string"
    ? data
    : data.message;



    addMessage(
        message,
        "stranger"
    );


});







socket.on("typing",()=>{


    typing.textContent =
    "Stranger is typing...";


});






socket.on("stopTyping",()=>{


    typing.textContent="";


});







socket.on("partnerLeft",()=>{


    connected=false;


    typing.textContent="";


    endPeer();


    clearMessages();


    setStatus(
        "Stranger disconnected"
    );


});







socket.on("onlineCount",(count)=>{


    onlineCount.textContent =
    "Online: "+count;


});







socket.on("pongServer",()=>{


    console.log(
        "Ping OK"
    );


});/*
==========================================
Preferences
==========================================
*/


const languageSelect =
document.getElementById("languageSelect");


const modeSelect =
document.getElementById("modeSelect");


const interestSelect =
document.getElementById("interestSelect");


const selectedPreferences =
document.getElementById("selectedPreferences");




function sendPreferences(){


    const preferences={


        language:
        languageSelect.value,


        mode:
        modeSelect.value,


        interest:
        interestSelect.value


    };



    socket.emit(
        "setPreferences",
        preferences
    );



    if(selectedPreferences){


        selectedPreferences.textContent =

        "Selected: "

        +

        preferences.language

        +

        " | "

        +

        preferences.mode

        +

        " | "

        +

        preferences.interest;


    }


}






languageSelect.addEventListener(
    "change",
    sendPreferences
);


modeSelect.addEventListener(
    "change",
    sendPreferences
);


interestSelect.addEventListener(
    "change",
    sendPreferences
);






/*
==========================================
Age Verification
==========================================
*/

async function startChat() {

    sendPreferences();

    home.classList.add("hidden");

    chat.classList.remove("hidden");

    setStatus("Connecting...");

    await startMedia();

    socket.emit("findPartner");

}

continueBtn.addEventListener("click", async () => {

    if (!ageConfirm.checked) {
        alert("Please confirm that you are 14 years or older.");
        return;
    }

    

    ageModal.classList.add("hidden");

    await startChat();

});








/*
==========================================
Start Chat
==========================================
*/

startBtn.addEventListener("click", () => {

    ageConfirm.checked = false;

    ageModal.classList.remove("hidden");

});






/*
==========================================
Messaging
==========================================
*/


sendBtn.addEventListener(
"click",
sendMessage
);




input.addEventListener(
"keydown",
(e)=>{


    if(e.key==="Enter"){


        sendMessage();


    }


});






function sendMessage(){


    const message =
    input.value.trim();



    if(
        !message ||
        !connected
    ){

        return;

    }




    socket.emit(
        "message",
        {
            message
        }
    );



    addMessage(
        message,
        "me"
    );



    input.value="";



    socket.emit(
        "stopTyping"
    );


}






input.addEventListener(
"input",
()=>{


    if(!connected){

        return;

    }



    if(input.value.length>0){


        socket.emit(
            "typing"
        );


    }

    else{


        socket.emit(
            "stopTyping"
        );


    }


});/*
==========================================
Next Stranger
==========================================
*/


nextBtn.addEventListener(
"click",
()=>{


    endPeer();


    clearMessages();


    typing.textContent="";


    setStatus(
        "Searching for stranger..."
    );


    socket.emit(
        "next"
    );


});






/*
==========================================
Disconnect
==========================================
*/


disconnectBtn.addEventListener(
"click",
()=>{


    endPeer();


    stopMedia();


    clearMessages();


    socket.emit(
        "disconnectChat"
    );



    connected=false;



    setStatus(
        "Disconnected"
    );


});







/*
==========================================
Report
==========================================
*/


reportBtn.addEventListener(
"click",
()=>{


    const reasons=[


        "Harassment",

        "Nudity / Sexual Content",

        "Spam",

        "Hate Speech",

        "Fake Identity",

        "Underage User",

        "Other"


    ];



    const choice = prompt(

        "Select report reason:\n\n"+

        "1. Harassment\n"+

        "2. Nudity / Sexual Content\n"+

        "3. Spam\n"+

        "4. Hate Speech\n"+

        "5. Fake Identity\n"+

        "6. Underage User\n"+

        "7. Other\n\n"+

        "Enter number:"

    );



    const index =
    Number(choice)-1;




    if(

        isNaN(index)

        ||

        index<0

        ||

        index>=reasons.length

    ){


        alert(
            "Invalid report reason."
        );


        return;


    }




    socket.emit(
        "reportPartner",
        {
            reason:reasons[index]
        }
    );



    alert(
        "Report submitted. Thank you for helping keep Silk Road safe."
    );


});






/*
==========================================
Block
==========================================
*/


blockBtn.addEventListener(
"click",
()=>{


    socket.emit(
        "blockPartner"
    );



    endPeer();


    clearMessages();



    setStatus(
        "User blocked."
    );


});








/*
==========================================
Camera Toggle
==========================================
*/


let cameraEnabled=true;



cameraBtn.addEventListener(
"click",
()=>{


    if(!localStream){

        return;

    }



    const videoTrack =
    localStream.getVideoTracks()[0];



    if(!videoTrack){

        return;

    }



    cameraEnabled =
    !cameraEnabled;



    videoTrack.enabled =
    cameraEnabled;



    cameraBtn.textContent =
    cameraEnabled

    ?

    "📷 Camera"

    :

    "📷 Camera Off";


});







/*
==========================================
Microphone Toggle
==========================================
*/


let microphoneEnabled=true;



muteBtn.addEventListener(
"click",
()=>{


    if(!localStream){

        return;

    }



    const audioTrack =
    localStream.getAudioTracks()[0];



    if(!audioTrack){

        return;

    }



    microphoneEnabled =
    !microphoneEnabled;



    audioTrack.enabled =
    microphoneEnabled;



    muteBtn.textContent =

    microphoneEnabled

    ?

    "🎤 Microphone"

    :

    "🔇 Muted";


});







/*
==========================================
Keep Alive
==========================================
*/


setInterval(
()=>{


    socket.emit(
        "pingServer"
    );


},
30000
);







/*
==========================================
Window Close
==========================================
*/


window.addEventListener(
"beforeunload",
()=>{


    endPeer();


});
