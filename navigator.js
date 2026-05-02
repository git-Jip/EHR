window.API_BASE = window.API_BASE || ((window.location.protocol === 'file:' || window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' && window.location.port !== '3000') ? 'http://localhost:3000/api' : '/api');
document.addEventListener('DOMContentLoaded', () => {
    const activePatientId = localStorage.getItem('selectedPatientId');
    if (!activePatientId) console.warn("No active patient selected for Navigators.");

    const setupEditModule = (tabId, editBtnId, cancelBtnId, saveBtnId, cancelAction, addBtnIds = []) => {
        const tab = document.getElementById(tabId);
        const editBtn = document.getElementById(editBtnId);
        const cancelBtn = document.getElementById(cancelBtnId);
        const saveBtn = document.getElementById(saveBtnId);

        if (!tab || !editBtn || !cancelBtn || !saveBtn) return null;

        const setEditMode = (isEdit) => {
            tab.querySelectorAll('input, select, textarea').forEach(el => {
                if (el.type === 'checkbox' || el.tagName === 'SELECT') {
                    el.disabled = !isEdit;
                } else {
                    if (isEdit) el.removeAttribute('readonly');
                    else el.setAttribute('readonly', true);
                }
                
                if (el.tagName !== 'SELECT' && el.type !== 'checkbox') {
                    if (!isEdit) {
                        el.style.backgroundColor = 'transparent';
                        el.style.borderColor = 'transparent';
                        el.style.pointerEvents = 'none';
                        el.style.resize = 'none';
                    } else {
                        el.style.backgroundColor = '';
                        el.style.borderColor = '#ccc';
                        el.style.pointerEvents = 'auto';
                        el.style.resize = '';
                    }
                }
            });

            editBtn.style.display = isEdit ? 'none' : 'inline-block';
            cancelBtn.style.display = isEdit ? 'inline-block' : 'none';
            saveBtn.style.display = isEdit ? 'inline-block' : 'none';
        };

        editBtn.addEventListener('click', () => setEditMode(true));
        cancelBtn.addEventListener('click', () => {
            if (cancelAction) cancelAction();
            else window.location.reload();
        });

        return setEditMode;
    };

    const navModule = setupEditModule('nav-module', 'edit-nav', 'cancel-nav', 'save-nav', () => loadNav());

    const getVal = id => document.getElementById(id)?.value || '';
    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    const getChk = id => document.getElementById(id)?.checked || false;
    const setChk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };

    const loadNav = async () => {
        if (!activePatientId) return;
        try {
            const response = await fetch(`${window.API_BASE}/navigator/${activePatientId}`);
            const result = await response.json();
            if (result.success && result.data) {
                const d = result.data;
                setVal('nav-date', d.date);
                setVal('nav-time', d.time);
                setVal('nav-acc', d.acc);
                setVal('nav-type', d.type);
                setVal('nav-fup', d.fup);
                setVal('nav-warn', d.warn);
                setVal('nav-ins', d.ins);
                
            }
            
            const editBtn = document.getElementById('edit-nav');
            if (editBtn) {
                const hasData = result.data && Object.values(result.data).some(val => val === true || (typeof val === 'string' && val.trim() !== ''));
                editBtn.innerHTML = hasData ? '✏️ Edit' : '✏️ Edit';
            }
        } catch (e) {
            console.error(e);
        } finally {
            if (navModule) navModule(false);
        }
    };

    loadNav();

    document.getElementById('save-nav')?.addEventListener('click', async (e) => {
        if (!activePatientId) return;
        const btnElement = e.target;
        const originalText = btnElement.textContent;
        btnElement.textContent = "Saving...";
        
        const payload = {
            date: getVal('nav-date'),
            time: getVal('nav-time'),
            acc: getVal('nav-acc'),
            type: getVal('nav-type'),
            fup: getVal('nav-fup'),
            warn: getVal('nav-warn'),
            ins: getVal('nav-ins')
        };

        try {
            const response = await fetch(`${window.API_BASE}/navigator`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: activePatientId, payload })
            });
            const result = await response.json();
            if (result.success) {
                btnElement.textContent = "Saved ✓";
                if (navModule) navModule(false);
            } else btnElement.textContent = "Failed";
        } catch(err) { btnElement.textContent = "Error!"; }
        setTimeout(() => btnElement.textContent = originalText, 2000);
    });
});
