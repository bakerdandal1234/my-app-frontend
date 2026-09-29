import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const apiConfigUrl = new URL('../src/api/config.ts', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    for (const extension of ['.ts', '.tsx']) {
      const url = new URL(specifier + extension, context.parentURL);
      try {
        await access(url);
        return { url: url.href, shortCircuit: true };
      } catch (error) {
        if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'ENOENT') throw error;
      }
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  // Only the environment adapter is substituted. Tests execute the actual auth modules.
  if (url === apiConfigUrl) {
    return { format: 'module', source: "export const API_URL = 'https://auth.test.invalid';", shortCircuit: true };
  }
  if (url.startsWith('file:') && /\.tsx?$/.test(url)) {
    const source = await readFile(new URL(url), 'utf8');
    const result = ts.transpileModule(source, {
      fileName: fileURLToPath(url),
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    });
    return { format: 'module', source: result.outputText, shortCircuit: true };
  }
  return nextLoad(url, context);
}
