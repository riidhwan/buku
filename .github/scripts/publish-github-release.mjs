import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const apiUrl = process.env.GITHUB_API_URL ?? 'https://api.github.com';

const option = (name) => {
  const prefix = `${name}=`;
  return process.argv
    .slice(2)
    .find((argument) => argument.startsWith(prefix))
    ?.slice(prefix.length);
};

const flag = (name) => process.argv.includes(name);

const request = async (path, options = {}) => {
  const { allowNotFound, ...fetchOptions } = options;
  const response = await fetch(`${apiUrl}${path}`, {
    ...fetchOptions,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...fetchOptions.headers,
    },
  });

  if (response.status === 404 && allowNotFound) {
    return undefined;
  }

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(
      `${options.method ?? 'GET'} ${path} failed: ${response.status} ${responseBody}`,
    );
  }

  return response.status === 204 ? undefined : response.json();
};

const uploadAsset = async (release, filePath, contentType) => {
  const fileName = basename(filePath);
  const uploadUrl = release.upload_url.replace('{?name,label}', `?name=${fileName}`);
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': contentType,
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: await readFile(filePath),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`Upload ${fileName} failed: ${response.status} ${responseBody}`);
  }
};

const deleteExistingAsset = async (owner, repo, release, filePath) => {
  const fileName = basename(filePath);
  const existingAsset = release.assets?.find((asset) => asset.name === fileName);
  if (!existingAsset) {
    return;
  }

  await request(`/repos/${owner}/${repo}/releases/assets/${existingAsset.id}`, {
    method: 'DELETE',
  });
};

const main = async () => {
  if (!token || !repository) {
    throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required.');
  }

  const [owner, repo] = repository.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPOSITORY: ${repository}`);
  }

  const version = option('--version');
  const sha = option('--sha') ?? process.env.GITHUB_SHA;
  const apk = option('--apk');
  const checksums = option('--checksums');
  const recovery = flag('--recovery');

  if (!version || !sha || !apk || !checksums) {
    throw new Error('--version, --sha, --apk, and --checksums are required.');
  }

  const tag = `v${version}`;
  const existingTag = await request(`/repos/${owner}/${repo}/git/ref/tags/${tag}`, {
    allowNotFound: true,
  });
  const existingRelease = await request(`/repos/${owner}/${repo}/releases/tags/${tag}`, {
    allowNotFound: true,
  });

  if (!recovery && (existingTag || existingRelease)) {
    throw new Error(`${tag} already exists. Automatic publishing will not overwrite releases.`);
  }

  if (recovery && !existingTag) {
    throw new Error(`${tag} does not exist. Recovery publishing requires an existing tag.`);
  }

  if (!existingTag) {
    await request(`/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/tags/${tag}`,
        sha,
      }),
    });
  }

  const release =
    existingRelease ??
    (await request(`/repos/${owner}/${repo}/releases`, {
      method: 'POST',
      body: JSON.stringify({
        tag_name: tag,
        target_commitish: sha,
        name: tag,
        draft: false,
        prerelease: false,
        generate_release_notes: true,
      }),
    }));

  if (recovery) {
    await deleteExistingAsset(owner, repo, release, apk);
    await deleteExistingAsset(owner, repo, release, checksums);
  }

  await uploadAsset(release, apk, 'application/vnd.android.package-archive');
  await uploadAsset(release, checksums, 'text/plain');
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
