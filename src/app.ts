import console from 'console'
import { agent } from './agent'
import { agent as agent2 } from './agent2'
import { KeyType, OutOfBandState, TypedArrayEncoder } from '@aries-framework/core'

async function app() {
  await agent.initialize()
  await agent2.initialize()
  agent.config.logger.info('Agents initialized!')

  const issuerId = `did:indy:bcovrin:test:A4CYPASJYRZRt98YWrac3H`
  await agent.dids.import({
    did: issuerId,
    overwrite: true,
    privateKeys: [
      {
        keyType: KeyType.Ed25519,
        privateKey: TypedArrayEncoder.fromString('asdfasdf000000000000000000000000'),
      },
    ],
  })

  const linkSecretIds = await agent.modules.anoncreds.getLinkSecretIds()
  if (linkSecretIds.length === 0) {
    await agent.modules.anoncreds.createLinkSecret()
  }
  const { schemaState } = await agent.modules.anoncreds.registerSchema({
    schema: {
      issuerId,
      attrNames: ['a'],
      name: 'test',
      version: `1.${Math.random()}`,
    },
    options: {},
  })

  const { credentialDefinitionState } = await agent.modules.anoncreds.registerCredentialDefinition({
    credentialDefinition: {
      issuerId,
      schemaId: schemaState.schemaId as string,
      tag: 'test',
    },
    options: {},
  })

  // Create out of band invitation

  const inv = await agent2.oob.createLegacyInvitation({
    autoAcceptConnection: true,
  })
  const { connectionRecord } = await agent.oob.receiveInvitation(inv.invitation)
  if (!connectionRecord) {
    throw new Error('Connection not found')
  }

  await agent.connections.returnWhenIsConnected(connectionRecord.id)
  const credentialRecord = await agent.credentials.offerCredential({
    connectionId: connectionRecord.id,
    credentialFormats: {
      anoncreds: {
        attributes: [
          {
            name: 'a',
            value: 'b',
          },
        ],
        credentialDefinitionId: credentialDefinitionState.credentialDefinitionId as string,
      },
    },
    protocolVersion: 'v2',
  })
}

app()
