"use strict";


const requests =
document.getElementById("requests");


const friends =
document.getElementById("friends");



async function loadRequests(){


const res =
await fetch("/friends/requests",
{
credentials:"include"
});


const data =
await res.json();



if(!data.success ||
data.requests.length===0)
{

requests.innerHTML =
"No friend requests";

return;

}



requests.innerHTML="";



data.requests.forEach(req=>{


const div =
document.createElement("div");


div.className="friendCard";


div.innerHTML=`

<img src="${req.avatar}">


<div class="friendInfo">

<b>
${req.displayName}
</b>


</div>


<button onclick="acceptRequest('${req._id}')">

Accept

</button>


<button onclick="declineRequest('${req._id}')">

Decline

</button>

`;


requests.appendChild(div);


});


}




async function acceptRequest(id){


await fetch("/friends/accept",
{

method:"POST",

headers:{

"Content-Type":"application/json"

},

body:JSON.stringify({

requestId:id

})

});


loadRequests();

loadFriends();


}




async function declineRequest(id){


await fetch("/friends/decline",
{

method:"POST",

headers:{

"Content-Type":"application/json"

},

body:JSON.stringify({

requestId:id

})

});


loadRequests();


}






async function loadFriends(){


const res =
await fetch("/friends",
{
credentials:"include"
});


const data =
await res.json();



if(!data.success ||
data.friends.length===0)
{

friends.innerHTML =
"No friends yet";

return;

}



friends.innerHTML="";



data.friends.forEach(friend=>{


const div =
document.createElement("div");


div.className="friendCard";



div.innerHTML=`

<img src="${friend.avatar || "/favicon.ico"}">


<div class="friendInfo">

<b>
${friend.displayName || "Unknown"}
</b>


<div class="${
friend.onlineStatus
?
"online"
:
"offline"
}">

${
friend.onlineStatus
?
"● Online"
:
"● Offline"
}

</div>


</div>

`;



friends.appendChild(div);



});


}




loadRequests();

loadFriends();