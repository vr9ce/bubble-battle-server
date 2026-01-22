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
    MAX_BUBBLE_RADIUS,
    GetSpeedByRadius,
    PLAYER_INIT_RADIUS,
    X_MAX, Y_MAX,
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
        if (other.ID != '')  // trial bubbles have NULL-string ID
            this.Ate.push(other.ID)

        this.Radius = Math.min(
            MAX_BUBBLE_RADIUS,
            Math.sqrt(this.Radius**2 + other.Radius**2)
        )
        if (this.Speed)
            this.Speed = GetSpeedByRadius(this.Radius)
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

        if (this.Radius >= other.Radius)
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
        if (this.EatenBy != undefined)
            return

        if (this.Speed == 0)
            return
        const dist = this.Speed * delta_sec

        this.NormalizeDirection()

        this.Coordinate[0] += this.Direction[0] * dist
        this.Coordinate[1] += this.Direction[1] * dist
        console.log('Moved bubble', this.ID, 'to', this.Coordinate)
        this.Coordinate[0] = Math.min(X_MAX, Math.max(-X_MAX, this.Coordinate[0]))
        this.Coordinate[1] = Math.min(Y_MAX, Math.max(-Y_MAX, this.Coordinate[1]))
        console.log('Clamped bubble', this.ID, 'to', this.Coordinate)
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

class Player {
    readonly ID: string
    readonly Bubble: Bubble

    constructor(bubble: Bubble) {
        this.ID = bubble.ID
        this.Bubble = bubble
    }
}

export class Game {
    readonly Bubbles = new Map<string, Bubble>
    readonly Players = new Map<string, Player>
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
    }

    Start() {
        setInterval(
            () => this.AdvanceToNextFrame(),
            GAME_TICK_PERIOD_MS
        )
    }

    AdvanceToNextFrame = (() => {
        let last_timestamp = Date.now()

        return () => {
            const current_timestamp = Date.now()
            const delta_sec = (current_timestamp - last_timestamp) / 1000
            last_timestamp = current_timestamp

            this.MoveAllBubbles(delta_sec)
            this.LetBubblesEatEachOther()

            this.Updater({
                Bubbles: Object.fromEntries([...this.Bubbles].map(([id, bubble]) => [id, bubble.Dump()])),
                Players: Array.from(this.Players.keys()),
            })
        }
    })()

    Execute(cmd: ClientMessageRaw) {
        const {
            ID: user_id,
            Direction: user_direction,
        } = cmd.User

        if (!this.Players.has(user_id)) {
            this.AddUser(user_id)
        }

        const user_bubble = this.Bubbles.get(user_id)
        if (String(user_direction) != '0,0') {
            user_bubble.Direction = user_direction
            user_bubble.Speed = GetSpeedByRadius(user_bubble.Radius)
        }
    }

    AddUser(user_id: string) {
        let user_bubble_coordinate: [number, number]

        while (true) {
            const [x, y] = [(Math.random() - 0.5) * MAP_WIDTH, (Math.random() - 0.5) * MAP_HEIGHT]
            let trial_bubble = new Bubble('', PLAYER_INIT_RADIUS, [x, y])

            let is_candidate = true
            for (const eater of this.Bubbles.values()) {
                if (eater.TryEat(trial_bubble)) {
                    is_candidate = false
                    break
                }
            }

            if (is_candidate) {
                user_bubble_coordinate = [x, y]
                break
            }
        }

        const player = new Player(new Bubble(user_id, PLAYER_INIT_RADIUS, user_bubble_coordinate))
        this.Bubbles.set(user_id, player.Bubble)
        this.Players.set(user_id, player)
        console.log(`Added new player: ID=${user_id}`)
    }

    MoveAllBubbles(delta_sec: number) {
        for (const user_id of this.Players.keys()) {
            this.Bubbles.get(user_id).Move(delta_sec)
        }
    }

    LetBubblesEatEachOther(): ReadonlySet<string> {
        const dead_bubbles = new Set<string>

        for (const user_id of this.Players.keys()) {
            const eater = this.Bubbles.get(user_id)
            for (const eaten of this.Bubbles.values()) {
                if (eater.TryEat(eaten)) {
                    dead_bubbles.add(eaten.ID)
                }
            }
        }

        return dead_bubbles
    }
}
