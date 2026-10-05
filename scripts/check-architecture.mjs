import { readFile, readdir } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

async function filesIn(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'generated') continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesIn(path)));
    else if (entry.name.endsWith('.ts')) files.push(path);
  }
  return files;
}

export async function checkArchitecture(root) {
  const policy = JSON.parse(await readFile(resolve(root, 'architecture-policy.json'), 'utf8'));
  const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  const sourceRoot = resolve(root, 'src');
  const files = await filesIn(sourceRoot);
  const known = new Set(files);
  const errors = [];
  const edges = new Map();
  for (const [name, version] of Object.entries({
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  })) {
    if (!/^\d+\.\d+\.\d+$/.test(version))
      errors.push(`Dependency must use an exact stable version: ${name}`);
    if (/express|multer/.test(name)) errors.push(`Forbidden HTTP dependency: ${name}`);
  }
  for (const path of files) {
    const name = relative(sourceRoot, path);
    const module = name.split('/')[0];
    const composition = policy.compositionFiles.includes(name);
    if (!composition && !Object.hasOwn(policy.modules, module))
      errors.push(`Unregistered module: ${name}`);
    const ast = ts.createSourceFile(
      name,
      await readFile(path, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const imports = [];
    for (const statement of ast.statements) {
      if (
        (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
        statement.moduleSpecifier &&
        ts.isStringLiteral(statement.moduleSpecifier)
      )
        imports.push(statement.moduleSpecifier.text);
    }
    const targets = [];
    for (const specifier of imports) {
      if (/express|multer|Open-ZCode\//i.test(specifier))
        errors.push(`Forbidden import in ${name}: ${specifier}`);
      if (
        name.endsWith('.controller.ts') &&
        (specifier.startsWith('node:') || /prisma|\/database\//.test(specifier))
      )
        errors.push(`Controller cannot access IO/database: ${name}`);
      if (specifier.startsWith('.')) {
        const target = resolve(dirname(path), specifier.replace(/\.js$/, '.ts'));
        const targetName = relative(sourceRoot, target);
        const targetModule = targetName.split('/')[0];
        if (targetName.startsWith('..')) errors.push(`Import leaves source root: ${name}`);
        if (targetModule !== module && !composition) {
          if (!(policy.modules[module] ?? []).includes(targetModule))
            errors.push(`Forbidden module dependency: ${name} -> ${targetModule}`);
          if (
            !['common', policy.generatedDirectory].includes(targetModule) &&
            !targetName.endsWith('/index.ts')
          )
            errors.push(`Cross-module import must use public index: ${name} -> ${targetName}`);
        }
        if (known.has(target)) targets.push(target);
        else if (targetModule !== policy.generatedDirectory)
          errors.push(`Unresolved local import: ${name} -> ${specifier}`);
      }
    }
    edges.set(path, targets);
    function walk(node) {
      if (ts.isCallExpression(node)) {
        const expression = node.expression;
        if (ts.isIdentifier(expression) && expression.text === 'forwardRef')
          errors.push(`Circular dependency workaround forbidden: ${name}`);
        if (
          name.endsWith('.controller.ts') &&
          ts.isIdentifier(expression) &&
          ['fetch', 'require'].includes(expression.text)
        )
          errors.push(`Controller IO call forbidden: ${name}`);
        if (
          name.endsWith('.controller.ts') &&
          ts.isPropertyAccessExpression(expression) &&
          /^\$(queryRaw|executeRaw|transaction)|^(readFile|writeFile|createReadStream)$/.test(
            expression.name.text,
          )
        )
          errors.push(`Controller IO call forbidden: ${name}`);
        if (
          ts.isPropertyAccessExpression(expression) &&
          ts.isIdentifier(expression.expression) &&
          expression.expression.text === 'console'
        )
          errors.push(`Use structured application logging: ${name}`);
      }
      ts.forEachChild(node, walk);
    }
    walk(ast);
  }
  const seen = new Set();
  const active = new Set();
  function visit(path, chain) {
    if (active.has(path)) {
      errors.push(
        `Import cycle: ${[...chain, path].map((item) => relative(sourceRoot, item)).join(' -> ')}`,
      );
      return;
    }
    if (seen.has(path)) return;
    active.add(path);
    for (const target of edges.get(path) ?? []) visit(target, [...chain, path]);
    active.delete(path);
    seen.add(path);
  }
  for (const path of files) visit(path, []);
  return { files: files.length, errors: [...new Set(errors)] };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await checkArchitecture(resolve(import.meta.dirname, '..'));
  if (result.errors.length) {
    process.stderr.write(result.errors.join('\n') + '\n');
    process.exitCode = 1;
  } else console.log(`Architecture checks passed (${result.files} source files)`);
}
