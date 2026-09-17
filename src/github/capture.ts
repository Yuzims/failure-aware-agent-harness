import { extractPullRequestNumbers } from "./normalize.js";
import type { GitHubDataProvider } from "./provider.js";
import {
  GITHUB_SOURCE,
  SNAPSHOT_SCHEMA_VERSION,
  UNTRUSTED,
  type CommitSnapshot,
  type InvestigationSnapshot,
} from "./types.js";

export async function captureInvestigationSnapshot(
  provider: GitHubDataProvider,
  input: {
    snapshotId: string;
    owner: string;
    repo: string;
    issueNumber: number;
    pullNumbers?: number[];
    createdAt?: string;
  },
): Promise<InvestigationSnapshot> {
  const owner = input.owner;
  const repo = input.repo;
  const retrievedAt = input.createdAt ?? new Date().toISOString();
  const repositoryData = await provider.getRepository({ owner, repo });
  const issue = await provider.getIssue({ owner, repo, issueNumber: input.issueNumber });
  const comments = await provider.getIssueComments({ owner, repo, issueNumber: input.issueNumber });
  const timeline = await provider.getIssueTimeline({
    owner,
    repo,
    issueNumber: input.issueNumber,
  });
  const pullNumbers = input.pullNumbers ?? extractPullRequestNumbers(timeline);
  const pullRequests: InvestigationSnapshot["pullRequests"] = {};
  const reviews: InvestigationSnapshot["reviews"] = {};
  const files: InvestigationSnapshot["files"] = {};
  const commits: InvestigationSnapshot["commits"] = {};
  const commitIndex: InvestigationSnapshot["commitIndex"] = {};

  for (const pullNumber of pullNumbers) {
    const pr = await provider.getPullRequest({ owner, repo, pullNumber });
    pullRequests[String(pullNumber)] = pr;
    reviews[String(pullNumber)] = await provider.getPullRequestReviews({ owner, repo, pullNumber });
    files[String(pullNumber)] = await provider.getPullRequestFiles({ owner, repo, pullNumber });
    const prCommits = await provider.listCommits({ owner, repo, pullNumber });
    commits[`pr:${pullNumber}`] = prCommits;
    indexCommits(commitIndex, prCommits);
  }

  const repoCommits = await provider.listCommits({ owner, repo });
  commits.repo = repoCommits;
  indexCommits(commitIndex, repoCommits);

  return {
    snapshotId: input.snapshotId,
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    createdAt: retrievedAt,
    source: GITHUB_SOURCE,
    owner,
    repository: repo,
    issueNumber: input.issueNumber,
    retrievedAt,
    trust: UNTRUSTED,
    repositoryData,
    issue,
    comments,
    timeline,
    pullRequests,
    reviews,
    files,
    commits,
    commitIndex,
  };
}

function indexCommits(index: Record<string, CommitSnapshot>, commits: CommitSnapshot[]): void {
  for (const commit of commits) {
    if (commit.sha) {
      index[commit.sha] = commit;
    }
  }
}
