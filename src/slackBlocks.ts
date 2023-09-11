import type { Issue, ArrElement } from './main.js'

/**
 * Create Slack blocks detailing the newly discovered issue.
 * https://api.slack.com/block-kit/building
 * @param newIssue issue to make message for, as returned by octokit
 * @returns Slack message Blocks summarising the new issue
 */
export const createSlackMessageBlocks = (newIssue: ArrElement<Issue['data']>) => {
  let blocks: object[] = createTitleBlocks()
  blocks = blocks.concat(createIssueBlocks(newIssue))
  return blocks
}

/**
 * Create Slack blocks for the title of the Slack message
 * @returns slack blocks
 */
const createTitleBlocks = () => {
  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'New GitHub issue was discovered! 🔎',
        emoji: true,
      },
    },
  ]
}

/**
 * Create Slack blocks for an individual issue.
 * @returns slack blocks
 */
const createIssueBlocks = (issue: ArrElement<Issue['data']>) => {
  return [
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `<${issue.url}|${issue.title}>`,
        },
        // {
        //   type: 'mrkdwn',
        //   text: '*Keywords:*\nTODO',
        // },
      ],
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Created:*\n${issue.created_at}`,
        },
        {
          type: 'mrkdwn',
          text: `*Author:*\n<${issue.user?.url}|${issue.user?.login}>`,
        },
      ],
    },
  ]
}
