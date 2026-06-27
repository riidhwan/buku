import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const marker = '<!-- buku-coverage-comment -->';
const summaryPath = process.argv[2] ?? 'coverage/app/coverage-summary.json';
const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const eventPath = process.env.GITHUB_EVENT_PATH;
const workspace = process.env.GITHUB_WORKSPACE;
const apiUrl = process.env.GITHUB_API_URL ?? 'https://api.github.com';

const formatFilePath = (file) => {
  if (!workspace) {
    return file;
  }

  const normalizedFile = file.replaceAll('\\', '/');
  const normalizedWorkspace = workspace.replaceAll('\\', '/');
  const prefix = `${normalizedWorkspace}/`;

  return normalizedFile.startsWith(prefix) ? normalizedFile.slice(prefix.length) : normalizedFile;
};

export const coverageRows = (summary) =>
  Object.entries(summary)
    .filter(([file]) => file !== 'total')
    .map(([file, coverage]) => ({
      file: formatFilePath(file),
      statements: coverage.statements.pct,
      branches: coverage.branches.pct,
      functions: coverage.functions.pct,
      lines: coverage.lines.pct,
    }))
    .filter((coverage) =>
      [coverage.statements, coverage.branches, coverage.functions, coverage.lines].some(
        (percent) => percent < 100,
      ),
    )
    .sort((left, right) => left.file.localeCompare(right.file));

const formatPercent = (percent) =>
  Number.isInteger(percent) ? `${percent}%` : `${percent.toFixed(2)}%`;

const overallTable = (total) => {
  if (!total) {
    throw new Error('Coverage summary is missing the total coverage row.');
  }

  return [
    '| Overall | Statements | Branches | Functions | Lines |',
    '| --- | ---: | ---: | ---: | ---: |',
    `| Total | ${formatPercent(total.statements.pct)} | ${formatPercent(
      total.branches.pct,
    )} | ${formatPercent(total.functions.pct)} | ${formatPercent(total.lines.pct)} |`,
  ].join('\n');
};

const fileTable = (rows) =>
  rows.length === 0
    ? 'All reported files are at 100% coverage.'
    : [
        '| File | Statements | Branches | Functions | Lines |',
        '| --- | ---: | ---: | ---: | ---: |',
        ...rows.map(
          (coverage) =>
            `| \`${coverage.file}\` | ${formatPercent(coverage.statements)} | ${formatPercent(
              coverage.branches,
            )} | ${formatPercent(coverage.functions)} | ${formatPercent(coverage.lines)} |`,
        ),
      ].join('\n');

export const coverageCommentBody = (summary) => {
  const rows = coverageRows(summary);

  return `${marker}
## Test results

${overallTable(summary.total)}

### Files below 100%

${fileTable(rows)}`;
};

const request = async (path, options = {}) => {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `${options.method ?? 'GET'} ${path} failed: ${response.status} ${responseBody}`,
    );
  }

  return response.status === 204 ? undefined : response.json();
};

const main = async () => {
  if (!token || !repository || !eventPath) {
    throw new Error('GITHUB_TOKEN, GITHUB_REPOSITORY, and GITHUB_EVENT_PATH are required.');
  }

  const [owner, repo] = repository.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY: ${repository}`);
  }

  const event = JSON.parse(await readFile(eventPath, 'utf8'));
  const issueNumber = event.pull_request?.number;
  if (typeof issueNumber !== 'number') {
    throw new Error('Coverage comments can only be posted for pull_request events.');
  }

  const summary = JSON.parse(await readFile(summaryPath, 'utf8'));
  const body = coverageCommentBody(summary);
  const comments = await request(
    `/repos/${owner}/${repo}/issues/${issueNumber}/comments?per_page=100`,
  );
  const existingComment = comments.find((comment) => comment.body?.includes(marker));

  if (existingComment) {
    await request(`/repos/${owner}/${repo}/issues/comments/${existingComment.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ body }),
    });
  } else {
    await request(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  }
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
