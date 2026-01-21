import {WebSocketServer, type WebSocket} from 'ws'
import {
    WEBSOCKET_PORT,
} from './config.js'
import type {
    ClientMessage,
    ServerMessage,
    ServerMessageRaw,
} from './proto.js'
import {Game} from './game.js'

const sockets = new Set<WebSocket>()
function Broadcast(msg: ServerMessageRaw) {
    for (const ws of sockets)
        ws.send(JSON.stringify({
            ...msg,
            Timestamp: Date.now(),
        } as ServerMessage))
}


const game = new Game(Broadcast)

new WebSocketServer({
    port: WEBSOCKET_PORT
}).on('connection', function() {
    let cnt: number = 0
    return ws => {
        console.log('New client connected', ++cnt)

        sockets.add(ws)
        ws.onclose = () => {
            console.log('Client disconnected')
            sockets.delete(ws)
        }

        ws.onmessage = event => {
            const msg: ClientMessage = JSON.parse(event.data.toString())
            console.log('Received message from client:', msg)
            game.Execute(msg)
        }
    }
}())
