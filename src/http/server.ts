import fastify from 'fastify'
import cookie from '@fastify/cookie'
import websocket from '@fastify/websocket'

import createPoll from './routes/create-poll'
import getPoll from './routes/get-poll'
import voteOnPoll from './routes/vote-on-poll'
import { pollResults } from '../ws/poll-results'

const app = fastify()

app.register(cookie, {
  secret: 'polls-app-nlw',
  hook: 'onRequest',
})

app.register(websocket)

app.register(createPoll, {
  prefix: 'polls',
})

app.register(getPoll, {
  prefix: 'polls',
})

app.register(voteOnPoll, {
  prefix: 'polls',
})

app.register(pollResults, {
  prefix: 'polls',
})

app.listen({ port: 3333 }).then(() => console.log('http server running'))
