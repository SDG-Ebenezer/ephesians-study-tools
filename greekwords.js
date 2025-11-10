// state trackers
// We track state per input instance (unique id) so duplicate words (same data-key)
// are treated independently.
const attempts = {};      // attempts[instanceId] = number
const revealedFlags = {}; // revealed[instanceId] = true/false
const askedReveal = {};   // whether we've already asked per-instance
const hintsGiven = {};    // hintsGiven[instanceId] = number of characters revealed as hints

var sessionActive = true;

var revealList = [];

function getRandomId(prefix='id'){ return prefix + '_' + Math.random().toString(36).slice(2) + '_' + Math.random().toString(36).slice(2,8); }

// helpers
function normalize(s){ return (s||"").trim().toLowerCase().replace(/\u00A0/g," "); }

// We'll initialize DOM-dependent state and listeners in `init()` so we don't
// rely on the script being executed after the full DOM is parsed.
function init() {
    // Assign a stable, unique instance id to each input so duplicates of the same
    // data-key can be distinguished. We store it in `data-instance` attribute.
    document.querySelectorAll('input.greek').forEach((i, idx) => {
        // If `data-instance` already exists (e.g., from server-side) keep it.
        const inst = i.dataset.instance || getRandomId('inst');
        i.dataset.instance = inst;
        attempts[inst] = 0;
        revealedFlags[inst] = false;
        askedReveal[inst] = false;
        // Track how many hint characters we've revealed for this instance
        // (0 means no hint shown yet)
        if (typeof hintsGiven !== 'undefined') {
            // if global hintsGiven exists and was pre-filled skip
        }
        hintsGiven[inst] = 0;
    });

    const controls = document.querySelector('.controls') || document.body;

    const btnReveal = document.getElementById('reveal');
    if (btnReveal) btnReveal.addEventListener('click', ()=> {
        showConfirm("Reveal all answers? (This will fill every field and mark them revealed)", 'Reveal', 'Cancel').then(ok => {
            if (ok) {
                revealAll();
                showSummary();
            }
        });
    });

    const btnReset = document.getElementById('reset');
    if (btnReset) btnReset.addEventListener('click', ()=> {
        showConfirm("Reset all inputs and progress?", 'Reset', 'Cancel').then(ok => { if (ok) resetAll(); });
    });

    const btnSummary = document.getElementById('summary');
    if (btnSummary) btnSummary.addEventListener('click', showSummary);

    const btnRetry = document.getElementById('retry');
    if (btnRetry) btnRetry.addEventListener('click', () => {
        showConfirm("Retry only the wrong answers?", "Retry", "Cancel").then(ok => {
            if (ok) retryWrongAnswers();
        });
    });

    // per-input: grade on blur and also detect Enter to run check. Attach to #passage if present
    const passage = document.getElementById('passage');
    if (passage) {
        passage.addEventListener('input', function(e){
            const tgt = e.target;
            if (tgt && tgt.matches && tgt.matches('input.greek')) {
                // remove classes when user types (so they can retry visibly)
                if (!tgt.classList.contains('revealed')) {
                    tgt.classList.remove('correct','incorrect');
                }
            }
        });

        passage.addEventListener('blur', function(e){
            const tgt = e.target;
            if (tgt && tgt.matches && tgt.matches('input.greek')) {
                gradeSingleInput(tgt);
                // update the live score (counts only confirmed correct)
                const inputs = Array.from(document.querySelectorAll('input.greek'));
                let correctCount = 0;
                inputs.forEach(i => { if (i.classList.contains('correct')) correctCount++; });
                const total = inputs.length;
                const scoreEl = document.getElementById('score');
                if (scoreEl) scoreEl.textContent = `Score: ${correctCount} / ${total}`;
            }
        }, true);

    // allow Enter in an input to run check and Space to grade+move to next
        passage.addEventListener('keydown', function(e){
            const tgt = e.target;
            if (!(tgt && tgt.matches && tgt.matches('input.greek'))) return;

            // Enter: run full check
            if (e.key === 'Enter') {
                e.preventDefault();
                checkAnswers();
                return;
            }

            // Space: grade this input and move focus to next input (prevent inserting a space)
            if (e.key === ' ' || e.code === 'Space') {
                // avoid triggering when modifier keys are held
                if (e.ctrlKey || e.altKey || e.metaKey) return;
                e.preventDefault();
                // grade and, if empty, offer a hint
                gradeSingleInput(tgt, { promptHint: true });
                focusNextInput(tgt);
            }
        });
    } else {
        console.warn('#passage element not found when initializing event handlers');
    }

    // accessibility: focus first input
    const first = document.querySelector('input.greek');
    if (first) first.focus();

    // create popup containers for confirmations and context menu
    ensurePopupContainers();

    // attach right-click (contextmenu) handler to each greek input
    document.querySelectorAll('input.greek').forEach(inp => {
        inp.addEventListener('contextmenu', function(e){
            e.preventDefault();
            showContextMenuForInput(inp, e.clientX, e.clientY);
        });
    });

    // enable autosize behavior
    enableAutosize();

    document.addEventListener('input', (e) => {
        if (e.target.classList.contains('greek')) {
            sessionActive = true;
        }
    });

    window.addEventListener('beforeunload', function (e) {
        const inputs = Array.from(document.querySelectorAll('input.greek'));
        const hasUnfinishedInputs = inputs.some(inp =>
            inp.value && !inp.classList.contains('correct')
        );

        if (sessionActive && hasUnfinishedInputs) {
            e.preventDefault();
            e.returnValue = "You have unsaved progress. Are you sure you want to leave?";
            return e.returnValue;
        }
    });
}

