/**
 * Remove duplicate keys at the same object-literal level in i18n files.
 * Keeps the last occurrence (matches JavaScript runtime behavior).
 */
import ts from 'typescript';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const languagesDir = path.join(__dirname, '../src/i18n/languages');

function getPropertyKey(prop) {
  if (ts.isPropertyAssignment(prop) || ts.isMethodDeclaration(prop)) {
    if (ts.isIdentifier(prop.name)) return prop.name.text;
    if (ts.isStringLiteral(prop.name)) return prop.name.text;
  }
  return null;
}

function countSameLevelDuplicates(node) {
  let count = 0;
  const seen = new Set();
  for (const prop of node.properties) {
    const key = getPropertyKey(prop);
    if (key) {
      if (seen.has(key)) count += 1;
      else seen.add(key);
    }
    if (ts.isPropertyAssignment(prop) && ts.isObjectLiteralExpression(prop.initializer)) {
      count += countSameLevelDuplicates(prop.initializer);
    }
  }
  return count;
}

function dedupeObjectLiteral(node) {
  const keepIndices = new Set();
  const seenKeys = new Set();

  for (let i = node.properties.length - 1; i >= 0; i--) {
    const prop = node.properties[i];
    const key = getPropertyKey(prop);
    if (key) {
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        keepIndices.add(i);
      }
    } else {
      keepIndices.add(i);
    }
  }

  const newProps = node.properties
    .filter((_, i) => keepIndices.has(i))
    .map((prop) => {
      if (ts.isPropertyAssignment(prop) && ts.isObjectLiteralExpression(prop.initializer)) {
        return ts.factory.updatePropertyAssignment(
          prop,
          prop.name,
          dedupeObjectLiteral(prop.initializer),
        );
      }
      return prop;
    });

  return ts.factory.updateObjectLiteralExpression(node, newProps);
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  let exportName = null;
  let exportObj = null;

  function visit(node) {
    if (ts.isVariableStatement(node)) {
      const isExport = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
      if (!isExport) return;

      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.initializer && ts.isObjectLiteralExpression(decl.initializer)) {
          exportName = decl.name.text;
          exportObj = decl.initializer;
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  if (!exportName || !exportObj) {
    return { filePath, skipped: true, removed: 0 };
  }

  const removed = countSameLevelDuplicates(exportObj);
  if (removed === 0) {
    return { filePath, skipped: false, removed: 0 };
  }

  const dedupedObj = dedupeObjectLiteral(exportObj);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  const printedObj = printer.printNode(ts.EmitHint.Unspecified, dedupedObj, sourceFile);
  const output = `export const ${exportName} = ${printedObj};\n`;
  fs.writeFileSync(filePath, output, 'utf8');

  return { filePath, skipped: false, removed };
}

function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else if (entry.name.endsWith('.ts')) files.push(fullPath);
  }
  return files;
}

const results = walk(languagesDir)
  .sort()
  .map(processFile)
  .filter((r) => !r.skipped && r.removed > 0);

const totalRemoved = results.reduce((sum, r) => sum + r.removed, 0);

console.log(`Processed ${walk(languagesDir).length} files`);
console.log(`Fixed ${results.length} files, removed ${totalRemoved} duplicate keys`);
for (const r of results) {
  console.log(`  ${path.relative(languagesDir, r.filePath)}: -${r.removed}`);
}
