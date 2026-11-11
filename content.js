// ============================================================
// EGODACT ADDON: LEARNING MODE
// ============================================================
(function () {
    'use strict';

    if (window.__egodactLearningModeLoaded) return;
    window.__egodactLearningModeLoaded = true;

    const client = window.EgodactAddonClient;
    if (!client) { console.warn('EgodactAddonClient missing'); return; }
    const L = window.EgodactAddonLib || {};

    // Keep our own namespaced localStorage store (egodact_lm_*) so
    // existing user data is preserved.
    const STORE_PREFIX = 'egodact_lm_';
    const store = {
        get(key, fallback) {
            try {
                const raw = localStorage.getItem(STORE_PREFIX + key);
                return raw === null ? fallback : JSON.parse(raw);
            } catch (err) { return fallback; }
        },
        set(key, value) {
            try { localStorage.setItem(STORE_PREFIX + key, JSON.stringify(value)); return true; }
            catch (err) { return false; }
        },
        remove(key) {
            try { localStorage.removeItem(STORE_PREFIX + key); } catch (err) {}
        }
    };

    client.registerAddon({
        id: 'egodact-learning-mode',
        name: 'Learning Mode',
        version: '0.3.1',
        description: 'Eisenhower matrix, compact mode and floating notepad.',
        author: 'MaxiTaxi',
        source: 'https://github.com/MaxiTaxi/Egodact_addon_Learning_Mode'
    });

    // ------------------------------------------------------------
    // Shared modal
    // ------------------------------------------------------------
    function openPanel(title, node) {
        client.openModal(title, '');
        const backdrop = document.getElementById('egodact-custom-modal-backdrop');
        if (!backdrop) return;
        const modal = backdrop.firstElementChild;
        if (modal) modal.style.width = 'min(660px, calc(100vw - 32px))';
        const content = backdrop.querySelector('div[style*="overflow-y:auto"]');
        if (content) {
            content.innerHTML = '';
            content.appendChild(node);
        }
    }

    // ------------------------------------------------------------
    // Clean Eisenhower matrix (with drag & drop)
    // ------------------------------------------------------------
    const QUADS = [
        { key: 'do', title: 'Do', sub: 'Urgent + belangrijk', color: '#ef5350' },
        { key: 'schedule', title: 'Plan', sub: 'Belangrijk, niet urgent', color: '#42a5f5' },
        { key: 'delegate', title: 'Delegeer', sub: 'Urgent, niet belangrijk', color: '#ffa726' },
        { key: 'drop', title: 'Laat vallen', sub: 'Geen van beide', color: '#78909c' }
    ];

    function getMatrixItems(key) {
        const arr = store.get('matrix_' + key, []);
        return Array.isArray(arr) ? arr.map(x => (typeof x === 'string' ? x : (x && x.text) || '')).filter(Boolean) : [];
    }
    function setMatrixItems(key, arr) {
        store.set('matrix_' + key, arr);
    }

    function renderMatrix(container) {
        const grid = container || document.createElement('div');
        grid.innerHTML = '';
        grid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:10px;';

        QUADS.forEach(q => {
            const card = document.createElement('div');
            card.style.cssText = 'display:flex; flex-direction:column; gap:8px; padding:12px; border-radius:8px; background:var(--egd-veld); border:1px solid var(--egd-rand); border-top:3px solid ' + q.color + '; min-height:150px;';
            card.setAttribute('data-lm-quad', q.key);

            const head = document.createElement('div');
            head.style.cssText = 'display:flex; align-items:baseline; justify-content:space-between; gap:8px;';
            const title = document.createElement('div');
            title.innerHTML = '<strong style="font-size:14px;">' + q.title + '</strong><div style="font-size:11px; color:var(--egd-tekst-zacht);">' + q.sub + '</div>';
            const count = document.createElement('span');
            count.style.cssText = 'font-size:11px; font-weight:bold; color:' + q.color + '; background:rgba(255,255,255,.08); border-radius:10px; padding:2px 7px;';
            head.append(title, count);
            card.appendChild(head);

            const list = document.createElement('div');
            list.style.cssText = 'display:flex; flex-direction:column; gap:5px; flex:1; min-height:40px;';
            list.setAttribute('data-lm-list', q.key);
            card.appendChild(list);

            const items = getMatrixItems(q.key);
            count.textContent = items.length;
            if (!items.length) {
                const empty = document.createElement('div');
                empty.textContent = 'Sleep hier een taak of typ er een';
                empty.style.cssText = 'font-size:11px; color:var(--egd-tekst-zacht); padding:6px 0;';
                list.appendChild(empty);
            } else {
                items.forEach((it, idx) => {
                    const row = document.createElement('div');
                    row.draggable = true;
                    row.style.cssText = 'display:flex; align-items:center; gap:7px; font-size:12px; padding:5px 7px; background:var(--egd-modal); border-radius:5px; cursor:grab; border:1px solid transparent;';
                    const dot = document.createElement('span');
                    dot.style.cssText = 'width:6px; height:6px; border-radius:50%; background:' + q.color + '; flex-shrink:0;';
                    const span = document.createElement('span');
                    span.textContent = it;
                    span.style.cssText = 'flex:1; overflow-wrap:anywhere;';
                    const del = document.createElement('button');
                    del.textContent = '\u00d7';
                    del.style.cssText = 'border:none; background:transparent; color:var(--egd-tekst-zacht); cursor:pointer; font-size:15px; line-height:1; padding:0 2px;';
                    del.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const arr = getMatrixItems(q.key);
                        arr.splice(idx, 1);
                        setMatrixItems(q.key, arr);
                        renderMatrix(grid);
                    });
                    row.append(dot, span, del);

                    row.addEventListener('dragstart', (e) => {
                        e.dataTransfer.setData('text/plain', JSON.stringify({ from: q.key, index: idx }));
                        e.dataTransfer.effectAllowed = 'move';
                        row.style.opacity = '0.5';
                    });
                    row.addEventListener('dragend', () => { row.style.opacity = '1'; });

                    list.appendChild(row);
                });
            }

            list.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                list.style.background = 'rgba(255,255,255,.04)';
            });
            list.addEventListener('dragleave', () => { list.style.background = ''; });
            list.addEventListener('drop', (e) => {
                e.preventDefault();
                list.style.background = '';
                let payload = null;
                try { payload = JSON.parse(e.dataTransfer.getData('text/plain') || 'null'); } catch (err) {}
                if (!payload || payload.from == null) return;
                if (payload.from === q.key) return;

                const srcArr = getMatrixItems(payload.from);
                if (payload.index < 0 || payload.index >= srcArr.length) return;
                const moved = srcArr.splice(payload.index, 1)[0];
                if (moved == null) return;
                setMatrixItems(payload.from, srcArr);

                const tgtArr = getMatrixItems(q.key);
                tgtArr.push(moved);
                setMatrixItems(q.key, tgtArr);

                renderMatrix(grid);
            });

            const addRow = document.createElement('div');
            addRow.style.cssText = 'display:flex; gap:6px;';
            const input = document.createElement('input');
            input.placeholder = 'Nieuwe taak...';
            input.style.cssText = 'flex:1; min-width:0; box-sizing:border-box; padding:6px 8px; border:1px solid var(--egd-rand); border-radius:5px; background:var(--egd-modal); color:var(--egd-tekst); font-size:12px;';
            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.textContent = '+';
            addBtn.style.cssText = 'width:30px; border:none; border-radius:5px; background:' + q.color + '; color:#fff; font-weight:bold; cursor:pointer; font-size:16px;';
            function add() {
                const v = input.value.trim();
                if (!v) return;
                const arr = getMatrixItems(q.key);
                arr.push(v);
                setMatrixItems(q.key, arr);
                renderMatrix(grid);
            }
            addBtn.addEventListener('click', add);
            input.addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
            addRow.append(input, addBtn);
            card.appendChild(addRow);

            grid.appendChild(card);
        });

        return grid;
    }

    // ------------------------------------------------------------
    // Compact mode (custom switches)
    // ------------------------------------------------------------
    const compactOptions = [
        { key: 'hideTijd', label: 'Tijd-knop', desc: 'Verberg de klok/timer-knop' },
        { key: 'hideBeta', label: 'Beta-knop', desc: 'Verberg de beta-knop' },
        { key: 'hideAddons', label: 'Addons-knop', desc: 'Verberg de addons-knop' },
        { key: 'hideAddonButtons', label: 'Addon-knoppen', desc: 'Verberg alle addon-knoppen in de topbar en het hamburgermenu' },
        { key: 'compactCards', label: 'Compacte kaarten', desc: 'Minder padding op het bord' }
    ];

    function maakSwitch(checked, onChange) {
        const wrap = document.createElement('span');
        wrap.style.cssText = 'position:relative; display:inline-block; width:40px; height:22px; flex-shrink:0; cursor:pointer;';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!checked;
        input.style.cssText = 'opacity:0; width:0; height:0; position:absolute;';
        const track = document.createElement('span');
        Object.assign(track.style, {
            position: 'absolute', inset: '0', borderRadius: '22px',
            background: checked ? 'var(--egd-accent)' : 'var(--egd-uit)',
            transition: 'background 180ms ease'
        });
        const knob = document.createElement('span');
        Object.assign(knob.style, {
            position: 'absolute', top: '2px', left: checked ? '20px' : '2px',
            width: '18px', height: '18px', borderRadius: '50%',
            background: '#fff', transition: 'left 180ms cubic-bezier(.4,0,.2,1)',
            boxShadow: '0 1px 3px rgba(0,0,0,.35)'
        });
        track.appendChild(knob);
        wrap.append(input, track);
        wrap.addEventListener('click', e => {
            e.preventDefault();
            input.checked = !input.checked;
            track.style.background = input.checked ? 'var(--egd-accent)' : 'var(--egd-uit)';
            knob.style.left = input.checked ? '20px' : '2px';
            onChange(input.checked);
        });
        return wrap;
    }

    function renderCompact() {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex; flex-direction:column; gap:8px;';
        compactOptions.forEach(o => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; gap:12px; padding:10px 12px; background:var(--egd-veld); border:1px solid var(--egd-rand); border-radius:8px;';
            const info = document.createElement('div');
            info.innerHTML = '<div style="font-size:13px; font-weight:bold;">' + o.label + '</div><div style="font-size:11px; color:var(--egd-tekst-zacht);">' + o.desc + '</div>';
            const sw = maakSwitch(store.get(o.key, false), val => { store.set(o.key, val); applyCompact(); });
            row.append(info, sw);
            wrap.appendChild(row);
        });
        return wrap;
    }

    // ------------------------------------------------------------
    // Hamburger-dropdown: addon-items verbergen in compact/leermodus
    // ------------------------------------------------------------
    let hamObserver = null;
    let hamWaitObserver = null;
    function isCompactMenuItem(el) {
        const id = String(el.getAttribute('data-egd-ham-id') || '');
        const label = String(el.textContent || '').toLowerCase();
        return id === 'lm-compact' || label.indexOf('compact') !== -1;
    }
    function isShortcutsItem(el) {
        const id = String(el.getAttribute('data-egd-ham-id') || '');
        const label = String(el.textContent || '').toLowerCase();
        return id === 'shortcuts' || label.indexOf('sneltoetsen') !== -1;
    }
    function applyHamburgerHiding(hide) {
        const dropdown = document.getElementById('egodact-hamburger-dropdown');
        if (!dropdown) {
            // De host tekent de dropdown later; pak hem zodra hij bestaat.
            if (!hamWaitObserver && typeof MutationObserver !== 'undefined') {
                hamWaitObserver = new MutationObserver(function () {
                    if (document.getElementById('egodact-hamburger-dropdown')) {
                        try { hamWaitObserver.disconnect(); } catch (e) {}
                        hamWaitObserver = null;
                        try { applyHamburgerHiding(!!store.get('hideAddonButtons', false)); } catch (e) {}
                    }
                });
                try { hamWaitObserver.observe(document.body, { childList: true, subtree: true }); } catch (e) {}
            }
            return;
        }
        dropdown.querySelectorAll('button').forEach(function (el) {
            const keep = el.getAttribute('data-egd-ham-keep') === '1';
            const hideThis = hide && !keep && !isCompactMenuItem(el) && !isShortcutsItem(el);
            el.style.setProperty('display', hideThis ? 'none' : '', 'important');
        });
        if (!hamObserver && typeof MutationObserver !== 'undefined') {
            hamObserver = new MutationObserver(function () {
                try { applyHamburgerHiding(!!store.get('hideAddonButtons', false)); } catch (e) {}
            });
        }
        if (hamObserver) {
            try {
                hamObserver.disconnect();
                hamObserver.observe(dropdown, { childList: true });
            } catch (e) {}
        }
    }

    function applyCompact() {
        const compactOn = !!store.get('compactCards', false);
        document.body.classList.toggle('lm-compact', compactOn);
        try {
            if (typeof client.setLearningMode === 'function') client.setLearningMode(compactOn);
        } catch (e) { console.error('learning mode toggle failed', e); }
        const map = { hideTijd: 'egodact-tijd-knop', hideBeta: 'egodact-beta-features-knop', hideAddons: 'egodact-addons-knop' };
        Object.keys(map).forEach(k => {
            const el = document.getElementById(map[k]);
            if (el) el.style.setProperty('display', store.get(k, false) ? 'none' : '', 'important');
        });
        const hideAddons = !!store.get('hideAddonButtons', false);
        document.querySelectorAll('[data-egodact-addon-btn="1"]').forEach(el => {
            el.style.setProperty('display', hideAddons ? 'none' : '', 'important');
        });
        applyHamburgerHiding(hideAddons);
    }

    // ------------------------------------------------------------
    // Notepad v2: tabs, pin, resize, markdown-ish, challenge link
    // ------------------------------------------------------------
    const NOTEPAD_KEY = 'notepad_v2';
    const NOTEPAD_GEOM_KEY = 'notepad_geom';

    function loadNotepadState() {
        const s = store.get(NOTEPAD_KEY, null);
        if (s && Array.isArray(s.notes) && s.notes.length) return s;
        return {
            notes: [{ id: 'n1', title: 'Notitie 1', body: '', pinned: false, challengeId: null }],
            activeId: 'n1'
        };
    }
    function saveNotepadState(s) {
        store.set(NOTEPAD_KEY, { notes: s.notes, activeId: s.activeId });
    }

    function renderMarkdown(text) {
        const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const lines = String(text || '').split('\n');
        const out = [];
        let inList = false, inCheck = false;
        lines.forEach((raw) => {
            const line = raw;
            if (/^#{1,3}\s/.test(line)) {
                if (inList) { out.push('</ul>'); inList = false; }
                if (inCheck) { out.push('</ul>'); inCheck = false; }
                const lvl = line.match(/^#+/)[0].length;
                out.push('<h' + (lvl + 2) + ' style="margin:6px 0 2px;font-size:' + (16 - lvl) + 'px;">' + inline(line.replace(/^#{1,3}\s/, '')) + '</h' + (lvl + 2) + '>');
                return;
            }
            const cb = line.match(/^-\s*\[([ xX])\]\s*(.*)$/);
            if (cb) {
                if (inList) { out.push('</ul>'); inList = false; }
                if (!inCheck) { out.push('<ul style="list-style:none;padding-left:0;margin:4px 0;">'); inCheck = true; }
                const checked = cb[1].toLowerCase() === 'x';
                const id = 'cb_' + Math.random().toString(36).slice(2);
                out.push('<li style="display:flex;align-items:flex-start;gap:6px;margin:2px 0;"><input type="checkbox" ' + (checked ? 'checked' : '') + ' data-cb="' + id + '" data-text="' + esc(cb[2]) + '"><span style="' + (checked ? 'text-decoration:line-through;color:var(--egd-tekst-zacht);' : '') + '">' + inline(cb[2]) + '</span></li>');
                return;
            }
            const bullet = line.match(/^[-*]\s+(.*)$/);
            if (bullet) {
                if (inCheck) { out.push('</ul>'); inCheck = false; }
                if (!inList) { out.push('<ul style="padding-left:18px;margin:4px 0;">'); inList = true; }
                out.push('<li>' + inline(bullet[1]) + '</li>');
                return;
            }
            if (line.trim() === '') {
                if (inList) { out.push('</ul>'); inList = false; }
                if (inCheck) { out.push('</ul>'); inCheck = false; }
                out.push('<div style="height:6px;"></div>');
                return;
            }
            if (inList) { out.push('</ul>'); inList = false; }
            if (inCheck) { out.push('</ul>'); inCheck = false; }
            out.push('<p style="margin:2px 0;">' + inline(line) + '</p>');
        });
        if (inList) out.push('</ul>');
        if (inCheck) out.push('</ul>');
        function inline(s) {
            return esc(s)
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                .replace(/`(.+?)`/g, '<code style="background:var(--egd-veld);padding:1px 4px;border-radius:3px;">$1</code>');
        }
        return out.join('');
    }

    let notepadEl = null;
    let notepadState = null;
    let notepadPreview = false;

    function openNotepad(linkChallengeId) {
        if (notepadEl) { notepadEl.style.display = 'flex'; return; }

        notepadState = loadNotepadState();
        if (linkChallengeId) {
            // Maak een nieuwe notitie gekoppeld aan deze challenge.
            const id = 'n' + Date.now();
            notepadState.notes.unshift({ id, title: 'Notitie', body: '', pinned: false, challengeId: linkChallengeId });
            notepadState.activeId = id;
            saveNotepadState(notepadState);
        }

        const geom = store.get(NOTEPAD_GEOM_KEY, null) || { w: 320, h: 260, x: null, y: null };

        notepadEl = document.createElement('div');
        Object.assign(notepadEl.style, {
            position: 'fixed',
            width: geom.w + 'px',
            height: geom.h + 'px',
            background: 'var(--egd-modal)',
            color: 'var(--egd-tekst)',
            border: '1px solid var(--egd-rand)',
            borderRadius: '8px',
            boxShadow: 'var(--egd-schaduw)',
            zIndex: '2147483000',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            resize: 'none'
        });
        if (geom.x != null) { notepadEl.style.left = geom.x + 'px'; notepadEl.style.right = 'auto'; }
        else { notepadEl.style.right = '16px'; }
        if (geom.y != null) { notepadEl.style.top = geom.y + 'px'; notepadEl.style.bottom = 'auto'; }
        else { notepadEl.style.bottom = '16px'; }

        // Header.
        const bar = document.createElement('div');
        bar.style.cssText = 'padding:6px 10px; background:var(--egd-veld); cursor:move; display:flex; justify-content:space-between; align-items:center; font-size:12px; font-weight:bold; gap:6px; flex-shrink:0;';
        const barTitle = document.createElement('span');
        barTitle.textContent = 'Notepad';
        barTitle.style.flex = '1';
        const pinBtn = document.createElement('button');
        pinBtn.textContent = '📌';
        pinBtn.title = 'Altijd bovenop';
        pinBtn.style.cssText = 'border:none;background:transparent;color:var(--egd-tekst);cursor:pointer;font-size:14px;';
        const close = document.createElement('button');
        close.textContent = '×';
        close.style.cssText = 'border:none;background:transparent;color:var(--egd-tekst);cursor:pointer;font-size:16px;';
        close.addEventListener('click', () => { notepadEl.style.display = 'none'; });
        bar.append(barTitle, pinBtn, close);

        // Challenge selector row.
        const linkRow = document.createElement('div');
        linkRow.style.cssText = 'padding:4px 8px; background:var(--egd-veld); border-bottom:1px solid var(--egd-rand); display:flex; align-items:center; gap:6px; flex-shrink:0;';
        const linkLabel = document.createElement('span');
        linkLabel.textContent = 'Challenge:';
        linkLabel.style.cssText = 'font-size:11px; color:var(--egd-tekst-zacht);';
        const linkSelect = document.createElement('select');
        linkSelect.style.cssText = 'flex:1; font-size:11px; padding:2px 4px; border-radius:4px; background:var(--egd-modal); color:var(--egd-tekst); border:1px solid var(--egd-rand);';
        const linkRefresh = document.createElement('button');
        linkRefresh.type = 'button';
        linkRefresh.textContent = '↻';
        linkRefresh.title = 'Challenges vernieuwen';
        linkRefresh.style.cssText = 'border:none;background:transparent;color:var(--egd-tekst-zacht);cursor:pointer;font-size:14px;padding:0 2px;';
        linkRow.append(linkLabel, linkSelect, linkRefresh);

        // Tabs.
        const tabs = document.createElement('div');
        tabs.style.cssText = 'display:flex; align-items:center; gap:2px; padding:4px 6px; background:var(--egd-veld); border-bottom:1px solid var(--egd-rand); overflow-x:auto; flex-shrink:0;';

        // Toolbar.
        const toolbar = document.createElement('div');
        toolbar.style.cssText = 'display:flex; align-items:center; gap:2px; padding:4px 6px; border-bottom:1px solid var(--egd-rand); flex-shrink:0;';
        function tbBtn(label, title, fn) {
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = label;
            b.title = title;
            b.style.cssText = 'border:none;background:transparent;color:var(--egd-tekst);cursor:pointer;padding:2px 6px;border-radius:4px;font-size:12px;font-weight:bold;';
            b.addEventListener('click', fn);
            return b;
        }

        const body = document.createElement('div');
        body.style.cssText = 'flex:1; min-height:0; display:flex; flex-direction:column;';

        const ta = document.createElement('textarea');
        ta.style.cssText = 'flex:1; border:none; resize:none; padding:8px; background:var(--egd-modal); color:var(--egd-tekst); font:inherit; font-size:13px;';

        const preview = document.createElement('div');
        preview.style.cssText = 'flex:1; overflow:auto; padding:8px; font-size:13px; line-height:1.45;';

        body.appendChild(ta);

        // Resize handle.
        const handle = document.createElement('div');
        handle.style.cssText = 'position:absolute; right:0; bottom:0; width:14px; height:14px; cursor:nwse-resize; background:linear-gradient(135deg, transparent 50%, var(--egd-tekst-zacht) 50%);';

        notepadEl.append(bar, linkRow, tabs, toolbar, body, handle);
        document.body.appendChild(notepadEl);

        // State helpers.
        function activeNote() {
            return notepadState.notes.find(n => n.id === notepadState.activeId) || notepadState.notes[0];
        }

        function loadChallengesIntoSelect(force) {
            linkSelect.innerHTML = '<option value="">(geen)</option><option value="" disabled>Laden...</option>';
            const loader = (typeof client.getChallenges === 'function')
                ? client.getChallenges(!!force)
                : (window.EgodactAddons && typeof window.EgodactAddons.getChallenges === 'function'
                    ? window.EgodactAddons.getChallenges(!!force)
                    : Promise.resolve([]));
            loader.then(list => {
                // Challenges come back as objects with various shapes;
                // normalize name/id.
                linkSelect.innerHTML = '<option value="">(geen)</option>';
                const arr = Array.isArray(list) ? list : [];
                if (!arr.length) {
                    const opt = document.createElement('option');
                    opt.value = '';
                    opt.disabled = true;
                    opt.textContent = '(geen challenges gevonden)';
                    linkSelect.appendChild(opt);
                } else {
                    arr.forEach(ch => {
                        if (!ch) return;
                        const id = String(ch.id || ch.challengeId || '').trim();
                        const name = String(ch.naam || ch.name || ch.title || ch.challengeName || ch.displayName || id || 'Challenge').trim();
                        if (!id && !name) return;
                        const opt = document.createElement('option');
                        opt.value = id || name;
                        opt.textContent = name;
                        opt.title = name;
                        linkSelect.appendChild(opt);
                    });
                }
                const n = activeNote();
                if (n && n.challengeId) linkSelect.value = n.challengeId;
            }).catch(() => {
                linkSelect.innerHTML = '<option value="">(geen)</option><option value="" disabled>(laden mislukt)</option>';
            });
        }
        loadChallengesIntoSelect();
        linkRefresh.addEventListener('click', function () { loadChallengesIntoSelect(true); });

        function renderTabs() {
            tabs.innerHTML = '';
            const sorted = [...notepadState.notes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
            sorted.forEach(n => {
                const t = document.createElement('button');
                t.type = 'button';
                t.style.cssText = 'border:none; background:' + (n.id === notepadState.activeId ? 'var(--egd-modal)' : 'transparent') + '; color:var(--egd-tekst); padding:3px 8px; border-radius:4px; cursor:pointer; font-size:11px; white-space:nowrap; display:flex; align-items:center; gap:4px;';
                const pin = document.createElement('span');
                pin.textContent = n.pinned ? '📌' : '';
                pin.style.fontSize = '9px';
                const lbl = document.createElement('span');
                lbl.textContent = n.title || 'Notitie';
                t.append(pin, lbl);
                lbl.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    const nv = prompt('Naam van de notitie:', n.title || '');
                    if (nv != null && nv.trim()) { n.title = nv.trim(); saveNotepadState(notepadState); renderTabs(); }
                });
                t.addEventListener('click', () => {
                    // save current
                    const cur = activeNote();
                    if (cur) cur.body = ta.value;
                    notepadState.activeId = n.id;
                    saveNotepadState(notepadState);
                    renderTabs();
                    loadActive();
                });
                // close tab
                const x = document.createElement('span');
                x.textContent = '×';
                x.style.cssText = 'margin-left:4px; opacity:.6; cursor:pointer;';
                x.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (notepadState.notes.length <= 1) return;
                    notepadState.notes = notepadState.notes.filter(xn => xn.id !== n.id);
                    if (notepadState.activeId === n.id) notepadState.activeId = notepadState.notes[0].id;
                    saveNotepadState(notepadState);
                    renderTabs();
                    loadActive();
                });
                t.appendChild(x);
                tabs.appendChild(t);
            });
            const addTab = document.createElement('button');
            addTab.type = 'button';
            addTab.textContent = '+';
            addTab.title = 'Nieuwe notitie';
            addTab.style.cssText = 'border:none; background:transparent; color:var(--egd-tekst); padding:3px 8px; cursor:pointer; font-size:14px; font-weight:bold;';
            addTab.addEventListener('click', () => {
                const cur = activeNote();
                if (cur) cur.body = ta.value;
                const id = 'n' + Date.now();
                notepadState.notes.push({ id, title: 'Notitie ' + (notepadState.notes.length + 1), body: '', pinned: false, challengeId: null });
                notepadState.activeId = id;
                saveNotepadState(notepadState);
                renderTabs();
                loadActive();
            });
            tabs.appendChild(addTab);
        }

        function loadActive() {
            const n = activeNote();
            if (!n) return;
            ta.value = n.body || '';
            // title editable via double-click on tab? keep simple
            linkSelect.value = n.challengeId || '';
            if (notepadPreview) renderPreview();
        }

        function saveActive() {
            const n = activeNote();
            if (n) { n.body = ta.value; n.challengeId = linkSelect.value || null; }
            saveNotepadState(notepadState);
        }

        ta.addEventListener('input', () => {
            saveActive();
        });
        linkSelect.addEventListener('change', () => { saveActive(); });

        // Toolbar actions.
        toolbar.appendChild(tbBtn('B', 'Vet', () => wrapSelection('**', '**')));
        toolbar.appendChild(tbBtn('I', 'Cursief', () => wrapSelection('*', '*')));
        toolbar.appendChild(tbBtn('•', 'Lijst', () => insertAtCursor('- ')));
        toolbar.appendChild(tbBtn('☐', 'Checkbox', () => insertAtCursor('- [ ] ')));
        const previewBtn = tbBtn('👁', 'Voorbeeld', () => {
            notepadPreview = !notepadPreview;
            if (notepadPreview) {
                saveActive();
                body.innerHTML = '';
                body.appendChild(preview);
                preview.innerHTML = renderMarkdown(ta.value);
                // checkbox toggles
                preview.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                    cb.addEventListener('change', () => {
                        const txt = cb.getAttribute('data-text') || '';
                        const newState = cb.checked ? 'x' : ' ';
                        // Replace first matching "- [ ] txt" or "- [x] txt"
                        const re = new RegExp('-\\s*\\[[ xX]\\]\\s*' + txt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
                        ta.value = ta.value.replace(re, '- [' + newState + '] ' + txt);
                        saveActive();
                    });
                });
            } else {
                body.innerHTML = '';
                body.appendChild(ta);
                ta.value = activeNote().body || '';
            }
        });
        toolbar.appendChild(previewBtn);

        function wrapSelection(before, after) {
            const start = ta.selectionStart, end = ta.selectionEnd;
            const sel = ta.value.slice(start, end);
            const next = ta.value.slice(0, start) + before + sel + after + ta.value.slice(end);
            ta.value = next;
            ta.selectionStart = start + before.length;
            ta.selectionEnd = end + before.length;
            ta.focus();
            saveActive();
        }
        function insertAtCursor(txt) {
            const start = ta.selectionStart;
            const next = ta.value.slice(0, start) + txt + ta.value.slice(start);
            ta.value = next;
            ta.selectionStart = ta.selectionEnd = start + txt.length;
            ta.focus();
            saveActive();
        }

        // Pin (always on top).
        let pinned = !!store.get('notepad_pinned', false);
        function applyPin() {
            notepadEl.style.zIndex = pinned ? '2147483600' : '2147483000';
            pinBtn.style.color = pinned ? 'var(--egd-accent)' : 'var(--egd-tekst)';
        }
        pinBtn.addEventListener('click', () => { pinned = !pinned; store.set('notepad_pinned', pinned); applyPin(); });
        applyPin();

        // Drag.
        let dragging = false, ox = 0, oy = 0;
        bar.addEventListener('mousedown', e => {
            if (e.target === close || e.target === pinBtn) return;
            dragging = true;
            ox = e.clientX - notepadEl.offsetLeft;
            oy = e.clientY - notepadEl.offsetTop;
            e.preventDefault();
        });
        document.addEventListener('mousemove', e => {
            if (!dragging) return;
            notepadEl.style.left = (e.clientX - ox) + 'px';
            notepadEl.style.right = 'auto';
            notepadEl.style.top = (e.clientY - oy) + 'px';
            notepadEl.style.bottom = 'auto';
        });
        document.addEventListener('mouseup', () => { dragging = false; });

        // Resize.
        let resizing = false, rw = 0, rh = 0, rx = 0, ry = 0;
        handle.addEventListener('mousedown', e => {
            resizing = true;
            rw = notepadEl.offsetWidth; rh = notepadEl.offsetHeight;
            rx = e.clientX; ry = e.clientY;
            e.preventDefault(); e.stopPropagation();
        });
        document.addEventListener('mousemove', e => {
            if (!resizing) return;
            const nw = Math.max(220, rw + (e.clientX - rx));
            const nh = Math.max(160, rh + (e.clientY - ry));
            notepadEl.style.width = nw + 'px';
            notepadEl.style.height = nh + 'px';
        });
        document.addEventListener('mouseup', () => {
            if (!resizing) return;
            resizing = false;
            store.set(NOTEPAD_GEOM_KEY, {
                w: notepadEl.offsetWidth,
                h: notepadEl.offsetHeight,
                x: parseInt(notepadEl.style.left) || null,
                y: parseInt(notepadEl.style.top) || null
            });
        });

        // Persist geometry on drag end too.
        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            store.set(NOTEPAD_GEOM_KEY, {
                w: notepadEl.offsetWidth,
                h: notepadEl.offsetHeight,
                x: parseInt(notepadEl.style.left) || null,
                y: parseInt(notepadEl.style.top) || null
            });
        });

        renderTabs();
        loadActive();
    }

    // ------------------------------------------------------------
    // Hamburger registration
    // ------------------------------------------------------------
    const addonId = 'egodact-learning-mode';

    function addonDisabled() {
        try {
            const raw = localStorage.getItem('egodact_disabled_addons');
            const list = raw ? JSON.parse(raw) : [];
            return Array.isArray(list) && list.indexOf(addonId) !== -1;
        } catch (err) { return false; }
    }

    const ICON = (paths) =>
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" ' +
        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';

    if (!addonDisabled()) {
        const items = [
            {
                id: 'lm-matrix',
                title: 'Eisenhower matrix',
                order: 10,
                icon: ICON('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>'),
                run: () => openPanel('Eisenhower Matrix', renderMatrix())
            },
            {
                id: 'lm-compact',
                title: 'Compact mode',
                order: 20,
                keepInLearningMode: true,
                icon: ICON('<path d="M4 6h16"/><path d="M4 12h10"/><path d="M4 18h16"/>'),
                run: () => openPanel('Compact mode', renderCompact())
            },
            {
                id: 'lm-notepad',
                title: 'Notepad',
                order: 30,
                icon: ICON('<path d="M5 4h11l3 3v13H5z"/><path d="M8 9h8"/><path d="M8 13h8"/><path d="M8 17h5"/>'),
                run: () => openNotepad()
            }
        ];

        const helper = (L && L.hamburger) ? L.hamburger : null;
        items.forEach(it => {
            const meta = { addonId: addonId, id: it.id, title: it.title, icon: it.icon, order: it.order, keepInLearningMode: !!it.keepInLearningMode };
            if (helper && typeof helper.add === 'function') {
                helper.add(meta);
                helper.onOpen(it.id, it.run);
            } else if (typeof client.registerHamburger === 'function') {
                client.registerHamburger(meta);
                client.onOpen(it.id, it.run);
                // Backwards compat for hosts without hamburger type:
                client.registerMenu(meta);
            } else {
                client.registerMenu(meta);
                client.onOpen(it.id, it.run);
            }
        });

        // Theme listener: re-apply compact on theme change (no 1.5s needed).
        if (typeof client.onThemeChange === 'function') {
            client.onThemeChange(() => applyCompact());
        }

        applyCompact();
        setInterval(applyCompact, 1500);

        // Re-register after a short delay in case the host wasn't ready.
        setTimeout(function () {
            items.forEach(function (it) {
            const meta = { addonId: addonId, id: it.id, title: it.title, icon: it.icon, order: it.order, keepInLearningMode: !!it.keepInLearningMode };
                try {
                    if (typeof client.registerHamburger === 'function') client.registerHamburger(meta);
                    else client.registerMenu(meta);
                } catch (e) {}
            });
        }, 1200);
    }
})();
