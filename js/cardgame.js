/* ═══════════════════════════════════════════════
   CARDGAME.JS — 9-tile point phase
═══════════════════════════════════════════════ */

const CardGame = {
  tiles: [],       // array of { type: 'points'|'oni', value }
  roundPoints: 0,
  flippedCount: 0,
  oniFlipped: false,

  ALPHABET: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),

  randomLetters(count) {
    return shuffle([...this.ALPHABET]).slice(0, count);
  },

  // Card images
  ONI_IMG:      'assets/card-oni.png',

  init() {
    this.roundPoints = 0;
    this.flippedCount = 0;
    this.oniFlipped = false;
    this.tiles = this.generateTiles();

    const team = App.activeTeam();
    document.getElementById('cardgame-team-label').textContent =
      `${team.name} – Choose some cards!`;

    // Start with Keep! disabled until a card is flipped
    const keepBtn = document.getElementById('keep-btn');
    keepBtn.textContent = 'Keep!';
    keepBtn.style.background = '';
    keepBtn.style.color = '';
    keepBtn.disabled = true;
    keepBtn.onclick = () => CardGame.keep();

    this.updateRoundPoints();
    this.renderOmamori();
    this.renderScores();
    this.renderGrid();
  },

  renderScores() {
    const el = document.getElementById('cardgame-scores');
    el.innerHTML = App.teams.map((team, i) => `
      <div class="panel-score-row ${i === App.activeTeamIndex ? 'active-team' : ''}">
        <span class="panel-score-name">${team.name}</span>
        <span class="panel-score-value">${team.score}</span>
      </div>
    `).join('');
  },

  generateTiles() {
    // Build 8 point tiles
    const pointTiles = [];
    for (let i = 0; i < 8; i++) {
      pointTiles.push({ type: 'points', value: Math.floor(Math.random() * 5) + 1 });
    }
    const oni = { type: 'oni', value: -5 };

    const leaderScore = Math.max(...App.teams.map(t => t.score));
    const myScore = App.activeTeam().score;
    const needsHelp = leaderScore > 0 && myScore < leaderScore * 0.6;

    // Shuffle the point tiles first
    const shuffledPoints = shuffle(pointTiles);

    if (needsHelp) {
      // Oni goes last — team is too far behind
      return [...shuffledPoints, oni];
    } else {
      // Oni goes somewhere between index 2 and 8 (never first or second)
      const oniPos = 2 + Math.floor(Math.random() * 7);
      const result = [...shuffledPoints];
      result.splice(oniPos, 0, oni);
      return result;
    }
  },

  renderGrid() {
    const grid = document.getElementById('tile-grid');
    const letters = this.randomLetters(9);
    grid.innerHTML = this.tiles.map((tile, i) => `
      <div class="tile" data-index="${i}">
        <span class="tile-letter">${letters[i]}</span>
      </div>
    `).join('');

    grid.querySelectorAll('.tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const index = parseInt(tile.dataset.index);
        if (tile.classList.contains('flipped')) return;
        this.flipTile(tile, index);
      });
    });
  },

  flipTile(el, index) {
    let tile = this.tiles[index];

    // If oni shows up before 2 point cards have been flipped,
    // secretly swap it with a random unflipped point tile
    if (tile.type === 'oni' && this.flippedCount < 2) {
      const safeIndex = this.tiles.findIndex(
        (t, i) => t.type === 'points' && i !== index &&
        !document.querySelector(`.tile[data-index="${i}"]`)?.classList.contains('flipped')
      );
      if (safeIndex !== -1) {
        // Swap in the array
        [this.tiles[index], this.tiles[safeIndex]] = [this.tiles[safeIndex], this.tiles[index]];
        tile = this.tiles[index];
      }
    }

    el.classList.add('flipping', 'flipped');

    setTimeout(() => {
      el.classList.remove('flipping');

      if (tile.type === 'oni') {
        this.revealOni(el);
      } else {
        this.revealPoints(el, tile.value);
      }
    }, 150);
  },

  revealPoints(el, value) {
    this.roundPoints += value;
    this.flippedCount++;

    el.classList.add('revealed-points');
    el.innerHTML = `
      <div class="tile-content">
        <span class="tile-points-text">+${value} point${value > 1 ? 's' : ''}</span>
        <img class="tile-img" src="assets/card-points-${value}.png" alt="${value} points" onerror="this.style.display='none'" />
      </div>`;

    // Enable Keep! after first flip
    if (this.flippedCount === 1) {
      const btn = document.getElementById('keep-btn');
      btn.disabled = false;
    }

    this.updateRoundPoints();
  },

  revealOni(el) {
    this.oniFlipped = true;
    el.classList.add('revealed-oni');
    el.innerHTML = `
      <div class="tile-content">
        <span class="tile-points-text" style="color:var(--oni-red)">–5 points</span>
        <img class="tile-img" src="${this.ONI_IMG}" alt="Oni" onerror="this.style.display='none'" />
      </div>`;

    // Disable all unflipped tiles
    document.querySelectorAll('.tile:not(.flipped)').forEach(t => {
      t.classList.add('flipped', 'tile-dead');
    });

    const team = App.activeTeam();

    if (team.omamori > 0) {
      this.flyOmamoriToOni(el, () => {
        team.omamori--;
        this.renderOmamori();
        this.setConfirmBtn('Keep!', 'green', () => this.endTurn(this.roundPoints, true));
      });
    } else {
      this.roundPoints += -5;
      this.updateRoundPoints();
      this.setConfirmBtn('Back to Scoreboard', 'red', () => this.endTurn(this.roundPoints, false));
    }
  },

  updateRoundPoints() {
    const el = document.getElementById('round-points');
    const sign = this.roundPoints >= 0 ? '+' : '';
    el.textContent = `${sign}${this.roundPoints}`;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
    el.addEventListener('animationend', () => el.classList.remove('pop'), { once: true });
  },

  renderOmamori() {
    const el = document.getElementById('cardgame-omamori-row');
    if (!el) return;
    el.innerHTML = omamoriSlotsHTML(App.activeTeam().omamori);
  },

  keep() {
    document.querySelectorAll('.tile:not(.flipped)').forEach(t => {
      t.classList.add('flipped', 'tile-dead');
    });
    this.endTurn(this.roundPoints, false);
  },

  setConfirmBtn(label, color, callback) {
    const btn = document.getElementById('keep-btn');
    btn.textContent = label;
    btn.disabled = false;
    btn.style.background = color === 'red' ? 'var(--oni-red)' : 'var(--confirm)';
    btn.style.color = 'var(--text-inverse)';
    btn.onclick = callback;
  },

  flyOmamoriToOni(oniEl, callback) {
    // Transition the oni card to protected state
    setTimeout(() => {
      // Change stroke to purple
      oniEl.style.borderColor = 'var(--omamori)';

      // Cross out the points text
      const pointsText = oniEl.querySelector('.tile-points-text');
      if (pointsText) {
        pointsText.style.textDecoration = 'line-through';
        pointsText.style.color = 'var(--text-muted)';
      }

      // Replace oni image with omamori image — same size as oni
      const img = oniEl.querySelector('.tile-img');
      if (img) {
        img.style.transition = 'opacity 0.3s ease';
        img.style.opacity = '0';
        setTimeout(() => {
          img.src = 'assets/card-omamori.png';
          img.style.opacity = '1';
          img.style.width = '55%';
          img.style.maxHeight = '55%';
        }, 300);
      }

      setTimeout(callback, 500);
    }, 200);
  },

  endTurn(points, wasProtected) {
    App.advanceTurn(App.activeTeamIndex, points);
  },
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}