import {WebSocketServer, type WebSocket} from 'ws'
import Ajv from "ajv"
import {
    WEBSOCKET_PORT,
} from './config.js'
import type {
    ClientMessage,
    ServerMessage,
    ServerMessageRaw,
} from './proto.js'
import {Game} from './game.js'

const client_json_validator = new Ajv().compile(
    {
        type: 'object',
        properties: {
            User: {
                type: 'object',
                properties: {
                    ID: {type: 'string'},
                    Direction: {
                        type: 'array',
                        items: {type: 'number'},
                        minItems: 2,
                        maxItems: 2,
                    },
                    Skin: {},
                },
                required: ['ID', 'Direction'],
            },
            Timestamp: {type: 'number'},
        },
        required: ['User', 'Timestamp'],
    }
)

const sockets = new Set<WebSocket>()
function Broadcast(msg: ServerMessageRaw) {
    for (const ws of sockets)
        ws.send(JSON.stringify({
            ...msg,
            Timestamp: Date.now(),
        } as ServerMessage))
    console.log('Broadcasted message to', sockets.size, 'clients')
}


const game = new Game(Broadcast)

new WebSocketServer({
    port: WEBSOCKET_PORT,
    verifyClient: ({origin}, done) => {
        done(true)
    }
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
            let msg_: ClientMessage
            try {
                msg_ = JSON.parse(event.data.toString())
            } catch {
                console.warn('Received non-JSON message from client')
                return
            }
            const msg = msg_
            if (!client_json_validator(msg)) {
                console.warn('Received invalid message from client:', client_json_validator.errors)
                return
            }
            console.log('Received message from client:', msg)
            game.Execute(msg)
        }
    }
}())
game.Start()
