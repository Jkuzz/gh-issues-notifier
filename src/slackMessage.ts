import { ApifyClient } from 'apify'

const SLACK_ACTOR_ID = 'katerinahronik/slack-message'
const MESSAGE_TEXT = 'New GitHub issue was discovered!'

type SlackIntegration = {
  channel: string
  token: string
  blocks: object[]
}

/**
 * Send a slack notification containing the provided message data.
 * Uses the Apify Actor katerinahronik/slack-message
 * @param slackIntegration connection data for the Slack integration
 * @returns promise of slack actor call
 */
export const sendSlackNotification = async (slackIntegration: SlackIntegration) => {
  const apifyClient = new ApifyClient({ token: process.env.APIFY_TOKEN })
  const slackActorClient = apifyClient.actor(SLACK_ACTOR_ID)

  const slackActorInput = {
    token: slackIntegration.token,
    channel: slackIntegration.channel,
    text: MESSAGE_TEXT,
    blocks: slackIntegration.blocks,
  }

  return slackActorClient.call(slackActorInput)
}
