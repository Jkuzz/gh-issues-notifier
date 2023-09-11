import type { Issue, ArrElement } from "./main.js"
import { repoUrlToFullName } from "./utils.js"

/**
 * Create Slack blocks detailing the newly discovered issues for each repository.
 * https://api.slack.com/block-kit/building
 * @param reposWithNewIssues list of repositories, each as a list of issues
 * @returns Slack message Blocks summarising the new issues
 */
export const createSlackMessageBlocks = (reposWithNewIssues: Issue['data'][]) => {
  let blocks: object[] = createTitleBlocks()

  for (let repoIssues of reposWithNewIssues) {
    if (repoIssues.length === 0) {
      continue
    }
    const repoUrl = repoIssues[0].repository_url

    blocks = blocks.concat(createRepositoryBlocks(repoUrl))
    for (let issue of repoIssues) {
      blocks = blocks.concat(createIssueBlocks(issue))
    }
  }
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
        text: 'New GitHub issues were discovered!',
        emoji: true,
      },
    },
  ]
}

/**
 * Create Slack blocks for the title of the repository. Does not handle child issues.
 * @returns slack blocks
 */
const createRepositoryBlocks = (repoUrl: string) => {
  const repoFullName = repoUrlToFullName(repoUrl)
  return [
    {
      type: 'divider',
    },
    {
      type: 'header',
      text: {
        type: 'mrkdwn',
        text: `<${repoUrl}|${repoFullName}>`,
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
        {
          type: 'mrkdwn',
          text: '*Keywords:*\nTODO',
        },
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
    // {
    //   type: 'section',
    //   text: {
    //     type: 'mrkdwn',
    //     text: `<${issue.url}|View issue>`,
    //   },
    // },
  ]
}
