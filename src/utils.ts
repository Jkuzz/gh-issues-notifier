export const parseRepoUrl = (url: string) => {
  const repo = url.replace('https://github.com/', '').replace('https://api.github.com/repos/', '')
  const [user, repoName] = repo.split('/')
  return { user, repoName }
}
