type Coordinate = [number, number]
// [x, y], 原点在窗口中心, x>0在上方, y>0在右侧.

type Direction = [number, number]
// 表示气泡当前的运动方向.
// Server-side 手动归一化.

type BubbleBody = {
  Radius: number,
  Ate: string[],  // 吃了的气泡的 ID, 每吃一个在后面追加一个.
  EatenBy?: string,  // 表示被谁吃了.
}

type ClientMessageRaw = {
  User: {
    ID: string,  // 客户端随机生成
    Direction: Direction,
    Skin?: any,  // 客户端内部使用
  }
}

type ClientMessage = {
  Timestamp: number,  // UNIX 时间戳, 毫秒.
} & ClientMessageRaw

type Kinematic = {
  Coordinate: Coordinate,
  Direction: Direction,
  Speed: number,
}

type Bubble = {
  ID: string,
  Body: BubbleBody,
  Kinematic: Kinematic,
}

type ServerMessageRaw = {
  Bubbles: Record<string, Bubble & {Skin?: any}>,
  Players: string[],
}

type ServerMessage = {
  Timestamp: number
} & ServerMessageRaw
