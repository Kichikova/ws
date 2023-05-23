import WebSocket, { WebSocketServer } from "ws"
import axios from "axios"
import path from "path"
import grpc from "@grpc/grpc-js"
import protoLoader from "@grpc/proto-loader"

const wsServer = new WebSocketServer({ port: 3001 })

const clients = new Set()
const chatMap = new Map()

// await axios(`http://localhost:8000/chatusers/?format=json`).then(
//   async (response) => {
//     let res = response.json()
//     chatusers = await res
//   }
// )

// const packageDefinition = protoLoader.loadSync(
//   path.join("/protos/alalallala.proto")
// )
// const Proto = grpc.loadPackageDefinition(packageDefinition)
// const Stub = new Proto.f("localhost:", grpc.credentials.createInsecure())

wsServer.on("connection", (ws, req) => {
  clients.add(ws)

  ws.on("message", (data) => {
    console.log(`received: ${data}`)
    data = JSON.parse(data)

    switch (data.event) {
      case "chatConnect":
        chatConnect(data, ws)
        break
      case "addMessage":
        addMessage(data)
        break
      case "reaction":
        addReaction(data)
        break
      case "delmessage":
        deleteMessage(data)
        break
      case "chmessage":
        changeMessage(data)
        break
      case "addMember":
        addMember(data)
        break
      case "deleteMember":
        deleteMember(data)
        break
      case "disconnect":
        addMessage(data)
        break
    }
  })

  ws.on("close", function () {
    console.log("соединение закрыто")

    clients.delete(ws)

    for (const [chatId, chat] of chatMap) {
      for (const client of chat) {
        if (client.userId === ws.userId) {
          chat.delete(client)
          console.log("delete user from chat with id: ", client.userId)
        }
      }

      if (chat.size === 0) {
        chatMap.delete(chat)
        console.log("delete chat with id: ", chatId)
      }
    }
  })
})

function chatConnect(data, ws) {
  console.log(data)
  const { chatId, userId } = data

  if (chatMap.has(chatId)) {
    chatMap.get(chatId).add(ws)
  } else {
    chatMap.set(chatId, new Set([ws]))
  }

  ws.userId = userId

  console.log(chatMap)
}

function addMessage(data) {
  const { event, ...message } = data

  const clients = chatMap.get(message.chatId) || []

  clients.forEach((client) => {
    if (client.userId === data.userId) return

    if (client.readyState === WebSocket.OPEN) {
      client.send(
        JSON.stringify({
          event: "subscribe.addMessage",
          message
        })
      )
    }
  })
}

function deleteMessage(data) {
  let newmes = {
    event: "deletedmessage",
    message_id: data.id
  }
  wclients.forEach((wc) => {
    if (data.chatid in wc.chats) {
      if (wc.wss.readyState === ws.OPEN) {
        wc.wss.send(JSON.stringify(newmes))
      }
    }
  })

  let url = "http://localhost:8000/message/" + data.id + "/"
  fetch(url, {
    method: "DELETE"
  }).then((res) => console.log(res.body))
}

//?
function changeMessage(data) {
  let newmes = {
    event: "changemessage",
    message_id: data.id,
    nc: data.content
  }
  wclients.forEach((wc) => {
    if (data.chatid in wc.chats) {
      if (wc.wss.readyState === ws.OPEN) {
        wc.wss.send(JSON.stringify(newmes))
      }
    }
  })
}

function addMember(data) {
  let newmes = {
    event: "chatadd",
    chat_id: data.chatId
  }

  let cu = {
    chat_id: data.chatId,
    user_id: data.userId
  }

  for (let wc in wclients) {
    if (wc.id === data.userId) {
      wc.chats.append(data.chatId)
      wc.wss.send(JSON.stringify(newmes))
    }
  }

  fetch("http://localhost:8000/chatuser/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=utf-8"
    },
    body: JSON.stringify(cu)
  })
}

//?
function deleteMember(data) {
  let newmes = {
    event: "chatdelete",
    chat_id: data.chat_id
  }
  for (let wc in wclients) {
    if (wc.id === data.user_id) {
      wc.chats.splice(wc.chats.indexOf(data.chat_id), 1)
      wc.wss.send(JSON.stringify(newmes))
    }
  }
}

function addReaction(data) {
  let newmes = {
    event: "addreaction",
    reaction: data.reaction,
    chatId: data.chatId
  }

  wclients.forEach((wc) => {
    if (data.chatId in wc.chats) {
      if (wc.wss.readyState === ws.OPEN) {
        wc.wss.send(JSON.stringify(newmes))
      }
    }
  })

  axios("http://localhost:8000/reaction/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=utf-8"
    },
    body: JSON.stringify(data.reaction)
  })
}