// Create popup containers (once) used by confirm dialogs and context menus
function ensurePopupContainers(){
    if (!document.getElementById('bb-popup-root')){
        const root = document.createElement('div');
        root.id = 'bb-popup-root';
        root.style.position = 'fixed';
        root.style.left = '0';
        root.style.top = '0';
        root.style.width = '100%';
        root.style.height = '100%';
        root.style.pointerEvents = 'none';
        root.style.zIndex = 9999;
        document.body.appendChild(root);
    }
}

// showConfirm: non-blocking replacement for window.confirm. Returns Promise<boolean>.
function showConfirm(message, okText = 'OK', cancelText = 'Cancel'){
    return new Promise((resolve) => {
        const root = document.getElementById('bb-popup-root') || (() => { ensurePopupContainers(); return document.getElementById('bb-popup-root'); })();
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.left = '0';
        overlay.style.top = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.background = 'rgba(0,0,0,0.15)';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.pointerEvents = 'auto';

        const box = document.createElement('div');
        box.style.background = 'white';
        box.style.color = '#111';
        box.style.padding = '12px 14px';
        box.style.borderRadius = '8px';
        box.style.boxShadow = '0 6px 18px rgba(0,0,0,0.15)';
        box.style.maxWidth = '420px';
        box.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

        const msg = document.createElement('div');
        msg.textContent = message;
        msg.style.marginBottom = '10px';
        box.appendChild(msg);

        const btnRow = document.createElement('div');
        btnRow.style.display = 'flex';
        btnRow.style.justifyContent = 'flex-end';
        btnRow.style.gap = '8px';

        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = cancelText;
        cancelBtn.style.padding = '6px 10px';
        cancelBtn.style.border = 'none';
        cancelBtn.style.background = '#eee';
        cancelBtn.style.borderRadius = '6px';
        cancelBtn.addEventListener('click', ()=>{ cleanup(false); });

        const okBtn = document.createElement('button');
        okBtn.textContent = okText;
        okBtn.style.padding = '6px 10px';
        okBtn.style.border = 'none';
        okBtn.style.background = '#2b76d2';
        okBtn.style.color = 'white';
        okBtn.style.borderRadius = '6px';
        okBtn.addEventListener('click', ()=>{ cleanup(true); });

        btnRow.appendChild(cancelBtn);
        btnRow.appendChild(okBtn);
        box.appendChild(btnRow);

        overlay.appendChild(box);
        root.appendChild(overlay);

        // cleanup helper
        function cleanup(result){
            if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
            resolve(Boolean(result));
        }

        // keyboard handling
        function keyHandler(e){
            if (e.key === 'Escape') { cleanup(false); }
            if (e.key === 'Enter') { cleanup(true); }
        }
        document.addEventListener('keydown', keyHandler, { once: true });
    });
}

