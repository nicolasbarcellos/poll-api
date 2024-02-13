import { randomUUID } from 'node:crypto'
import { FastifyInstance } from 'fastify'
import z from 'zod'
import { prisma } from '../../lib/prisma'
import { redis } from '../../lib/redis'
import { voting } from '../../utils/voting-pub-sub'

async function voteOnPoll(app: FastifyInstance) {
  app.post('/:pollId/votes', async (req, reply) => {
    const getReqParamsSchema = z.object({
      pollId: z.string().uuid(),
    })

    const voteOnPollBodySchema = z.object({
      pollOptionId: z.string().uuid(),
    })

    const { pollOptionId } = voteOnPollBodySchema.parse(req.body)
    const { pollId } = getReqParamsSchema.parse(req.params)

    let { sessionId } = req.cookies

    if (sessionId) {
      const userPreviousVoteOnPoll = await prisma.vote.findUnique({
        where: {
          sessionId_pollId: {
            sessionId,
            pollId,
          },
        },
      })

      if (
        userPreviousVoteOnPoll &&
        userPreviousVoteOnPoll.pollOptionId !== pollOptionId
      ) {
        await prisma.vote.delete({
          where: {
            id: userPreviousVoteOnPoll.id,
          },
        })

        const votes = await redis.zincrby(
          pollId,
          -1,
          userPreviousVoteOnPoll.pollOptionId,
        )

        voting.publish(pollId, {
          pollOptionId: userPreviousVoteOnPoll.pollOptionId,
          votes: Number(votes),
        })
      } else if (userPreviousVoteOnPoll) {
        return reply
          .status(400)
          .send({ error: 'You already voted on this poll' })
      }
    }

    if (!sessionId) {
      sessionId = randomUUID()

      reply.setCookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days to expire
        signed: true, // user nao consegue mudar o valor do cookie manualmente
        httpOnly: true, // the user only be able to access in back-end enviroment
      })
    }

    await prisma.vote.create({
      data: {
        sessionId,
        pollId,
        pollOptionId,
      },
    })

    const votes = await redis.zincrby(pollId, 1, pollOptionId) // incrementa em 1 o ranking da opção dentro da enquete

    voting.publish(pollId, {
      pollOptionId,
      votes: Number(votes),
    })

    return reply.status(201).send()
  })
}

export default voteOnPoll
