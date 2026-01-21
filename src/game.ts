import type {
    ClientMessageRaw,
    ServerMessageRaw,
    BubbleJSON,
} from './proto.js'
import {
    INIT_NUM_NPC_BUBBLES,
    MAP_HEIGHT, MAP_WIDTH,
    GAME_TICK_PERIOD_MS,
    STOMACH_RADIUS_RATIO,
    PLAYER_INIT_RADIUS,
} from './config.js'

class Bubble {
    readonly ID: string
    Radius: number
    readonly Ate: string[] = []
    EatenBy?: string
    Coordinate: [number, number]
    Direction: [number, number] = [0, 0]
    Speed: number = 0  // if died, set to 0

    constructor(id: string, radius: number, coordinate: Readonly<[number, number]>) {
        this.ID = id
        this.Radius = radius
        this.Coordinate = [...coordinate]
    }

    Eat(other: typeof this) {
        other.Speed = 0

        other.EatenBy = this.ID
        this.Ate.push(other.ID)

        this.Radius = Math.sqrt(this.Radius**2 + other.Radius**2)
    }

    Dist(other: typeof this): number {
        const dx = this.Coordinate[0] - other.Coordinate[0]
        const dy = this.Coordinate[1] - other.Coordinate[1]
        return Math.sqrt(dx**2 + dy**2)
    }

    EatableBy(other: typeof this): boolean {
        if (this.ID == other.ID)
            return false

        if (this.EatenBy != undefined)
            return false

        if (this.Radius <= other.Radius)
            return false

        return true
    }

    TryEat(other: typeof this): boolean {
        const stomach_radius = this.Radius * STOMACH_RADIUS_RATIO

        if (stomach_radius < this.Dist(other))
            return false

        if (other.EatableBy(this)) {
            this.Eat(other)
            return true
        }

        return false
    }

    Move(delta_sec: number) {
        this.NormalizeDirection()

        const dist = this.Speed * delta_sec
        this.Coordinate[0] += this.Direction[0] * dist
        this.Coordinate[1] += this.Direction[1] * dist
    }

    NormalizeDirection() {
        const [dx, dy] = this.Direction
        const len = Math.sqrt(dx**2 + dy**2)
        if (len == 0)
            return

        this.Direction = [dx / len, dy / len]
    }

    Dump(): BubbleJSON {
        return {
            ID: this.ID,
            Body: {
                Radius: this.Radius,
                Ate: this.Ate,
                EatenBy: this.EatenBy,
            },
            Kinematic: {
                Coordinate: this.Coordinate,
                Direction: this.Direction,
                Speed: this.Speed,
            },
        }
    }
}

export class Game {
    readonly Bubbles = new Map<string, Bubble>
    readonly Players = new Set<string>()
    readonly Updater: (msg: ServerMessageRaw) => void

    constructor(status_reporter: typeof this.Updater) {
        // init npc bubbles
        while (this.Bubbles.size < INIT_NUM_NPC_BUBBLES) {
            const id = Math.random().toString(36).slice(2)
            if (this.Bubbles.has(id))
                continue

            this.Bubbles.set(
                id,
                new Bubble(
                    id,
                    1 + PLAYER_INIT_RADIUS * 2 * Math.random(),
                    [(Math.random() - 0.5) * MAP_WIDTH, (Math.random() - 0.5) * MAP_HEIGHT]
                )
            )

            console.log(`Initialized No.${this.Bubbles.size} NPC, ID=${id}`)
        }

        this.Updater = status_reporter
        setInterval(
            () => this.Execute(),
            GAME_TICK_PERIOD_MS
        )
    }
    Execute = (() => {
        let last_cmd_timestamp = Date.now()
        let last_cmd: ClientMessageRaw|null = null

        return (cmd?: ClientMessageRaw) => {
            const current_timestamp = Date.now()

            if (last_cmd === null) {
                last_cmd = cmd
                last_cmd_timestamp = current_timestamp
                return
            }


        }
    })()
}
