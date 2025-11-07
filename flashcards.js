// flashcards.js — random verse flashcard testing for Greek words

document.addEventListener("DOMContentLoaded", () => {
  const passage = document.getElementById("passage");
  if (!passage) return;

  // Add button
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
  const results = []; // { verseNum, correct }

  function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
  }

  function enterFlashMode() {
    passage.style.display = "none";
    flashUI.style.display = "block";
    shuffled = shuffle(verses.slice());
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
    container.querySelectorAll("input.greek").forEach(inp => {
      inp.value = "";
      inp.classList.remove("correct","incorrect","revealed");
      inp.removeAttribute("readonly");
    });
    document.getElementById("flashProgress").textContent =
      `Verse ${verse.querySelector("strong")?.textContent || '?'} of ${verses.length} (${current+1}/${verses.length})`;
  }

  function checkCurrentVerse() {
    const container = document.getElementById("flashcardContainer");
    const inputs = container.querySelectorAll("input.greek");
    let allCorrect = true;
    inputs.forEach(inp => {
      const res = gradeSingleInput(inp);
      if (res !== "correct") allCorrect = false;
    });
    const verseNum = container.querySelector("strong")?.textContent || "?";
    results.push({ verseNum, correct: allCorrect });
    alert(allCorrect ? `Verse ${verseNum}: ✅ Correct` : `Verse ${verseNum}: ❌ Some incorrect`);
  }

  function revealCurrentVerse() {
    const container = document.getElementById("flashcardContainer");
    const inputs = container.querySelectorAll("input.greek");
    inputs.forEach(inp => revealSingle(inp, true));
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
      summary.innerHTML = `<h3>All correct! 🎉</h3>
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

  // Button handlers
  flashBtn.addEventListener("click", enterFlashMode);
  flashUI.querySelector("#checkVerse").addEventListener("click", checkCurrentVerse);
  flashUI.querySelector("#revealVerse").addEventListener("click", revealCurrentVerse);
  flashUI.querySelector("#nextVerse").addEventListener("click", nextVerse);
  flashUI.querySelector("#exitFlashcards").addEventListener("click", exitFlashMode);
});
