import { resolve, sep } from 'node:path';
import ts from 'typescript';
import { projectRoot, readManifest } from './check-auth-sync.mjs';

const manifest = await readManifest();
const configPath = resolve(projectRoot, 'tsconfig.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) {
  console.error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
  process.exit(1);
}

// Explicit roots and no project references: never traverse App or business modules.
const parsed = ts.parseJsonConfigFileContent({
  ...config.config,
  files: [...manifest.sourceFiles, 'src/vite-env.d.ts'],
  include: [],
  exclude: [],
  references: [],
}, ts.sys, projectRoot);
const options = {
  ...parsed.options,
  strict: true,
  noUnusedLocals: true,
  noUnusedParameters: true,
  noEmit: true,
  incremental: false,
  composite: false,
  tsBuildInfoFile: undefined,
};
const sourceRoot = resolve(projectRoot, 'src').toLowerCase() + sep;
const allowedSources = new Set([
  ...parsed.fileNames, resolve(projectRoot, 'src/api/config.ts'),
].map((file) => resolve(file).toLowerCase()));
const isAllowed = (file) => {
  const absolute = resolve(file).toLowerCase();
  return !absolute.startsWith(sourceRoot) || allowedSources.has(absolute);
};
const host = ts.createCompilerHost(options);
const readFile = host.readFile.bind(host);
const fileExists = host.fileExists.bind(host);
host.readFile = (file) => isAllowed(file) ? readFile(file) : undefined;
host.fileExists = (file) => isAllowed(file) && fileExists(file);
const program = ts.createProgram({ rootNames: parsed.fileNames, options, host });
const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
if (diagnostics.length > 0) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
    getCanonicalFileName: (file) => file,
    getCurrentDirectory: () => projectRoot,
    getNewLine: () => '\n',
  }));
  process.exitCode = 1;
} else {
  console.log(`Strict auth TypeScript check passed (${manifest.sourceFiles.length} canonical source files).`);
}
