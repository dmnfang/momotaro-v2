/* ═══════════════════════════════════════════════
   RARE.JS — 2×2 rare tile phase
═══════════════════════════════════════════════ */

const Rare = {
  tiles: [],      // [{ type: 'points'|'omamori'|'swap', value? }]
  chosen: false,
  swapTarget: null,

  ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),

  randomLetters(count) {
    return shuffle([...this.ALPHABET]).slice(0, count);
  },

  OMAMORI_IMG:     'assets/card-omamori.png',
  SWAP_IMG:        'assets/card-swap.png',
  RARE_POINTS_IMG: 'assets/card-points-rare.png',

  init() {
    this.chosen = false;
    this.swapTarget = null;
    this.tiles = this.generateTiles();

    const team = App.activeTeam();
    document.getElementById('rare-team-label').textContent =
      `${team.name} – Choose 1 rare card!`;

    this.renderGrid();
    this.resetPanel();
  },

  generateTiles() {
    const allZero = App.teams.every(t => t.score === 0);

    // If all scores are 0 swap is pointless — replace with another points tile
    const tiles = [
      allZero ? { type: 'points', value: 7 } : { type: 'swap' },
      { type: 'omamori' },
      { type: 'points', value: 7 },
      { type: 'points', value: 7 },
    ];
    return shuffle(tiles);
  },

  renderGrid() {
    const grid = document.getElementById('rare-grid');
    const letters = this.randomLetters(4);
    grid.innerHTML = this.tiles.map((tile, i) => `
      <div class="rare-tile" data-index="${i}">
        <span class="rare-tile-letter">${letters[i]}</span>
      </div>
    `).join('');

    grid.querySelectorAll('.rare-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        if (this.chosen) return;
        const index = parseInt(tile.dataset.index);
        this.flipTile(tile, index);
      });
    });
  },

  flipTile(el, index) {
    const tile = this.tiles[index];
    this.chosen = true;

    // Only the chosen tile flips — others just become unclickable
    el.classList.add('flipped', 'selected-rare', 'flipping');

    setTimeout(() => {
      el.classList.remove('flipping');
      this.revealTile(el, tile);
    }, 150);
  },

  revealTile(el, tile) {
    if (tile.type === 'points') {
      el.innerHTML = `
        <div class="tile-content">
          <span class="tile-points-text" style="color:var(--text-primary)">+${tile.value} points</span>
          <img class="tile-img" src="${this.RARE_POINTS_IMG}" alt="${tile.value} points" onerror="this.style.display='none'" />
        </div>`;
      this.showPointsPanel(tile.value);
    } else if (tile.type === 'omamori') {
      el.innerHTML = `
        <div class="tile-content">
          <span class="tile-points-text">Omamori!</span>
          <img class="tile-img" src="${this.OMAMORI_IMG}" alt="Omamori" onerror="this.style.display='none'" />
        </div>`;
      this.showOmamoriPanel();
    } else if (tile.type === 'swap') {
      el.innerHTML = `
        <div class="tile-content">
          <span class="tile-points-text" style="font-weight:900">Swap!</span>
          <img class="tile-img" src="${this.SWAP_IMG}" alt="Swap" onerror="this.style.display='none'" />
        </div>`;
      this.showSwapPanel();
    }
  },

  resetPanel() {
    const panel = document.getElementById('rare-panel');
    panel.innerHTML = `
      <div class="rare-panel-title" style="color:var(--text-muted)">Flip a card to reveal your reward</div>
    `;
  },

  showPointsPanel(value) {
    const panel = document.getElementById('rare-panel');
    panel.innerHTML = `
      <div class="rare-panel-title">You got ${value} points!</div>
      <div class="rare-panel-body">
        <div class="rare-panel-value">+${value}</div>
      </div>
      <button class="rare-confirm-btn" id="rare-confirm">End Turn</button>
    `;
    document.getElementById('rare-confirm').onclick = () => {
      App._lastTurnResult = `Rare (+${value} points)`;
      App.advanceTurn(App.activeTeamIndex, value);
    };
  },

  showOmamoriPanel() {
    const panel = document.getElementById('rare-panel');
    const currentCount = App.teams[App.activeTeamIndex].omamori;
    const newCount = Math.min(currentCount + 1, 2);
    const alreadyMax = currentCount >= 2;

    panel.innerHTML = `
      <div class="rare-panel-title">${alreadyMax ? 'Already at max omamori!' : 'You got an omamori!'}</div>
      <div class="rare-panel-body">
        <img class="rare-panel-img" src="${this.OMAMORI_IMG}" alt="Omamori" />
        <div class="rare-panel-omamori-count">You now have <span class="omamori-count-num">${newCount}</span> omamori (max 2)</div>
      </div>
      <button class="rare-confirm-btn" id="rare-confirm">Confirm</button>
    `;
    document.getElementById('rare-confirm').onclick = () => {
      App._lastTurnResult = 'Rare (omamori)';
      if (!alreadyMax) App.teams[App.activeTeamIndex].omamori = newCount;
      App.advanceTurn(null, 0);
    };
  },
  showSwapPanel() {
    const panel = document.getElementById('rare-panel');
    const currentIdx = App.activeTeamIndex;

    const teamRows = App.teams.map((team, i) => `
      <div class="swap-team-row ${i === currentIdx ? 'current-team' : ''}" data-team="${i}">
        <span class="swap-team-name">${team.name}</span>
        <span class="swap-team-score">${team.score}</span>
      </div>
    `).join('');

    panel.innerHTML = `
      <div class="rare-panel-title">Choose a team to swap with...</div>
      <div class="rare-panel-body">
        <div class="swap-team-list">${teamRows}</div>
      </div>
      <button class="rare-confirm-btn" id="rare-confirm" disabled>Confirm</button>
    `;

    // Bind row selection
    panel.querySelectorAll('.swap-team-row:not(.current-team)').forEach(row => {
      row.addEventListener('click', () => {
        panel.querySelectorAll('.swap-team-row').forEach(r => r.classList.remove('selected-swap'));
        row.classList.add('selected-swap');
        this.swapTarget = parseInt(row.dataset.team);
        document.getElementById('rare-confirm').disabled = false;
      });
    });

    document.getElementById('rare-confirm').addEventListener('click', () => {
      if (this.swapTarget === null) return;
      App._lastTurnResult = 'Rare (swap)';
      App.goTo('scoreboard');
      Scoreboard.render();
      Scoreboard.animateSwap(currentIdx, this.swapTarget, () => {
        App.advanceTurn(null, 0);
      });
    });
  },
};

// shuffle is defined in cardgame.js — loaded first