// Show a tiny context menu for an input at (x,y)
function showContextMenuForInput(inp, x, y){
    // remove existing
    const existing = document.getElementById('bb-context-menu');
    if (existing) existing.remove();


    const menu = document.createElement('div');
    menu.id = 'bb-context-menu';
    menu.style.position = 'fixed';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.background = 'white';
    menu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
    menu.style.borderRadius = '6px';
    menu.style.padding = '6px';
    menu.style.zIndex = 10000;
    menu.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

    const word = document.createElement('div')
    var text = inp.placeholder;
    word.textContent = text.charAt(0).toUpperCase() + text.slice(1);
    word.style.padding = '6px 10px';
    word.style.fontWeight = "bold";
    word.style.background = '#c9c9c9ff';
    menu.appendChild(word);

    const revealOpt = document.createElement('div');
    revealOpt.textContent = 'Reveal word';
    revealOpt.style.padding = '6px 10px';
    revealOpt.style.cursor = 'pointer';
    revealOpt.addEventListener('click', ()=>{ revealSingle(inp, true); menu.remove(); });

    const hintOpt = document.createElement('div');
    hintOpt.textContent = 'Get hint (next char)';
    hintOpt.style.padding = '6px 10px';
    hintOpt.style.cursor = 'pointer';
    hintOpt.addEventListener('click', ()=>{ revealNextChar(inp); menu.remove(); });

    const cancelOpt = document.createElement('div');
    cancelOpt.textContent = 'Cancel';
    cancelOpt.style.padding = '6px 10px';
    cancelOpt.style.cursor = 'pointer';
    cancelOpt.style.color = '#666';
    cancelOpt.addEventListener('click', ()=>{ menu.remove(); });

    [revealOpt, hintOpt, cancelOpt].forEach(n => {
        n.addEventListener('mouseenter', ()=> n.style.background = '#f2f6fb');
        n.addEventListener('mouseleave', ()=> n.style.background = '');
        menu.appendChild(n);
    });

    document.body.appendChild(menu);

    // close on next click outside
    const onDocClick = (ev) => { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('mousedown', onDocClick); } };
    setTimeout(()=> document.addEventListener('mousedown', onDocClick), 0);
}

function gradeSingleInput(inp, options = {}) {
    const key = inp.dataset.key;
    const inst = inp.dataset.instance;
    if (revealedFlags[inst]) {
    // already revealed: keep revealed state
    inp.classList.remove("incorrect","correct");
    inp.classList.add("revealed");
    return "revealed";
    }
    const user = normalize(inp.value);
    if (!user) {
    inp.classList.remove("correct","incorrect");
    // If caller requested a hint prompt (e.g., via space key), offer next-character hint
    if (options.promptHint) {
        // only prompt if there is at least one character left to reveal
        const full = key || '';
        const already = hintsGiven[inst] || 0;
        if (already < full.length) {
            const wantHint = confirm(`No entry for "${inp.placeholder || full}". Reveal the next character as a hint?`);
            if (wantHint) {
                revealNextChar(inp);
                return "hinted";
            }
        }
    }
    return "empty";
    }
    const exp = normalize(key || "");
    if (user === exp) {
    attempts[inst] = 0; // reset attempts on success for this instance
    inp.classList.remove("incorrect","revealed");
    inp.classList.add("correct");
    inp.removeAttribute('aria-invalid');
    return "correct";
    } else {
    // incorrect
    attempts[inst] = (attempts[inst] || 0) + 1;
    inp.classList.remove("correct","revealed");
    inp.classList.add("incorrect");
    inp.setAttribute('aria-invalid','true');

    // if reached threshold and not yet revealed, ask per-instance.
    if (attempts[inst] >= 3 && !revealedFlags[inst] && !askedReveal[inst]) {
        askedReveal[inst] = true;
        // small asynchronous prompt so UI updates (e.g., red border) before confirm
        setTimeout(()=> {
        //const want = confirm(`You've tried "${inp.placeholder}" (${attempts[inst]} wrong attempts). Reveal the answer for this word?`);
        const want = true//confirm("Do you want to reveal the answer for this word?");
        if (want) {
            revealSingle(inp, true);
        } else {
            // If they decline, keep input as incorrect and allow further tries.
            // attempts continue to accumulate.
            attempts[inst] = 0;
            revealedFlags[inst] = false;
            askedReveal[inst] = false;
        }
        }, 50);
    }
    return "incorrect";
    }
}

