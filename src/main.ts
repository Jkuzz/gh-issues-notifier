// Cheerio - The fast, flexible & elegant library for parsing and manipulating HTML and XML (Read more at https://cheerio.js.org/).
import * as cheerio from 'cheerio'
// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/).
import { Actor, log } from 'apify'
import { Octokit } from 'octokit'
import { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods'
import { sendSlackNotification } from './slackMessage.js'
import { createSlackMessageBlocks } from './slackBlocks.js'
import { parseRepoNameOrUrl } from './utils.js'
import { createObjectDigest } from './hash.js'

// Extracts element type from array type
export type ArrElement<ArrType> = ArrType extends readonly (infer ElementType)[]
  ? ElementType
  : never
export type Issue = RestEndpointMethodTypes['issues']['listForRepo']['response']

interface Input {
  searchRepos: string[]
  searchKeywords: string[]
  slackToken?: string
  slackChannel?: string
}

const KV_STORE_NAME = 'gh-issues-notifier-state'

/**
 * Checks whether or not the issue is relevant.
 * Looks for search keywords in the title or body of the issue.
 * @param issue to check
 * @param searchKeywords keywords to look for
 * @returns true if the issue is relevant
 */
const checkIssueRelevant = (issue: ArrElement<Issue['data']>, searchKeywords: string[]) => {
  if (!issue || issue.state !== 'open') {
    return false
  }

  for (let keyword of searchKeywords) {
    if (issue.title.indexOf(keyword) > -1) {
      return true
    }
  }

  if (issue.body) {
    const $ = cheerio.load(issue.body)
    for (let keyword of searchKeywords) {
      if ($.text().indexOf(keyword) > -1) {
        return true
      }
    }
  }

  return false
}

/**
 * Discover all issues that are deemed relevant and were not reported yet.
 * Goes through all the provided GH repositories and looks at the issue text
 * @param repoUrls urls of repos to search
 * @param searchKeywords keywords to match in the search
 * @param checkedFilter lambda to filter out issues that were already reported
 * @throws when octokit issues fail to fetch
 * @returns list of repos, each as a list of issues
 */
const findRelevantNewIssues = async (
  repoUrls: string[],
  searchKeywords: string[],
  checkedFilter: (potentialNewIssue: ArrElement<Issue['data']>) => boolean
) => {
  let outputs: Issue['data'] = []
  for (let url of repoUrls) {
    let repoInfo
    try {
      repoInfo = parseRepoNameOrUrl(url)
    } catch (e) {
      if (e instanceof Error) {
        log.error(e.message)
      }
      continue
    }
    const repoIssues = await octokit.rest.issues.listForRepo({
      owner: repoInfo.user,
      repo: repoInfo.repoName,
    })

    const relevantIssues = repoIssues.data
      .filter(checkedFilter)
      .filter((issue) => checkIssueRelevant(issue, searchKeywords))

    if (relevantIssues.length === 0) {
      continue // no relevant issues, next repo
    }
    outputs = outputs.concat(relevantIssues)
  }
  return outputs
}

/**
 * Checks the data store for whether or not the issue was already reported.
 * @param potentialNewIssue Issue to check
 * @param lastCheckedAt timestamp of when the issues were last checked
 * @returns true if issue was not reported yet
 */
const checkIssueNotReported = (
  potentialNewIssue: ArrElement<Issue['data']>,
  lastCheckedAt: number
) => {
  return Date.parse(potentialNewIssue.created_at) > lastCheckedAt
}

const findAndReportIssues = async (input: Input) => {
  const reportedIssuesStore = await Actor.openKeyValueStore(KV_STORE_NAME)
  const actorInstanceHash = await createObjectDigest(input)
  const lastCheckedAt = +((await reportedIssuesStore.getValue(actorInstanceHash)) || '0')
  const currentCheckedAt = Date.now()

  // Closure filter function with last checked timestamp
  const issueAlreadyCheckedFilter = (potentialNewIssue: ArrElement<Issue['data']>) => {
    return checkIssueNotReported(potentialNewIssue, lastCheckedAt)
  }

  let newIssues: Awaited<ReturnType<typeof findRelevantNewIssues>>
  try {
    newIssues = await findRelevantNewIssues(searchRepos, searchKeywords, issueAlreadyCheckedFilter)
  } catch (_e) {
    log.error(
      'Error fetching issues from GitHub. One of your selected repos is likely misspelled or private.'
    )
    return
  }

  log.info(`Saving current actor information under hash [${actorInstanceHash}]`)
  reportedIssuesStore.setValue(actorInstanceHash, currentCheckedAt)

  if (newIssues.length > 0) {
    log.info(`Discovered ${newIssues.length} new issues.`)
  } else {
    log.info('No new issues discovered.')
    return
  }

  if (input.slackChannel && input.slackToken) {
    log.info(`Sending Slack notification with new issues.`)
    const messagePromises = newIssues.map((newIssue) => {
      const slackMessageBlocks = createSlackMessageBlocks(newIssue)
      return sendSlackNotification({
        token: input.slackToken!,
        channel: input.slackChannel!,
        blocks: slackMessageBlocks,
      })
    })
    Promise.all(messagePromises)
  }

  // Save headings to Dataset - a table-like storage.
  await Actor.pushData(newIssues)
}

// The init() call configures the Actor for its environment. It's recommended to start every Actor with an init().
await Actor.init()

// Structure of input is defined in input_schema.json
const input = await Actor.getInput<Input>()
if (!input) throw new Error('Input is missing!')
const { searchRepos, searchKeywords } = input

if (!searchRepos || searchRepos.length === 0) {
  log.error('No repositories provided!')
}
if (!searchKeywords || searchKeywords.length === 0) {
  log.error('No search keywords provided!')
}

const octokit = new Octokit({})

await findAndReportIssues(input)

// Gracefully exit the Actor process. It's recommended to quit all Actors with an exit().
await Actor.exit()
