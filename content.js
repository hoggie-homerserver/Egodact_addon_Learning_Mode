// ============================================================
// EGODACT ADDON: LEARNING MODE
// ============================================================
(function () {
    'use strict';

    const client = window.EgodactAddonClient;
    if (!client) { console.warn('EgodactAddonClient missing'); return; }

    const store = (client.storage) ? client.storage('egodact-learning-mode') : { get: (k, f) => f, set: () => {}, remove: () => {} };

    client.registerAddon({
        id: 'egodact-learning-mode',
        name: 'Learning Mode',
        version: '0.1.0',
        description: 'Eisenhower matrix, compact mode, floating notepad, shortcuts and mail sync.',
        author: 'MaxiTaxi'
    });

    // ------------------------------------------------------------
    // Shared modal (host modal, but we append DOM ourselves)
    // ------------------------------------------------------------
    function openPanel(title, node) {
        // The SDK's openModal only takes (title, bodyHtml) and renders a
        // string. Open it empty, then move the real DOM node into the body.
        client.openModal(title, '');
        const backdrop = document.getElementById('egodact-custom-modal-backdrop');
        if (!backdrop) return;
        const modal = backdrop.firstElementChild;
        if (modal) modal.style.width = 'min(640px, calc(100vw - 32px))';
        const content = backdrop.querySelector('div[style*="overflow-y:auto"]');
        if (content) {
            content.innerHTML = '';
            content.appendChild(node);
        }
    }

    // ------------------------------------------------------------
    // 1. Eisenhower matrix
    // ------------------------------------------------------------
    function renderMatrix() {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:8px;';
        const quads = [
            { key: 'do', title: 'Do (urgent + belangrijk)', color: '#ef5350' },
            { key: 'schedule', title: 'Plan (belangrijk)', color: '#42a5f5' },
            { key: 'delegate', title: 'Delegeer (urgent)', color: '#ffa726' },
            { key: 'drop', title: 'Laat vallen', color: '#78909c' }
        ];
        quads.forEach(q => {
            const box = document.createElement('div');
            box.style.cssText = 'background:var(--egd-veld); border:1px solid var(--egd-rand); border-left:4px solid ' + q.color + '; border-radius:6px; padding:10px; min-height:90px; display:flex; flex-direction:column; gap:4px;';
            const t = document.createElement('strong');
            t.textContent = q.title;
            t.style.fontSize = '12px';
            box.appendChild(t);
            const list = document.createElement('div');
            list.style.cssText = 'display:flex; flex-direction:column; gap:4px;';
            function renderItems() {
                list.innerHTML = '';
                const items = store.get('matrix_' + q.key, []);
                items.forEach((it, idx) => {
                    const row = document.createElement('div');
                    row.style.cssText = 'display:flex; align-items:center; gap:6px; font-size:12px;';
                    const span = document.createElement('span');
                    span.textContent = it;
                    span.style.flex = '1';
                    span.style.overflowWrap = 'anywhere';
                    const del = document.createElement('button');
                    del.textContent = '×';
                    del.style.cssText = 'border:none;background:transparent;color:var(--egd-gevaar);cursor:pointer;font-size:14px;';
                    del.addEventListener('click', () => {
                        const arr = store.get('matrix_' + q.key, []);
                        arr.splice(idx, 1);
                        store.set('matrix_' + q.key, arr);
                        renderItems();
                    });
                    row.append(span, del);
                    list.appendChild(row);
                });
            }
            renderItems();
            const input = document.createElement('input');
            input.placeholder = 'Nieuwe taak...';
            input.style.cssText = 'margin-top:auto; width:100%; box-sizing:border-box; padding:6px; border:1px solid var(--egd-rand); border-radius:4px; background:var(--egd-modal); color:var(--egd-tekst); font-size:12px;';
            input.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && input.value.trim()) {
                    const arr = store.get('matrix_' + q.key, []);
                    arr.push(input.value.trim());
                    store.set('matrix_' + q.key, arr);
                    input.value = '';
                    renderItems();
                }
            });
            box.append(list, input);
            wrap.appendChild(box);
        });
        return wrap;
    }

    // ------------------------------------------------------------
    // 2. Compact mode
    // ------------------------------------------------------------
    const compactOptions = [
        { key: 'hideTijd', label: 'Verberg tijd-knop' },
        { key: 'hideBeta', label: 'Verberg beta-knop' },
        { key: 'hideAddons', label: 'Verberg addons-knop' },
        { key: 'compactCards', label: 'Compacte kaarten (minder padding)' }
    ];
    function renderCompact() {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex; flex-direction:column; gap:8px;';
        compactOptions.forEach(o => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:8px 10px; background:var(--egd-veld); border-radius:6px;';
            const lbl = document.createElement('span');
            lbl.textContent = o.label;
            lbl.style.fontSize = '13px';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = !!store.get(o.key, false);
            cb.addEventListener('change', () => { store.set(o.key, cb.checked); applyCompact(); });
            row.append(lbl, cb);
            wrap.appendChild(row);
        });
        return wrap;
    }
    function applyCompact() {
        document.body.classList.toggle('lm-compact', !!store.get('compactCards', false));
        const map = { hideTijd: 'egodact-tijd-knop', hideBeta: 'egodact-beta-features-knop', hideAddons: 'egodact-addons-knop' };
        Object.keys(map).forEach(k => {
            const el = document.getElementById(map[k]);
            if (el) el.style.display = store.get(k, false) ? 'none' : '';
        });
    }

    // ------------------------------------------------------------
    // 3. Floating notepad
    // ------------------------------------------------------------
    let notepadEl = null;
    function openNotepad() {
        if (notepadEl) { notepadEl.style.display = 'flex'; return; }
        notepadEl = document.createElement('div');
        Object.assign(notepadEl.style, {
            position: 'fixed', right: '16px', bottom: '16px', width: '280px', height: '220px',
            background: 'var(--egd-modal)', color: 'var(--egd-tekst)', border: '1px solid var(--egd-rand)',
            borderRadius: '8px', boxShadow: 'var(--egd-schaduw)', zIndex: '2147483000',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
        });
        const bar = document.createElement('div');
        bar.style.cssText = 'padding:6px 10px; background:var(--egd-veld); cursor:move; display:flex; justify-content:space-between; align-items:center; font-size:12px; font-weight:bold;';
        bar.textContent = 'Notepad';
        const close = document.createElement('button');
        close.textContent = '×';
        close.style.cssText = 'border:none;background:transparent;color:var(--egd-tekst);cursor:pointer;font-size:16px;';
        close.addEventListener('click', () => { notepadEl.style.display = 'none'; });
        bar.appendChild(close);
        const ta = document.createElement('textarea');
        ta.value = store.get('notepad', '');
        ta.style.cssText = 'flex:1; border:none; resize:none; padding:8px; background:var(--egd-modal); color:var(--egd-tekst); font:inherit; font-size:13px;';
        ta.addEventListener('input', () => store.set('notepad', ta.value));
        notepadEl.append(bar, ta);
        document.body.appendChild(notepadEl);
        let dragging = false, ox = 0, oy = 0;
        bar.addEventListener('mousedown', (e) => { dragging = true; ox = e.clientX - notepadEl.offsetLeft; oy = e.clientY - notepadEl.offsetTop; });
        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            notepadEl.style.left = (e.clientX - ox) + 'px';
            notepadEl.style.right = 'auto';
            notepadEl.style.top = (e.clientY - oy) + 'px';
            notepadEl.style.bottom = 'auto';
        });
        document.addEventListener('mouseup', () => { dragging = false; });
    }

    // ------------------------------------------------------------
    // 4. Keyboard shortcuts
    // ------------------------------------------------------------
    const shortcuts = [
        { keys: 'Ctrl+Shift+N', action: 'Open notepad' },
        { keys: 'Ctrl+Shift+M', action: 'Open Eisenhower matrix' },
        { keys: 'Ctrl+Shift+L', action: 'Toggle compact mode' }
    ];
    function renderShortcuts() {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex; flex-direction:column; gap:6px; font-size:13px;';
        shortcuts.forEach(s => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:var(--egd-veld); border-radius:4px;';
            const code = document.createElement('code');
            code.textContent = s.keys;
            code.style.cssText = 'background:var(--egd-modal); padding:2px 6px; border-radius:3px; font-size:12px;';
            const act = document.createElement('span');
            act.textContent = s.action;
            row.append(code, act);
            wrap.appendChild(row);
        });
        return wrap;
    }
    document.addEventListener('keydown', function (e) {
        if (!e.ctrlKey || !e.shiftKey) return;
        const k = e.key.toLowerCase();
        if (k === 'n') { e.preventDefault(); openNotepad(); }
        if (k === 'm') { e.preventDefault(); openPanel('Eisenhower Matrix', renderMatrix()); }
        if (k === 'l') { e.preventDefault(); store.set('compactCards', !store.get('compactCards', false)); applyCompact(); }
    });

    // ------------------------------------------------------------
    // 5. Mail sync
    // ------------------------------------------------------------
    function renderMails() {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex; flex-direction:column; gap:8px;';
        const info = document.createElement('div');
        info.style.cssText = 'font-size:12px; color:var(--egd-tekst-zacht);';
        info.textContent = 'Open Magister of Somtoday (Berichten) in een ander tabblad; deze addon leest daar je berichten (alleen jouw sessie) en toont ze hier.';
        wrap.appendChild(info);
        const list = document.createElement('div');
        list.style.cssText = 'display:flex; flex-direction:column; gap:4px;';
        wrap.appendChild(list);
        const status = document.createElement('div');
        status.style.cssText = 'font-size:12px; color:var(--egd-tekst-zacht);';
        status.textContent = 'Laden...';
        wrap.appendChild(status);
        function show(mails) {
            list.innerHTML = '';
            if (!mails || !mails.length) {
                const leeg = document.createElement('div');
                leeg.textContent = 'Nog geen berichten gesynchroniseerd. Open Magister/Somtoday Berichten en ververs.';
                leeg.style.cssText = 'padding:12px; text-align:center; color:var(--egd-tekst-zacht); background:var(--egd-veld); border-radius:6px;';
                list.appendChild(leeg);
                status.textContent = '';
                return;
            }
            mails.forEach(m => {
                const row = document.createElement('div');
                row.style.cssText = 'padding:8px; background:var(--egd-veld); border-radius:4px; font-size:12px; line-height:1.4;';
                row.textContent = m.tekst;
                list.appendChild(row);
            });
            status.textContent = mails.length + ' berichten geladen.';
        }
        function load() {
            try {
                if (chrome && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.get('lm_mails', res => show((res && res.lm_mails) || []));
                } else { show([]); }
            } catch (err) { show([]); }
        }
        load();
        const btn = document.createElement('button');
        btn.textContent = 'Vernieuwen';
        btn.style.cssText = 'padding:8px 12px; border:none; border-radius:4px; background:var(--egd-accent); color:var(--egd-accent-tekst); font-weight:bold; cursor:pointer; align-self:flex-start;';
        btn.addEventListener('click', load);
        wrap.appendChild(btn);
        return wrap;
    }

    // ------------------------------------------------------------
    // Menu items
    // ------------------------------------------------------------
    const menuItems = [
        { title: 'Eisenhower matrix', run: () => openPanel('Eisenhower Matrix', renderMatrix()) },
        { title: 'Compact mode', run: () => openPanel('Compact mode', renderCompact()) },
        { title: 'Notepad', run: openNotepad },
        { title: 'Sneltoetsen', run: () => openPanel('Sneltoetsen', renderShortcuts()) },
        { title: 'Berichten', run: () => openPanel('Berichten', renderMails()) }
    ];

    // ------------------------------------------------------------
    // Hamburger button next to the user name
    // ------------------------------------------------------------
    function injectStyle() {
        if (document.getElementById('lm-style')) return;
        const style = document.createElement('style');
        style.id = 'lm-style';
        style.textContent = `
            #lm-toggle {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border: none;
                background: transparent;
                cursor: pointer;
                padding: 0 6px;
                margin: 0 4px 0 0;
                color: var(--egd-tekst, #fff);
                opacity: .85;
                transition: opacity 150ms ease;
                flex-shrink: 0;
            }
            #lm-toggle:hover { opacity: 1; }
            #lm-toggle .lm-icon {
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                width: 20px;
                height: 14px;
                transition: transform 220ms cubic-bezier(.4,0,.2,1);
                transform: rotate(0deg);
            }
            #lm-toggle.lm-open .lm-icon { transform: rotate(90deg); }
            #lm-toggle .lm-icon span {
                display: block;
                height: 2px;
                width: 100%;
                background: currentColor;
                border-radius: 2px;
            }
            #lm-dropdown {
                position: fixed;
                background: var(--egd-modal, #424242);
                color: var(--egd-tekst, #fff);
                border: 1px solid var(--egd-rand, #555);
                border-radius: 6px;
                box-shadow: var(--egd-schaduw, 0 8px 24px rgba(0,0,0,.4));
                padding: 6px;
                display: flex;
                flex-direction: column;
                gap: 2px;
                min-width: 200px;
                opacity: 0;
                transform: translateY(-8px) scale(.98);
                transform-origin: top right;
                pointer-events: none;
                transition: opacity 180ms ease, transform 180ms cubic-bezier(.4,0,.2,1);
                z-index: 2147483000;
            }
            #lm-dropdown.lm-open {
                opacity: 1;
                transform: translateY(0) scale(1);
                pointer-events: auto;
            }
            #lm-dropdown button {
                text-align: left;
                padding: 9px 12px;
                border: none;
                background: transparent;
                color: var(--egd-tekst, #fff);
                cursor: pointer;
                border-radius: 4px;
                font-size: 13px;
                font-family: inherit;
                width: 100%;
            }
            #lm-dropdown button:hover { background: var(--egd-hover, rgba(255,255,255,.08)); }
        `;
        document.head.appendChild(style);
    }

    function findNameElement() {
        // Find the visible "Welcome, <name>" text in the header.
        const nodes = document.querySelectorAll('header *, nav *');
        let best = null;
        nodes.forEach(el => {
            const txt = (el.textContent || '').trim();
            if (/welcome|hallo|goedemorgen|goedemiddag/i.test(txt) && txt.length < 60) {
                if (!best || el.children.length < best.children.length) best = el;
            }
        });
        return best;
    }

    function injectToggle() {
        if (document.getElementById('lm-toggle')) return;
        const target = findNameElement();
        if (!target || !target.parentNode) return;

        injectStyle();

        const btn = document.createElement('button');
        btn.id = 'lm-toggle';
        btn.type = 'button';
        btn.title = 'Learning Mode';
        btn.innerHTML = '<span class="lm-icon"><span></span><span></span><span></span></span>';

        // Auto-size to the name area, a bit bigger.
        const rect = target.getBoundingClientRect();
        const h = Math.min(48, Math.max(32, Math.round((rect.height || 22) * 1.4)));
        btn.style.height = h + 'px';
        btn.style.width = h + 'px';
        btn.style.minWidth = h + 'px';

        const dropdown = document.createElement('div');
        dropdown.id = 'lm-dropdown';
        menuItems.forEach(it => {
            const item = document.createElement('button');
            item.type = 'button';
            item.textContent = it.title;
            item.addEventListener('click', () => { close(); it.run(); });
            dropdown.appendChild(item);
        });
        document.body.appendChild(dropdown);

        let open = false;
        function position() {
            const r = btn.getBoundingClientRect();
            dropdown.style.top = (r.bottom + 6) + 'px';
            dropdown.style.left = Math.max(8, Math.min(window.innerWidth - 220, r.left)) + 'px';
        }
        function openMenu() {
            open = true;
            position();
            dropdown.classList.add('lm-open');
            btn.classList.add('lm-open');
        }
        function close() {
            if (!open) return;
            open = false;
            dropdown.classList.remove('lm-open');
            btn.classList.remove('lm-open');
        }
        function toggle() { if (open) close(); else openMenu(); }

        btn.addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
        document.addEventListener('click', function (e) {
            if (open && !dropdown.contains(e.target) && e.target !== btn) close();
        });
        window.addEventListener('resize', () => { if (open) position(); });
        window.addEventListener('scroll', () => { if (open) position(); }, true);

        // Place the button to the right of the name.
        target.parentNode.insertBefore(btn, target.nextSibling);
    }

    // Wait for the header/name to exist.
    let tries = 0;
    const timer = setInterval(() => {
        tries++;
        injectToggle();
        applyCompact();
        if (document.getElementById('lm-toggle') || tries > 40) clearInterval(timer);
    }, 500);

    // Re-inject if the SPA re-renders the header.
    try {
        const mo = new MutationObserver(() => {
            if (!document.getElementById('lm-toggle')) injectToggle();
        });
        mo.observe(document.body, { childList: true, subtree: true });
    } catch (err) {}
})();
