// ============================================================
// GRADE SCRAPER (Magister / Somtoday)
// Runs on the student's own Magister/Somtoday session.
// Stores grades in chrome.storage.local so the Egodact addon
// (same extension) can read them. No school involvement.
// ============================================================
(function () {
    'use strict';

    function scrape() {
        const grades = [];
        const host = location.hostname;
        // Generic: walk tables
        document.querySelectorAll('table').forEach(table => {
            table.querySelectorAll('tr').forEach(tr => {
                const cells = Array.from(tr.querySelectorAll('td,th')).map(c => c.textContent.trim());
                if (cells.length < 2) return;
                // find a grade-like token
                let grade = null;
                let vak = null;
                cells.forEach(c => {
                    if (/^\d{1,2}([.,]\d{1,2})?$/.test(c)) {
                        const n = parseFloat(c.replace(',', '.'));
                        if (n >= 1 && n <= 10) grade = c;
                    }
                });
                // subject = first non-numeric cell
                vak = cells.find(c => c && !/^\d{1,2}([.,]\d{1,2})?$/.test(c));
                if (grade && vak) {
                    grades.push({ vak: vak.slice(0,40), cijfer: grade, bron: host, t: Date.now() });
                }
            });
        });
        // de-dupe by vak
        const seen = new Set();
        const uniq = grades.filter(g => {
            if (seen.has(g.vak)) return false;
            seen.add(g.vak); return true;
        });
        try {
            if (chrome && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ 'lm_grades': uniq });
            }
        } catch (err) {}
    }

    // run after load and on mutation (lazy)
    setTimeout(scrape, 2000);
    const obs = new MutationObserver(() => { clearTimeout(window.__lm_scrape_t); window.__lm_scrape_t = setTimeout(scrape, 1500); });
    if (document.body) obs.observe(document.body, { childList:true, subtree:true });
})();
