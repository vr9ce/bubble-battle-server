export const WEBSOCKET_PORT = 6666

export const GAME_TICKS = 10

export const [MAP_WIDTH, MAP_HEIGHT] = [500, 500]
export const [X_MAX, Y_MAX] = [MAP_WIDTH, MAP_HEIGHT].map(v => v / 2)

export const PLAYER_INIT_RADIUS = 10

export const INIT_NUM_NPC_BUBBLES = Math.floor(
    (MAP_WIDTH * MAP_HEIGHT) / (PLAYER_INIT_RADIUS ** 2) / 40
)

export const STOMACH_RADIUS_RATIO = 0.6
// 另一个气泡的圆心进入到当前气泡圆心的这个比例位置时, 视为被吃掉.
