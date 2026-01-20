import type {
    ClientMessage,
    ServerMessage,
    Bubble,
} from './proto.js'

export class Game {
    readonly Bubbles = new Map<string, Bubble>

    constructor(status_reporter: (msg: ServerMessage) => void) {

    }
    Execute(cmd: ClientMessage) {

    }
}
