import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import ts from 'typescript';

const responsibilitySignals = [
  ['tab', /\b(tab|tabs)\b/i],
  ['session', /\bsession\b/i],
  ['back-navigation', /\b(back|history)\b/i],
  ['reading-mode', /\b(reading|article|reader)\b/i],
  ['notice', /\b(notice|message|capability)\b/i],
  ['url-policy', /\b(url|href|normalize)\b/i],
  ['chapter', /\bchapter\b/i],
  ['viewport', /\b(viewport|browser)\b/i],
  ['persistence', /\b(persist|store|repository|sqlite|preferences)\b/i],
  ['update', /\b(update|install|release|version)\b/i],
];

const budgetByKind = {
  'feature-domain': { soft: 140, hard: 180 },
  'feature-application-port': { soft: 140, hard: 180 },
  'feature-application-facade': { soft: 450, hard: 650 },
  'feature-application-use-case': { soft: 140, hard: 180 },
  'feature-application': { soft: 180, hard: 260 },
  'feature-infrastructure': { soft: 300, hard: 450 },
  'feature-presentation-route': { soft: 90, hard: 120 },
  'feature-presentation': { soft: 220, hard: 320 },
  core: { soft: 180, hard: 260 },
  'shared-domain': { soft: 140, hard: 180 },
  'shared-application': { soft: 180, hard: 260 },
  'shared-presentation': { soft: 220, hard: 320 },
};

export function architectureReportForFiles(files, options = {}) {
  const root = options.root ?? process.cwd();
  const reports = files
    .map((file) => path.relative(root, path.resolve(root, file)))
    .filter(isReportableTypeScriptFile)
    .filter((file) => existsSync(path.join(root, file)))
    .map((file) => analyzeFile(root, file));

  return {
    reports,
    hasHardFailure: reports.some((report) =>
      report.warnings.some((warning) => warning.severity === 'hard'),
    ),
  };
}

export function formatArchitectureReport(result) {
  if (result.reports.length === 0) {
    return 'No changed production TypeScript files to inspect.';
  }

  return result.reports.map(formatFileReport).join('\n\n');
}

export function changedFiles(root = process.cwd()) {
  return gitFiles(root, ['diff', '--name-only', '--diff-filter=ACMRT', 'HEAD']);
}

export function stagedFiles(root = process.cwd()) {
  return gitFiles(root, ['diff', '--cached', '--name-only', '--diff-filter=ACMRT']);
}

export function allProductionTypeScriptFiles(root = process.cwd()) {
  return gitFiles(root, ['ls-files', 'src/app/**/*.ts']).filter(isReportableTypeScriptFile);
}

function analyzeFile(root, file) {
  const absolutePath = path.join(root, file);
  const sourceText = readFileSync(absolutePath, 'utf8');
  const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true);
  const kind = classifyFile(file);
  const budget = budgetByKind[kind] ?? null;
  const lineCount = sourceText.split(/\r?\n/).length;
  const imports = importSources(sourceFile);
  const importedAreas = Array.from(new Set(imports.map((source) => classifyImport(file, source))));
  const exports = exportedNames(sourceFile);
  const members = memberNames(sourceFile);
  const signals = detectedResponsibilitySignals([...exports, ...members, ...imports]);
  const warnings = warningsForReport({
    budget,
    exports,
    file,
    kind,
    lineCount,
    members,
    signals,
  });

  return {
    file,
    kind,
    lineCount,
    budget,
    exports,
    importedAreas,
    methodCount: members.length,
    signals,
    warnings,
  };
}

function formatFileReport(report) {
  const budget = report.budget
    ? `${report.lineCount} lines / review ${report.budget.soft} / hard ${report.budget.hard}`
    : `${report.lineCount} lines`;
  const exports = report.exports.length > 0 ? report.exports.join(', ') : 'none';
  const imports = report.importedAreas.length > 0 ? report.importedAreas.join(', ') : 'none';
  const signals = report.signals.length > 0 ? report.signals.join(', ') : 'none';
  const warnings =
    report.warnings.length > 0
      ? report.warnings.map((warning) => `  - ${warning.message}`).join('\n')
      : '  - none';

  return [
    report.file,
    `kind: ${report.kind}`,
    `size: ${budget}`,
    `exports: ${exports}`,
    `methods/functions: ${report.methodCount}`,
    `imports: ${imports}`,
    `responsibility signals: ${signals}`,
    'warnings:',
    warnings,
  ].join('\n');
}

function warningsForReport({ budget, exports, file, kind, lineCount, members, signals }) {
  const warnings = [];

  if (budget && lineCount > budget.hard) {
    warnings.push({
      severity: 'hard',
      message: `file exceeds hard ${kind} budget (${lineCount} > ${budget.hard})`,
    });
  } else if (budget && lineCount > budget.soft) {
    warnings.push({
      severity: 'review',
      message: `file exceeds review ${kind} budget (${lineCount} > ${budget.soft})`,
    });
  }

  if (kind === 'feature-application-facade' && signals.length >= 5) {
    warnings.push({
      severity: 'review',
      message:
        'facade shows several responsibility signals; look for extractable policies/use cases',
    });
  }

  if (kind === 'feature-application-facade' && members.length > 24) {
    warnings.push({
      severity: 'review',
      message: `facade has ${members.length.toString()} methods/functions; check whether coordination and policy logic are mixed`,
    });
  }

  if (!file.endsWith('.routes.ts') && exports.length > 8) {
    warnings.push({
      severity: 'review',
      message: `file exports ${exports.length.toString()} symbols; check for more than one public responsibility`,
    });
  }

  return warnings;
}

