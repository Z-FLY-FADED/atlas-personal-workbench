import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import ts from 'typescript';

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? files(join(directory, entry.name)) : [resolve(directory, entry.name)]);
}

type Dependency = { target: string; specifier: string };
const modules = new Map<string, { client: boolean; dependencies: Dependency[] }>();
for (const file of files('app').filter(file => /\.tsx?$/.test(file))) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const dependencies: Dependency[] = [];
  const add = (specifier: string) => {
    if (!specifier.startsWith('.')) { dependencies.push({ target: specifier, specifier }); return; }
    const base = resolve(dirname(file), specifier);
    const target = [base, base + '.ts', base + '.tsx', join(base, 'index.ts')].find(path => existsSync(path));
    assert.ok(target, `${file}: unresolved import ${specifier}`);
    dependencies.push({ target, specifier });
  };
  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly) {
      const named = node.importClause?.namedBindings;
      if (!node.importClause?.name && named && ts.isNamedImports(named) && named.elements.every(item => item.isTypeOnly)) return;
      add((node.moduleSpecifier as ts.StringLiteral).text);
    } else if (ts.isExportDeclaration(node) && !node.isTypeOnly && node.moduleSpecifier) {
      if (node.exportClause && ts.isNamedExports(node.exportClause) && node.exportClause.elements.every(item => item.isTypeOnly)) return;
      add((node.moduleSpecifier as ts.StringLiteral).text);
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && ts.isStringLiteral(node.arguments[0])) {
      add(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  modules.set(file, { client: source.statements.some(node => ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression) && node.expression.text === 'use client'), dependencies });
}

test('client bundles cannot reach server modules, Cloudflare bindings or Node builtins', () => {
  for (const [entry, module] of modules) {
    if (!module.client) continue;
    const visited = new Set<string>();
    const check = (file: string, chain: string[]) => {
      if (visited.has(file)) return;
      visited.add(file);
      for (const dependency of modules.get(file)?.dependencies || []) {
        const next = [...chain, dependency.target];
        assert.ok(!dependency.target.startsWith(resolve('app/server')) && !/^(cloudflare:|node:)/.test(dependency.target), next.join(' -> '));
        check(dependency.target, next);
      }
    };
    check(entry, [entry]);
  }
});

test('application runtime imports have no circular dependencies', () => {
  const checked = new Set<string>();
  const check = (file: string, chain: string[]) => {
    assert.ok(!chain.includes(file), [...chain, file].join(' -> '));
    if (checked.has(file)) return;
    for (const dependency of modules.get(file)?.dependencies || []) {
      if (modules.has(dependency.target)) check(dependency.target, [...chain, file]);
    }
    checked.add(file);
  };
  for (const file of modules.keys()) check(file, []);
});

test('server modules cannot depend on client components or React hooks', () => {
  const serverRoot = resolve('app/server');
  for (const entry of modules.keys()) {
    if (!entry.startsWith(serverRoot)) continue;
    const visited = new Set<string>();
    const check = (file: string, chain: string[]) => {
      if (visited.has(file)) return;
      visited.add(file);
      const moduleInfo = modules.get(file);
      assert.ok(!moduleInfo?.client, chain.join(' -> '));
      for (const dependency of moduleInfo?.dependencies || []) {
        assert.notEqual(dependency.specifier, 'react', [...chain, dependency.target].join(' -> '));
        check(dependency.target, [...chain, dependency.target]);
      }
    };
    check(entry, [entry]);
  }
});
