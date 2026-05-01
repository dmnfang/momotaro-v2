/* ═══════════════════════════════════════════════
   DATA.JS — Library loading + question sampling
═══════════════════════════════════════════════ */

window.LIBRARY = null;

async function loadLibrary() {
  const res = await fetch('data/library.json');
  window.LIBRARY = await res.json();
}

// Returns the unit list for a given grade
function getUnits(grade) {
  if (!LIBRARY) return [];
  return LIBRARY[`grade${grade}`]?.units || [];
}

// Samples n questions evenly across selected units
// Returns array of question objects
function sampleQuestions(grade, selectedUnitIds, count = 26) {
  if (!LIBRARY) return [];
  const units = getUnits(grade).filter(u => selectedUnitIds.includes(u.id));
  if (!units.length) return [];

  // Pool all questions from selected units, tagged with unit
  const pool = [];
  units.forEach(unit => {
    unit.questions.forEach(q => pool.push({ ...q, unitId: unit.id, unitName: unit.name }));
  });

  if (!pool.length) return [];

  // Shuffle and return up to count
  return shuffle([...pool]).slice(0, count);
}

// Builds a full shuffled question pool from selected units
function buildQuestionPool(grade, selectedUnitIds) {
  if (!LIBRARY) return [];
  const units = getUnits(grade).filter(u => selectedUnitIds.includes(u.id));
  const pool = [];
  units.forEach(unit => {
    unit.questions.forEach(q => pool.push({ ...q, unitId: unit.id }));
  });
  return shuffle([...pool]);
}

// Get next question using shared pool then per-team fallback
function getNextQuestion() {
  // Phase 1: shared pool
  if (App.sharedQueue && App.sharedQueue.length > 0) {
    return App.sharedQueue.shift();
  }

  // Phase 2: per-team personal queue
  const teamIndex = App.activeTeamIndex;
  if (!App.teamQueues[teamIndex] || App.teamQueues[teamIndex].length === 0) {
    App.teamQueues[teamIndex] = buildQuestionPool(App.grade, App.selectedUnits);
  }
  return App.teamQueues[teamIndex].shift() || null;
}

// Renders a universal 2-slot omamori grid
function omamoriSlotsHTML(count) {
  return `<div class="omamori-slots">
    <div class="omamori-slot ${count >= 1 ? '' : 'empty'}">
      <img src="assets/card-omamori.png" alt="omamori" />
    </div>
    <div class="omamori-slot ${count >= 2 ? '' : 'empty'}">
      <img src="assets/card-omamori.png" alt="omamori" />
    </div>
  </div>`;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}