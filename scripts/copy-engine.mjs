// Copies the Stockfish lite single-threaded WASM build into public/engine.
// Single-threaded = no SharedArrayBuffer, so it works on GitHub Pages without COOP/COEP headers.
import { copyFileSync, mkdirSync } from 'node:fs';
const src = 'node_modules/stockfish/bin/stockfish-19-lite-single';
mkdirSync('public/engine', { recursive: true });
copyFileSync(`${src}.js`, 'public/engine/stockfish.js');
copyFileSync(`${src}.wasm`, 'public/engine/stockfish.wasm');
copyFileSync('node_modules/stockfish/Copying.txt', 'public/engine/COPYING.txt');
console.log('Stockfish engine copied to public/engine');
