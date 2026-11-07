// ============================================================
// MAIL SCRAPER (Magister / Somtoday)
// Runs on the student's own Magister/Somtoday session.
// Collects messages from the "Berichten" page and stores them
// in chrome.storage.local so the Egodact addon can show them.
// ============================================================
(function () {
    'use strict');

    function scrape() {
        const mails = [];
        const host = location.hostname;
        // Magister/Somtoday message lists: try common selectors
        const candidates = document.querySelectorAll(
            '[class*="bericht"], [class*="message"], [class*="mail"], tr, li, article'
        );
        candidates.forEach(el => {
            const txt = (el.textContent || '').trim().replace(/\s+/g, ' ');
            if (txt.length < 8 || txt.length > 400) return;
            // heuristic: must contain a date-ish token
            if (!/\d{1,2}[-/]\d{1,2}/.test(txt) && !/\d{1,2}\s+(jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec)/i.test(txt)) return;
            // avoid duplicates of huge containers
            if (el.querySelectorAll('tr,li,article').length > 3) return;
            mails.push({ tekst: txt.slice(0, 300), bron: host, t: Date.now() });
        });
        // de-dupe
        const seen = new Set();
        const uniq = mails.filter(m => {
            if (seen.has(m.tekst)) return false;
            seen.add(m.tekst); return true;
        }).slice(0, 50);
        try {
            if (chrome && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ 'lm_mails': uniq });
            }
        } catch (err) {}
    }

    setTimeout(scrape, 2500);
    const obs = new MutationObserver(() => { clearTimeout(window.__lm_mail_t); window.__lm_mail_t = setTimeout(scrape, 2000); });
    if (document.body) obs.observe(document.body, { childList: true, subtree: true });
})();
