// Tiny promise wrapper around stockfish.js for Node (used only by dev/CI validation scripts).
const initEngine = require("stockfish");

async function createEngine(flavor = "single") {
  const engine = await initEngine(flavor);
  let listeners = [];
  engine.listener = (line) => { for (const l of listeners.slice()) l(line); };
  const send = (cmd) => engine.sendCommand(cmd);
  const waitFor = (pred) => new Promise((res) => {
    const l = (line) => { if (pred(line)) { listeners = listeners.filter((x) => x !== l); res(line); } };
    listeners.push(l);
  });
  send("uci"); await waitFor((l) => l === "uciok");
  send("setoption name MultiPV value 1");
  send("isready"); await waitFor((l) => l === "readyok");

  // Analyse a FEN; returns { lines: [{ multipv, cp, mate, pv: [uci...] }] } at final depth.
  async function analyse(fen, { depth = 18, multipv = 1, movetime } = {}) {
    send(`setoption name MultiPV value ${multipv}`);
    send("ucinewgame");
    send(`position fen ${fen}`);
    const lines = {};
    const l = (line) => {
      if (!line.startsWith("info") || !line.includes(" pv ")) return;
      const m = line.match(/multipv (\d+)/); const idx = m ? +m[1] : 1;
      const cp = line.match(/score cp (-?\d+)/); const mate = line.match(/score mate (-?\d+)/);
      const pv = line.split(" pv ")[1].trim().split(" ");
      lines[idx] = { multipv: idx, cp: cp ? +cp[1] : null, mate: mate ? +mate[1] : null, pv };
    };
    listeners.push(l);
    send(movetime ? `go movetime ${movetime}` : `go depth ${depth}`);
    const best = await waitFor((x) => x.startsWith("bestmove"));
    listeners = listeners.filter((x) => x !== l);
    return { bestmove: best.split(" ")[1], lines: Object.values(lines).sort((a, b) => a.multipv - b.multipv) };
  }
  return { analyse, quit: () => { try { send("quit"); } catch {} } };
}
module.exports = { createEngine };
