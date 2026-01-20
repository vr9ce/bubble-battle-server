import type {
    ClientMessage,
    ServerMessageRaw,
    Bubble,
} from './proto.js'
import {
    INIT_NUM_NPC_BUBBLES,
    MAP_HEIGHT, MAP_WIDTH,
    PLAYER_INIT_RADIUS,
} from './config.js'

export class Game {
    readonly Bubbles = new Map<string, Bubble>
    readonly Updater: (msg: ServerMessageRaw) => void

    constructor(status_reporter: (msg: ServerMessageRaw) => void) {
        this.Updater = status_reporter

        // init npc bubbles
        while (this.Bubbles.size < INIT_NUM_NPC_BUBBLES) {
            const id = Math.random().toString(36).slice(2)
            if (this.Bubbles.has(id))
                continue

            const body: Bubble['Body'] = {
                Radius: 1 + PLAYER_INIT_RADIUS * 2 * Math.random(),
                Ate: [],
            }

            const kinematic: Bubble['Kinematic'] = {
                Coordinate: [
                    (Math.random() - 0.5) * MAP_WIDTH,
                    (Math.random() - 0.5) * MAP_HEIGHT,
                ],
                Direction: [0, 0],
                Speed: 0,
            }

            this.Bubbles.set(id, {
                ID: id,
                Body: body,
                Kinematic: kinematic,
            })
        }

        this.Updater({
            Bubbles: Object.fromEntries(this.Bubbles),
            Players: [],
        })
    }
    Execute(cmd: ClientMessage) {

    }
}
