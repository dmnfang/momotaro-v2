/* ═══════════════════════════════════════════════
   APP.JS — Router, global state, screen transitions
═══════════════════════════════════════════════ */

const App = {
  // ── Global state ──────────────────────────────
  grade: null,
  selectedUnits: [],
  teamCount: 2,
  teams: [],
  activeTeamIndex: 0,
  currentQuestion: null,
  sharedQueue: [],
  teamQueues: [],
  turnHistory: [],

  // ── Screen references ──────────────────────────
  screens: {},

  init() {
    this.screens = {
      home:       document.getElementById('screen-home'),
      setup:      document.getElementById('screen-setup'),
      scoreboard: document.getElementById('screen-scoreboard'),
      question:   document.getElementById('screen-question'),
      cardgame:   document.getElementById('screen-cardgame'),
      rare:       document.getElementById('screen-rare'),
    };

    this.bindHomeEvents();
    this.bindSetupEvents();
    this.bindScoreboardEvents();
    this.bindQuestionEvents();
    this.bindCardgameEvents();
    this.bindRareEvents();

    loadLibrary().then(() => {
      console.log('Library loaded');
    });
  },

  // ── Navigation ─────────────────────────────────
  goTo(screenId) {
    Object.values(this.screens).forEach(s => s.classList.remove('active'));
    this.screens[screenId].classList.add('active');
  },

  // ── Home ──────────────────────────────────────
  bindHomeEvents() {
    document.querySelectorAll('.grade-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.grade = parseInt(btn.dataset.grade);
        this.selectedUnits = [];
        this.openSetup();
      });
    });
  },

  // ── Setup ─────────────────────────────────────
  openSetup() {
    document.getElementById('setup-grade-label').textContent = `Grade ${this.grade}`;
    this.teamCount = 2;
    this.renderTeamToggle();
    this.renderUnitGrid();
    this.updateLaunchBtn();
    this.goTo('setup');
  },

  bindSetupEvents() {
    document.getElementById('setup-back').addEventListener('click', () => this.goTo('home'));

    document.getElementById('setup-expand').addEventListener('click', () => {
      this.toggleFullscreen();
    });

    document.getElementById('launch-btn').addEventListener('click', () => {
      if (this.selectedUnits.length === 0) return;
      this.launchGame();
    });
  },

  renderTeamToggle() {
    document.querySelectorAll('.team-count-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.count) === this.teamCount);
      btn.onclick = () => {
        this.teamCount = parseInt(btn.dataset.count);
        this.renderTeamToggle();
      };
    });
  },

  renderUnitGrid() {
    const grid = document.getElementById('unit-grid');
    const gradeKey = `grade${this.grade}`;
    const units = LIBRARY?.[gradeKey]?.units || [];

    grid.innerHTML = units.map(unit => `
      <div class="unit-card" data-unit-id="${unit.id}">
        <div class="unit-card-header">
          <span class="unit-card-title">${unit.name}</span>
          <div class="unit-dot">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 7l3.5 3.5L12 3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </div>
        <span class="unit-chip">${unit.questions.length} questions</span>
      </div>
    `).join('');

    grid.querySelectorAll('.unit-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.unitId;
        if (this.selectedUnits.includes(id)) {
          this.selectedUnits = this.selectedUnits.filter(u => u !== id);
          card.classList.remove('selected');
        } else {
          this.selectedUnits.push(id);
          card.classList.add('selected');
        }
        this.updateLaunchBtn();
      });
    });
  },

  updateLaunchBtn() {
    const btn = document.getElementById('launch-btn');
    const count = this.selectedUnits.length;
    btn.disabled = count === 0;
    btn.textContent = count === 0 ? 'Select a unit to launch' : 'Launch';

    const countEl = document.getElementById('units-selected-count');
    countEl.textContent = count === 0 ? '0 selected' : `${count} unit${count > 1 ? 's' : ''} selected`;
  },

  // ── Launch ────────────────────────────────────
  launchGame() {
    this.teams = Array.from({ length: this.teamCount }, (_, i) => ({
      name: `Team ${i + 1}`,
      score: 0,
      omamori: 0,
    }));
    this.activeTeamIndex = 0;
    this.sharedQueue = buildQuestionPool(this.grade, this.selectedUnits);
    this.teamQueues = Array.from({ length: this.teamCount }, () => []);

    Scoreboard.render();
    this.goTo('scoreboard');
  },

  // ── Scoreboard ────────────────────────────────
  bindScoreboardEvents() {
    document.getElementById('scoreboard-back').addEventListener('click', () => {
      this.goTo('setup');
    });
    document.getElementById('scoreboard-expand').addEventListener('click', () => {
      this.toggleFullscreen();
    });
  },

  // ── Question ──────────────────────────────────
  bindQuestionEvents() {
    document.getElementById('question-new').onclick = () => {
      Question.load();
    };

    document.getElementById('question-play').onclick = () => {
      this.playCardGame();
    };
  },

  playCardGame() {
    if (Math.random() < 0.30) {
      Rare.init();
      this.goTo('rare');
    } else {
      CardGame.init();
      this.goTo('cardgame');
    }
  },

  openQuestion(teamIndex) {
    this._playBusy = false;
    this.activeTeamIndex = teamIndex;
    const team = this.teams[teamIndex];
    document.getElementById('question-team-label').textContent = team.name;
    const loaded = Question.load();
    if (loaded) this.goTo('question');
  },

  // ── Card game ─────────────────────────────────
  bindCardgameEvents() {
    // keep-btn onclick is set dynamically by cardgame.js
  },

  // ── Rare ──────────────────────────────────────
  bindRareEvents() {
    // Rare confirm button is dynamic, bound in rare.js
  },

  // ── Helpers ───────────────────────────────────
  activeTeam() {
    return this.teams[this.activeTeamIndex];
  },

  applyPoints(delta) {
    this.teams[this.activeTeamIndex].score += delta;
    Scoreboard.updateScore(this.activeTeamIndex);
  },

  overrideTurn(teamIndex) {
    this.activeTeamIndex = teamIndex;
    Scoreboard.render();
  },

  advanceTurn(scoringTeamIndex = null, delta = 0, skipRender = false) {
    this._playBusy = false;

    const teamIndex = scoringTeamIndex ?? this.activeTeamIndex;
    const oldScore = this.teams[teamIndex].score;
    const newScore = oldScore + delta;

    // Log completed turn
    const completingTeam = this.teams[teamIndex];
    if (completingTeam) this.turnHistory.push({
      name: completingTeam.name,
      result: this._lastTurnResult || '?'
    });
    this._lastTurnResult = null;

    // Advance turn index
    this.activeTeamIndex = (this.activeTeamIndex + 1) % this.teamCount;

    if (skipRender) {
      // Already on scoreboard — just update active column highlight without full re-render
      this.teams[teamIndex].score = newScore;
      document.querySelectorAll('.team-column').forEach((col, i) => {
        col.classList.toggle('active', i === this.activeTeamIndex);
        const btn = col.querySelector('.question-trigger-btn');
        if (btn) {
          btn.classList.toggle('inactive', i !== this.activeTeamIndex);
          btn.onclick = () => App.openQuestion(i);
        }
      });
    } else {
      // Render with old score then animate to new
      this.teams[teamIndex].score = oldScore;
      Scoreboard.render();
      this.goTo('scoreboard');
      this.teams[teamIndex].score = newScore;
      if (delta !== 0) {
        Scoreboard.animateScoreChange(teamIndex, oldScore, newScore);
      }
    }
  },

  showHistory() {
    const overlay = document.getElementById('history-overlay');
    const content = document.getElementById('history-content');
    const rounds = [];
    let round = [];

    this.turnHistory.forEach((entry, i) => {
      round.push(entry);
      if (round.length === this.teamCount || i === this.turnHistory.length - 1) {
        rounds.push([...round]);
        round = [];
      }
    });

    if (rounds.length === 0) {
      content.innerHTML = '<div>No turns completed yet.</div>';
    } else {
      content.innerHTML = rounds.map((r, i) =>
        `<div><strong style="color:var(--text-primary)">Round ${i + 1}:</strong> ${
          r.map(e => `${e.name} – <strong>${e.result}</strong>`).join(', ')
        }</div>`
      ).join('');
    }

    overlay.style.display = 'flex';
  },

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  },
};

// ── Boot ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());