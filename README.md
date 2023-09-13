
Github Issue Notifier is built to **watch the selected GitHub repositories for new issues containing at least one of the selected keywords**. The discovered issues are output into the default dataset and, if configured, sent as Slack messages. Finds all existing issues on first run and only new ones since the last search on subsequent runs. Issue edits are not accounted for.

## Input

To run this Actor, you'll need at least one Github repository and a Slack API token. You can get the token by following the instructions on the [Slack tutorials page](https://api.slack.com/tutorials/tracks/getting-a-token). Here's the full input that you'll need:

- URLs or repository names of repositories you want to monitor.
- Keywords that will be looked for in the titles and bodies of new issues.
- Slack channel where the notification with Github issues information will be sent (e.g. #notifications).
- Slack API token in a format xoxp-xxxxxxxxx-xxxx.

<img width="75%" src="https://i.imgur.com/MvFetS7.png" />

## Output

Each run of this Actor outputs an array of new issues. The issue objects are what GitHub's Octokit API returns, see more at [their docs](https://docs.github.com/en/rest/issues/issues?apiVersion=2022-11-28#list-repository-issues).

## How to run Github Issue Notifier

1. Get a free Apify account.
2. Create a new task.
3. Modify the Actor input configuration as needed: add GitHub repository names, keywords, Slack API token and channel.
4. Click the Start button.
5. Get your notified in the respective channel whenever an event in GitHub repository occurs.

## Want to automate Slack notifications or track GitHub issues?

You can use the simple automation tools below. Some of them are built for relevant Slack notification case that you can set up for GitHub, Toggl, or other platforms. Some of them are built specifically for GitHub. Feel free to browse them:

<table>
  <tr>
    <td>💌 <a href="https://apify.com/katerinahronik/slack-message">Slack Message Generator</a></td>
    <td>👀 <a href="https://apify.com/zuzka/slack-messages-downloader">Slack Messages Downloader</a></td>
  </tr>
  <tr>
    <td>⚠️ <a href="https://apify.com/lukaskrivka/github-issues-to-spreadsheet">Github Issues Tracker</a></td>
    <td>🏅 <a href="https://apify.com/mihails/github-champion">Github Champion Scraper</a></td>
  </tr>
</table>

