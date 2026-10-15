/* Dungeon Master Night — offline family D&D crawl. No network. */
(function () {
  "use strict";

  const STORAGE_KEY = "boyd-dungeon-night-v1";
  const RECAPS_KEY = "boyd-dungeon-night-recaps-v1";

  const HEROES = [
    { id: "knight", name: "Sir Bold", role: "Knight", emoji: "🛡️", maxHp: 28, atk: 5, ac: 14, skill: "Shield Bash" },
    { id: "ranger", name: "Willow", role: "Ranger", emoji: "🏹", maxHp: 22, atk: 6, ac: 12, skill: "Precise Shot" },
    { id: "wizard", name: "Pip", role: "Wizard", emoji: "🪄", maxHp: 18, atk: 7, ac: 11, skill: "Spark Bolt" },
  ];

  /* Pre-authored DM narration — lots of variety, kid-friendly */
  const DM = {
    titleOpen: [
      "Gather round, adventurers! The torchlight flickers… and tonight, YOU are the heroes.",
      "Welcome back to the table, Boyd family. The dice are warm. The dungeon waits.",
    ],
    entrance: [
      "You stand before the mossy arch of Emberdeep Keep. Cold air sighs from within. Two passages yawn ahead.",
      "The stone door of Emberdeep groans open. Sir Bold raises his shield. Willow nocks an arrow. Pip whispers a spark into being.",
    ],
    torchPath: [
      "Torchlight dances on old murals of friendly dragons and brave kids. The corridor smells of cinnamon… and something squeaky.",
      "You take the torch hall. Carved Terps footprints? Weird. Comforting. The rattle of tiny armor echoes ahead.",
    ],
    mossPath: [
      "Soft green moss carpets the tunnel. Glow-bugs light your way like tiny stars. A puddle reflects three brave faces.",
      "The mossy tunnel is quiet except for drips. Willow spots tracks — small clawed feet, heading deeper.",
    ],
    goblinIntro: [
      "Three Giggle-Goblins tumble out, waving wooden spoons like swords! \"This is OUR snack dungeon!\"",
      "A pack of Giggle-Goblins block the hall, armored in cookie tins. They look more silly than scary — but ready to tussle!",
    ],
    afterGoblin: [
      "The goblins drop their spoons and flee, giggling. \"You win! Keep the shiny!\" One leaves a glowing pebble.",
      "Victory! The goblins bow (badly) and scramble away. A small chest sits where they stood.",
    ],
    puzzleRoom: [
      "A stone pedestal holds three runes: Shield, Bow, and Star. A whisper: \"Name the party that protects, aims, and wonders.\"",
      "Ancient riddle stone: \"We are three — steel courage, keen eye, bright mind. Speak our kinds to open the way.\"",
    ],
    treasure: [
      "Gold coins? No — better: a Honey Loaf of Healing, a Cloak of Quiet Steps, and Pip's favorite: a Spark Marble!",
      "Loot time! Willow finds a Quiver of Friendly Arrows. Sir Bold claims a Badge of Bravery. Pip pockets a Moon Crumb.",
    ],
    bridge: [
      "A rope bridge spans a sparkling underground stream. It sways. Something large snores in the dark beyond.",
      "The bridge creaks. Far ahead, ember-eyes blink once… twice. The boss chamber waits.",
    ],
    bossIntro: [
      "The Shadow Drake uncoils — not evil, just lonely and dramatic. \"WHO DARES… oh. Kids? And a dad? Fine. LET'S DUEL FAIRLY!\"",
      "A Shadow Drake with a ridiculous scarf blocks the treasure vault. \"Beat me in a fair fight and the Crystal of Story is yours!\"",
    ],
    bossWin: [
      "The Drake bows deeply. \"Well fought, heroes of Millersville! Take the Crystal — and tell a great story about tonight.\"",
      "With a final flourish, the Drake yields. \"You three (plus the tall one) are legends. The Crystal of Story is yours!\"",
    ],
    skillOk: [
      "The dice favor the bold! The bridge holds steady.",
      "A solid roll! Your footing is sure; the party advances.",
    ],
    skillFail: [
      "Whoa — a wobble! Everyone grabs the ropes. You make it across, a little scraped but laughing.",
      "The bridge swings wild! Sir Bold steadies the others. A bruise or two, but you're through.",
    ],
  };

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /* Deterministic roll queue for tests */
  let rollQueue = [];
  function rollD20() {
    if (rollQueue.length) return rollQueue.shift();
    return 1 + Math.floor(Math.random() * 20);
  }

  const NODES = {
    entrance: {
      id: "entrance",
      art: "🏰",
      title: "Emberdeep Keep",
      pathLabel: "Gate",
      narrate: () => pick(DM.entrance),
      choices: [
        { label: "Take the Torch Corridor", hint: "Warm light, murals, maybe goblins", next: "torch" },
        { label: "Take the Mossy Tunnel", hint: "Glow-bugs, quiet tracks, maybe a riddle", next: "moss" },
      ],
    },
    torch: {
      id: "torch",
      art: "🔥",
      title: "Torch Corridor",
      pathLabel: "Torch",
      narrate: () => pick(DM.torchPath),
      choices: [
        { label: "Press onward (sounds like goblins…)", hint: "Combat ahead", next: "goblins" },
      ],
    },
    moss: {
      id: "moss",
      art: "🌿",
      title: "Mossy Tunnel",
      pathLabel: "Moss",
      narrate: () => pick(DM.mossPath),
      choices: [
        { label: "Study the riddle stone", hint: "A puzzle for Char & Vic", next: "riddle" },
      ],
    },
    goblins: {
      id: "goblins",
      art: "👺",
      title: "Giggle-Goblin Ambush",
      pathLabel: "Goblins",
      narrate: () => pick(DM.goblinIntro),
      combat: {
        enemies: [
          { id: "g1", name: "Giggle-Goblin", emoji: "🥄", hp: 10, maxHp: 10, atk: 3, ac: 11 },
          { id: "g2", name: "Tin-Lid Goblin", emoji: "🥫", hp: 12, maxHp: 12, atk: 3, ac: 12 },
        ],
        onWin: "loot_goblin",
      },
    },
    riddle: {
      id: "riddle",
      art: "🧩",
      title: "Rune Pedestal",
      pathLabel: "Riddle",
      narrate: () => pick(DM.puzzleRoom),
      puzzle: {
        prompt: "What three roles make our party? (knight, ranger, wizard)",
        answers: ["knight ranger wizard", "knight, ranger, wizard", "knight ranger and wizard"],
        onWin: "loot_riddle",
      },
    },
    loot_goblin: {
      id: "loot_goblin",
      art: "💎",
      title: "Goblin Spoils",
      pathLabel: "Loot",
      narrate: () => pick(DM.afterGoblin),
      loot: ["Glow Pebble", "Honey Loaf"],
      choices: [{ label: "Continue toward the bridge", next: "bridge" }],
    },
    loot_riddle: {
      id: "loot_riddle",
      art: "✨",
      title: "Hidden Niche",
      pathLabel: "Loot",
      narrate: () => pick(DM.treasure),
      loot: ["Spark Marble", "Cloak of Quiet Steps"],
      choices: [{ label: "Continue toward the bridge", next: "bridge" }],
    },
    bridge: {
      id: "bridge",
      art: "🌉",
      title: "Rope Bridge",
      pathLabel: "Bridge",
      narrate: () => pick(DM.bridge),
      skillCheck: {
        label: "Steady the party across (d20 + 3 vs DC 10)",
        dc: 10,
        bonus: 3,
        hero: "knight",
        onSuccess: "boss",
        onFail: "boss",
        failDamage: 2,
      },
    },
    boss: {
      id: "boss",
      art: "🐉",
      title: "Shadow Drake's Vault",
      pathLabel: "Boss",
      narrate: () => pick(DM.bossIntro),
      combat: {
        enemies: [
          { id: "drake", name: "Shadow Drake", emoji: "🐉", hp: 36, maxHp: 36, atk: 5, ac: 13 },
        ],
        onWin: "victory",
        isBoss: true,
      },
    },
    victory: {
      id: "victory",
      art: "🏆",
      title: "Crystal of Story",
      pathLabel: "Victory",
      narrate: () => pick(DM.bossWin),
      isVictory: true,
    },
  };

  const PATH_ORDER = ["Gate", "Torch/Moss", "Challenge", "Loot", "Bridge", "Boss", "Victory"];

  /* ---------- State ---------- */
  let state = defaultState();
  let combat = null;
  let diceAnim = null;
  let mute = false;

  function defaultState() {
    return {
      screen: "title", // title | adventure | combat | dice | victory | print
      nodeId: "entrance",
      party: HEROES.map((h) => ({
        ...h,
        hp: h.maxHp,
        loot: [],
      })),
      inventory: [],
      path: [],
      log: [],
      lastNarration: "",
      puzzleAnswer: "",
      skillResolved: false,
      victoryLoot: ["Crystal of Story"],
      turn: 0,
    };
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        screen: state.screen,
        nodeId: state.nodeId,
        party: state.party,
        inventory: state.inventory,
        path: state.path,
      }));
    } catch (_) {}
  }

  function loadRecaps() {
    try {
      return JSON.parse(localStorage.getItem(RECAPS_KEY) || "[]");
    } catch (_) {
      return [];
    }
  }

  function saveRecap(recap) {
    const list = loadRecaps();
    list.unshift(recap);
    try {
      localStorage.setItem(RECAPS_KEY, JSON.stringify(list.slice(0, 20)));
    } catch (_) {}
    return list;
  }

  function toast(msg) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2200);
  }

  function node() {
    return NODES[state.nodeId];
  }

  function aliveParty() {
    return state.party.filter((p) => p.hp > 0);
  }

  /* ---------- Combat ---------- */
  function startCombat(cfg) {
    combat = {
      enemies: cfg.enemies.map((e) => ({ ...e })),
      onWin: cfg.onWin,
      isBoss: !!cfg.isBoss,
      log: [],
      phase: "hero", // hero | enemy | won | lost
      activeHero: 0,
      waitingRoll: false,
    };
    state.screen = "combat";
    pushLog(cfg.isBoss ? "Boss fight! The Shadow Drake roars (politely)." : "Combat! Roll high to hit!");
    render();
  }

  function pushLog(text, cls) {
    if (!combat) return;
    combat.log.push({ text, cls: cls || "" });
    if (combat.log.length > 40) combat.log.shift();
  }

  function nextAliveHeroIndex(from) {
    const n = state.party.length;
    for (let i = 0; i < n; i++) {
      const idx = (from + i) % n;
      if (state.party[idx].hp > 0) return idx;
    }
    return -1;
  }

  function livingEnemies() {
    return combat.enemies.filter((e) => e.hp > 0);
  }

  function heroAttack(skill) {
    if (!combat || combat.phase !== "hero" || combat.waitingRoll) return;
    const hi = nextAliveHeroIndex(combat.activeHero);
    if (hi < 0) return;
    combat.activeHero = hi;
    const hero = state.party[hi];
    const foes = livingEnemies();
    if (!foes.length) return finishCombat(true);
    const target = foes[0];
    combat.waitingRoll = true;
    state.screen = "dice";
    animateDice((roll) => {
      const total = roll + hero.atk;
      const hit = total >= target.ac;
      const crit = roll === 20;
      const fumble = roll === 1;
      let dmg = 0;
      if (fumble) {
        pushLog(`${hero.name} slips! (nat 1)`, "miss");
      } else if (hit || crit) {
        dmg = skill ? hero.atk + 4 : hero.atk + Math.floor(roll / 5);
        if (crit) dmg += 6;
        target.hp = Math.max(0, target.hp - dmg);
        pushLog(
          `${hero.name} ${skill ? "uses " + hero.skill + " on" : "strikes"} ${target.name} — rolled ${roll}+${hero.atk}=${total}${crit ? " CRIT!" : ""} for ${dmg}!`,
          crit ? "crit" : "hit"
        );
      } else {
        pushLog(`${hero.name} misses ${target.name} (rolled ${roll}+${hero.atk}=${total} vs AC ${target.ac})`, "miss");
      }
      combat.waitingRoll = false;
      if (!livingEnemies().length) {
        finishCombat(true);
        return;
      }
      // next hero or enemies
      const nextH = nextAliveHeroIndex(hi + 1);
      if (nextH === -1 || nextH <= hi && hi === state.party.length - 1 || (nextH !== -1 && nextH < hi && combat._roundDone)) {
        // simplified: after each hero attack, enemies act once we've cycled — do enemy turn after every hero for pace
      }
      // Enemy turn after each hero action for snappy kid combat
      enemyTurn();
    }, skill ? hero.skill : hero.name + " attacks");
  }

  function enemyTurn() {
    if (!combat) return;
    const foes = livingEnemies();
    const heroes = aliveParty();
    if (!foes.length) return finishCombat(true);
    if (!heroes.length) return finishCombat(false);

    foes.forEach((foe) => {
      if (foe.hp <= 0) return;
      const target = heroes[Math.floor(Math.random() * heroes.length)];
      const roll = rollD20();
      const total = roll + foe.atk;
      if (roll === 1) {
        pushLog(`${foe.name} trips over its own feet!`, "miss");
      } else if (total >= target.ac || roll === 20) {
        let dmg = foe.atk + (roll === 20 ? 3 : 1);
        // knight shield reduce
        if (target.id === "knight") dmg = Math.max(1, dmg - 1);
        target.hp = Math.max(0, target.hp - dmg);
        pushLog(`${foe.name} hits ${target.name} for ${dmg}! (roll ${roll})`, "miss");
      } else {
        pushLog(`${foe.name} swings at ${target.name} and misses.`, "hit");
      }
    });

    if (!aliveParty().length) {
      finishCombat(false);
      return;
    }
    combat.phase = "hero";
    combat.activeHero = nextAliveHeroIndex(0);
    state.screen = "combat";
    render();
  }

  function finishCombat(won) {
    const onWin = combat && combat.onWin;
    const isBoss = combat && combat.isBoss;
    combat = null;
    if (won) {
      if (isBoss) {
        state.lastNarration = pick(DM.bossWin);
        goNode("victory");
      } else {
        goNode(onWin);
      }
    } else {
      // Soft fail — revive with 1 HP and retry flavor
      state.party.forEach((p) => { if (p.hp <= 0) p.hp = Math.max(1, Math.floor(p.maxHp / 3)); });
      toast("The party catches its breath… try again!");
      state.screen = "adventure";
      // Restart same combat node
      const n = node();
      if (n.combat) startCombat(n.combat);
      else render();
    }
  }

  /* ---------- Dice animation ---------- */
  function animateDice(cb, label) {
    state.screen = "dice";
    diceAnim = { label: label || "Rolling…", value: "?", rolling: true };
    render();
    const frames = 12;
    let i = 0;
    const iv = setInterval(() => {
      diceAnim.value = 1 + Math.floor(Math.random() * 20);
      renderDiceOnly();
      i++;
      if (i >= frames) {
        clearInterval(iv);
        const final = rollD20();
        // If queue was used inside rollD20 after random displays, that's fine;
        // for visual we set final explicitly — re-call if queue empty already consumed
        diceAnim.value = final;
        diceAnim.rolling = false;
        diceAnim.nat20 = final === 20;
        diceAnim.nat1 = final === 1;
        render();
        setTimeout(() => {
          diceAnim = null;
          cb(final);
        }, 550);
      }
    }, 70);
  }

  function renderDiceOnly() {
    const el = document.querySelector(".d20");
    if (el && diceAnim) el.textContent = String(diceAnim.value);
  }

  /* ---------- Navigation ---------- */
  function goNode(id) {
    const n = NODES[id];
    if (!n) return false;
    state.nodeId = id;
    state.puzzleAnswer = "";
    state.skillResolved = false;
    if (n.pathLabel && !state.path.includes(n.pathLabel)) state.path.push(n.pathLabel);
    state.lastNarration = n.narrate ? n.narrate() : "";
    if (n.loot && n.loot.length) {
      n.loot.forEach((item) => {
        if (!state.inventory.includes(item)) state.inventory.push(item);
        // give to a hero
        const h = state.party[state.inventory.length % state.party.length];
        if (h && !h.loot.includes(item)) h.loot.push(item);
      });
      // heal a bit on honey loaf
      if (n.loot.includes("Honey Loaf")) {
        state.party.forEach((p) => { p.hp = Math.min(p.maxHp, p.hp + 6); });
      }
    }
    if (n.isVictory) {
      state.screen = "victory";
      if (!state.inventory.includes("Crystal of Story")) state.inventory.push("Crystal of Story");
      save();
      render();
      return true;
    }
    if (n.combat) {
      startCombat(n.combat);
      return true;
    }
    state.screen = "adventure";
    save();
    render();
    return true;
  }

  function choose(next) {
    goNode(next);
  }

  function submitPuzzle() {
    const n = node();
    if (!n.puzzle) return { ok: false };
    const ans = (state.puzzleAnswer || "").trim().toLowerCase().replace(/\s+/g, " ");
    const ok = n.puzzle.answers.some((a) => a === ans);
    if (ok) {
      toast("The runes blaze — path open!");
      goNode(n.puzzle.onWin);
      return { ok: true };
    }
    toast("Not quite — think of our three heroes' roles!");
    return { ok: false };
  }

  function doSkillCheck() {
    const n = node();
    if (!n.skillCheck || state.skillResolved) return;
    state.skillResolved = true;
    const sc = n.skillCheck;
    const hero = state.party.find((p) => p.id === sc.hero) || state.party[0];
    animateDice((roll) => {
      const total = roll + sc.bonus;
      const success = total >= sc.dc;
      if (success) {
        state.lastNarration = pick(DM.skillOk) + ` (${hero.name} rolled ${roll}+${sc.bonus}=${total} vs DC ${sc.dc})`;
      } else {
        state.lastNarration = pick(DM.skillFail) + ` (${hero.name} rolled ${roll}+${sc.bonus}=${total})`;
        state.party.forEach((p) => { p.hp = Math.max(1, p.hp - (sc.failDamage || 2)); });
      }
      state.screen = "adventure";
      render();
      setTimeout(() => goNode(success ? sc.onSuccess : sc.onFail), 900);
    }, sc.label);
  }

  function startGame() {
    state = defaultState();
    rollQueue = [];
    combat = null;
    goNode("entrance");
  }

  function reset() {
    state = defaultState();
    combat = null;
    diceAnim = null;
    rollQueue = [];
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    render();
  }

  /* ---------- Render ---------- */
  function el(html) {
    const d = document.createElement("div");
    d.innerHTML = html.trim();
    return d.firstChild;
  }

  function partyRailHtml() {
    return state.party.map((p) => {
      const pct = Math.round((p.hp / p.maxHp) * 100);
      const active = combat && state.party[combat.activeHero] && state.party[combat.activeHero].id === p.id;
      return `<div class="pc${active ? " active" : ""}" data-id="${p.id}">
        <div class="pc-head"><span>${p.emoji}</span><span>${esc(p.name)}</span><span class="pc-role">${esc(p.role)}</span></div>
        <div class="hp-bar"><div class="hp-fill" style="width:${pct}%"></div></div>
        <div class="hp-label">${p.hp}/${p.maxHp} HP</div>
        ${p.loot.map((l) => `<span class="loot-chip">${esc(l)}</span>`).join("")}
      </div>`;
    }).join("");
  }

  function pathHtml() {
    const labels = state.path.length ? state.path : ["Gate"];
    return `<div class="path-trail">${labels.map((l, i) =>
      `<span class="path-node${i === labels.length - 1 ? " here" : " done"}">${esc(l)}</span>`
    ).join("")}</div>`;
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  }

  function renderTitle() {
    return `<div class="screen title-screen" id="screen-title">
      <div class="crest">⚔️📜🐉</div>
      <h1 class="game-title">Dungeon Master Night</h1>
      <p class="tagline">A family adventure for Boyd, Miranda, Char &amp; Vic</p>
      <div class="party-preview">
        ${HEROES.map((h) => `<div class="hero-card"><div class="emoji">${h.emoji}</div><div class="name">${esc(h.name)}</div><div class="role">${esc(h.role)}</div></div>`).join("")}
      </div>
      <p class="dm-text" style="max-width:540px;margin:0 auto 18px;font-size:1rem;color:var(--ink-soft)">${esc(pick(DM.titleOpen))}</p>
      <div class="btn-row">
        <button class="btn" id="btn-start">Begin the Quest</button>
        <button class="btn secondary" id="btn-recaps">Story Recaps</button>
      </div>
      <p class="family-note">Fully offline · dice, combat &amp; choices · Char practices the story ending<br/>
      <strong>No accounts. No network. Just torchlight &amp; imagination.</strong></p>
    </div>`;
  }

  function renderAdventure() {
    const n = node();
    let body = "";
    if (n.puzzle) {
      body = `<div class="choices">
        <label style="font-family:var(--ui);font-size:0.85rem;color:var(--ink-soft)">${esc(n.puzzle.prompt)}</label>
        <input id="puzzle-input" type="text" placeholder="e.g. knight, ranger, wizard" value="${esc(state.puzzleAnswer)}"
          style="padding:10px 12px;border:2px solid #a07848;border-radius:8px;font-family:var(--font);font-size:1rem;width:100%" />
        <button class="btn" id="btn-puzzle">Speak the Answer</button>
      </div>`;
    } else if (n.skillCheck && !state.skillResolved) {
      body = `<div class="btn-row" style="justify-content:flex-start">
        <button class="btn" id="btn-skill">${esc(n.skillCheck.label)}</button>
      </div>`;
    } else if (n.loot) {
      body = `<div class="loot-banner">Loot gained: ${n.loot.map(esc).join(" · ")}</div>
        <div class="choices">${(n.choices || []).map((c) =>
          `<button class="choice-btn" data-next="${esc(c.next)}">${esc(c.label)}${c.hint ? `<span class="hint">${esc(c.hint)}</span>` : ""}</button>`
        ).join("")}</div>`;
    } else {
      body = `<div class="choices">${(n.choices || []).map((c) =>
        `<button class="choice-btn" data-next="${esc(c.next)}">${esc(c.label)}${c.hint ? `<span class="hint">${esc(c.hint)}</span>` : ""}</button>`
      ).join("")}</div>`;
    }

    return `<div class="screen" id="screen-adventure">
      <div class="adv-layout">
        <aside class="party-rail"><h3>The Party</h3>${partyRailHtml()}
          <div style="margin-top:8px;font-size:0.7rem;font-family:var(--ui);opacity:0.8">Pack: ${state.inventory.map(esc).join(", ") || "—"}</div>
        </aside>
        <div class="story-panel">
          ${pathHtml()}
          <div class="scene-art">${n.art || "🗺️"}</div>
          <div class="dm-box">
            <div class="dm-label">Dungeon Master · ${esc(n.title)}</div>
            <div class="dm-text">${esc(state.lastNarration || (n.narrate && n.narrate()) || "")}</div>
          </div>
          ${body}
        </div>
      </div>
    </div>`;
  }

  function renderCombat() {
    if (!combat) return "";
    const foes = combat.enemies;
    return `<div class="screen" id="screen-combat">
      <div class="adv-layout">
        <aside class="party-rail"><h3>The Party</h3>${partyRailHtml()}</aside>
        <div class="combat-panel">
          <h2>${combat.isBoss ? "⚔️ BOSS BATTLE ⚔️" : "⚔️ Combat!"}</h2>
          <div class="enemy-row">
            ${foes.map((e) => {
              const pct = Math.round((e.hp / e.maxHp) * 100);
              return `<div class="enemy-card" style="${e.hp <= 0 ? "opacity:0.35" : ""}">
                <div class="emoji">${e.emoji}</div>
                <div class="ename">${esc(e.name)}</div>
                <div class="hp-bar" style="margin-top:6px"><div class="hp-fill" style="width:${pct}%"></div></div>
                <div class="hp-label">${e.hp}/${e.maxHp}</div>
              </div>`;
            }).join("")}
          </div>
          <div class="combat-log">${combat.log.map((l) => `<div class="line ${l.cls}">${esc(l.text)}</div>`).join("")}</div>
          <div class="combat-actions">
            <button class="btn danger" id="btn-attack" ${combat.phase !== "hero" ? "disabled" : ""}>Attack</button>
            <button class="btn" id="btn-skill-atk" ${combat.phase !== "hero" ? "disabled" : ""}>Use Hero Skill</button>
          </div>
        </div>
      </div>
    </div>`;
  }

  function renderDice() {
    if (!diceAnim) return "";
    const cls = ["d20"];
    if (diceAnim.rolling) cls.push("rolling");
    if (diceAnim.nat20) cls.push("nat20");
    if (diceAnim.nat1) cls.push("nat1");
    const inCombat = !!combat;
    return `<div class="screen" id="screen-dice">
      <div class="dice-stage">
        <div class="dice-label${inCombat ? " combat" : ""}">${esc(diceAnim.label)}</div>
        <div class="${cls.join(" ")}">${diceAnim.value}</div>
        <div class="dice-label${inCombat ? " combat" : ""}">d20</div>
      </div>
      ${inCombat ? `<div class="combat-panel" style="margin-top:8px"><div class="combat-log">${combat.log.slice(-5).map((l) => `<div class="line ${l.cls}">${esc(l.text)}</div>`).join("")}</div></div>` : ""}
    </div>`;
  }

  function renderVictory() {
    const recaps = loadRecaps();
    return `<div class="screen victory-screen" id="screen-victory">
      <div class="trophy">🏆✨</div>
      <h1>Quest Complete!</h1>
      <p class="tagline">The Crystal of Story shines. Now Char (and Vic) write the legend.</p>
      <div class="dm-box" style="text-align:left;max-width:640px;margin:12px auto">
        <div class="dm-label">Dungeon Master</div>
        <div class="dm-text">${esc(state.lastNarration || pick(DM.bossWin))}</div>
      </div>
      <p style="font-family:var(--ui);font-size:0.9rem;color:var(--ink-soft)">Loot: ${state.inventory.map(esc).join(" · ") || "—"}</p>
      <div class="recap-form" id="recap-form">
        <h3>✏️ Write Your Adventure Recap</h3>
        <div class="prompts">
          <strong>Writing prompts (pick a few):</strong>
          <ul>
            <li>Who was the bravest, and what did they do?</li>
            <li>What was the silliest moment (goblins? the Drake's scarf?)?</li>
            <li>What loot did you love most?</li>
            <li>How did the party feel when the Crystal shone?</li>
            <li>What would you explore next time in Emberdeep?</li>
          </ul>
        </div>
        <label for="recap-author">Author name</label>
        <input id="recap-author" type="text" placeholder="Char, Vic, or the whole party…" />
        <label for="recap-title">Story title</label>
        <input id="recap-title" type="text" placeholder="e.g. The Night We Beat the Shadow Drake" />
        <label for="recap-body">Your story</label>
        <textarea id="recap-body" placeholder="Once upon a torchlit night in Emberdeep Keep…"></textarea>
        <div class="btn-row" style="margin-top:14px;justify-content:flex-start">
          <button class="btn" id="btn-save-recap">Save Recap</button>
          <button class="btn secondary" id="btn-print-recap">Printable Page</button>
          <button class="btn ghost" id="btn-again">Play Again</button>
        </div>
        ${recaps.length ? `<div class="saved-list"><strong>Saved on this device:</strong><ul>${recaps.slice(0, 5).map((r) =>
          `<li>${esc(r.title || "Untitled")} — ${esc(r.author || "?")} <em>(${esc(r.date || "")})</em></li>`
        ).join("")}</ul></div>` : ""}
      </div>
    </div>`;
  }

  function renderPrint(recap) {
    const r = recap || {};
    return `<div class="screen" id="screen-print">
      <div class="print-page" id="print-area">
        <h2>🗡️ Dungeon Master Night — Adventure Recap</h2>
        <p><strong>${esc(r.title || "Untitled Adventure")}</strong></p>
        <p>By ${esc(r.author || "A brave hero")} · ${esc(r.date || "")}</p>
        <hr/>
        <p style="white-space:pre-wrap;line-height:1.6;font-size:1.05rem">${esc(r.body || "")}</p>
        <hr/>
        <p style="font-size:0.85rem;color:var(--ink-soft)">Party: Sir Bold the Knight · Willow the Ranger · Pip the Wizard<br/>
        Path: ${esc((r.path || state.path || []).join(" → "))}<br/>
        Loot: ${esc((r.loot || state.inventory || []).join(", "))}</p>
        <p style="font-size:0.8rem;font-style:italic;color:var(--ink-soft)">Boyd Family · Emberdeep Keep · Offline adventure</p>
      </div>
      <div class="btn-row no-print" style="margin-top:16px">
        <button class="btn" id="btn-do-print">Print</button>
        <button class="btn secondary" id="btn-back-victory">Back</button>
      </div>
    </div>`;
  }

  function renderRecapsOnly() {
    const recaps = loadRecaps();
    return `<div class="screen" id="screen-recaps">
      <h1 class="game-title" style="font-size:1.6rem">Story Recaps</h1>
      <p class="tagline">Saved on this device (localStorage)</p>
      ${recaps.length === 0
        ? `<p style="color:var(--ink-soft)">No stories yet — complete a quest and write one!</p>`
        : `<ul class="saved-list">${recaps.map((r, i) =>
            `<li><button class="choice-btn" data-recap="${i}" style="width:100%"><strong>${esc(r.title || "Untitled")}</strong>
              <span class="hint">by ${esc(r.author || "?")} · ${esc(r.date || "")}</span></button></li>`
          ).join("")}</ul>`}
      <div class="btn-row" style="margin-top:20px">
        <button class="btn secondary" id="btn-back-title">Back</button>
      </div>
    </div>`;
  }

  let printRecap = null;
  let showRecaps = false;

  function render() {
    const app = document.getElementById("app");
    if (!app) return;
    let main = "";
    if (showRecaps) main = renderRecapsOnly();
    else if (state.screen === "title") main = renderTitle();
    else if (state.screen === "print") main = renderPrint(printRecap);
    else if (state.screen === "victory") main = renderVictory();
    else if (state.screen === "dice") main = renderDice();
    else if (state.screen === "combat") main = renderCombat();
    else main = renderAdventure();

    app.innerHTML = `
      <div class="torch-overlay" aria-hidden="true"></div>
      <div class="shell">
        <div class="topbar">
          <span class="brand">⚔️ Dungeon Master Night</span>
          <span class="meta">${state.screen === "title" ? "Boyd Family Table" : esc((node() && node().title) || "Adventure")}</span>
          <button class="icon-btn" id="btn-mute" type="button">${mute ? "Unmute" : "Mute"}</button>
        </div>
        ${main}
      </div>
      <div class="footer-tiny">TokenMax · offline single-file · port 4354</div>
    `;
    bind();
  }

  function bind() {
    const $ = (s) => document.querySelector(s);
    const start = $("#btn-start");
    if (start) start.onclick = () => { showRecaps = false; startGame(); };
    const recapsBtn = $("#btn-recaps");
    if (recapsBtn) recapsBtn.onclick = () => { showRecaps = true; render(); };
    const backTitle = $("#btn-back-title");
    if (backTitle) backTitle.onclick = () => { showRecaps = false; state.screen = "title"; render(); };
    const muteBtn = $("#btn-mute");
    if (muteBtn) muteBtn.onclick = () => { mute = !mute; render(); };

    document.querySelectorAll(".choice-btn[data-next]").forEach((btn) => {
      btn.onclick = () => choose(btn.getAttribute("data-next"));
    });
    document.querySelectorAll(".choice-btn[data-recap]").forEach((btn) => {
      btn.onclick = () => {
        const list = loadRecaps();
        printRecap = list[Number(btn.getAttribute("data-recap"))];
        showRecaps = false;
        state.screen = "print";
        render();
      };
    });

    const pin = $("#puzzle-input");
    if (pin) {
      pin.oninput = () => { state.puzzleAnswer = pin.value; };
      pin.onkeydown = (e) => { if (e.key === "Enter") submitPuzzle(); };
    }
    const bp = $("#btn-puzzle");
    if (bp) bp.onclick = () => submitPuzzle();

    const sk = $("#btn-skill");
    if (sk) sk.onclick = () => doSkillCheck();

    const atk = $("#btn-attack");
    if (atk) atk.onclick = () => heroAttack(false);
    const satk = $("#btn-skill-atk");
    if (satk) satk.onclick = () => heroAttack(true);

    const saveR = $("#btn-save-recap");
    if (saveR) saveR.onclick = () => {
      const author = ($("#recap-author") && $("#recap-author").value) || "Hero";
      const title = ($("#recap-title") && $("#recap-title").value) || "Our Emberdeep Adventure";
      const body = ($("#recap-body") && $("#recap-body").value) || "";
      if (!body.trim()) { toast("Write a few sentences first — Char's practice time!"); return; }
      const recap = {
        author, title, body,
        date: new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
        path: state.path.slice(),
        loot: state.inventory.slice(),
      };
      saveRecap(recap);
      printRecap = recap;
      toast("Recap saved on this device!");
      render();
    };
    const pr = $("#btn-print-recap");
    if (pr) pr.onclick = () => {
      const author = ($("#recap-author") && $("#recap-author").value) || "Hero";
      const title = ($("#recap-title") && $("#recap-title").value) || "Our Emberdeep Adventure";
      const body = ($("#recap-body") && $("#recap-body").value) || "(Write your story, then print!)";
      printRecap = {
        author, title, body,
        date: new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
        path: state.path.slice(),
        loot: state.inventory.slice(),
      };
      state.screen = "print";
      render();
    };
    const again = $("#btn-again");
    if (again) again.onclick = () => { showRecaps = false; startGame(); };

    const dop = $("#btn-do-print");
    if (dop) dop.onclick = () => window.print();
    const bv = $("#btn-back-victory");
    if (bv) bv.onclick = () => { state.screen = "victory"; render(); };
  }

  /* ---------- Test API ---------- */
  function getState() {
    return {
      screen: state.screen,
      nodeId: state.nodeId,
      path: state.path.slice(),
      inventory: state.inventory.slice(),
      party: state.party.map((p) => ({ id: p.id, hp: p.hp, maxHp: p.maxHp, loot: p.loot.slice() })),
      combat: combat ? {
        phase: combat.phase,
        enemies: combat.enemies.map((e) => ({ id: e.id, hp: e.hp, maxHp: e.maxHp, name: e.name })),
        isBoss: combat.isBoss,
      } : null,
    };
  }

  /** Fast-forward helpers for smoke tests (skip dice animation). */
  function setNextRolls(arr) {
    rollQueue = arr.slice();
    return rollQueue.length;
  }

  function forceGo(nodeId) {
    return goNode(nodeId);
  }

  function quickCombatWin() {
    if (!combat) return false;
    combat.enemies.forEach((e) => { e.hp = 0; });
    finishCombat(true);
    return true;
  }

  function attackOnceSync() {
    // Synchronous attack using queued rolls (no animation) for tests
    if (!combat || combat.phase !== "hero") return { ok: false, reason: "not hero phase" };
    const hi = nextAliveHeroIndex(combat.activeHero);
    if (hi < 0) return { ok: false };
    const hero = state.party[hi];
    const foes = livingEnemies();
    if (!foes.length) { finishCombat(true); return { ok: true, won: true }; }
    const target = foes[0];
    const roll = rollD20();
    const total = roll + hero.atk;
    const hit = total >= target.ac || roll === 20;
    let dmg = 0;
    if (roll !== 1 && hit) {
      dmg = hero.atk + 3 + (roll === 20 ? 6 : 0);
      target.hp = Math.max(0, target.hp - dmg);
      pushLog(`${hero.name} hits for ${dmg} (roll ${roll})`, roll === 20 ? "crit" : "hit");
    } else {
      pushLog(`${hero.name} misses (roll ${roll})`, "miss");
    }
    if (!livingEnemies().length) { finishCombat(true); return { ok: true, won: true, roll, dmg }; }
    // sync enemy turn with rolls
    livingEnemies().forEach((foe) => {
      const heroes = aliveParty();
      if (!heroes.length) return;
      const t = heroes[0];
      const er = rollD20();
      if (er + foe.atk >= t.ac) {
        const d = foe.atk + 1;
        t.hp = Math.max(0, t.hp - d);
        pushLog(`${foe.name} hits ${t.name} for ${d}`, "miss");
      }
    });
    if (!aliveParty().length) {
      state.party.forEach((p) => { if (p.hp <= 0) p.hp = Math.floor(p.maxHp / 3); });
    }
    combat.activeHero = nextAliveHeroIndex(hi + 1);
    if (combat.activeHero < 0) combat.activeHero = nextAliveHeroIndex(0);
    state.screen = "combat";
    render();
    return { ok: true, roll, dmg };
  }

  function solveSkillSync() {
    const n = node();
    if (!n.skillCheck) return { ok: false };
    const roll = rollD20();
    const total = roll + n.skillCheck.bonus;
    const success = total >= n.skillCheck.dc;
    state.skillResolved = true;
    if (!success) state.party.forEach((p) => { p.hp = Math.max(1, p.hp - 2); });
    goNode(n.skillCheck.onSuccess);
    return { ok: true, roll, total, success };
  }

  function saveRecapTest(opts) {
    const recap = {
      author: (opts && opts.author) || "Char",
      title: (opts && opts.title) || "Test Recap",
      body: (opts && opts.body) || "We beat the Drake and found the Crystal!",
      date: new Date().toLocaleString("en-US", { timeZone: "America/New_York" }),
      path: state.path.slice(),
      loot: state.inventory.slice(),
    };
    saveRecap(recap);
    return recap;
  }

  window.__DM__ = {
    HEROES,
    NODES,
    DM,
    getState,
    reset,
    startGame,
    goNode: forceGo,
    choose,
    submitPuzzle,
    setPuzzleAnswer: (v) => { state.puzzleAnswer = v; },
    setNextRolls,
    rollD20,
    quickCombatWin,
    attackOnceSync,
    solveSkillSync,
    saveRecap: saveRecapTest,
    loadRecaps,
    getCombat: () => combat,
    PATH_ORDER,
  };

  // boot
  render();
})();
