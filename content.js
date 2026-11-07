// ============================================================
// EGODACT ADDON: LEARNING MODE
// ============================================================
(function () {
    'use strict';

    const client = window.EgodactAddonClient;
    if (!client) { console.warn('EgodactAddonClient missing'); return; }

    const L = window.EgodactAddonLib || {};
    const { ui, el } = L;

    client.registerAddon({
        id: 'egodact-learning-mode',
        name: 'Learning Mode',
        version: '0.1.0',
        description: 'Eisenhower matrix, compact mode, floating notepad, shortcuts, grade sync and lo-fi player.',
        author: 'MaxiTaxi'
    });

    const store = (client.storage) ? client.storage('egodact-learning-mode') : { get:(k,f)=>f, set:()=>{}, remove:()=>{} };

    // ---------- 1. Eisenhower matrix ----------
    function renderMatrix() {
        const wrap = el ? el('div', { style: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' } }) : document.createElement('div');
        const quads = [
            { key:'do', title:'Do (urgent+important)', color:'#ef5350' },
            { key:'schedule', title:'Schedule (important)', color:'#42a5f5' },
            { key:'delegate', title:'Delegate (urgent)', color:'#ffa726' },
            { key:'drop', title:'Drop (neither)', color:'#78909c' }
        ];
        quads.forEach(q => {
            const box = document.createElement('div');
            box.style.cssText = 'background:var(--egd-veld); border:1px solid var(--egd-rand); border-left:4px solid ' + q.color + '; border-radius:6px; padding:10px; min-height:80px;';
            const t = document.createElement('strong'); t.textContent = q.title; t.style.fontSize='12px';
            box.appendChild(t);
            const list = document.createElement('div'); list.style.cssText='margin-top:6px; display:flex; flex-direction:column; gap:4px;';
            const items = store.get('matrix_' + q.key, []);
            items.forEach((it, idx) => {
                const row = document.createElement('div');
                row.style.cssText = 'display:flex; align-items:center; gap:6px; font-size:12px;';
                const span = document.createElement('span'); span.textContent = it; span.style.flex='1';
                const del = document.createElement('button'); del.textContent='×'; del.style.cssText='border:none;background:transparent;color:var(--egd-gevaar);cursor:pointer;';
                del.addEventListener('click', () => {
                    const arr = store.get('matrix_' + q.key, []);
                    arr.splice(idx,1); store.set('matrix_' + q.key, arr);
                    // re-render by reopening
                });
                row.append(span, del);
                list.appendChild(row);
            });
            const input = document.createElement('input');
            input.placeholder = 'Nieuwe taak...';
            input.style.cssText = 'margin-top:6px; width:100%; box-sizing:border-box; padding:6px; border:1px solid var(--egd-rand); border-radius:4px; background:var(--egd-modal); color:var(--egd-tekst); font-size:12px;';
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && input.value.trim()) {
                    const arr = store.get('matrix_' + q.key, []);
                    arr.push(input.value.trim()); store.set('matrix_' + q.key, arr);
                    input.value = '';
                }
            });
            box.append(list, input);
            wrap.appendChild(box);
        });
        return wrap;
    }

    // ---------- 2. Compact mode ----------
    function renderCompact() {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex; flex-direction:column; gap:8px;';
        const opts = [
            { key:'hideGames', label:'Verberg games-knop' },
            { key:'hideTijd', label:'Verberg tijd-knop' },
            { key:'hideBeta', label:'Verberg beta-knop' },
            { key:'compactCards', label:'Compacte kaarten (minder padding)' }
        ];
        opts.forEach(o => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:8px; background:var(--egd-veld); border-radius:6px;';
            const lbl = document.createElement('span'); lbl.textContent = o.label; lbl.style.fontSize='13px';
            const cb = document.createElement('input'); cb.type='checkbox';
            cb.checked = !!store.get(o.key, false);
            cb.addEventListener('change', () => {
                store.set(o.key, cb.checked);
                applyCompact();
            });
            row.append(lbl, cb);
            wrap.appendChild(row);
        });
        return wrap;
    }
    function applyCompact() {
        const body = document.body;
        body.classList.toggle('lm-compact', !!store.get('compactCards', false));
        // toggle buttons visibility
        const map = { hideGames:'egodact-games-knop'? 'egodact-games-knop':'', hideTijd:'egodact-tijd-knop', hideBeta:'egodact-beta-features-knop' };
        Object.keys(map).forEach(k => {
            const id = map[k];
            if (!id) return;
            const elb = document.getElementById(id);
            if (elb) elb.style.display = store.get(k,false) ? 'none' : '';
        });
    }

    // ---------- 3. Floating notepad ----------
    let notepadEl = null;
    function openNotepad() {
        if (notepadEl) { notepadEl.style.display = 'flex'; return; }
        notepadEl = document.createElement('div');
        Object.assign(notepadEl.style, {
            position:'fixed', right:'16px', bottom:'16px', width:'280px', height:'220px',
            background:'var(--egd-modal)', color:'var(--egd-tekst)', border:'1px solid var(--egd-rand)',
            borderRadius:'8px', boxShadow:'var(--egd-schaduw)', zIndex:'2147483000',
            display:'flex', flexDirection:'column', overflow:'hidden'
        });
        const bar = document.createElement('div');
        bar.style.cssText = 'padding:6px 10px; background:var(--egd-veld); cursor:move; display:flex; justify-content:space-between; align-items:center; font-size:12px; font-weight:bold;';
        bar.textContent = 'Notepad';
        const close = document.createElement('button'); close.textContent='×'; close.style.cssText='border:none;background:transparent;color:var(--egd-tekst);cursor:pointer;';
        close.addEventListener('click', () => { notepadEl.style.display='none'; });
        bar.appendChild(close);
        const ta = document.createElement('textarea');
        ta.value = store.get('notepad', '');
        ta.style.cssText = 'flex:1; border:none; resize:none; padding:8px; background:var(--egd-modal); color:var(--egd-tekst); font:inherit; font-size:13px;';
        ta.addEventListener('input', () => store.set('notepad', ta.value));
        notepadEl.append(bar, ta);
        document.body.appendChild(notepadEl);
        // drag
        let dragging=false, ox=0, oy=0;
        bar.addEventListener('mousedown', (e) => { dragging=true; ox=e.clientX-notepadEl.offsetLeft; oy=e.clientY-notepadEl.offsetTop; });
        document.addEventListener('mousemove', (e) => { if(!dragging) return; notepadEl.style.left=(e.clientX-ox)+'px'; notepadEl.style.right='auto'; notepadEl.style.top=(e.clientY-oy)+'px'; notepadEl.style.bottom='auto'; });
        document.addEventListener('mouseup', () => dragging=false);
    }

    // ---------- 4. Keyboard shortcuts ----------
    function renderShortcuts() {
        const wrap = document.createElement('div');
        wrap.style.cssText = 'font-size:13px; line-height:1.8;';
        const shortcuts = [
            { keys:'Ctrl+Shift+N', action:'Open notepad' },
            { keys:'Ctrl+Shift+M', action:'Open matrix' },
            { keys:'Ctrl+Shift+L', action:'Toggle compact mode' }
        ];
        shortcuts.forEach(s => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex; justify-content:space-between; padding:6px 8px; background:var(--egd-veld); border-radius:4px;';
            row.innerHTML = '<code style="background:var(--egd-modal); padding:2px 6px; border-radius:3px;">' + s.keys + '</code><span>' + s.action + '</span>';
            wrap.appendChild(row);
        });
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey) {
                if (e.key.toLowerCase() === 'n') { e.preventDefault(); openNotepad(); }
                if (e.key.toLowerCase() === 'm') { e.preventDefault(); client.openModal('Eisenhower Matrix', renderMatrix()); }
                if (e.key.toLowerCase() === 'l') { e.preventDefault(); store.set('compactCards', !store.get('compactCards',false)); applyCompact(); }
            }
        });
        return wrap;
    }

    // ---------- 5. Mail sync (Magister/Somtoday berichten) ----------
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

        try {
            if (chrome && chrome.storage && chrome.storage.local) {
                chrome.storage.local.get('lm_mails', (res) => { show((res && res.lm_mails) || []); });
            } else {
                show([]);
            }
        } catch (err) { show([]); }

        const btn = document.createElement('button');
        btn.textContent = 'Vernieuwen';
        btn.style.cssText = 'padding:8px 12px; border:none; border-radius:4px; background:var(--egd-accent); color:var(--egd-accent-tekst); font-weight:bold; cursor:pointer; align-self:flex-start;';
        btn.addEventListener('click', () => {
            try {
                if (chrome && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.get('lm_mails', (res) => { show((res && res.lm_mails) || []); });
                }
            } catch (err) {}
        });
        wrap.appendChild(btn);
        return wrap;
    }

    // ---------- Main menu ----------
    function openLearningMenu(e) {
        if (e) { e.preventDefault(); e.stopPropagation(); }
        const body = document.createElement('div');
        body.style.cssText = 'display:flex; flex-direction:column; gap:10px;';
        const tabs = [
            { title:'Matrix', render: renderMatrix },
            { title:'Compact', render: renderCompact },
            { title:'Notepad', render: () => { openNotepad(); const d=document.createElement('div'); d.textContent='Notepad geopend (floating).'; return d; } },
            { title:'Shortcuts', render: renderShortcuts },
            { title:'Berichten', render: renderMails }
        ];
        // simple tab buttons
        const tabBar = document.createElement('div');
        tabBar.style.cssText = 'display:flex; gap:4px; flex-wrap:wrap; border-bottom:1px solid var(--egd-rand); padding-bottom:8px;';
        const content = document.createElement('div');
        content.style.cssText = 'min-height:120px;';
        tabs.forEach(t => {
            const b = document.createElement('button');
            b.textContent = t.title;
            b.style.cssText = 'padding:6px 10px; border:1px solid var(--egd-rand); border-radius:4px; background:transparent; color:var(--egd-tekst); cursor:pointer; font-size:12px;';
            b.addEventListener('click', () => {
                content.innerHTML = '';
                content.appendChild(t.render());
                tabBar.querySelectorAll('button').forEach(x => { x.style.background='transparent'; x.style.color='var(--egd-tekst)'; });
                b.style.background='var(--egd-accent)'; b.style.color='var(--egd-accent-tekst)';
            });
            tabBar.appendChild(b);
        });
        body.append(tabBar, content);
        // open first tab
        const firstBtn = tabBar.querySelector('button');
        if (firstBtn) firstBtn.click();

        client.openModal('Learning Mode', '', {
            breedte: 'min(640px, calc(100vw - 32px))',
            onOpen: function (backdrop, modal) {
                const be = modal.querySelector('#egodact-modal-body');
                if (be) be.appendChild(body);
            }
        });
    }

    client.registerMenu({
        addonId: 'egodact-learning-mode',
        id: 'lm-menu',
        title: 'Learning Mode',
        icon: ''
    });
    client.onOpen('lm-menu', openLearningMenu);

    // apply compact on load
    setTimeout(applyCompact, 500);
})();
