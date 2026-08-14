import IORedis from 'ioredis'
import { env } from '../config/env'
import { broadcastToUser } from '../websocket/socket.rooms'

const createClient = () =>
  new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null
})

const publisher = createClient()
const subscriber = createClient()

export const getUserChannel = (
  userId: string
): string => {
  return `usage:${userId}`
}

const publish = async (
  userId: string,
  type: string,
  data: object
): Promise<void> => {
  await publisher.publish(
    getUserChannel(userId),

    JSON.stringify({
      type,
      data
    })
  )
}

export const publishUsageUpdate = (
  userId: string,
  data: object
): Promise<void> => {
  return publish(
    userId,
    'USAGE_UPDATE',
    data
  )
}

export const publishAlertTriggered = (
  userId: string,
  data: object
): Promise<void> => {
  return publish(
    userId,
    'ALERT_TRIGGERED',
    data
  )
}

export const initSubscriber = async (): Promise<void> => {
  await subscriber.psubscribe('usage:*')

  subscriber.on(
    'pmessage',
    (_pattern, channel, message) => {
      try {
        const userId = channel.replace(
          'usage:',
          ''
        )

        broadcastToUser(
          userId,
          JSON.parse(message)
        )
      } catch (error) {
        console.error(
          '[PubSub] Failed to process message:',
          error
        )
      }
    }
  )

  console.log(
    '[PubSub] Subscriber initialized'
  )
}

export const closePubSub = async (): Promise<void> => {
  await Promise.all([
    publisher.quit(),
    subscriber.quit()
  ])
}