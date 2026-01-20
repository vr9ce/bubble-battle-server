import {WebSocketServer, type WebSocket} from 'ws'
import {
    WEBSOCKET_PORT,
} from './config.js'
import type {
    ClientMessage,
    ServerMessage,
} from './proto.js'
import {Game} from './game.js'

const sockets = new Set<WebSocket>()
function Broadcast(msg: ServerMessage) {
    for (const ws of sockets)
        ws.send(JSON.stringify(msg))
}


const game = new Game(Broadcast)

new WebSocketServer({
    port: WEBSOCKET_PORT
}).on('connection', ws => {
    console.info('New client connected')

    sockets.add(ws)
    ws.onmessage = event => {
        const msg: ClientMessage = JSON.parse(event.data.toString())
        game.Execute(msg)
    }
})
