import { pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, sleep } from "./cdp.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DIST = pathToFileURL(join(ROOT, "dist", "dungeon-night.html")).href;
const OUT = join(ROOT, "screenshots");

async function main() {
  const c = await launch({ width: 1280, height: 800, port: 9446 });
  try {
    await c.goto(DIST, 600);
    await c.ev("window.__DM__.reset()");
    await sleep(400);
    await c.shot(join(OUT, "00-best-title.png"));
    await c.shot(join(OUT, "01-title.png"));

    await c.ev("window.__DM__.startGame()");
    await sleep(350);
    await c.shot(join(OUT, "02-entrance.png"));

    await c.ev("window.__DM__.choose('torch')");
    await sleep(250);
    await c.shot(join(OUT, "03-torch.png"));

    await c.ev("window.__DM__.choose('goblins')");
    await sleep(300);
    await c.shot(join(OUT, "04-combat.png"));

    await c.ev("window.__DM__.quickCombatWin()");
    await sleep(300);
    await c.shot(join(OUT, "05-loot.png"));

    await c.ev("window.__DM__.choose('bridge')");
    await sleep(250);
    await c.shot(join(OUT, "06-bridge.png"));

    await c.ev("window.__DM__.setNextRolls([18])");
    await c.ev("window.__DM__.solveSkillSync()");
    await sleep(300);
    await c.shot(join(OUT, "07-boss.png"));

    await c.ev("window.__DM__.quickCombatWin()");
    for (let i = 0; i < 20; i++) {
      await sleep(150);
      if ((await c.ev("window.__DM__.getState().screen")) === "victory") break;
    }
    await sleep(400);
    await c.shot(join(OUT, "08-victory.png"));
    console.log("shots done");
  } finally {
    await c.close();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