// Reveal the next character of the answer for this input (used as a hint).
function revealNextChar(inp) {
    const key = inp.dataset.key || '';
    const inst = inp.dataset.instance;
    const already = hintsGiven[inst] || 0;
    if (already >= key.length) {
        // already fully revealed
        revealSingle(inp, true);
        return;
    }
    const nextCount = already + 1;
    const newVal = key.slice(0, nextCount);
    inp.value = newVal;
    hintsGiven[inst] = nextCount;
    // mark as partially revealed visually
    inp.classList.remove('correct','incorrect');
    inp.classList.add('hint');
    // if fully revealed now, switch to full revealed state
    if (nextCount >= key.length) {
        revealedFlags[inst] = true;
        inp.classList.remove('hint');
        inp.classList.add('revealed');
        inp.setAttribute('readonly','readonly');
    }
    // resize the input to fit the revealed text
    try { setInputWidthToFit(inp); } catch (e) { /* ignore if not available yet */ }
}

// Move focus to the next input.greek after `from`. If at end, focus stays.
function focusNextInput(from) {
    const inputs = Array.from(document.querySelectorAll('input.greek'));
    const idx = inputs.indexOf(from);
    if (idx >= 0 && idx < inputs.length - 1) {
        const nxt = inputs[idx + 1];
        nxt.focus();
        // select existing content so typing replaces it
        try { nxt.select(); } catch (e) { /* ignore */ }
    }
}

function checkAnswers() {
    sessionActive = true
    try {
        console.log('checkAnswers called');
        const inputs = Array.from(document.querySelectorAll('input.greek'));
        let correctCount = 0;
        inputs.forEach(inp => {
            const r = gradeSingleInput(inp);
            if (r === "correct") correctCount++;
        });
        const totalCount = inputs.length;
        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.textContent = `Score: ${correctCount} / ${totalCount}`;
        else console.warn('checkAnswers: #score element not found');
    } catch (err) {
        console.error('Error in checkAnswers:', err);
    }
}

function retryWrongAnswers() {
    const inputs = Array.from(document.querySelectorAll('input.greek'));
    inputs.forEach(inp => {
        if (inp.classList.contains('incorrect') || inp.classList.contains('revealed')) {
            // Reset wrong answers only
            inp.value = '';
            inp.classList.remove('incorrect', 'revealed', 'hint');
            inp.removeAttribute('readonly');
            const inst = inp.dataset.instance;
            if (inst) {
                attempts[inst] = 0;
                revealedFlags[inst] = false;
                askedReveal[inst] = false;
                hintsGiven[inst] = 0;
            }
            try { setInputWidthToFit(inp); } catch (e) {}
        }
    });

    // Reset the score since only correct ones are preserved
    const correctCount = inputs.filter(i => i.classList.contains('correct')).length;
    const total = inputs.length;
    const scoreEl = document.getElementById('score');
    if (scoreEl) scoreEl.textContent = `Score: ${correctCount} / ${total}`;

    // Optional: confirmation message
    //alert("Wrong answers cleared. You can retry them now!");
}

