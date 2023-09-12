export const parseRepoNameOrUrl = (nameOrUrl: string) => {
  const repo = nameOrUrl.replace('https://github.com/', '').replace('https://api.github.com/repos/', '')
  const splitRepoName = repo.split('/')
  if (splitRepoName.length !== 2) {
    throw new Error('Invalid repo name provided')
  }
  const [user, repoName] = splitRepoName
  return { user, repoName }
}
