#!/usr/bin/env node
// Mirror ported components from src/components into design/system/components
// for the Claude Design design-system project. See design/system/README-SYNC.md.
//
//   node design/mirror-components.mjs
//
// For each component listed below it writes, next to each other:
//   <Name>.jsx   the TypeScript source with the types stripped (comments kept)
//   <Name>.d.ts  the declarations from the TypeScript compiler, with the
//                @startingPoint tag Claude Design uses to list the component
// The .prompt.md usage notes are written by hand and left alone.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ts = createRequire(join(ROOT, 'package.json'))('typescript');

// path under src/components → starting point (omit for helpers).
const COMPONENTS = {
  'core/SegmentedControl': { section: 'Core', subtitle: 'Single-choice segmented radiogroup (focus / primary)', viewport: '700x120' },
  'core/Switch': { section: 'Core', subtitle: 'M3 switch row with label and supporting line', viewport: '700x100' },
  'core/Sheet': { section: 'Core', subtitle: 'Bottom sheet on phones, dialog on larger windows', viewport: '700x360' },
  'core/ConfirmDialog': { section: 'Core', subtitle: 'Destructive confirmation (alertdialog)', viewport: '700x300' },
  'core/Snackbar': { section: 'Core', subtitle: 'One-line status on the inverse surface', viewport: '700x120' },
  'core/Skeleton': { section: 'Core', subtitle: 'Static loading blocks, no shimmer', viewport: '700x200' },
  'app/RoomCard': { section: 'Room Finder', subtitle: 'Duration-first free-room list row with focus badge', viewport: '700x130' },
  'focus/focusIcons': null,
  'focus/ActivityRow': { section: 'Focus', subtitle: 'Batch / claimed / unknown activity in a room', viewport: '700x110' },
  'focus/FocusButton': { section: 'Focus', subtitle: 'Start focus and Join', viewport: '700x100' },
  'focus/FocusSurface': { section: 'Focus', subtitle: 'The running session on room detail', viewport: '420x420' },
  'focus/FocusPill': { section: 'Focus', subtitle: 'Running session from any screen', viewport: '700x80' },
  'focus/FocusSummary': { section: 'Focus', subtitle: 'Session ended, added to the graph', viewport: '420x200' },
  'focus/CheckInSheet': { section: 'Focus', subtitle: 'Break is over / still focusing, before the next block', viewport: '420x320' },
  'focus/FocusBadge': { section: 'Focus', subtitle: 'Own / batch / claimed badge on cards', viewport: '700x80' },
  'focus/FocusGraph': { section: 'Focus', subtitle: 'Contribution graph of daily focus minutes', viewport: '900x260' },
  'focus/ShareCard': { section: 'Focus', subtitle: 'Semester share card drawn on canvas (1080 × 1080)', viewport: '420x440' },
  'focus/ProfileHeader': { section: 'Focus', subtitle: 'One-line Profile header with batch chip', viewport: '700x80' },
  'focus/ListNotice': { section: 'Focus', subtitle: 'Quiet / time travel / unknown line over the list', viewport: '700x60' },
  'focus/MapLegend': { section: 'Focus', subtitle: 'Campus map key: free, batch ring, claim dot', viewport: '700x80' },
  'focus/BuildingRow': { section: 'Focus', subtitle: 'Building list row, the map in words', viewport: '700x100' },
};

const SRC = join(ROOT, 'src/components');
const OUT = join(ROOT, 'design/system/components');

function writeOut(rel, ext, text) {
  const file = join(OUT, rel + ext);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}

// ── .jsx ─────────────────────────────────────────────────────────────
for (const rel of Object.keys(COMPONENTS)) {
  const src = readFileSync(join(SRC, rel + '.tsx'), 'utf8');
  let code = ts.transpileModule(src, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.Preserve },
  }).outputText;
  code = code.replace(/from '(\.{1,2}\/[^']+)'/g, (_, p) => `from '${p}.jsx'`);
  code = /^import \{([^}]*)\} from 'react';$/m.test(code)
    ? code.replace(/^import \{([^}]*)\} from 'react';$/m, "import React, {$1} from 'react';")
    : "import React from 'react';\n" + code;
  code = code.replace(/\n{3,}/g, '\n\n');
  const doc = /\/\*\*[\s\S]*?\*\//.exec(src);
  const lines = code.split('\n');
  let i = 0;
  while (i < lines.length && /^import /.test(lines[i])) i++;
  if (doc && !code.includes(doc[0])) lines.splice(i, 0, '', doc[0]);
  writeOut(rel, '.jsx', `// Mirror of src/components/${rel}.tsx with the types stripped. Edit the source, then run design/mirror-components.mjs.\n` + lines.join('\n'));
}

// ── .d.ts ────────────────────────────────────────────────────────────
const options = {
  declaration: true,
  emitDeclarationOnly: true,
  jsx: ts.JsxEmit.ReactJSX,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  target: ts.ScriptTarget.ES2022,
  strict: true,
  skipLibCheck: true,
};
const roots = Object.keys(COMPONENTS).map((rel) => join(SRC, rel + '.tsx'));
const emitted = new Map();
const program = ts.createProgram(roots, options);
program.emit(undefined, (file, text) => emitted.set(resolve(file).replace(/\\/g, '/'), text));

for (const [rel, meta] of Object.entries(COMPONENTS)) {
  const key = [...emitted.keys()].find((k) => k.endsWith(`/components/${rel}.d.ts`));
  if (!key) throw new Error(`no declarations for ${rel}`);
  let d = emitted.get(key);
  // Room status lives in the app's domain layer; inline it for the mirror.
  d = d.replace(/^import type \{ RoomStatus \} from '[^']+';\n/m, '').replace(/\bRoomStatus\b/g, "'free' | 'soon' | 'occupied'");
  d = d.replace(/import\("react"\)\.JSX\.Element/g, 'JSX.Element');
  if (meta) {
    const name = rel.split('/').pop();
    const re = new RegExp(`export declare function ${name}(<[^>]*>)?\\(\\{[\\s\\S]*?\\}: (\\w+(?:<\\w+>)?)\\): (JSX\\.Element(?: \\| null)?);`);
    d = d.replace(re, (_, generic = '', props, ret) =>
      `/**\n * @startingPoint section="${meta.section}" subtitle="${meta.subtitle}" viewport="${meta.viewport}"\n */\nexport declare function ${name}${generic}(props: ${props}): ${ret};`,
    );
    if (!d.includes('@startingPoint')) throw new Error(`could not tag ${rel}`);
  }
  writeOut(rel, '.d.ts', d);
}

console.log(`mirrored ${Object.keys(COMPONENTS).length} components into design/system/components`);

// Focus graph/share card use the same classroom calendar as the app.
const calendar = readFileSync(join(ROOT, 'src/domain/openingHours.ts'), 'utf8');
writeOut('../domain/openingHours', '.jsx', '// Mirror of src/domain/openingHours.ts. Generated by design/mirror-components.mjs.\n' +
  ts.transpileModule(calendar, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText);
const calendarDeclaration = [...emitted.keys()].find((k) => k.endsWith('/domain/openingHours.d.ts'));
if (!calendarDeclaration) throw new Error('no classroom calendar declarations');
writeOut('../domain/openingHours', '.d.ts', emitted.get(calendarDeclaration));
