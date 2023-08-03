import * as fs from 'node:fs/promises';
import { buildTools } from '@zooduck/build-tools';

// Distributable
await buildTools.createJSExportFromCSS('src/mbzScrollbars.component.css');
await fs.rm('dist', { recursive: true, force: true });
await fs.mkdir('dist');
await fs.cp('src', 'dist', { recursive: true });
await fs.rm('dist/mbzScrollbars.component.css');
await fs.rename('dist/mbzScrollbars.component.js', 'dist/index.module.js');
await buildTools.removeCommentsFromFile('dist/index.module.js');

// Playground
await fs.rm('playground/@zooduck/mbz-scrollbars', { recursive: true, force: true });
await fs.cp('dist', 'playground/@zooduck/mbz-scrollbars', { recursive: true });
