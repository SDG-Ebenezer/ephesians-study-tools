// flashcards.js — flashcard testing mode for verses

document.addEventListener("DOMContentLoaded", () => {
  const passage = document.getElementById("passage");
  if (!passage) return;

  // Add Flashcards button
  const controls = document.querySelector(".controls");
  const flashBtn = document.createElement("button");
  flashBtn.id = "flashcardsBtn";
  flashBtn.textContent = "Flashcards";
  controls.appendChild(flashBtn);

  const verses = Array.from(passage.querySelectorAll("div"));
  const flashUI = document.createElement("div");
  flashUI.id = "flashcardMode";
  flashUI.style.display = "none";
  flashUI.innerHTML = `
    <div id="flashcardContainer" class="verse"></div>
    <div class="flashControls" style="margin-top:1em;">
      <button id="checkVerse">Check</button>
      <button id="revealVerse">Reveal</button>
      <button id="nextVerse">Next</button>
      <button id="exitFlashcards">Exit Flashcards</button>
    </div>
    <div id="flashProgress" style="margin-top:8px;"></div>
    <div id="flashSummary" style="display:none; margin-top:1em;"></div>
  `;
  passage.parentNode.insertBefore(flashUI, passage.nextSibling);

  let shuffled = [];
  let current = 0;
  const results = [];

  function shuffle(array) {
    const a = array.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function enterFlashMode() {
    passage.style.display = "none";
    flashUI.style.display = "block";
    shuffled = shuffle(verses);
    current = 0;
    results.length = 0;
    showVerse();
  }

  function exitFlashMode() {
    flashUI.style.display = "none";
    passage.style.display = "block";
    document.getElementById("flashSummary").style.display = "none";
  }

  function showVerse() {
    const verse = shuffled[current];
    if (!verse) {
      showSummary();
      return;
    }
    const container = document.getElementById("flashcardContainer");
    container.innerHTML = verse.outerHTML;

    // reset inputs
    container.querySelectorAll("input.greek").forEach(inp => {
      inp.value = "";
      inp.classList.remove("correct","incorrect","revealed","hint");
      inp.removeAttribute("readonly");
    });

    document.getElementById("flashProgress").textContent =
      `Verse ${verse.querySelector("strong")?.textContent || '?'} (${current+1}/${verses.length})`;
  }

  // --- CORE CHECK FUNCTION (no annoying confirm boxes)
  function checkCurrentVerse() {
    const container = document.getElementById("flashcardContainer");
    const inputs = Array.from(container.querySelectorAll("input.greek"));
    let allCorrect = true;

    inputs.forEach(inp => {
      // temporarily suppress per-word reveal prompts
      const inst = inp.dataset.instance;
      if (inst && typeof askedReveal !== "undefined") askedReveal[inst] = true;
      const res = gradeSingleInput(inp);
      if (res !== "correct") allCorrect = false;
    });

    const verseNum = container.querySelector("strong")?.textContent || "?";
    results.push({ verseNum, correct: allCorrect });

    // restore askedReveal to false so normal mode still works later
    inputs.forEach(inp => {
      const inst = inp.dataset.instance;
      if (inst && typeof askedReveal !== "undefined") askedReveal[inst] = false;
    });

    alert(allCorrect ? `Verse ${verseNum}: ✅ All correct!` : `Verse ${verseNum}: ❌ Some incorrect`);
  }

  // --- REVEAL CURRENT VERSE (no prompts)
  function revealCurrentVerse() {
    const container = document.getElementById("flashcardContainer");
    const inputs = container.querySelectorAll("input.greek");
    inputs.forEach(inp => {
      revealSingle(inp, true); // immediate reveal
    });
  }

  function nextVerse() {
    current++;
    if (current < shuffled.length) showVerse();
    else showSummary();
  }

  function showSummary() {
    const summary = document.getElementById("flashSummary");
    summary.style.display = "block";
    const wrong = results.filter(r => !r.correct);
    if (!wrong.length) {
      summary.innerHTML = `<h3>All verses correct! 🎉</h3>
        <button id="exitAfterSummary">Exit Flashcards</button>`;
    } else {
      summary.innerHTML = `
        <h3>Review Needed</h3>
        <p>You missed ${wrong.length} verse${wrong.length>1?'s':''}: ${wrong.map(r=>r.verseNum).join(', ')}</p>
        <button id="retestWrong">Retest Missed</button>
        <button id="exitAfterSummary">Exit Flashcards</button>`;
    }
    document.getElementById("flashcardContainer").innerHTML = "";
    document.getElementById("flashProgress").textContent = "";

    document.getElementById("exitAfterSummary").onclick = exitFlashMode;
    const retest = document.getElementById("retestWrong");
    if (retest) {
      retest.onclick = () => {
        shuffled = verses.filter(v => {
          const num = v.querySelector("strong")?.textContent || "?";
          return wrong.some(r => r.verseNum === num);
        });
        current = 0;
        results.length = 0;
        showVerse();
      };
    }
  }

  // --- BUTTON HANDLERS ---
  flashBtn.addEventListener("click", enterFlashMode);
  flashUI.querySelector("#checkVerse").addEventListener("click", checkCurrentVerse);
  flashUI.querySelector("#revealVerse").addEventListener("click", revealCurrentVerse);
  flashUI.querySelector("#nextVerse").addEventListener("click", nextVerse);
  flashUI.querySelector("#exitFlashcards").addEventListener("click", exitFlashMode);
});
