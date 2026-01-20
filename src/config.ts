export const WEBSOCKET_PORT = 6666

export const GAME_TICKS = 10

export const [MAP_WIDTH, MAP_HEIGHT] = [500, 500]

export const PLAYER_INIT_RADIUS = 10

export const INIT_NUM_NPC_BUBBLES = Math.floor(
    (MAP_WIDTH * MAP_HEIGHT) / (PLAYER_INIT_RADIUS ** 2) / 40
)
