import { mkdir, copyFile, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = path.join(root, 'dist');
await mkdir(path.join(destination, 'vendor'), { recursive: true });
for (const file of ['index.html', 'adventure.css', 'rehearsal.html', 'style.css', 'favicon.svg', 'LICENSE', 'THIRD_PARTY_NOTICES.md']) await copyFile(path.join(root, file), path.join(destination, file));
await cp(path.join(root, 'src'), path.join(destination, 'src'), { recursive: true });
await cp(path.join(root, 'assets'), path.join(destination, 'assets'), { recursive: true });
await copyFile(path.join(root, 'node_modules/phaser/dist/phaser.min.js'), path.join(destination, 'vendor/phaser.js'));
await copyFile(path.join(root, 'node_modules/phaser/LICENSE.md'), path.join(destination, 'vendor/LICENSE.phaser.md'));
await copyFile(path.join(root, 'node_modules/eventemitter3/LICENSE'), path.join(destination, 'vendor/LICENSE.eventemitter3'));
console.log('Static game written to dist/. Publish this directory on a static web host.');
