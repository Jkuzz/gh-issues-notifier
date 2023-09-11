# Github Issue Notifier
This actor watches the selected GitHub repositories for new issues containing at least one of the selected keywords. The discovered issues are output into the default dataset and, if configured, sent as Slack messages. Finds all existing issues on first run and only new ones since the last search on subsequent runs. Issue edits are not accounted for.

## How to run
To run the actor, you'll need an Apify account. Simply create a new task for the actor by clicking the green button above, modify the actor input configuration, click Run and get your results. To get the Slack token, please follow the instructions on Slack help center.
