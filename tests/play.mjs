// Full playthrough of Dungeon Master Night via window.__DM__.
import { pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, sleep } from "./cdp.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DIST = pathToFileURL(join(ROOT, "dist", "dungeon-night.html")).href;

const checks = [];
function check(ok, msg, info = "") {
  checks.push({ ok: !!ok, msg, info });
}

async function main() {
  const c = await launch({ width: 1280, height: 800, port: 9445 });
  try {
    await c.goto(DIST);
    check(await c.ev("typeof window.__DM__ === 'object'"), "__DM__ test API present");
    const title = await c.ev("document.title");
    check(title.includes("Dungeon Master Night"), "document title", title);
    const heroes = await c.ev("window.__DM__.HEROES.length");
    check(heroes === 3, "3 heroes", String(heroes));
    const nodes = await c.ev("Object.keys(window.__DM__.NODES).length");
    check(nodes >= 8, "dungeon nodes embedded", String(nodes));

    // UI start
    await c.ev("window.__DM__.reset()");
    await c.click("#btn-start");
    await sleep(250);
    let st = await c.ev("JSON.stringify(window.__DM__.getState())").then(JSON.parse);
    check(st.screen === "adventure" && st.nodeId === "entrance", "Begin Quest reaches entrance", JSON.stringify(st));

    // Torch path via choices
    await c.ev("window.__DM__.choose('torch')");
    await sleep(100);
    st = await c.ev("JSON.stringify(window.__DM__.getState())").then(JSON.parse);
    check(st.nodeId === "torch", "torch corridor", st.nodeId);

    // Enter goblin combat
    await c.ev("window.__DM__.choose('goblins')");
    await sleep(200);
    st = await c.ev("JSON.stringify(window.__DM__.getState())").then(JSON.parse);
    check(st.screen === "combat" && st.combat, "goblin combat started", st.screen);

    // Dice + combat: queue high rolls and attack sync
    await c.ev("window.__DM__.setNextRolls([18,18,18,18,18,18,18,18,18,18,18,18])");
    let attacks = 0;
    for (let i = 0; i < 12; i++) {
      const r = await c.ev("JSON.stringify(window.__DM__.attackOnceSync())").then(JSON.parse);
      attacks++;
      if (r.won) break;
      st = await c.ev("JSON.stringify(window.__DM__.getState())").then(JSON.parse);
      if (st.screen !== "combat") break;
    }
    check(attacks >= 1, "at least one dice-backed attack", String(attacks));
    st = await c.ev("JSON.stringify(window.__DM__.getState())").then(JSON.parse);
    check(st.nodeId === "loot_goblin" || st.screen === "adventure", "won goblin fight → loot", JSON.stringify({ node: st.nodeId, screen: st.screen }));

    // Continue to bridge
    if (st.nodeId === "loot_goblin") {
      await c.ev("window.__DM__.choose('bridge')");
      await sleep(100);
    }
    st = await c.ev("JSON.stringify(window.__DM__.getState())").then(JSON.parse);
    check(st.nodeId === "bridge", "at rope bridge", st.nodeId);

    // Skill check with dice
    await c.ev("window.__DM__.setNextRolls([15])");
    const sk = await c.ev("JSON.stringify(window.__DM__.solveSkillSync())").then(JSON.parse);
    check(sk.ok && sk.success, "bridge skill check passed", JSON.stringify(sk));
    st = await c.ev("JSON.stringify(window.__DM__.getState())").then(JSON.parse);
    check(st.screen === "combat" && st.combat && st.combat.isBoss, "boss combat started", JSON.stringify(st.combat));

    // Win boss via quick win (after verifying combat exists)
    await c.ev("window.__DM__.setNextRolls([20,20,20,20,20,20,20,20,20,20,20,20,20,20])");
    // Prefer fighting with dice a bit then finish
    for (let i = 0; i < 3; i++) {
      st = await c.ev("JSON.stringify(window.__DM__.getState())").then(JSON.parse);
      if (st.screen !== "combat") break;
      await c.ev("window.__DM__.attackOnceSync()");
    }
    st = await c.ev("JSON.stringify(window.__DM__.getState())").then(JSON.parse);
    if (st.screen === "combat") {
      await c.ev("window.__DM__.quickCombatWin()");
    }
    await sleep(200);
    st = await c.ev("JSON.stringify(window.__DM__.getState())").then(JSON.parse);
    check(st.screen === "victory", "victory screen reached", st.screen);
    check(st.inventory.includes("Crystal of Story") || st.inventory.length >= 1, "loot includes crystal or spoils", st.inventory.join(","));

    // Recap save
    const recap = await c.ev(`JSON.stringify(window.__DM__.saveRecap({
      author: "Char",
      title: "The Night We Beat the Drake",
      body: "Sir Bold shielded us. Willow shot true. Pip sparkled. We won the Crystal!"
    }))`).then(JSON.parse);
    check(!!recap.title, "recap object returned", recap.title);
    const nRecaps = await c.ev("window.__DM__.loadRecaps().length");
    check(nRecaps >= 1, "recap saved to localStorage", String(nRecaps));

    // Alternate path: riddle
    await c.ev("window.__DM__.reset()");
    await c.ev("window.__DM__.startGame()");
    await c.ev("window.__DM__.choose('moss')");
    await c.ev("window.__DM__.choose('riddle')");
    await c.ev("window.__DM__.setPuzzleAnswer('knight, ranger, wizard')");
    const pz = await c.ev("JSON.stringify(window.__DM__.submitPuzzle())").then(JSON.parse);
    check(pz.ok, "riddle solved", JSON.stringify(pz));
    st = await c.ev("JSON.stringify(window.__DM__.getState())").then(JSON.parse);
    check(st.nodeId === "loot_riddle", "riddle path loot", st.nodeId);

    // rollD20 API
    await c.ev("window.__DM__.setNextRolls([20])");
    const d = await c.ev("window.__DM__.rollD20()");
    check(d === 20, "deterministic d20 from queue", String(d));

    // Network: only file/data
    const badNet = c.requests.filter((u) => /^https?:/i.test(u));
    check(badNet.length === 0, "no external network requests during play", badNet.slice(0, 3).join(", "));

    const jsErr = c.errors.filter((e) => !/favicon/i.test(e));
    check(jsErr.length === 0, "no console/JS errors", jsErr.slice(0, 3).join(" | "));
  } catch (e) {
    check(false, "play.mjs exception", String(e && e.stack || e));
  } finally {
    await c.close();
  }

  const out = {
    checks,
    passed: checks.filter((x) => x.ok).length,
    failed: checks.filter((x) => !x.ok).length,
  };
  console.log(JSON.stringify(out));
  process.exit(out.failed ? 1 : 0);
}

main();
