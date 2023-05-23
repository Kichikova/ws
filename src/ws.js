import ws, { WebSocketServer } from 'ws'
import path from 'path'
import grpc from '@grpc/grpc-js'
import protoLoader from '@grpc/proto-loader'

const wsServer = new WebSocketServer({ port: 3001 })
let wclients = []
let chatusers = []

await fetch(`http://localhost:8000/chatusers/?format=json`)
    .then(async (response) => {
        let res = response.json()
        chatusers = await res
    });

const packageDefinition = protoLoader.loadSync(path.join('/protos/alalallala.proto'));
const Proto = grpc.loadPackageDefinition(packageDefinition);
const Stub = new Proto.f('localhost:', grpc.credentials.createInsecure());

wsServer.on("connection", (ws, req) => {

    ws.on("message", (data) => {
        console.log(`received: ${data}`);
        data = JSON.parse(data);

        switch (data.event) {
            case "connection":
                addclient(data, ws);
                break;
            case "message":
                addMessage(data);
                break;
            case "reaction":
                addReaction(data);
                break;
            case "delmessage":
                deleteMessage(data);
                break;
            case "chmessage":
                changeMessage(data);
                break;
            case "addMember":
                addMember(data);
                break;
            case "deleteMember":
                deleteMember(data);
                break;
            case "disconnect":
                addMessage(data);
                break;
        }
    });
});

function addclient(data, ws) {
    let chats =[]
    for (let cu in chatusers){
        if (cu.user_id === data.user_id){
            chats.push(cu.chat_id)
        }
    }
    let wc={
        id:data.id,
        wss:ws,
        chats: chats
    }
    wclients.push(wc)
}

function addMessage(data) {
    let newmes = {
        event: "subscribe.addMessage",
        message: data.message,
        chatId: data.chatId
    };
    wclients.forEach((wc) => {
        if (data.chatId in wc.chats) {
            if (wc.wss.readyState === ws.OPEN){
                wc.wss.send(JSON.stringify(newmes));
            }
        }
    });
    fetch("http://localhost:8000/message/",
        {
            method: "POST",
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(data.message)
        })
}

function deleteMessage(data) {
    let newmes = {
        event: "deletedmessage",
        message_id: data.id,
    };
    wclients.forEach((wc) => {
        if (data.chatid in wc.chats) {
            if (wc.wss.readyState === ws.OPEN){
                wc.wss.send(JSON.stringify(newmes));
            }
        }
    });

    let url = "http://localhost:8000/message/"+data.id+"/"
    fetch(url,
        {
            method: "DELETE",
        })
        .then((res)=>(console.log(res.body)))
}

//?
function changeMessage(data) {
    let newmes = {
        event: "changemessage",
        message_id: data.id,
        nc: data.content
    };
    wclients.forEach((wc) => {
        if (data.chatid in wc.chats) {
            if (wc.wss.readyState === ws.OPEN){
                wc.wss.send(JSON.stringify(newmes));
            }
        }
    });
}

function addMember(data) {
    let newmes = {
        event: "chatadd",
        chat_id: data.chatId,
    };

    let cu = {
        chat_id: data.chatId,
        user_id: data.userId
    }

    for (let wc in wclients){
        if (wc.id === data.userId){
            wc.chats.append(data.chatId)
            wc.wss.send(JSON.stringify(newmes));
        }
    }

    fetch("http://localhost:8000/chatuser/",
        {
            method: "POST",
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(cu)
        })
}


//?
function deleteMember(data) {
    let newmes = {
        event: "chatdelete",
        chat_id: data.chat_id,
    };
    for (let wc in wclients){
        if (wc.id === data.user_id){
            wc.chats.splice(wc.chats.indexOf(data.chat_id), 1);
            wc.wss.send(JSON.stringify(newmes));
        }
    }
}

function addReaction(data) {
    let newmes = {
        event: "addreaction",
        reaction: data.reaction,
        chatId: data.chatId
    };

    wclients.forEach((wc) => {
        if (data.chatId in wc.chats) {
            if (wc.wss.readyState === ws.OPEN){
                wc.wss.send(JSON.stringify(newmes));
            }
        }
    });

    fetch("http://localhost:8000/reactions/",
        {
            method: "POST",
            headers: {
                'Content-Type': 'application/json;charset=utf-8'
            },
            body: JSON.stringify(data.reaction)
        })
}