/*
function revealSingle(inp, setReadonly = true) {
    const key = inp.dataset.key;
    const inst = inp.dataset.instance;
    const val = key || "";
    inp.value = val;
    revealedFlags[inst] = true;
    inp.classList.add("revealed");
    inp.classList.remove("correct","incorrect");
    if (setReadonly) {
    inp.setAttribute('readonly','readonly');
    }
    // mark hints as fully given
    hintsGiven[inst] = (key || '').length;
    // resize to fit full value
    try { setInputWidthToFit(inp); } catch (e) { }
    // update score display (revealed does not count as correct)
    checkAnswers();
}*/
async function revealSingle(inp, setReadonly = true, askConfirm = true, mustType = true) {
    const key = inp.dataset.key?.trim() || "";
    const inst = inp.dataset.instance;
    if (key && !revealList.includes(key)) {
        revealList.push(key);
    }


    const confirmReveal = askConfirm?confirm("Are you sure you want to reveal the answer?"):true;
    if (!confirmReveal) return;
    
    if(mustType){
        // Create overlay
        const overlay = document.createElement("div");
        Object.assign(overlay.style, {
            position: "fixed",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: "10001"
        });

        const box = document.createElement("div");
        Object.assign(box.style, {
            background: "white",
            padding: "20px 28px",
            borderRadius: "8px",
            boxShadow: "0 6px 18px rgba(0,0,0,0.3)",
            fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
            textAlign: "center",
            maxWidth: "360px"
        });

        box.innerHTML = `
            <div style="margin-bottom:10px; font-size:17px; font-weight:500;">Copy the answer exactly to proceed:</div>
            <div style="background:#f3f3f3; padding:8px; border-radius:4px; margin-bottom:12px; user-select:all;">
            <i>${inp.placeholder?inp.placeholder + " - ":"WORD: "}</i>    
            <b style="letter-spacing:0.5px;">${key}</b>
            </div>
            <input id="copyConfirmInput" type="text" autocomplete="off" autocorrect="off" spellcheck="false"
                style="padding:8px 10px; width:90%; font-size:16px; border:1px solid #ccc; border-radius:6px; text-align:center;">
            <div id="copyStatus" style="margin-top:10px; color:#888; font-size:14px;">Type the word exactly.</div>
        `;

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const inputField = box.querySelector("#copyConfirmInput");
        const status = box.querySelector("#copyStatus");

        // Focus for immediate typing
        inputField.focus();

        return new Promise(resolve => {
            const checkInput = () => {
                const userTyped = inputField.value.trim();
                if (normalize(userTyped) === normalize(key)) {
                    status.textContent = "✅ Correct!";
                    status.style.color = "green";

                    setTimeout(() => {
                        overlay.remove();
                        inp.value = key;
                        revealedFlags[inst] = true;
                        inp.classList.add("revealed", "incorrect");
                        inp.classList.remove("correct");
                        if (setReadonly) inp.setAttribute("readonly", "readonly");
                        hintsGiven[inst] = key.length;

                        // ✅ Track revealed word
                        if (key && !revealList.includes(key)) {
                            revealList.push(key);
                        }

                        try { setInputWidthToFit(inp); } catch (e) {}
                        checkAnswers();
                        resolve();
                    }, 600);
                } else {
                    status.textContent = "❌ Incorrect. Copy it exactly.";
                    status.style.color = "red";
                }
            };

            // Lock the user in until correct
            inputField.addEventListener("input", checkInput);
        });
    } else{
        const val = key || "";
        inp.value = val;
        revealedFlags[inst] = true;
        inp.classList.add("revealed");
        inp.classList.remove("correct","incorrect");
        if (setReadonly) inp.setAttribute('readonly','readonly');
        hintsGiven[inst] = (key || '').length;

        // ✅ Track revealed word
        if (key && !revealList.includes(key)) {
            revealList.push(key);
        }

        try { setInputWidthToFit(inp); } catch (e) {}
        checkAnswers();
    }
}

function revealAll() {
    const inputs = Array.from(document.querySelectorAll('input.greek'));
    inputs.forEach(inp => {
        if(!inp.classList.contains('correct') && !inp.classList.contains('incorrect')){
            revealSingle(inp, true, false, false);
        } else {
            // also ensure corrected inputs are resized to their full expected value if they are revealed later
            try { setInputWidthToFit(inp); } catch (e) {}
        }
    });
    // mark askedReveal so we don't prompt again
    Object.keys(askedReveal).forEach(k => askedReveal[k] = true);
}

