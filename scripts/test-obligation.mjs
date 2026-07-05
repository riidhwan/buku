import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const defaultExceptionManifest = 'scripts/test-obligation-exceptions.json';

const mustTestPatterns = [
  { classification: 'adapter', pattern: /\.adapter\.ts$/ },
  { classification: 'policy', pattern: /[.-]policy\.ts$/ },
  { classification: 'reducer', pattern: /[.-]reducer\.ts$/ },
  { classification: 'use-case', pattern: /\.use-case\.ts$/ },
  { classification: 'workflow', pattern: /-workflow\.ts$/ },
];

const noNearbySpecPatterns = [
  { classification: 'port', pattern: /\.port\.ts$/ },
  { classification: 'token', pattern: /\.token\.ts$/ },
  { classification: 'route', pattern: /\.routes\.ts$/ },
  { classification: 'provider', pattern: /(^|\/)provide-[^/]+\.ts$/ },
];

export function testObligationReportForFiles(files, options = {}) {
  const root = options.root ?? process.cwd();
  const exceptionManifestPath = options.exceptionManifestPath ?? defaultExceptionManifest;
  const exceptions = readExceptionManifest(root, exceptionManifestPath);
  const productionFiles = files
    .map((file) => normalizeRelativePath(root, file))
    .filter(isProductionTypeScriptFile)
    .filter((file) => existsSync(path.join(root, file)));

  const reports = productionFiles.map((file) => reportForFile(root, file, exceptions.entries));
  const manifestWarnings = exceptions.warnings;
  const manifestFailures = validateExceptionManifest(root, exceptions.entries);
  const failures = [
    ...manifestFailures,
    ...reports.flatMap((report) =>
      report.failures.map((message) => ({ file: report.file, message })),
    ),
  ];
  const warnings = [
    ...manifestWarnings,
    ...reports.flatMap((report) =>
      report.warnings.map((message) => ({ file: report.file, message })),
    ),
  ];

  return {
    reports,
    failures,
    warnings,
    hasFailures: failures.length > 0,
  };
}

export function formatTestObligationReport(result) {
  if (result.reports.length === 0 && result.failures.length === 0 && result.warnings.length === 0) {
    return 'No changed production TypeScript files to inspect for test obligation.';
  }

  const sections = [];
  if (result.failures.length > 0) {
    sections.push(['test obligation failures:', ...result.failures.map(formatFinding)].join('\n'));
  }

  if (result.warnings.length > 0) {
    sections.push(['test obligation warnings:', ...result.warnings.map(formatFinding)].join('\n'));
  }

  const okReports = result.reports
    .filter((report) => report.failures.length === 0 && report.warnings.length === 0)
    .map((report) => `  - ${report.file}: ${report.classification}`);
  if (okReports.length > 0) {
    sections.push(['test obligation checked:', ...okReports].join('\n'));
  }

  return sections.join('\n\n');
}

export function changedFiles(root = process.cwd()) {
  return gitFiles(root, ['diff', '--name-only', '--diff-filter=ACMRT', 'HEAD']);
}

export function stagedFiles(root = process.cwd()) {
  return gitFiles(root, ['diff', '--cached', '--name-only', '--diff-filter=ACMRT']);
}

export function allProductionTypeScriptFiles(root = process.cwd()) {
  return gitFiles(root, ['ls-files', 'src/app/**/*.ts']).filter(isProductionTypeScriptFile);
}

function reportForFile(root, file, exceptions) {
  const classification = classifyTestObligation(file);
  const exception = exceptions.get(file);
  const hasNearbySpec = existsSync(path.join(root, nearbySpecPath(file)));
  const failures = [];
  const warnings = [];

  if (classification.testRequired) {
    if (!hasNearbySpec && exception === undefined) {
      const spec = nearbySpecPath(file);
      failures.push(`missing nearby spec ${spec}`);
    }
  }

  if (classification.kind === 'ambiguous' && !hasNearbySpec && exception === undefined) {
    warnings.push(classification.message);
  }

  return {
    file,
    classification: classification.label,
    failures,
    warnings,
  };
}

