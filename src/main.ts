// Cheerio - The fast, flexible & elegant library for parsing and manipulating HTML and XML (Read more at https://cheerio.js.org/).
import * as cheerio from 'cheerio'
// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/).
import { Actor } from 'apify'
import { Octokit } from 'octokit'
import { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods'
import { sendSlackNotification } from './slackMessage.js'
import { createSlackMessageBlocks } from './slackBlocks.js'
import { repoUrlToFullName } from './utils.js'

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
 * Goes through all the provided GH repositories and looks at the
 * @param repoUrls
 * @param searchKeywords
 * @returns
 */
const findRelevantIssues = async (repoUrls: string[], searchKeywords: string[]) => {
  const outputs: Issue['data'][] = []
  for (let url of repoUrls) {
    const repoInfo = repoUrlToFullName(url)
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

// Structure of input is defined in input_schema.json
const input = await Actor.getInput<Input>()
if (!input) throw new Error('Input is missing!')
const { searchRepos, searchKeywords } = input
const octokit = new Octokit({})

const reportedIssuesStore = await Actor.openKeyValueStore('reported-issues')

const relevantIssues = await findRelevantIssues(searchRepos, searchKeywords)
const reposWithNewIssues = relevantIssues
  // For each repo, filter out issues that were already reported
  .map((repoFoundIssues) => {
    const newRepoIssues = repoFoundIssues.filter(async (potentialNewIssue) => {
      // TODO optimise this by saving timestamp of last report instead of list of reported issues
      const alreadyReported = await reportedIssuesStore.getValue(`${potentialNewIssue.id}`)
      if (alreadyReported) {
        return false
      }
      reportedIssuesStore.setValue(`${potentialNewIssue.id}`, { reported: true})
      return true
    })
    return newRepoIssues
  })
  // filter out repos with no new issues
  .filter((repoIssues) => repoIssues.length > 0)

if (reposWithNewIssues.length > 0 && input.slackChannel && input.slackToken) {
  const slackMessageBlocks = createSlackMessageBlocks(reposWithNewIssues)
  await sendSlackNotification({
    token: input.slackToken,
    channel: input.slackChannel,
    blocks: slackMessageBlocks,
  })
}

// Save headings to Dataset - a table-like storage.
await Actor.pushData(reposWithNewIssues)

// Gracefully exit the Actor process. It's recommended to quit all Actors with an exit().
await Actor.exit()
