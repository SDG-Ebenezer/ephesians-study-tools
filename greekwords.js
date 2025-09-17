// expected answers (lowercase transliterations)
const expected = {
    paulos: "paulos", apostolos: "apostolos", Christos: "Christos", Iesous: "iesous", thelema: "thelema", theos: "theos", hagios: "hagios", Ephesos: "ephesos",
    pistos: "pistos", charis: "charis", eirene: "eirene", pater: "pater", kyrios: "kyrios",
    Christos: "christos", eulogetos: "eulogetos", eulogeo: "eulogeo", pneumatikos: "pneumatikos", eulogia: "eulogia",
    epouranios: "epouranios", eklegomai: "eklegomai", katabole: "katabole", kosmos: "kosmos",
    amomos: "amomos", agape: "agape", proorizo: "proorizo",
    huiothesia: "huiothesia", eudokia: "eudokia", epainos: "epainos", doxa: "doxa",
    charitoo: "charitoo", apolytrosis: "apolytrosis", haima: "haima",
    aphesis: "aphesis", paraptoma: "paraptoma", ploutos: "ploutos",
    perisseuo: "perisseuo", sophia: "sophia", phronesis: "phronesis", mysterion: "mysterion",
    pleroma: "pleroma", pisteuo: "pisteuo", pistis: "pistis",
    kairos: "kairos", anakephalaioo: "anakephalaioo", ouranos: "ouranos",
    ge: "ge", kleroo: "kleroo", prothesis: "prothesis",
    boule: "boule", proelpizo: "proelpizo",
    akouo: "akouo", logos: "logos", alethia: "alethia",
    euangelion: "euangelion", soteria: "soteria", sphragizo: "sphragizo",
    epangelia: "epangelia", pneuma: "pneuma", arrabon: "arrabon",
    kleronomia: "kleronomia", peripoiesis: "peripoiesis", eucharisteo: "eucharisteo", poieomneia: "poieomneia",
    proseuche: "proseuche", apokalypsis: "apokalypsis", epignosis: "epignosis", ophthalmos: "ophthalmos",
    dianoia: "dianoia", photizo: "photizo", elpis: "elpis", klesis: "klesis",    
    hyperbole: "hyperbole", megethos: "megethos", dynamis: "dynamis", 
    energeia: "energeia", ischys: "ischys", kratos: "kratos", energeo: "energeo", nekros: "nekros", dexios: "dexios",
    arche: "arche", exousia: "exousia", kyriotes: "kyriotes",
    onoma: "onoma", aion: "aion", pous: "pous", kephale: "kephale", ekklesia: "ekklesia", soma: "soma", pleroo: "pleroo",
    nekros: "nekros",
    paraptoma: "paraptoma",
    hamartia: "hamartia",
    peripateo: "peripateo",
    kosmos: "kosmos",
    archon: "archon",
    exousia: "exousia",
    aer: "aer",
    pneuma: "pneuma",
    huios: "huios",
    apeitheia: "apeitheia",
    anatrepho: "anatrepho",
    epithymia: "epithymia",
    sarx: "sarx",
    thelema: "thelema",
    dianoia: "dianoia",
    physis: "physis",
    teknon: "teknon",
    orge: "orge",
    theos: "theos",
    plousios: "plousios",
    eleos: "eleos",
    polys: "polys",
    agape: "agape",
    agapao: "agapao",
    syzoopoieo: "syzoopoieo",
    christos: "christos",
    charis: "charis",
    sozo: "sozo",
    synegeiro: "synegeiro",
    sygkathizo: "sygkathizo",
    epouranios: "epouranios",
    iesous: "iesous",
    hyperballo: "hyperballo",
    ploutos: "ploutos",
    chrestotes: "chrestotes",
    pistis: "pistis",
    doron: "doron",
    ergon: "ergon",
    kauchaomai: "kauchaomai",
    poiema: "poiema",
    ktizo: "ktizo",
    agathos: "agathos",
    proetoimazo: "proetoimazo",
    ethnos: "ethnos",
    akrobystia: "akrobystia",
    peritome: "peritome",
    cheiropoietos: "cheiropoietos",
    apallotrioo: "apallotrioo",
    politeia: "politeia",
    israel: "israel",
    xenos: "xenos",
    diatheke: "diatheke",
    epangelia: "epangelia",
    elpis: "elpis",
    atheos: "atheos",
    makran: "makran",
    haima: "haima",
    eirene: "eirene",
    heis: "heis",
    phragmos: "phragmos",
    mesotoichon: "mesotoichon",
    katargeo: "katargeo",
    nomos: "nomos",
    dogma: "dogma",
    kainos: "kainos",
    anthropos: "anthropos",
    dyo: "dyo",
    apokatallasso: "apokatallasso",
    soma: "soma",
    stauros: "stauros",
    apokteino: "apokteino",
    echthra: "echthra",
    euangelizo: "euangelizo",
    prosagoge: "prosagoge",
    pater: "pater",
    paroikos: "paroikos",
    sympolites: "sympolites",
    hagios: "hagios",
    oikeios: "oikeios",
    apostolos: "apostolos",
    prophetes: "prophetes",
    akrogoniaios: "akrogoniaios",
    oikodome: "oikodome",
    auxano: "auxano",
    naos: "naos",
    kyrios: "kyrios",
    katoiketerion: "katoiketerion",
};

