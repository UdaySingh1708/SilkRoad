const socket = io();


const home = document.getElementById("home");
const chat = document.getElementById("chat");

const startBtn = document.getElementById("startBtn");
const nextBtn = document.getElementById("nextBtn");
const disconnectBtn = document.getElementById("disconnectBtn");

const sendBtn = document.getElementById("sendBtn");
const input = document.getElementById("messageInput");

const messages = document.getElementById("messages");
const status = document.getElementById("status");
const typing = document.getElementById("typing");
const onlineCount = document.getElementById("onlineCount");


let connected = false;



function addMessage(text, type){

    const div = document.createElement("div");

    div.className = "message " + type;

    div.textContent = text;

    messages.appendChild(div);

    messages.scrollTop = messages.scrollHeight;

}



function startSearching(){

    home.classList.add("hidden");

    chat.classList.remove("hidden");


    messages.innerHTML="";

    status.textContent="Searching for stranger...";

    typing.textContent="";

    connected=false;


    socket.emit("findPartner");

}




function sendMessage(){

    const text=input.value.trim();


    if(!connected || text==="") return;


    socket.emit(
        "message",
        text
    );


    addMessage(
        text,
        "me"
    );


    input.value="";

    socket.emit("stopTyping");

}



startBtn.onclick=startSearching;



sendBtn.onclick=sendMessage;



input.addEventListener(
"keydown",
(e)=>{

    if(e.key==="Enter"){

        e.preventDefault();

        sendMessage();

    }

});



input.addEventListener(
"input",
()=>{


    if(!connected) return;


    if(input.value.length>0){

        socket.emit("typing");

    }else{

        socket.emit("stopTyping");

    }


});




nextBtn.onclick=()=>{


    messages.innerHTML="";

    typing.textContent="";


    status.textContent=
    "Searching for new stranger...";


    connected=false;


    socket.emit("next");


};





disconnectBtn.onclick=()=>{


    socket.disconnect();


    location.reload();


};





socket.on(
"matched",
()=>{


    connected=true;


    status.textContent=
    "Connected to stranger";


});





socket.on(
"waiting",
()=>{


    status.textContent=
    "Waiting for stranger...";


});





socket.on(
"message",
(msg)=>{


    if(typeof msg==="string"){

        addMessage(
            msg,
            "stranger"
        );

    }else{


        addMessage(
            msg.message,
            "stranger"
        );

    }


});





socket.on(
"typing",
()=>{


    typing.textContent=
    "Stranger is typing...";


});





socket.on(
"stopTyping",
()=>{


    typing.textContent="";


});





socket.on(
"partnerLeft",
()=>{


    connected=false;


    status.textContent=
    "Stranger disconnected";


    typing.textContent="";


});





socket.on(
"onlineCount",
(count)=>{


    onlineCount.textContent=
    "Online: " + count;


});





socket.on(
"connect",
()=>{

    console.log(
        "Connected to server"
    );

});