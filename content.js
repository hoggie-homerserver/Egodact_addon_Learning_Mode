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
        version: '0.2.0',
        description: 'Eisenhower matrix, compact mode and floating notepad.',
        author: 'MaxiTaxi'
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
    // Clean Eisenhower matrix
    // ------------------------------------------------------------
    const QUADS = [
        { key: 'do', title: 'Do', sub: 'Urgent + belangrijk', color: '#ef5350' },
        { key: 'schedule', title: 'Plan', sub: 'Belangrijk, niet urgent', color: '#42a5f5' },
        { key: 'delegate', title: 'Delegeer', sub: 'Urgent, niet belangrijk', color: '#ffa726' },
        { key: 'drop', title: 'Laat vallen', sub: 'Geen van beide', color: '#78909c' }
    ];

    function renderMatrix() {
        const grid = document.createElement('div');
        grid.style.cssText = 'display:grid; grid-template-columns:1fr 1fr; gap:10px;';

        QUADS.forEach(q => {
            const card = document.createElement('div');
            card.style.cssText = 'display:flex; flex-direction:column; gap:8px; padding:12px; border-radius:8px; background:var(--egd-veld); border:1px solid var(--egd-rand); border-top:3px solid ' + q.color + '; min-height:150px;';

            const head = document.createElement('div');
            head.style.cssText = 'display:flex; align-items:baseline; justify-content:space-between; gap:8px;';
            const title = document.createElement('div');
            title.innerHTML = '<strong style="font-size:14px;">' + q.title + '</strong><div style="font-size:11px; color:var(--egd-tekst-zacht);">' + q.sub + '</div>';
            const count = document.createElement('span');
            count.style.cssText = 'font-size:11px; font-weight:bold; color:' + q.color + '; background:rgba(255,255,255,.08); border-radius:10px; padding:2px 7px;';
            head.append(title, count);
            card.appendChild(head);

            const list = document.createElement('div');
            list.style.cssText = 'display:flex; flex-direction:column; gap:5px; flex:1;';
            card.appendChild(list);

            function renderItems() {
                list.innerHTML = '';
                const items = store.get('matrix_' + q.key, []);
                count.textContent = items.length;
                if (!items.length) {
                    const empty = document.createElement('div');
                    empty.textContent = 'Geen taken';
                    empty.style.cssText = 'font-size:11px; color:var(--egd-tekst-zacht); padding:6px 0;';
                    list.appendChild(empty);
                    return;
                }
                items.forEach((it, idx) => {
                    const row = document.createElement('div');
                    row.style.cssText = 'display:flex; align-items:center; gap:7px; font-size:12px; padding:5px 7px; background:var(--egd-modal); border-radius:5px;';
                    const dot = document.createElement('span');
                    dot.style.cssText = 'width:6px; height:6px; border-radius:50%; background:' + q.color + '; flex-shrink:0;';
                    const span = document.createElement('span');
                    span.textContent = it;
                    span.style.cssText = 'flex:1; overflow-wrap:anywhere;';
                    const del = document.createElement('button');
                    del.textContent = '×';
                    del.style.cssText = 'border:none; background:transparent; color:var(--egd-tekst-zacht); cursor:pointer; font-size:15px; line-height:1; padding:0 2px;';
                    del.addEventListener('mouseenter', () => { del.style.color = 'var(--egd-gevaar)'; });
                    del.addEventListener('mouseleave', () => { del.style.color = 'var(--egd-tekst-zacht)'; });
                    del.addEventListener('click', () => {
                        const arr = store.get('matrix_' + q.key, []);
                        arr.splice(idx, 1);
                        store.set('matrix_' + q.key, arr);
                        renderItems();
                    });
                    row.append(dot, span, del);
                    list.appendChild(row);
                });
            }
            renderItems();

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
                const arr = store.get('matrix_' + q.key, []);
                arr.push(v);
                store.set('matrix_' + q.key, arr);
                input.value = '';
                renderItems();
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
        { key: 'hideAddonButtons', label: 'Addon-knoppen', desc: 'Verberg alle addon-knoppen in de topbar' },
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

    function applyCompact() {
        document.body.classList.toggle('lm-compact', !!store.get('compactCards', false));
        const map = { hideTijd: 'egodact-tijd-knop', hideBeta: 'egodact-beta-features-knop', hideAddons: 'egodact-addons-knop' };
        Object.keys(map).forEach(k => {
            const el = document.getElementById(map[k]);
            if (el) el.style.display = store.get(k, false) ? 'none' : '';
        });
        document.querySelectorAll('[data-egodact-addon-btn="1"]').forEach(el => {
            el.style.display = store.get('hideAddonButtons', false) ? 'none' : '';
        });
    }
    // Re-apply because the host may re-render its header.
    setInterval(applyCompact, 1500);

    // ------------------------------------------------------------
    // Floating notepad
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
        bar.addEventListener('mousedown', e => { dragging = true; ox = e.clientX - notepadEl.offsetLeft; oy = e.clientY - notepadEl.offsetTop; });
        document.addEventListener('mousemove', e => {
            if (!dragging) return;
            notepadEl.style.left = (e.clientX - ox) + 'px';
            notepadEl.style.right = 'auto';
            notepadEl.style.top = (e.clientY - oy) + 'px';
            notepadEl.style.bottom = 'auto';
        });
        document.addEventListener('mouseup', () => { dragging = false; });
    }

    // ------------------------------------------------------------
    // Menu
    // ------------------------------------------------------------
    const menuItems = [
        { title: 'Eisenhower matrix', run: () => openPanel('Eisenhower Matrix', renderMatrix()) },
        { title: 'Compact mode', run: () => openPanel('Compact mode', renderCompact()) },
        { title: 'Notepad', run: openNotepad }
    ];

    // ------------------------------------------------------------
    // Hamburger button (right of the name)
    // ------------------------------------------------------------
    function injectStyle() {
        if (document.getElementById('lm-style')) return;
        const style = document.createElement('style');
        style.id = 'lm-style';
        style.textContent = `
            #lm-toggle {
                display: inline-flex; align-items: center; justify-content: center;
                border: none; background: transparent; cursor: pointer;
                padding: 0 6px; margin: 0 10px 0 12px;
                color: var(--egd-tekst, #fff); opacity: .85;
                transition: opacity 150ms ease; flex-shrink: 0;
            }
            #lm-toggle:hover { opacity: 1; }
            #lm-toggle .lm-icon {
                display: flex; flex-direction: column; justify-content: space-between;
                width: 20px; height: 14px;
                transition: transform 220ms cubic-bezier(.4,0,.2,1);
                transform: rotate(0deg);
            }
            #lm-toggle.lm-open .lm-icon { transform: rotate(90deg); }
            #lm-toggle .lm-icon span { display:block; height:2px; width:100%; background:currentColor; border-radius:2px; }
            #lm-dropdown {
                position: fixed; background: var(--egd-modal, #424242); color: var(--egd-tekst, #fff);
                border: 1px solid var(--egd-rand, #555); border-radius: 8px;
                box-shadow: var(--egd-schaduw, 0 8px 24px rgba(0,0,0,.4));
                padding: 6px; display: flex; flex-direction: column; gap: 2px; min-width: 190px;
                opacity: 0; transform: translateY(-8px) scale(.98); transform-origin: top right;
                pointer-events: none;
                transition: opacity 180ms ease, transform 180ms cubic-bezier(.4,0,.2,1);
                z-index: 2147483000;
            }
            #lm-dropdown.lm-open { opacity: 1; transform: translateY(0) scale(1); pointer-events: auto; }
            #lm-dropdown button {
                text-align: left; padding: 9px 12px; border: none; background: transparent;
                color: var(--egd-tekst, #fff); cursor: pointer; border-radius: 5px;
                font-size: 13px; font-family: inherit; width: 100%;
            }
            #lm-dropdown button:hover { background: var(--egd-hover, rgba(255,255,255,.08)); }
            body.lm-compact [class*="challenge" i],
            body.lm-compact [class*="card" i] { padding: 4px !important; }
        `;
        document.head.appendChild(style);
    }

    function findNameElement() {
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
            dropdown.style.left = Math.max(8, Math.min(window.innerWidth - 200, r.left)) + 'px';
        }
        function openMenu() { open = true; position(); dropdown.classList.add('lm-open'); btn.classList.add('lm-open'); }
        function close() { if (!open) return; open = false; dropdown.classList.remove('lm-open'); btn.classList.remove('lm-open'); }
        function toggle() { if (open) close(); else openMenu(); }

        btn.addEventListener('click', e => { e.stopPropagation(); toggle(); });
        document.addEventListener('click', e => { if (open && !dropdown.contains(e.target) && e.target !== btn) close(); });
        window.addEventListener('resize', () => { if (open) position(); });
        window.addEventListener('scroll', () => { if (open) position(); }, true);

        // Right of the name.
        target.parentNode.insertBefore(btn, target.nextSibling);
    }

    let tries = 0;
    const timer = setInterval(() => {
        tries++;
        injectToggle();
        applyCompact();
        if (document.getElementById('lm-toggle') || tries > 40) clearInterval(timer);
    }, 500);

    try {
        const mo = new MutationObserver(() => { if (!document.getElementById('lm-toggle')) injectToggle(); });
        mo.observe(document.body, { childList: true, subtree: true });
    } catch (err) {}
})();
