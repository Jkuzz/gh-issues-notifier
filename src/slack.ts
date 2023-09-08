const SLACK_ACTOR_ID = 'katerinahronik/slack-message'

import { ApifyClient, log } from 'apify'

type SlackIntegration = {
  channel: string,
  token: string,
}

export const sendSlackNotification = async (slackIntegration: SlackIntegration) => {
  const apifyClient = new ApifyClient({ token: process.env.APIFY_TOKEN })
  const slackActorClient = apifyClient.actor(SLACK_ACTOR_ID)
  
  const messageText = 'New relevant GitHub issues were discovered!'
  let messageBlocks = {}
  
  const slackActorInput = {
    token: slackIntegration.token,
    channel: slackIntegration.channel,
    text: messageText,
    blocks: messageBlocks,
  }

  log.info(`Slack notification:\n${JSON.stringify(messageBlocks)}`)
  await slackActorClient.call(slackActorInput)
}
