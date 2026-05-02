window.API_BASE = window.API_BASE || ((window.location.protocol === 'file:' || window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' && window.location.port !== '3000') ? 'http://localhost:3000/api' : '/api');
document.addEventListener('DOMContentLoaded', () => {
    const activePatientId = localStorage.getItem('selectedPatientId');
    if (!activePatientId) {
        console.warn("No active patient selected for MAR.");
    }

    // --- GENERIC EDIT MODULE SETUP ---
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
                
                // Add plain text styling specifically for dynamic fields
                if (el.tagName !== 'SELECT' && el.type !== 'checkbox') {
                    if (!isEdit) {
                        el.style.backgroundColor = 'transparent';
                        el.style.borderColor = 'transparent';
                        el.style.pointerEvents = 'none';
                    } else {
                        el.style.backgroundColor = '';
                        el.style.borderColor = 'var(--navy-blue)';
                        el.style.pointerEvents = 'auto';
                    }
                }
            });

            tab.querySelectorAll('.btn-delete').forEach(el => {
                el.style.display = isEdit ? 'inline-block' : 'none';
            });
            
            addBtnIds.forEach(id => {
                const addBtn = document.getElementById(id);
                if (addBtn) addBtn.style.display = isEdit ? 'inline-block' : 'none';
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

    const marModule = setupEditModule('mar-module', 'edit-mar', 'cancel-mar', 'save-mar', () => loadMAR(), ['add-mar-btn']);

    const marList = document.getElementById('mar-list');

    const createMARPanel = (med='', dose='', route='', freq='', prov='', ind='', start='') => {
        const div = document.createElement('div');
        div.className = 'mar-panel-view dynamic-row';
        div.innerHTML = `
            <div style="flex: 1;">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom: 5px;">
                    <input type="text" class="m-med" value="${med}" placeholder="Medication Details" style="font-size: 1.1rem; font-weight: bold; width: 60%; border: 1px solid var(--navy-blue); border-radius: 4px; padding: 4px;">
                    <input type="text" class="m-dose" value="${dose}" placeholder="Dose (e.g. 25mg)" style="font-size: 1.1rem; font-weight: bold; color: #3498db; width: 30%; border: 1px solid var(--navy-blue); border-radius: 4px; padding: 4px;">
                </div>
                <div class="details" style="display:flex; gap: 5px; margin-bottom: 5px;">
                    <input type="text" class="m-route" value="${route}" placeholder="Route" style="width: 25%; border: 1px solid var(--navy-blue); border-radius: 4px; padding: 4px;">
                    <span>•</span>
                    <input type="text" class="m-freq" value="${freq}" placeholder="Frequency" style="width: 25%; border: 1px solid var(--navy-blue); border-radius: 4px; padding: 4px;">
                    <span>•</span>
                    <input type="text" class="m-prov" value="${prov}" placeholder="Provider" style="width: 25%; border: 1px solid var(--navy-blue); border-radius: 4px; padding: 4px;">
                </div>
                <div class="details" style="display:flex;">
                    <span style="margin-right: 5px; margin-top:5px;">Indication: </span>
                    <input type="text" class="m-ind" value="${ind}" placeholder="Indication" style="flex: 1; border: 1px solid var(--navy-blue); border-radius: 4px; padding: 4px;">
                </div>
            </div>
            <div style="text-align: right; margin-left: 20px;">
                <div style="font-size: 0.9rem; color: #555; margin-bottom:10px;">
                    Start: <input type="date" class="m-start" value="${start}" style="border: 1px solid var(--navy-blue); border-radius: 4px; padding: 4px;">
                </div>
                <button type="button" class="btn-delete" style="background:transparent; border:none; cursor:pointer; font-size: 1.2rem;" title="Delete">🗑️</button>
            </div>
        `;

        div.querySelector('.btn-delete').addEventListener('click', () => div.remove());
        return div;
    };

    document.getElementById('add-mar-btn')?.addEventListener('click', () => {
        marList.appendChild(createMARPanel());
    });

    const loadMAR = async () => {
        if (!activePatientId) return;
        try {
            const response = await fetch(`${window.API_BASE}/mar/${activePatientId}`);
            const result = await response.json();
            
            let hasMar = false;
            if (result.success && result.data && result.data.meds) {
                hasMar = result.data.meds.length > 0;
                if (marList) {
                    marList.innerHTML = '';
                    result.data.meds.forEach(m => {
                        marList.appendChild(createMARPanel(m.med, m.dose, m.route, m.freq, m.prov, m.ind, m.start));
                    });
                }
            }
            
            const editBtn = document.getElementById('edit-mar');
            if (editBtn) editBtn.innerHTML = hasMar ? '✏️ Edit' : '➕ Add';
            
        } catch (e) {
            console.error(e);
        } finally {
            if (marModule) marModule(false);
        }
    };

    loadMAR();

    const saveToServer = async (payloadSubset, btnElement, toggleModuleBack) => {
        if (!activePatientId) return;
        const originalText = btnElement.textContent;
        btnElement.textContent = "Saving...";
        try {
            const response = await fetch(`${window.API_BASE}/mar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: activePatientId, payload: payloadSubset })
            });
            const result = await response.json();
            if (result.success) {
                btnElement.textContent = "Saved ✓";
                if (toggleModuleBack) toggleModuleBack(false);
                setTimeout(() => btnElement.textContent = originalText, 2000);
            } else {
                btnElement.textContent = "Failed";
                setTimeout(() => btnElement.textContent = originalText, 2000);
            }
        } catch(e) {
            console.error(e);
            btnElement.textContent = "Error!";
            setTimeout(() => btnElement.textContent = originalText, 2000);
        }
    };

    document.getElementById('save-mar')?.addEventListener('click', (e) => {
        const meds = [];
        marList.querySelectorAll('.dynamic-row').forEach(panel => {
            meds.push({
                med: panel.querySelector('.m-med').value,
                dose: panel.querySelector('.m-dose').value,
                route: panel.querySelector('.m-route').value,
                freq: panel.querySelector('.m-freq').value,
                prov: panel.querySelector('.m-prov').value,
                ind: panel.querySelector('.m-ind').value,
                start: panel.querySelector('.m-start').value
            });
        });
        saveToServer({ meds }, e.target, marModule);
    });
});
