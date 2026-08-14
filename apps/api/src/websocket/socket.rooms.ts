import { WebSocket } from 'ws'

export type AuthenticatedWebSocket = WebSocket & {
  userId: string
  isAlive: boolean
}

const rooms = new Map<
  string,
  Set<AuthenticatedWebSocket>
>()

const getOrCreateRoom = (
  userId: string
): Set<AuthenticatedWebSocket> => {
  let room = rooms.get(userId)

  if (!room) {
    room = new Set()
    rooms.set(userId, room)
  }

  return room
}

export const addConnection = (
  userId: string,
  ws: AuthenticatedWebSocket
): void => {
  const room = getOrCreateRoom(userId)

  room.add(ws)
}

export const removeConnection = (
  userId: string,
  ws: AuthenticatedWebSocket
): void => {
  const room = rooms.get(userId)

  if (!room) {
    return
  }

  room.delete(ws)

  if (room.size === 0) {
    rooms.delete(userId)
  }
}

export const broadcastToUser = (
  userId: string,
  message: object
): void => {
  const room = rooms.get(userId)

  if (!room) {
    return
  }

  const payload = JSON.stringify(message)

  for (const ws of room) {
    if (ws.readyState !== WebSocket.OPEN) {
      continue
    }

    ws.send(payload)
  }
}

export const getRoomSize = (
  userId: string
): number => {
  return rooms.get(userId)?.size ?? 0
}