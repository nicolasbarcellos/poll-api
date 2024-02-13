import { FastifyInstance } from 'fastify'
import z from 'zod'
import { prisma } from '../../lib/prisma'
import { redis } from '../../lib/redis'

async function getPoll(app: FastifyInstance) {
  app.get('/:pollId', async (req, reply) => {
    const getReqParamsSchema = z.object({
      pollId: z.string().uuid(),
    })

    const { pollId } = getReqParamsSchema.parse(req.params)

    const poll = await prisma.poll.findUnique({
      where: {
        id: pollId,
      },
      include: {
        options: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    if (!poll) {
      return reply.status(400).send({ error: 'Poll not found' })
    }

    const result = await redis.zrange(pollId, 0, -1, 'WITHSCORES') // todas as opções

    const votes = result.reduce(
      (obj, att, index) => {
        if (index % 2 === 0) {
          obj[att] = Number(result[index + 1])
        }

        return obj
      },
      {} as Record<string, number>,
    )

    return reply.send({
      ...poll,
      options: poll.options.map((item) => {
        return {
          id: item.id,
          title: item.title,
          score: item.id in votes ? votes[item.id] : 0,
        }
      }),
    })
  })
}

export default getPoll
