// Cheerio - The fast, flexible & elegant library for parsing and manipulating HTML and XML (Read more at https://cheerio.js.org/).
import * as cheerio from 'cheerio'
// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/).
import { Actor } from 'apify'
import { Octokit } from 'octokit'
import { RestEndpointMethodTypes } from '@octokit/plugin-rest-endpoint-methods'
import { sendSlackNotification } from './slack'

// Extracts element type from array type
type ArrElement<ArrType> = ArrType extends readonly (infer ElementType)[] ? ElementType : never
type Issue = RestEndpointMethodTypes['issues']['listForRepo']['response']

// The init() call configures the Actor for its environment. It's recommended to start every Actor with an init().
await Actor.init()

interface Input {
  searchRepos: string[]
  searchKeywords: string[]
  slackToken?: string
  slackChannel?: string
}

const processRepoUrl = (url: string) => {
  const repo = url.replace('https://github.com/', '')
  const [user, repoName] = repo.split('/')
  return { user, repoName }
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

const findRelevantIssues = async (repoUrls: string[], searchKeywords: string[]) => {
  const outputs: { repo: string; issues: Issue['data'] }[] = []
  for (let url of repoUrls) {
    const repoInfo = processRepoUrl(url)
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
    outputs.push({
      repo: repoInfo.repoName,
      issues: relevantIssues,
    })
  }
  return outputs
}

// Structure of input is defined in input_schema.json
const input = await Actor.getInput<Input>()
if (!input) throw new Error('Input is missing!')
const { searchRepos, searchKeywords } = input
const octokit = new Octokit({})

const relevantIssues = await findRelevantIssues(searchRepos, searchKeywords)
const potentialOutputs = relevantIssues.flatMap((repoSearchResults) => {
  return repoSearchResults.issues.map((issue) => {
    return {
      repo: repoSearchResults.repo,
      url: issue.url,
      title: issue.title,
      author: issue.user?.login,
      createdAt: issue.created_at,
      id: issue.id,
    }
  })
})
const reportedIssuesStore = await Actor.openKeyValueStore('reported-issues')

const actorOutput = potentialOutputs.filter(async (potentialOutput) => {
  const alreadyReported = await reportedIssuesStore.getValue(`${potentialOutput.id}`)
  if (alreadyReported) {
    return false
  }
  reportedIssuesStore.setValue(`${potentialOutput.id}`, true)
  return true
})

if (actorOutput.length > 0 && input.slackChannel && input.slackToken) {
  await sendSlackNotification({ token: input.slackToken, channel: input.slackChannel })
}

// Save headings to Dataset - a table-like storage.
await Actor.pushData(actorOutput)

// Gracefully exit the Actor process. It's recommended to quit all Actors with an exit().
await Actor.exit()
