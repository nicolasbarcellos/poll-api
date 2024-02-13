import { FastifyInstance } from 'fastify'
import { voting } from '../utils/voting-pub-sub'
import z from 'zod'

// requisição continua
export async function pollResults(app: FastifyInstance) {
  app.get('/:pollId/results', { websocket: true }, (connection, req) => {
    // Subscribe only to messages posted in the channel with the poll ID

    const getReqParamsSchema = z.object({
      pollId: z.string().uuid(),
    })

    const { pollId } = getReqParamsSchema.parse(req.params)

    voting.subscribe(pollId, (message) => {
      connection.socket.send(JSON.stringify(message))
    })
  })
}
