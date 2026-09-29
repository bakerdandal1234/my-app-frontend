import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function validateManifest(value) {
  if (!value || typeof value !== 'object' || value.version !== 1) {
    throw new Error('Unsupported auth manifest.');
  }
  for (const key of ['sourceFiles', 'toolingFiles']) {
    if (!Array.isArray(value[key]) || value[key].length === 0) {
      throw new Error(`Manifest ${key} must be a non-empty array.`);
    }
    for (const path of value[key]) {
      if (typeof path !== 'string' || path.includes('\\') ||
          path.split('/').some((part) => part === '' || part === '.' || part === '..') ||
          !(path === 'auth-canonical.json' || /^(src|scripts|tests|docs)\/[\w./-]+$/.test(path))) {
        throw new Error('Manifest paths must stay within the project.');
      }
      if (key === 'sourceFiles' && (!path.startsWith('src/') || !/\.tsx?$/.test(path))) {
        throw new Error('Source entries must be TypeScript files under src/.');
      }
    }
  }
  const files = [...value.sourceFiles, ...value.toolingFiles];
  if (new Set(files).size !== files.length) throw new Error('Duplicate auth manifest entry.');
  return value;
}

export async function readManifest(root = projectRoot) {
  return validateManifest(JSON.parse(await readFile(resolve(root, 'auth-canonical.json'), 'utf8')));
}

function normalize(text) {
  // Ignore platform encoding/line-ending differences, but retain source and comments.
  return text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

export async function compareFiles(root, peer, files, readText = (path) => readFile(path, 'utf8')) {
  if (resolve(root).toLowerCase() === resolve(peer).toLowerCase()) {
    throw new Error('Choose a different project as the comparison target.');
  }
  const differences = [];
  for (const file of files) {
    const results = await Promise.allSettled([
      readText(resolve(root, file)), readText(resolve(peer, file)),
    ]);
    for (const [index, result] of results.entries()) {
      if (result.status === 'rejected') {
        differences.push({ file, reason: index === 0 ? 'unreadable in local project' : 'unreadable in peer project' });
      }
    }
    const [local, remote] = results;
    if (local.status === 'fulfilled' && remote.status === 'fulfilled' &&
        normalize(local.value) !== normalize(remote.value)) {
      differences.push({ file, reason: 'different source' });
    }
  }
  return differences;
}

async function main() {
  const [peer, ...extra] = process.argv.slice(2);
  if (!peer || extra.length > 0) {
    throw new Error('Usage: npm run check:auth-sync -- "<other-project-directory>"');
  }
  const manifest = await readManifest();
  const files = [...manifest.sourceFiles, ...manifest.toolingFiles];
  const differences = await compareFiles(projectRoot, peer, files);
  for (const difference of differences) {
    console.error(`${difference.reason}: ${difference.file}`);
  }
  if (differences.length > 0) {
    console.error(`Auth sync failed: ${differences.length} difference(s). No files were changed.`);
    process.exitCode = 1;
  } else {
    console.log(`Auth sync passed: ${files.length} canonical files match.`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Auth sync failed.');
    process.exitCode = 1;
  });
}
