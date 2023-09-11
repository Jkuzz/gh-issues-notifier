// Cheerio - The fast, flexible & elegant library for parsing and manipulating HTML and XML (Read more at https://cheerio.js.org/).
import * as cheerio from 'cheerio'
// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/).
import { Actor, log } from 'apify'
import { Octokit } from 'octokit'
import { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods'
import { sendSlackNotification } from './slackMessage.js'
import { createSlackMessageBlocks } from './slackBlocks.js'
import { parseRepoUrl } from './utils.js'

// Extracts element type from array type
export type ArrElement<ArrType> = ArrType extends readonly (infer ElementType)[]
  ? ElementType
  : never
export type Issue = RestEndpointMethodTypes['issues']['listForRepo']['response']

// The init() call configures the Actor for its environment. It's recommended to start every Actor with an init().
await Actor.init()

interface Input {
  searchRepos: string[]
  searchKeywords: string[]
  slackToken?: string
  slackChannel?: string
}

const checkIssueRelevant = (issue: ArrElement<Issue['data']>, searchKeywords: string[]) => {
  if (!issue || issue.state !== 'open' || !issue.body) {
    return false
  }

  const $ = cheerio.load(issue.body)
  for (let keyword of searchKeywords) {
    if ($.text().indexOf(keyword) > -1) {
      return true
    }
  }
  return false
}

/**
 * Discover all issues that are deemed relevant.
 * Goes through all the provided GH repositories and looks at the issue text
 * @param repoUrls urls of repos to search
 * @param searchKeywords keywords to match in the search
 * @returns list of repos, each as a list of issues
 */
const findRelevantIssues = async (repoUrls: string[], searchKeywords: string[]) => {
  const outputs: Issue['data'][] = []
  for (let url of repoUrls) {
    const repoInfo = parseRepoUrl(url)
    const repoIssues = await octokit.rest.issues.listForRepo({
      owner: repoInfo.user,
      repo: repoInfo.repoName,
    })

    const relevantIssues = repoIssues.data.filter((issue) =>
      checkIssueRelevant(issue, searchKeywords)
    )

    if (relevantIssues.length === 0) {
      console.log('no issues')
      continue // no relevant issues, next repo
    }
    outputs.push(relevantIssues)
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

// Structure of input is defined in input_schema.json
const input = await Actor.getInput<Input>()
if (!input) throw new Error('Input is missing!')
const { searchRepos, searchKeywords } = input
const octokit = new Octokit({})

const reportedIssuesStore = await Actor.openKeyValueStore('reported-issues')
const lastCheckedAtDate = (await reportedIssuesStore.getValue('lastCheckedAt')) || '0'
const lastCheckedAt = +lastCheckedAtDate
reportedIssuesStore.setValue('lastCheckedAt', Date.now())

const relevantIssues = await findRelevantIssues(searchRepos, searchKeywords)
const reposWithNewIssues = relevantIssues
  // For each repo, filter out issues that were already reported
  .map((repoFoundIssues) => {
    return repoFoundIssues.filter((potentialNewIssue) =>
      checkIssueNotReported(potentialNewIssue, lastCheckedAt)
    )
  })
  // filter out repos with no new issues
  .filter((repoIssues) => repoIssues.length > 0)

if (reposWithNewIssues.length > 0) {
  log.info(`Discovered ${reposWithNewIssues.flat().length} new issues in ${reposWithNewIssues.length} repositories.`)
} else {
  log.info('No new issues discovered.')
}

if (reposWithNewIssues.length > 0 && input.slackChannel && input.slackToken) {
  log.info(`Sending Slack notification with new issues.`)
  const slackMessageBlocks = createSlackMessageBlocks(reposWithNewIssues)
  await sendSlackNotification({
    token: input.slackToken,
    channel: input.slackChannel,
    blocks: slackMessageBlocks,
  })
}

// Save headings to Dataset - a table-like storage.
await Actor.pushData({ issues: reposWithNewIssues })

// Gracefully exit the Actor process. It's recommended to quit all Actors with an exit().
await Actor.exit()
