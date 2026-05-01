/* ═══════════════════════════════════════════════
   QUESTION.JS
═══════════════════════════════════════════════ */

const Question = {
  load() {
    const q = getNextQuestion();
    if (!q) return;
    App.currentQuestion = q;
    this.render(q);
  },

  render(q) {
    const team = App.activeTeam();
    const mode = q.pair ? 'Ask 1 friend' : 'Please answer';
    document.getElementById('question-team-label').textContent = `${team.name} – ${mode}`;

    const qaCard       = document.querySelector('.question-card');
    const imageWrap    = document.getElementById('question-image-wrap');
    const bubblesWrap  = document.getElementById('question-bubbles-wrap');
    const skitWrap     = document.getElementById('question-skit-wrap');

    // Reset all panels
    qaCard.classList.remove('hidden');
    imageWrap.classList.add('hidden');
    imageWrap.classList.remove('skit-image');
    bubblesWrap.classList.add('hidden');
    skitWrap.classList.add('hidden');

    if (q.type === 'A') {
      imageWrap.classList.remove('hidden');
      const img = document.getElementById('question-image');
      img.src = q.image || '';
      img.style.display = q.image ? 'block' : 'none';
      imageWrap.style.background = q.image ? '' : 'var(--surface-inset)';
      document.getElementById('question-text').textContent = q.question;

      // Scaffold is tappable for Type A — reveals answer in green
      const scaffoldEl = document.getElementById('question-scaffold');
      scaffoldEl.textContent = q.scaffold;
      scaffoldEl.style.color = '';
      scaffoldEl.style.cursor = 'pointer';
      scaffoldEl.classList.add('tappable');
      scaffoldEl.onclick = () => {
        if (q.answer) {
          scaffoldEl.textContent = q.answer;
          scaffoldEl.style.color = 'var(--confirm)';
          scaffoldEl.style.cursor = 'default';
          scaffoldEl.classList.remove('tappable');
          scaffoldEl.onclick = null;
        }
      };

    } else if (q.type === 'B') {
      bubblesWrap.classList.remove('hidden');
      document.getElementById('question-text').textContent = q.question;
      const scaffoldEl = document.getElementById('question-scaffold');
      scaffoldEl.textContent = q.scaffold;
      scaffoldEl.style.color = '';
      scaffoldEl.style.cursor = 'default';
      scaffoldEl.classList.remove('tappable');
      scaffoldEl.onclick = null;
      this.renderBubbles(q.helperImages || []);

    } else if (q.type === 'C') {
      qaCard.classList.add('hidden');
      skitWrap.classList.remove('hidden');
      imageWrap.classList.remove('hidden');
      imageWrap.classList.remove('skit-image');
      const img = document.getElementById('question-image');
      img.src = q.image || '';
      img.style.display = q.image ? 'block' : 'none';
      imageWrap.style.background = q.image ? '' : 'var(--surface-inset)';
      this.renderSkit(q.dialogue || []);
    }
  },

  renderSkit(dialogue) {
    const container = document.getElementById('question-skit');
    container.innerHTML = dialogue.map(line => `
      <div class="skit-line ${line.blanks ? 'skit-has-blanks' : ''}">
        <span class="skit-speaker ${line.speaker === 'A' ? 'skit-speaker-a' : 'skit-speaker-b'}">${line.speaker}</span>
        <span class="skit-text">${line.text}</span>
      </div>
    `).join('');
  },

  renderBubbles(images) {
    const container = document.getElementById('question-bubbles');
    if (!images.length) {
      container.innerHTML = `
        <div style="grid-column:1/-1;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:14px;font-weight:700;">
          Helper images coming soon
        </div>`;
      return;
    }
    container.innerHTML = images.map(src => `
      <div class="bubble-item">
        <img src="${src}" alt="" />
      </div>
    `).join('');
  },
};

function personIcon() {
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="8" cy="5" r="3" stroke="currentColor" stroke-width="1.5"/>
    <path d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`;
}