// state trackers
// We track state per input instance (unique id) so duplicate words (same data-key)
// are treated independently.
const attempts = {};      // attempts[instanceId] = number
const revealedFlags = {}; // revealed[instanceId] = true/false
const askedReveal = {};   // whether we've already asked per-instance
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
    });

    const controls = document.querySelector('.controls') || document.body;

    const btnReveal = document.getElementById('reveal');
    if (btnReveal) btnReveal.addEventListener('click', ()=> {
        const ok = confirm("Reveal all answers? (This will fill every field and mark them revealed)");
        if (ok) {
            revealAll();
            showSummary();
        }
    });

    const btnReset = document.getElementById('reset');
    if (btnReset) btnReset.addEventListener('click', ()=> {
        const ok = confirm("Reset all inputs and progress?");
        if (ok) resetAll();
    });

    const btnSummary = document.getElementById('summary');
    if (btnSummary) btnSummary.addEventListener('click', showSummary);

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

        // allow Enter in an input to run check
        passage.addEventListener('keydown', function(e){
            if (e.key === 'Enter') {
                e.preventDefault();
                checkAnswers();
            }
        });
    } else {
        console.warn('#passage element not found when initializing event handlers');
    }

    // accessibility: focus first input
    const first = document.querySelector('input.greek');
    if (first) first.focus();

    // enable autosize behavior
    enableAutosize();
}

function gradeSingleInput(inp) {
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
    return "empty";
    }
    const exp = normalize(expected[key] || "");
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
        const want = confirm(`You've tried "${inp.placeholder}" (${attempts[inst]} wrong attempts). Reveal the answer for this word?`);
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

function checkAnswers() {
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

function revealSingle(inp, setReadonly = true) {
    const key = inp.dataset.key;
    const inst = inp.dataset.instance;
    const val = expected[key] || "";
    inp.value = val;
    revealedFlags[inst] = true;
    inp.classList.add("revealed");
    inp.classList.remove("correct","incorrect");
    if (setReadonly) {
    inp.setAttribute('readonly','readonly');
    }
    // update score display (revealed does not count as correct)
    checkAnswers();
}

function revealAll() {
    const inputs = Array.from(document.querySelectorAll('input.greek'));
    inputs.forEach(inp => {
        if(!inp.classList.contains('correct') && !inp.classList.contains('incorrect')){
            revealSingle(inp, true)
        }
    });
    // mark askedReveal so we don't prompt again
    Object.keys(askedReveal).forEach(k => askedReveal[k] = true);
}

function resetAll() {
    const inputs = Array.from(document.querySelectorAll('input.greek'));
    inputs.forEach(inp => {
    inp.value = "";
    inp.classList.remove("correct","incorrect","revealed");
    inp.removeAttribute('readonly');
    });
    // reset state
    Object.keys(attempts).forEach(k => attempts[k] = 0);
    Object.keys(revealedFlags).forEach(k => revealedFlags[k] = false);
    Object.keys(askedReveal).forEach(k => askedReveal[k] = false);
    document.getElementById('score').textContent = "";
    document.getElementById('summaryBox').style.display = 'none';
    document.getElementById('summaryBox').innerHTML = '';
}

// build summary: counts and list of words to practice
function showSummary() {
    const inputs = Array.from(document.querySelectorAll('input.greek'));
    const total = inputs.length;
    let correct = 0, revealed = 0, incorrect = 0, empty = 0;
    const practice = []; // words to work on: incorrect/unrevealed OR revealed
    inputs.forEach(inp => {
    const key = inp.dataset.key;
    const inst = inp.dataset.instance;
    const state = inp.classList.contains('revealed') ? 'revealed'
                : inp.classList.contains('correct') ? 'correct'
                : inp.classList.contains('incorrect') ? 'incorrect' : 'empty';
    const user = normalize(inp.value);
    if (state === 'correct') correct++;
    else if (state === 'revealed') { revealed++; practice.push({ key, inst }); }
    else if (state === 'incorrect') { incorrect++; practice.push({ key, inst }); }
    else empty++;
    });

    // prepare readable list (use expected transliteration)
    // prioritize incorrect over revealed, sort by attempts desc to suggest those you struggled with
    practice.sort((a,b) => (attempts[b.inst]||0) - (attempts[a.inst]||0));
    const practiceList = practice.map(item => {
        const key = item.key;
        // Try to collect English translations from placeholders of inputs with the same data-key
        const selectorKey = (window.CSS && CSS.escape) ? CSS.escape(key) : key;
        const inputsForKey = Array.from(document.querySelectorAll(`input.greek[data-key="${selectorKey}"]`));
        const placeholders = inputsForKey.map(i => (i.placeholder || '').trim()).filter(Boolean);
        // dedupe while preserving order
        const uniq = Array.from(new Set(placeholders));
        const label = uniq.length ? uniq.join(', ') : (expected[key] || '');
        return `${key} — ${label}`;
    });

    const summaryEl = document.getElementById('summaryBox');
    summaryEl.style.display = 'block';
    summaryEl.innerHTML = `
    <h3>Summary</h3>
    <div><strong>Total fields:</strong> ${total}</div>
    <div><strong>Correct:</strong> ${correct} &nbsp; <strong>Revealed/Incorrect:</strong> ${revealed + incorrect} &nbsp; <strong>Empty:</strong> ${empty}</div>
    <p style="margin-top:8px">Suggestion: practice the words below. Start with those you've tried multiple times.</p>
    ${practiceList.length ? `<ul>${practiceList.map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ul>` : '<div>No suggested words — great job! 🎉</div>'}
    <p style="margin-top:8px; color:var(--muted)">Tip: try flashcards for the top 8 words here, or type them 5× each to build recall.</p>
    `;
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

// enable on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => enableAutosize());