function resetAll() {
    //
    sessionActive = false;
    revealList = [];

    //    
    const inputs = Array.from(document.querySelectorAll('input.greek'));
    inputs.forEach(inp => {
    inp.value = "";
    inp.classList.remove("correct","incorrect","revealed");
    inp.removeAttribute('readonly');
    inp.classList.remove('hint');
    try { setInputWidthToFit(inp); } catch (e) {}
    });
    // reset state
    Object.keys(attempts).forEach(k => attempts[k] = 0);
    Object.keys(revealedFlags).forEach(k => revealedFlags[k] = false);
    Object.keys(askedReveal).forEach(k => askedReveal[k] = false);
    Object.keys(hintsGiven).forEach(k => hintsGiven[k] = 0);
    document.getElementById('score').textContent = "";
    document.getElementById('summaryBox').style.display = 'none';
    document.getElementById('summaryBox').innerHTML = '';
}
// Capitalize only the first letter of a string, leave the rest as-is
function capitalizeFirstLetter(str) {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Build summary: counts and list of words to practice (duplicates combined)
function showSummary() {
    //
    sessionActive = false;


    const inputs = Array.from(document.querySelectorAll('input.greek'));
    const total = inputs.length;
    let correct = 0, revealed = 0, incorrect = 0, empty = 0;
    const wordStats = {}; // key -> { attempts, revealed, incorrect, placeholders:Set }

    // Collect per-word stats
    inputs.forEach(inp => {
        const key = inp.dataset.key || '';
        const inst = inp.dataset.instance;
        const state = inp.classList.contains('revealed') ? 'revealed'
                    : inp.classList.contains('correct') ? 'correct'
                    : inp.classList.contains('incorrect') ? 'incorrect'
                    : 'empty';
        const ph = (inp.placeholder || '').trim();

        if (!wordStats[key]) {
            wordStats[key] = { attempts: 0, revealed: 0, incorrect: 0, placeholders: new Set() };
        }
        if (ph) wordStats[key].placeholders.add(ph);
        wordStats[key].attempts += (attempts[inst] || 0);

        if (state === 'correct') correct++;
        else if (state === 'revealed') { revealed++; wordStats[key].revealed++; }
        else if (state === 'incorrect') { incorrect++; wordStats[key].incorrect++; }
        else empty++;
    });
    const getRidOfBrackets = (str) => str.replace(/[\[\]\(\)]/g, "");

    // Build combined practice list (one entry per unique word needing practice)
    const allPlaceholders = Object.entries(wordStats)
        .filter(([key, data]) => data.revealed > 0 || data.incorrect > 0)
        .sort((a, b) => b[1].attempts - a[1].attempts)
        .map(([key, data]) => {
            // Capitalize each placeholder properly
            const placeholders = Array.from(data.placeholders).map(ph => getRidOfBrackets(capitalizeFirstLetter(ph)));
            const label = [...new Set(placeholders)].join(', ') || key;
            
            return `${key} - ${label}`
        });

    // Remove brackets and duplicates
    
    const practiceList = [...new Set(allPlaceholders)];

    // Render summary box
    const summaryEl = document.getElementById('summaryBox');
    summaryEl.style.display = 'block';
    summaryEl.innerHTML = `
        <h3>Summary</h3>
        <div><strong>Total fields:</strong> ${total}</div>
        <div><strong>Correct:</strong> ${correct} &nbsp;
             <strong>Revealed/Incorrect:</strong> ${revealed + incorrect} &nbsp;
             <strong>Empty:</strong> ${empty}</div>
        <p style="margin-top:8px">
            Suggestion: practice the words below. Start with those you've tried multiple times.
        </p>
        ${practiceList.length
            ? `<ul>${practiceList.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`
            : '<div>No suggested words — great job! 🎉</div>'
        }
        <p style="margin-top:8px; color:var(--muted)">
            Tip: try flashcards for the top 8 words here, or type them 5× each to build recall.
        </p>
    `;

    if (revealList.length > 0) {
        const reviewList = [...new Set(revealList)];
        const reviewHTML = `
            <h4>Words Revealed This Session</h4>
            <ul>${reviewList.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul>
        `;
        summaryEl.innerHTML += reviewHTML;
    }

}


// small utility to escape HTML in list items
function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// Initialize when DOM is ready (safe if script is injected in head or bottom)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    // DOM already ready
    init();
}
// Measure text width in pixels using canvas. Reuses a single canvas for speed.
const textMeasurer = (() => {
    const cvs = document.createElement('canvas');
    const ctx = cvs.getContext('2d');
    return (text, font) => {
    if (font) ctx.font = font;
    return ctx.measureText(text).width;
    };
})();

function computeFontForElement(el){
    // Build a CSS font string like: "italic 600 16px/1.2 'Inter', system-ui"
    const cs = getComputedStyle(el);
    // Compose font shorthand using needed properties
    // See CSS font shorthand: font-style font-variant font-weight font-size/line-height font-family
    return `${cs.fontStyle} ${cs.fontVariant} ${cs.fontWeight} ${cs.fontSize} / ${cs.lineHeight} ${cs.fontFamily}`;
}

function getExtraHorizontal(el){
    // compute padding + border to add when setting width (content-box chosen above)
    const cs = getComputedStyle(el);
    const left = parseFloat(cs.paddingLeft || 0) + parseFloat(cs.borderLeftWidth || 0);
    const right = parseFloat(cs.paddingRight || 0) + parseFloat(cs.borderRightWidth || 0);
    return left + right;
}

function setInputWidthToFit(input, options = {}){
    const value = input.value || input.placeholder || '';
    // if empty string, measure placeholder; if both empty fallback to charset
    const font = computeFontForElement(input);
    const measured = textMeasurer(value || ' ', font);
    const extra = getExtraHorizontal(input);
    const min = options.min || 0;
    const max = options.max || Infinity;
    // Add a small buffer so the caret is not jammed to the edge
    const buffer = options.buffer ?? 8;
    const target = Math.min(max, Math.max(min, Math.ceil(measured + extra + buffer)));
    input.style.width = target + 'px';
}

// Attach autosizing behavior to all inputs with class `.autosize`
function enableAutosize(selector = '.autosize', opts = {}){
    const inputs = Array.from(document.querySelectorAll(selector));
    inputs.forEach(inp => {
    // set initial min based on placeholder measured in pixels
    const font = computeFontForElement(inp);
    const placeholderText = inp.placeholder || '';
    const phWidth = Math.ceil(textMeasurer(placeholderText || ' ', font));
    const extra = getExtraHorizontal(inp);
    const buffer = opts.buffer ?? 8;
    const minWidth = phWidth + extra + buffer;
    // optional max width: you can set data-max attribute or use opts.max
    const computedMax = opts.max || (inp.dataset.max ? parseInt(inp.dataset.max,10) : Infinity);

    // initialize inline style for minWidth so it starts at placeholder width
    inp.style.width = (Math.min(computedMax, minWidth)) + 'px';

    // on input, update width
    const onInput = () => setInputWidthToFit(inp, { min: minWidth, max: computedMax, buffer });
    inp.addEventListener('input', onInput);

    // also update on font/window change to stay accurate
    window.addEventListener('resize', onInput);
    // if you dynamically change classes/fonts you can re-run onInput manually

    // call once to ensure correct for pre-filled inputs
    onInput();
    });
}

/** */
const inputs = document.querySelectorAll(".greek");
const placeholderReader = document.getElementById("placeholder_reader");

function resetPlaceholderReader() {
    if (!placeholderReader) return;
    placeholderReader.innerHTML = "";
    placeholderReader.style.display = "none";
    placeholderReader.style.left = "-9999px";
    placeholderReader.style.top = "-9999px";
}

// Position the placeholderReader in a UI-friendly spot adjacent to the input element.
function positionPlaceholderReaderNearInput(input){
    if (!placeholderReader || !input) return;
    const text = input.placeholder || '';
    if (!text) return;

    // ensure the reader is measurable
    placeholderReader.style.display = 'block';
    placeholderReader.innerHTML = text;
    placeholderReader.style.maxWidth = '320px';
    placeholderReader.style.whiteSpace = 'normal';

    // measure sizes
    const inpRect = input.getBoundingClientRect();
    const readerRect = placeholderReader.getBoundingClientRect();
    const padding = 8; // gap between input and tooltip

    // try to place to the right centered vertically
    let left = Math.round(inpRect.right + padding);
    let top = Math.round(inpRect.top + (inpRect.height - readerRect.height) / 2);

    // if right overflow, place on left
    if (left + readerRect.width > window.innerWidth - 8) {
        left = Math.round(inpRect.left - readerRect.width - padding);
    }
    // clamp vertically
    if (top < 8) top = 8;
    if (top + readerRect.height > window.innerHeight - 8) top = Math.max(8, window.innerHeight - readerRect.height - 8);

    placeholderReader.style.left = left + 'px';
    placeholderReader.style.top = top + 'px';
}

resetPlaceholderReader();

// Hover timers: if the mouse stays over an input for 5s, reveal its placeholder
const hoverTimers = {}; // hoverTimers[instance] = timeoutId (5s reveal into input)
const hoverDisplayTimers = {}; // hoverDisplayTimers[instance] = timeoutId (2s tooltip show)
const hoverLastPos = {}; // hoverLastPos[instance] = {x,y}

inputs.forEach(input => {
    // guard if placeholderReader not present
    input.addEventListener("mouseenter", (e) => {
        const text = input.placeholder || '';
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        const inst = input.dataset.instance || getRandomId('inst');

        // store last position
        hoverLastPos[inst] = { x: mouseX, y: mouseY };

        // Start tooltip display timer (1s). The timer will be restarted on every mousemove,
        // so the tooltip only appears after the mouse has been stationary for 1 seconds.
        if (hoverDisplayTimers[inst]) clearTimeout(hoverDisplayTimers[inst]);
        if (placeholderReader && text) {
            hoverDisplayTimers[inst] = setTimeout(() => {
                positionPlaceholderReaderNearInput(input);
            }, 2000);
        }

        // Start hover timer: reveal placeholder into the input after 5 seconds
        // don't start if already revealed or has content or readonly
        if (revealedFlags[inst] || input.value.trim() !== '' || input.readOnly) return;
        if (hoverTimers[inst]) clearTimeout(hoverTimers[inst]);
        hoverTimers[inst] = setTimeout(() => {
            // if still hovered (no mouseleave fired), reveal placeholder text into the input as a hint
            // ensure input still empty and not revealed
            if (input.matches(':hover') && !revealedFlags[inst] && input.value.trim() === '' && !input.readOnly) {
                // reveal placeholder value into input (as a hint, not full reveal)
                input.value = input.placeholder || '';
                // mark hint state and update hintsGiven for this instance
                hintsGiven[inst] = (input.value || '').length;
                input.classList.remove('correct','incorrect');
                input.classList.add('hint');
                try { setInputWidthToFit(input); } catch (e) {}
            }
            delete hoverTimers[inst];
        }, 5000);
    });

    // restart tooltip timer on small moves; if user keeps moving, the tooltip will not appear until 2s after last movement
    input.addEventListener('mousemove', (e) => {
        const inst = input.dataset.instance;
        if (!inst) return;
        const pos = { x: e.clientX, y: e.clientY };
        hoverLastPos[inst] = pos;
        // restart tooltip timer
        if (hoverDisplayTimers[inst]) clearTimeout(hoverDisplayTimers[inst]);
        const text = input.placeholder || '';
        if (placeholderReader && text) {
            hoverDisplayTimers[inst] = setTimeout(() => {
                positionPlaceholderReaderNearInput(input);
            }, 2000);
        }
    });

    input.addEventListener("mouseleave", (e) => {
        resetPlaceholderReader();
        const inst = input.dataset.instance;
        if (inst && hoverTimers[inst]) {
            clearTimeout(hoverTimers[inst]);
            delete hoverTimers[inst];
        }
        if (inst && hoverDisplayTimers[inst]) {
            clearTimeout(hoverDisplayTimers[inst]);
            delete hoverDisplayTimers[inst];
        }
        if (inst && hoverLastPos[inst]) delete hoverLastPos[inst];
    });
});

// enable on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => enableAutosize());