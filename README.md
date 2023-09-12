# Github Issue Notifier

This actor watches the selected GitHub repositories for new issues containing at least one of the selected keywords. The discovered issues are output into the default dataset and, if configured, sent as Slack messages. Finds all existing issues on first run and only new ones since the last search on subsequent runs. Issue edits are not accounted for.

## Input
|     Field     |   Type    |  Description |
|   ---------   |   ------  |   -------------  |
|searchKeywords | string[]  | URLs or repository names of repositories you want to monitor.|
|searchRepos    | string[]  | keywords that will be looked for in the titles and bodies of new issues. |
|slackChannel   | string    | Channel where the notification with Github issues information will be sent (e.g. #general) |
|slackToken     | string    | Slack API token in a format xoxp-xxxxxxxxx-xxxx. |
## Output

Each run of this actor outputs an array of new issues. The issue objects are what github's Octokit API returns, see more at [their docs](https://docs.github.com/en/rest/issues/issues?apiVersion=2022-11-28#list-repository-issues).

## How to run

To run the actor, you'll need an Apify account. Simply create a new task for the actor by clicking the green button above, modify the actor input configuration, click Run and get your results. To get the Slack token, please follow the instructions on the [Slack tutorials page](https://api.slack.com/tutorials/tracks/getting-a-token).
