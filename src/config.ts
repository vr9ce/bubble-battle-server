export const WEBSOCKET_PORT = 16666

export const GAME_TICKS = 5
export const GAME_TICK_PERIOD_MS = 1000 / GAME_TICKS

export const [MAP_WIDTH, MAP_HEIGHT] = function(x: number, y: number) {
    return [Math.max(x, y), Math.min(x, y)]
}(2000, 2000)
export const [X_MAX, Y_MAX] = [MAP_WIDTH, MAP_HEIGHT].map(v => v / 2)
export const MAX_BUBBLE_RADIUS = MAP_HEIGHT

export const PLAYER_INIT_RADIUS = 10

export const INIT_NUM_NPC_BUBBLES = Math.floor(
    (MAP_WIDTH * MAP_HEIGHT) / (PLAYER_INIT_RADIUS ** 2) / 200
)

export const STOMACH_RADIUS_RATIO = 0.6
// 另一个气泡的圆心进入到当前气泡圆心的这个比例位置时, 视为被吃掉.

// 半径越大, 速度越慢.
export function GetSpeedByRadius(radius: number): number {
    const [MIN_SPEED, MAX_SPEED] = [5, 50]

    const speed = MAX_SPEED - radius/MAX_BUBBLE_RADIUS * (MAX_SPEED - MIN_SPEED)
    return speed
}
