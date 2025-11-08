// flashcards.js — verse-based flashcard testing (per-word checking)
var canMoveOn = false

var toggleInFlashcards = false

document.addEventListener("DOMContentLoaded", () => {
  const passage = document.getElementById("passage");
  if (!passage) return;

  // Add Flashcards button
  const controls = document.querySelector(".controls");
  const flashBtn = document.createElement("button");
  flashBtn.id = "flashcardsBtn";
  controls.appendChild(flashBtn);

  function resetFlashBtn(){    
    flashBtn.style.backgroundColor = "#1f830bff"
    flashBtn.style.color = "#d6d6d6ff"
    flashBtn.innerHTML = "Flashcard Mode" 
  }
  resetFlashBtn()


  const verses = Array.from(passage.querySelectorAll("div"));
  const flashUI = document.createElement("div");
  flashUI.id = "flashcardMode";
  flashUI.style.display = "none";
  flashUI.innerHTML = `
    <div id="flashcardContainer" class="verse"></div>
    <div class="flashControls" style="margin-top:1em;">
      <button id="revealVerse">Reveal</button>
      <button id="nextVerse" style="background-color:#eee;color:#111">Next Verse</button>
      <!--<button id="exitFlashcards">Exit Flashcards</button>-->
    </div>
    <div id="flashProgress" style="margin-top:8px;"></div>
    <div id="flashSummary" style="display:none; margin-top:1em;"></div>
  `;
  passage.parentNode.insertBefore(flashUI, passage.nextSibling);
function disableNextVerseBtn(){
    var nextVerseBtn = document.getElementById("nextVerse")
    nextVerseBtn.style.backgroundColor = "#8f8f8fff";
    nextVerseBtn.style.color = "#555555ff"
  }
  disableNextVerseBtn()


  let shuffled = [];
  let current = 0;
  const results = [];

  // Fisher–Yates shuffle
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

    // Reset all inputs
    container.querySelectorAll("input.greek").forEach(inp => {
      inp.value = "";
      inp.classList.remove("correct","incorrect","revealed","hint");
      inp.removeAttribute("readonly");
    });

    const verseNum = verse.querySelector("strong")?.textContent || "?";
    document.getElementById("flashProgress").textContent =
      `Verse ${verseNum} (${current + 1}/${verses.length})`;

    enableWordChecking(container);
  }

  function enableWordChecking(container) {
    const inputs = Array.from(container.querySelectorAll("input.greek"));

    inputs.forEach((inp, idx) => {
      inp.addEventListener("keydown", (e) => {
        // ignore modifier keys
        if (e.ctrlKey || e.altKey || e.metaKey) return;

        if ([" ", "Tab", "Enter"].includes(e.key)) {
          e.preventDefault();
          gradeSingleInput(inp);
          // move to next word for Space or Tab
          if ([" ", "Tab"].includes(e.key) && idx < inputs.length - 1) {
            inputs[idx + 1].focus();
          }
          // check if all words graded
          checkIfVerseDone(inputs);
        }
      });
    });

    // focus the first word at start
    if (inputs[0]) inputs[0].focus();
  }

 function checkIfVerseDone(inputs) {
  const allDone = inputs.every(inp =>
    inp.classList.contains("correct") ||
    inp.classList.contains("incorrect") ||
    inp.classList.contains("revealed")
  );

  if (allDone) {
    const verseNum =
      document.getElementById("flashcardContainer").querySelector("strong")?.textContent || "?";
    results.push({
      verseNum,
      correct: inputs.every(i => i.classList.contains("correct"))
    });
    canMoveOn = true;
    var nextVerseBtn = document.getElementById("nextVerse");
    nextVerseBtn.style.backgroundColor = "#15b5ffff";
    nextVerseBtn.style.color = "#000000";
  }
}


  // --- Reveal all words in current verse (single confirm only)
function revealCurrentVerse() {
  const container = document.getElementById("flashcardContainer");
  const inputs = container.querySelectorAll("input.greek");

  // Only reveal blanks — no confirm needed
  let anyBlank = false;
  inputs.forEach(inp => {
    if (!inp.value.trim()) {
      revealSingle(inp, true, false);
      anyBlank = true;
    }
  });

  if (!anyBlank) {
    alert("No blank words to reveal.");
  } else {
    checkIfVerseDone(inputs);
  }
}


  function nextVerse() {
    if(canMoveOn){
        current++;
        if (current < shuffled.length) {
            showVerse();
            canMoveOn = false
            disableNextVerseBtn()
        }
        else showSummary();
    } else{
        alert("Hmmm....looks like you are missing a word...")
    }
  }

 function showSummary() {
  const summary = document.getElementById("flashSummary");
  summary.style.display = "block";

  // Collect all wrong words
  const allWrongWords = new Set();
  results.forEach(r => {
    const verse = verses.find(v => (v.querySelector("strong")?.textContent || "?") === r.verseNum);
    if (!verse) return;
    verse.querySelectorAll("input.greek.incorrect, input.greek.revealed").forEach(inp => {
      if (inp.dataset?.key) allWrongWords.add(inp.dataset.key.trim());
      else allWrongWords.add(inp.value.trim() || inp.placeholder || "unknown");
    });
  });

  const wrongWords = [...allWrongWords].filter(w => w.length > 0);

  if (!wrongWords.length) {
    summary.innerHTML = `<h3>All words correct! 🎉</h3>
      <button id="exitAfterSummary">Exit Flashcards</button>`;
  } else {
    summary.innerHTML = `
      <h3>Review Needed</h3>
      <p>You missed ${wrongWords.length} unique word${wrongWords.length > 1 ? "s" : ""}:</p>
      <div style="margin-top:8px; font-weight:bold;">${wrongWords.join(", ")}</div>
      <button id="exitAfterSummary">Exit Flashcards</button>`;
  }

  document.getElementById("flashcardContainer").innerHTML = "";
  document.getElementById("flashProgress").textContent = "";

  document.getElementById("exitAfterSummary").onclick = exitFlashMode;
}

  
  function performFlashBtnAction(){
    if(!toggleInFlashcards){
        enterFlashMode()       
        flashBtn.innerHTML = "Exit Flashcards" 
        flashBtn.style.backgroundColor = "#aa0c0cff"
        flashBtn.style.color = "#d6d6d6ff"
        toggleInFlashcards = true
    } else{
        exitFlashMode()
        resetFlashBtn()
        toggleInFlashcards = false
    }
  }

  // --- BUTTON HANDLERS ---
  flashBtn.addEventListener("click", performFlashBtnAction)
  flashUI.querySelector("#revealVerse").addEventListener("click", revealCurrentVerse);
  flashUI.querySelector("#nextVerse").addEventListener("click", nextVerse);
  //flashUI.querySelector("#exitFlashcards").addEventListener("click", exitFlashMode);
});
