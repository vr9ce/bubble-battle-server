import type {
    ClientMessage,
    ServerMessage,
} from './proto.js'

export class Game {
    constructor(status_reporter: (msg: ServerMessage) => void) {

    }
    Execute(cmd: ClientMessage) {

    }
}
