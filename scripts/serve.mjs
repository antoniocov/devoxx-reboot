import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let relative = pathname === '/' ? 'index.html' : pathname.slice(1);
    // Only game files are served; local notes and dotfiles stay private.
    if (!(['index.html', 'rehearsal.html', 'style.css', 'adventure.css', 'favicon.svg', 'vendor/phaser.js'].includes(relative) || /^src\/(adventure\/(stages\/)?)?[\w-]+\.js$/.test(relative) || /^assets\/[\w-]+\.(png|webp|svg)$/.test(relative))) {
      res.writeHead(404).end('Not found');
      return;
    }
    if (relative === 'vendor/phaser.js') relative = 'node_modules/phaser/dist/phaser.min.js';
    const data = await readFile(path.join(root, relative));
    res.writeHead(200, { 'Content-Type': types[path.extname(relative)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch {
    res.writeHead(404).end('Not found');
  }
});
const port = Number(process.env.PORT || 5173);
server.listen(port, '127.0.0.1', () => console.log(`Devoxx Reboot → http://localhost:${port}`));
