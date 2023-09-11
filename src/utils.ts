export const repoUrlToFullName = (url: string) => {
  const repo = url.replace('https://github.com/', '')
  const [user, repoName] = repo.split('/')
  return { user, repoName }
}
