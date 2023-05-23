import ws, { WebSocketServer } from 'ws'
import path from 'path'
import grpc from '@grpc/grpc-js'
import protoLoader from '@grpc/proto-loader'

const wsServer = new WebSocketServer({ port: 3001 })
let wclients = []
let messages = []
let chatusers = []

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
                addMessage(data, messages);
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

function addMessage(data, queue) {
    let newmes = {
        event: "newmessage",
        message_id: data.id,
        content: data.content,
        time: data.time,
        user_id: data.user_id,
        chat_id: data.chat_id,
        shown: 0
    };
    wclients.forEach((wc) => {
        if (data.chatid in wc.chats) {
            if (wc.wss.readyState === ws.OPEN){
                wc.wss.send(JSON.stringify(newmes));
            }
        }
    });
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
}

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
        chat_id: data.chat_id,
    };
    for (let wc in wclients){
        if (wc.id === data.user_id){
            wc.chats.append(data.chat_id)
            wc.wss.send(JSON.stringify(newmes));
        }
    }
}

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
        message_id: data.message_id,
        name: data.name,
        user_id: data.user_id
    };
    wclients.forEach((wc) => {
        if (data.chatid in wc.chats) {
            if (wc.wss.readyState === ws.OPEN){
                wc.wss.send(JSON.stringify(newmes));
            }
        }
    });
}