export function classifyTestObligation(file) {
  const mustTestMatch = mustTestPatterns.find(({ pattern }) => pattern.test(file));
  if (mustTestMatch !== undefined) {
    return {
      kind: 'must-test',
      label: mustTestMatch.classification,
      testRequired: true,
    };
  }

  const noNearbySpecMatch = noNearbySpecPatterns.find(({ pattern }) => pattern.test(file));
  if (noNearbySpecMatch !== undefined || isTypeOnlyFileName(file)) {
    return {
      kind: 'no-nearby-spec-required',
      label: noNearbySpecMatch?.classification ?? 'type-only',
      testRequired: false,
    };
  }

  if (/\.facade\.ts$/.test(file)) {
    const workflowHint = /workflow/i.test(path.basename(file))
      ? ' Workflow-named facades should be renamed to *-workflow.ts when they own behavior.'
      : '';
    return {
      kind: 'ambiguous',
      label: 'facade',
      testRequired: false,
      message: `facade test obligation is ambiguous; add a nearby spec, add a validated exception, or rename to a clearer role.${workflowHint}`,
    };
  }

  if (/^src\/app\/features\/[^/]+\/application\//.test(file)) {
    return {
      kind: 'ambiguous',
      label: 'application',
      testRequired: false,
      message:
        'application file role is ambiguous; rename to a classified role, add a nearby spec, or add a validated exception when it owns no behavior.',
    };
  }

  return {
    kind: 'unclassified',
    label: 'unclassified',
    testRequired: false,
  };
}

function isTypeOnlyFileName(file) {
  return /(?:^|\/)(?:.+-)?(?:result|results|types|dto|shape|model|models)\.ts$/.test(file);
}

function nearbySpecPath(file) {
  return file.replace(/\.ts$/, '.spec.ts');
}

function readExceptionManifest(root, manifestPath) {
  const absolutePath = path.join(root, manifestPath);
  if (!existsSync(absolutePath)) {
    return {
      entries: new Map(),
      warnings: [{ file: manifestPath, message: 'exception manifest does not exist' }],
    };
  }

  const parsed = JSON.parse(readFileSync(absolutePath, 'utf8'));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${manifestPath} must contain a JSON object.`);
  }

  return {
    entries: new Map(Object.entries(parsed)),
    warnings: [],
  };
}

function validateExceptionManifest(root, exceptions) {
  const failures = [];

  for (const [file, exception] of exceptions) {
    if (!existsSync(path.join(root, file))) {
      failures.push({ file, message: 'exception points to a missing production file' });
      continue;
    }

    if (!isProductionTypeScriptFile(file)) {
      failures.push({ file, message: 'exception path must point to a production TypeScript file' });
    }

    if (!isPlainObject(exception)) {
      failures.push({ file, message: 'exception value must be an object' });
      continue;
    }

    if (!isNonEmptyString(exception.classification)) {
      failures.push({ file, message: 'exception classification must be a non-empty string' });
    }

    if (!isNonEmptyString(exception.reason) || exception.reason.trim().length < 20) {
      failures.push({
        file,
        message: 'exception reason must be specific and at least 20 characters',
      });
    }

    if (!Array.isArray(exception.coveredBy) || exception.coveredBy.length === 0) {
      failures.push({ file, message: 'exception coveredBy must list at least one spec file' });
      continue;
    }

    for (const coveredBy of exception.coveredBy) {
      if (!isNonEmptyString(coveredBy) || !coveredBy.endsWith('.spec.ts')) {
        failures.push({ file, message: 'exception coveredBy entries must be spec file paths' });
        continue;
      }

      if (!existsSync(path.join(root, coveredBy))) {
        failures.push({ file, message: `coveredBy spec does not exist: ${coveredBy}` });
      }
    }
  }

  return failures;
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeRelativePath(root, file) {
  return path.relative(root, path.resolve(root, file)).replaceAll(path.sep, '/');
}

function isProductionTypeScriptFile(file) {
  return (
    file.startsWith('src/app/') &&
    file.endsWith('.ts') &&
    !file.endsWith('.spec.ts') &&
    !file.endsWith('.d.ts')
  );
}

function formatFinding(finding) {
  return `  - ${finding.file}: ${finding.message}`;
}

function gitFiles(root, args) {
  const result = spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.error?.code === 'EPERM') {
    return parseGitFileOutput(result.stdout);
  }

  if (result.error && result.stdout.length === 0) {
    throw result.error;
  }

  if (result.status !== 0 && result.stdout.length === 0) {
    throw new Error(result.stderr || `git ${args.join(' ')} failed`);
  }

  return parseGitFileOutput(result.stdout);
}

function parseGitFileOutput(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseArgs(argv) {
  return {
    all: argv.includes('--all'),
    changed: argv.includes('--changed'),
    staged: argv.includes('--staged'),
    files: argv.filter((arg) => !arg.startsWith('--')),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  let files = args.files;

  if (args.all) {
    files = allProductionTypeScriptFiles();
  } else if (args.staged) {
    files = stagedFiles();
  } else if (args.changed || files.length === 0) {
    files = changedFiles();
  }

  const result = testObligationReportForFiles(files);
  console.log(formatTestObligationReport(result));

  if (result.hasFailures) {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
