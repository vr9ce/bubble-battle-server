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
    USER_DIRECTION_MAX_STAGNATION_TIME,
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

        this.Direction = [dx/len, dy/len]
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

    last_cmd_timestamp: number = 0  // UNIX epoch (seconds)
    private cmd_buffer: ClientMessageRaw[] = []  // Each tick start, only use the latest command, others are discarded.
    BufferCommand(cmd: ClientMessageRaw) {
        this.cmd_buffer.push(cmd)
    }
    Execute() {
        const now = Date.now() / 1000

        if (this.cmd_buffer.length == 0) {
            if (now - this.last_cmd_timestamp > USER_DIRECTION_MAX_STAGNATION_TIME) {
                this.Bubble.Direction = [0, 0]
                this.Bubble.Speed = 0
            }
            return
        }

        this.last_cmd_timestamp = now
        const cmd = this.cmd_buffer[this.cmd_buffer.length - 1]
        this.cmd_buffer = []

        const {
            Direction: user_direction,
        } = cmd.User

        if (String(user_direction) != '0,0') {
            this.Bubble.Direction = user_direction
            this.Bubble.Speed = GetSpeedByRadius(this.Bubble.Radius)
        }
    }

    AdvanceToNextFrame(delta_sec: number) {
        this.Bubble.Move(delta_sec)
        this.Execute()
    }
}

export class Game {
    readonly Bubbles = new Map<string, Bubble>
    readonly Players = new Map<string, Player>
    readonly Updater: (msg: ServerMessageRaw) => void

    constructor(status_reporter: typeof this.Updater) {
        this.GenerateNPC(INIT_NUM_NPC_BUBBLES)
        this.Updater = status_reporter
    }

    Start() {
        setInterval(
            () => this.AdvanceToNextFrame(),
            GAME_TICK_PERIOD_MS
        )
    }

    GetNPCs(): ReadonlySet<string> {
        const npc_ids = new Set<string>
        for (const id of this.Bubbles.keys()) {
            if (!this.Players.has(id)) {
                npc_ids.add(id)
            }
        }
        return npc_ids
    }

    GenerateNPC(n: number) {
        n = Math.floor(n)

        while (n--) {
            const id = 'NPC.' + Math.random().toString(36).slice(2)
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
    }

    GetLivedNPCs(): ReadonlySet<string> {
        const lived_npc_ids = new Set<string>
        for (const id of this.GetNPCs()) {
            const bubble = this.Bubbles.get(id)
            if (bubble.EatenBy == undefined) {
                lived_npc_ids.add(id)
            }
        }
        return lived_npc_ids
    }

    GetLivedPlayers(): ReadonlySet<string> {
        const lived_player_ids = new Set<string>
        for (const id of this.Players.keys()) {
            const bubble = this.Bubbles.get(id)
            if (bubble.EatenBy == undefined) {
                lived_player_ids.add(id)
            }
        }
        return lived_player_ids
    }

    AdvanceToNextFrame = (() => {
        let last_timestamp = Date.now()

        return () => {
            const current_timestamp = Date.now()
            const delta_sec = (current_timestamp - last_timestamp) / 1000
            last_timestamp = current_timestamp

            for (const player of this.Players.values()) {
                player.AdvanceToNextFrame(delta_sec)
            }
            this.LetBubblesEatEachOther()

            if (this.NeedMoreNPC()) {
                this.GenerateNPC(INIT_NUM_NPC_BUBBLES * Math.random())
            }

            this.Updater({
                Bubbles: Object.fromEntries([...this.Bubbles].map(([id, bubble]) => [id, bubble.Dump()])),
                Players: Array.from(this.Players.keys()),
            })
        }
    })()

    NeedMoreNPC(): boolean {
        const a = this.GetLivedNPCs().size/this.GetLivedPlayers().size < 5
        const b = this.GetLivedNPCs().size < INIT_NUM_NPC_BUBBLES/2

        return a || b
    }

    Execute(cmd: ClientMessageRaw) {
        const {
            ID: user_id,
        } = cmd.User

        if (!this.Players.has(user_id)) {
            this.AddUser(user_id)
        }
        this.Players.get(user_id).BufferCommand(cmd)
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
