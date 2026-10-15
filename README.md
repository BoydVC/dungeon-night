# Dungeon Master Night

Offline family-friendly D&D-style dungeon crawl for **Boyd, Miranda, Char (13) and Vic (11)**. A pre-written “AI Dungeon Master” narrates a three-hero party — **Sir Bold** the Knight, **Willow** the Ranger, and **Pip** the Wizard — through Emberdeep Keep: branching paths, animated d20 rolls, turn-based combat, loot, a Shadow Drake boss, and a kid-written story recap (writing practice for Char) saved to `localStorage` with a printable page.

Progress and recaps stay on this device. No accounts, no network, no CDN fonts or scripts, no live LLM — all DM lines are authored in-game.

## How to play

1. Open the game and tap **Begin the Quest**.
2. At the gate, choose the **Torch Corridor** (goblin fight) or the **Mossy Tunnel** (party riddle).
3. Win combat with **Attack** / **Hero Skill** (animated d20), grab loot, steady the rope bridge, then face the **Shadow Drake**.
4. On victory, write a story recap from the prompts, **Save Recap**, and optionally open the **Printable Page**.

## Run

```bash
./run.sh all      # build + screenshots + smoke test + start server
./run.sh start    # build + serve http://127.0.0.1:4354/
./run.sh test     # build + smoke test
./run.sh shots    # build + screenshots/
./run.sh stop
```

Offline single file: `dist/dungeon-night.html` (open in any browser; works with no server).

Health check: `http://127.0.0.1:4354/healthz`

## Layout

| Path | Role |
|------|------|
| `web/index.html` · `app.css` · `app.js` | Source |
| `build.py` | Inlines web/ → `dist/dungeon-night.html` |
| `server.py` | Stdlib server on port **4354** |
| `run.sh` | build / start / stop / status / shots / test / all |
| `tests/smoke_test.py` | Offline checks + headless Chrome full playthrough |
| `tests/shots.py` | 1280×800 gameplay screenshots |
| `screenshots/00-best-title.png` | Hero shot |
| `dist/dungeon-night.html` | Deliverable snapshot |

## Adventure map

1. **Gate** — choose Torch or Moss
2. **Torch Corridor** → **Giggle-Goblin** combat → loot
3. **Mossy Tunnel** → **Rune riddle** (knight, ranger, wizard) → loot
4. **Rope Bridge** — d20 skill check
5. **Shadow Drake** boss → **Crystal of Story** + writing recap

## Theme

Parchment panels, torchlight gradients, gold frames, party HP rail — cozy tabletop night for the Boyd living room.

## Test results (2026-10-15)

`./run.sh test` → **32/32 checks passed** (offline snapshot + headless Chrome playthrough: dice/combat, bridge skill, boss victory, recap localStorage, riddle branch, zero network). Server: `http://127.0.0.1:4354/`.


---
## Repo notes
- **Built:** 2026-10-15, by TokenMax (Boyd's Grok Bot) on the Grok Bot box.
- **Run:** `./run.sh` (then open the localhost URL it prints).
- Imported from `/workspace/tokenmax/dungeon-night` on Oct 23, 2026. node_modules, virtualenvs, logs and files over 20 MB were left out.
