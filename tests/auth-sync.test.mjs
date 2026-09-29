import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { compareFiles, validateManifest } from '../scripts/check-auth-sync.mjs';

const left = resolve('fixture-left');
const right = resolve('fixture-right');
const file = 'src/auth/api.ts';
const manifest = { version: 1, sourceFiles: [file], toolingFiles: ['auth-canonical.json'] };
function reader(entries) {
  return async (path) => {
    if (!entries.has(path)) throw new Error('Missing fixture');
    return entries.get(path);
  };
}

test('sync accepts the same source across BOM and CRLF differences', async () => {
  const files = new Map([[resolve(left, file), '\uFEFFexport {};\r\n'], [resolve(right, file), 'export {};\n']]);
  assert.deepEqual(await compareFiles(left, right, [file], reader(files)), []);
});

test('sync reports changed source', async () => {
  const files = new Map([[resolve(left, file), 'export const value = 1;'], [resolve(right, file), 'export const value = 2;']]);
  assert.deepEqual(await compareFiles(left, right, [file], reader(files)), [{ file, reason: 'different source' }]);
});

test('sync fails when a canonical file is missing, including in both projects', async () => {
  const differences = await compareFiles(left, right, [file], reader(new Map()));
  assert.equal(differences.length, 2);
});

test('sync rejects comparing a project to itself', async () => {
  await assert.rejects(compareFiles(left, left, [file]), /different project/);
});

test('manifest rejects traversal, absolute paths, duplicates and invalid source entries', () => {
  assert.deepEqual(validateManifest(manifest), manifest);
  for (const path of ['../secret', 'src/../secret.ts', '/outside.ts', 'C:\\outside.ts', 'src\\auth.ts', 'scripts/check.mjs']) {
    assert.throws(() => validateManifest({ ...manifest, sourceFiles: [path] }));
  }
  assert.throws(() => validateManifest({ ...manifest, sourceFiles: [file, file] }), /Duplicate/);
  assert.throws(() => validateManifest({ ...manifest, sourceFiles: [] }));
});
