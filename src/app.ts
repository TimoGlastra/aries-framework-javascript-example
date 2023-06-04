import { connect } from 'ngrok'
import { agent } from './agent'
import * as QRCode from 'qrcode'
import { server } from './server'
import { OutOfBandState } from '@aries-framework/core'

async function app() {
  await agent.initialize()
  agent.config.logger.info('Agent initialized!')

  // expose agent port to ngrok and set the agent to use the ngrok url
  const ngrokUrl = await connect(6006)
  agent.config.endpoints = [ngrokUrl]

  server.get('/s/:invitationId', async (req, res) => {
    const outOfBandRecord = await agent.oob.findByCreatedInvitationId(req.params.invitationId)

    if (!outOfBandRecord || outOfBandRecord.state !== OutOfBandState.AwaitResponse)
      return res.status(404).send('Not found')

    const invitationJson = outOfBandRecord.outOfBandInvitation.toJSON({ useDidSovPrefixWhereAllowed: true })

    return res.header('Content-Type', 'application/json').send(invitationJson)
  })

  // Create out of band invitation
  const { outOfBandInvitation } = await agent.oob.createInvitation()

  // Create short url for invitation
  const shortUrl = `${ngrokUrl}/s/${outOfBandInvitation.id}`
  const qrInvitation = await QRCode.toString(shortUrl, { type: 'terminal' })

  console.log(qrInvitation)
  console.log(shortUrl)
}

app()
