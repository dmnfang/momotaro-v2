/* ═══════════════════════════════════════════════
   SCOREBOARD.JS
═══════════════════════════════════════════════ */

const Scoreboard = {
  render() {
    const container = document.getElementById('scoreboard-columns');
    container.dataset.teams = App.teamCount;
    container.innerHTML = App.teams.map((team, i) => `
      <div class="team-column ${i === App.activeTeamIndex ? 'active' : ''}" data-team="${i}">
        <div class="team-column-name">${team.name}</div>
        <div class="team-score-group">
          <div class="team-column-score" id="score-${i}">${team.score}</div>
          <div class="omamori-display" id="omamori-${i}">
            ${omamoriSlotsHTML(team.omamori)}
          </div>
        </div>
        <button class="question-trigger-btn ${i === App.activeTeamIndex ? '' : 'invisible'}" id="question-btn-${i}">Question</button>
      </div>
    `).join('');

    // Apply digit classes after render
    App.teams.forEach((team, i) => {
      const el = document.getElementById(`score-${i}`);
      if (el) this.updateDigitClass(el, team.score);
    });

    App.teams.forEach((_, i) => {
      const btn = document.getElementById(`question-btn-${i}`);
      if (btn) btn.onclick = () => App.openQuestion(i);
    });
  },

  renderOmamori(teamIndex) {
    const el = document.getElementById(`omamori-${teamIndex}`);
    if (!el) return;
    el.innerHTML = omamoriSlotsHTML(App.teams[teamIndex].omamori);
  },

  updateDigitClass(el, score) {
    el.classList.toggle('three-digits', Math.abs(score) >= 100);
  },

  updateScore(teamIndex) {
    const el = document.getElementById(`score-${teamIndex}`);
    if (!el) return;
    el.textContent = App.teams[teamIndex].score;
    this.updateDigitClass(el, App.teams[teamIndex].score);
    el.classList.remove('score-pop');
    void el.offsetWidth;
    el.classList.add('score-pop');
    el.addEventListener('animationend', () => el.classList.remove('score-pop'), { once: true });
  },

  updateOmamori(teamIndex) {
    const el = document.getElementById(`omamori-${teamIndex}`);
    if (!el) return;
    el.innerHTML = this.renderOmamori(App.teams[teamIndex].omamori);
  },

  // Animate score counting from old to new value
  animateScoreChange(teamIndex, oldScore, newScore) {
    const el = document.getElementById(`score-${teamIndex}`);
    if (!el) return;

    const delta = newScore - oldScore;
    const isPositive = delta >= 0;
    const duration = 600;
    const steps = 20;
    const stepMs = duration / steps;
    const stepVal = delta / steps;

    // Flash color to signal change
    el.style.transition = `color 0.2s ease`;
    el.style.color = isPositive ? 'var(--confirm)' : 'var(--oni-red)';

    let current = oldScore;
    let step = 0;

    const tick = setInterval(() => {
      step++;
      current += stepVal;
      el.textContent = Math.round(current);

      if (step >= steps) {
        clearInterval(tick);
        el.textContent = newScore;
        this.updateDigitClass(el, newScore);
        // Fade back to normal blue
        setTimeout(() => {
          el.style.transition = 'color 0.5s ease';
          el.style.color = '';
          setTimeout(() => { el.style.transition = ''; }, 550);
        }, 200);
      }
    }, stepMs);
  },
  animateSwap(fromIndex, toIndex, callback) {
    const fromEl = document.getElementById(`score-${fromIndex}`);
    const toEl   = document.getElementById(`score-${toIndex}`);
    if (!fromEl || !toEl) { callback?.(); return; }

    const els = [fromEl, toEl];
    const PULSE_COUNT = 3;
    const PULSE_MS    = 300;

    // Inject keyframe if not already present
    if (!document.getElementById('swap-keyframes')) {
      const style = document.createElement('style');
      style.id = 'swap-keyframes';
      style.textContent = `
        @keyframes swapPulse {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.18); }
        }
      `;
      document.head.appendChild(style);
    }

    els.forEach(el => {
      el.style.transition = `color ${PULSE_MS}ms ease`;
    });

    let pulse = 0;

    const doPulse = () => {
      if (pulse >= PULSE_COUNT) {
        // Final beat: swap values, hold red briefly, then fade to blue
        const tmp = App.teams[fromIndex].score;
        App.teams[fromIndex].score = App.teams[toIndex].score;
        App.teams[toIndex].score = tmp;

        els.forEach(el => {
          el.style.animation = 'swapPulse 0.35s cubic-bezier(0.34,1.56,0.64,1)';
        });
        fromEl.textContent = App.teams[fromIndex].score;
        toEl.textContent   = App.teams[toIndex].score;

        setTimeout(() => {
          els.forEach(el => {
            el.style.transition = 'color 0.6s ease';
            el.style.color = '';
            el.style.animation = '';
          });
          setTimeout(() => {
            els.forEach(el => { el.style.transition = ''; });
            callback?.();
          }, 650);
        }, 400);
        return;
      }

      // Toggle red on odd pulses, back on even
      const toRed = pulse % 2 === 0;
      els.forEach(el => {
        el.style.color = toRed ? 'var(--oni-red)' : '#6AB4E8';
      });
      pulse++;
      setTimeout(doPulse, PULSE_MS);
    };

    doPulse();
  },
};