function classifyFile(file) {
  if (/^src\/app\/features\/[^/]+\/domain\//.test(file)) {
    return 'feature-domain';
  }

  if (/^src\/app\/features\/[^/]+\/application\/ports\//.test(file)) {
    return 'feature-application-port';
  }

  if (/^src\/app\/features\/[^/]+\/application\/.*\.facade\.ts$/.test(file)) {
    return 'feature-application-facade';
  }

  if (/^src\/app\/features\/[^/]+\/application\/.*\.use-case\.ts$/.test(file)) {
    return 'feature-application-use-case';
  }

  if (/^src\/app\/features\/[^/]+\/application\//.test(file)) {
    return 'feature-application';
  }

  if (/^src\/app\/features\/[^/]+\/infrastructure\//.test(file)) {
    return 'feature-infrastructure';
  }

  if (/^src\/app\/features\/[^/]+\/presentation\/.*\.routes\.ts$/.test(file)) {
    return 'feature-presentation-route';
  }

  if (/^src\/app\/features\/[^/]+\/presentation\//.test(file)) {
    return 'feature-presentation';
  }

  if (/^src\/app\/core\//.test(file)) {
    return 'core';
  }

  if (/^src\/app\/shared\/domain\//.test(file)) {
    return 'shared-domain';
  }

  if (/^src\/app\/shared\/application\//.test(file)) {
    return 'shared-application';
  }

  if (/^src\/app\/shared\/presentation\//.test(file)) {
    return 'shared-presentation';
  }

  return 'app-shell';
}

function importSources(sourceFile) {
  return sourceFile.statements
    .filter(ts.isImportDeclaration)
    .map((statement) => statement.moduleSpecifier)
    .filter(ts.isStringLiteral)
    .map((literal) => literal.text);
}

function exportedNames(sourceFile) {
  const names = [];

  for (const statement of sourceFile.statements) {
    if (hasExportModifier(statement) && 'name' in statement && statement.name) {
      names.push(statement.name.text);
    }

    if (ts.isExportDeclaration(statement) && statement.exportClause) {
      if (ts.isNamedExports(statement.exportClause)) {
        for (const element of statement.exportClause.elements) {
          names.push(element.name.text);
        }
      }
    }
  }

  return names;
}

function memberNames(sourceFile) {
  const names = [];

  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name) {
      names.push(node.name.text);
    }

    if (ts.isMethodDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
      names.push(node.name.text);
    }

    if (ts.isPropertyDeclaration(node) && node.name && ts.isIdentifier(node.name)) {
      names.push(node.name.text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return names;
}

function detectedResponsibilitySignals(values) {
  const haystack = values.map(tokenizeForSignals).join(' ');
  return responsibilitySignals
    .filter(([, pattern]) => pattern.test(haystack))
    .map(([signal]) => signal);
}

function tokenizeForSignals(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .toLowerCase();
}

function classifyImport(fromFile, source) {
  if (source.startsWith('@angular/')) {
    return 'angular';
  }

  if (source.startsWith('@ionic/')) {
    return 'ionic';
  }

  if (source.startsWith('@capacitor/')) {
    return 'capacitor';
  }

  if (source.startsWith('@env/')) {
    return 'environment';
  }

  if (source.startsWith('@core/')) {
    return 'core';
  }

  if (source.startsWith('@shared/')) {
    return 'shared';
  }

  if (source.startsWith('.')) {
    const resolved = path
      .normalize(path.join(path.dirname(fromFile), source))
      .replaceAll(path.sep, '/');
    return classifyResolvedImport(resolved);
  }

  return source.split('/')[0] ?? 'external';
}

function classifyResolvedImport(resolved) {
  const featureLayer = resolved.match(/^src\/app\/features\/[^/]+\/([^/]+)/);
  if (featureLayer) {
    return `feature-${featureLayer[1]}`;
  }

  if (resolved.startsWith('src/app/core/')) {
    return 'core';
  }

  if (resolved.startsWith('src/app/shared/')) {
    return 'shared';
  }

  if (resolved.startsWith('src/app/')) {
    return 'app-shell';
  }

  return 'relative';
}

function hasExportModifier(node) {
  return Boolean(node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword));
}

function isReportableTypeScriptFile(file) {
  return (
    file.startsWith('src/app/') &&
    file.endsWith('.ts') &&
    !file.endsWith('.spec.ts') &&
    !file.endsWith('.d.ts')
  );
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
    failOnHard: argv.includes('--fail-on-hard'),
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

  const result = architectureReportForFiles(files);
  console.log(formatArchitectureReport(result));

  if (args.failOnHard && result.hasHardFailure) {
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main();
}
