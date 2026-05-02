window.API_BASE = window.API_BASE || ((window.location.protocol === 'file:' || window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' && window.location.port !== '3000') ? 'http://localhost:3000/api' : '/api');
document.addEventListener('DOMContentLoaded', () => {
    const activePatientId = localStorage.getItem('selectedPatientId');
    if (!activePatientId) console.warn("No active patient selected for Care Plan.");

    // --- GENERIC EDIT MODULE SETUP ---
    const setupEditModule = (tabId, editBtnId, cancelBtnId, saveBtnId, cancelAction, addBtnIds = [], listId, actionColClass, onEditToggle) => {
        const tab = document.getElementById(tabId);
        const editBtn = document.getElementById(editBtnId);
        const cancelBtn = document.getElementById(cancelBtnId);
        const saveBtn = document.getElementById(saveBtnId);

        if (!tab || !editBtn || !cancelBtn || !saveBtn) return null;

        const setEditMode = (isEdit) => {
            tab.querySelectorAll('input, select, textarea').forEach(el => {
                if (el.type === 'checkbox' || el.tagName === 'SELECT') el.disabled = !isEdit;
                else {
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
                        el.style.borderColor = 'var(--navy-blue)';
                        el.style.pointerEvents = 'auto';
                        el.style.resize = '';
                    }
                }
            });

            tab.querySelectorAll('.btn-delete, .btn-small-add, .remove-plan-btn').forEach(el => {
                el.style.display = isEdit ? 'inline-block' : 'none';
            });
            
            addBtnIds.forEach(id => {
                const addBtn = document.getElementById(id);
                if (addBtn) addBtn.style.display = isEdit ? 'inline-block' : 'none';
            });

            if (actionColClass) {
                tab.querySelectorAll(actionColClass).forEach(el => {
                    el.style.display = isEdit ? 'table-cell' : 'none';
                });
            }

            editBtn.style.display = isEdit ? 'none' : 'inline-block';
            cancelBtn.style.display = isEdit ? 'inline-block' : 'none';
            saveBtn.style.display = isEdit ? 'inline-block' : 'none';
            
            if (onEditToggle) onEditToggle(isEdit);
        };

        editBtn.addEventListener('click', () => setEditMode(true));
        cancelBtn.addEventListener('click', () => {
            if (cancelAction) cancelAction();
            else window.location.reload();
        });

        return setEditMode;
    };

    // --- PROGRESS NOTES ---
    const pnList = document.getElementById('progress-notes-list');
    let progressNotesData = [];
    
    const pnModule = setupEditModule('progress-notes', 'edit-progress-notes', 'cancel-progress-notes', 'save-progress-notes', () => loadCarePlan(), ['add-progress-note-btn'], 'progress-notes-list', null, (isEdit) => {
        if (isEdit && progressNotesData.length > 0) {
            let activeTr = Array.from(pnList.children).find(tr => tr.style.backgroundColor);
            if (activeTr) activeTr.click();
            else pnList.children[0].click();
        }
    });

    const renderProgressNotes = () => {
        pnList.innerHTML = '';
        progressNotesData.forEach((note, index) => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.innerHTML = `
                <td><input type="text" class="pn-date" value="${note.date || ''}" readonly style="width: 100%;"></td>
                <td><input type="text" class="pn-time" value="${note.time || ''}" readonly style="width: 100%;"></td>
                <td><input type="text" class="pn-author" value="${note.author || ''}" readonly style="width: 100%;"></td>
                <td><input type="text" class="pn-type" value="${note.noteType || ''}" readonly style="width: 100%;"></td>
                <td><input type="text" class="pn-summary" value="${note.summary || ''}" readonly style="width: 100%;"></td>
            `;
            // Hidden data fields for SOAP
            const sInput = document.createElement('input'); sInput.type = 'hidden'; sInput.className = 'pn-s'; sInput.value = note.s || '';
            const oInput = document.createElement('input'); oInput.type = 'hidden'; oInput.className = 'pn-o'; oInput.value = note.o || '';
            const aInput = document.createElement('input'); aInput.type = 'hidden'; aInput.className = 'pn-a'; aInput.value = note.a || '';
            const pInput = document.createElement('input'); pInput.type = 'hidden'; pInput.className = 'pn-p'; pInput.value = note.p || '';
            tr.append(sInput, oInput, aInput, pInput);
            
            tr.addEventListener('click', () => {
                // Update form view
                document.getElementById('pn-view-date').textContent = tr.querySelector('.pn-date').value || '-';
                document.getElementById('pn-view-time').textContent = tr.querySelector('.pn-time').value || '-';
                document.getElementById('pn-view-author').textContent = tr.querySelector('.pn-author').value || '-';
                
                const isEdit = document.getElementById('save-progress-notes').style.display === 'inline-block';
                if (isEdit) {
                    document.getElementById('pn-view-s').innerHTML = `<textarea style="width:100%; border:1px solid var(--navy-blue);" rows="3" onchange="document.querySelectorAll('.pn-s')[${index}].value=this.value">${sInput.value}</textarea>`;
                    document.getElementById('pn-view-o').innerHTML = `<textarea style="width:100%; border:1px solid var(--navy-blue);" rows="3" onchange="document.querySelectorAll('.pn-o')[${index}].value=this.value">${oInput.value}</textarea>`;
                    document.getElementById('pn-view-a').innerHTML = `<textarea style="width:100%; border:1px solid var(--navy-blue);" rows="3" onchange="document.querySelectorAll('.pn-a')[${index}].value=this.value">${aInput.value}</textarea>`;
                    document.getElementById('pn-view-p').innerHTML = `<textarea style="width:100%; border:1px solid var(--navy-blue);" rows="3" onchange="document.querySelectorAll('.pn-p')[${index}].value=this.value">${pInput.value}</textarea>`;
                } else {
                    document.getElementById('pn-view-s').textContent = sInput.value || '-';
                    document.getElementById('pn-view-o').textContent = oInput.value || '-';
                    document.getElementById('pn-view-a').textContent = aInput.value || '-';
                    document.getElementById('pn-view-p').textContent = pInput.value || '-';
                }
                
                // Highlight row
                Array.from(pnList.children).forEach(c => c.style.backgroundColor = '');
                tr.style.backgroundColor = '#dcebf5';
            });
            pnList.appendChild(tr);
        });
        
        if (progressNotesData.length > 0) {
            pnList.children[0].click();
        } else {
            // clear view
            document.getElementById('pn-view-date').textContent = '-';
            document.getElementById('pn-view-time').textContent = '-';
            document.getElementById('pn-view-author').textContent = '-';
            document.getElementById('pn-view-s').textContent = '-';
            document.getElementById('pn-view-o').textContent = '-';
            document.getElementById('pn-view-a').textContent = '-';
            document.getElementById('pn-view-p').textContent = '-';
        }
    };

    document.getElementById('add-progress-note-btn')?.addEventListener('click', () => {
        const today = new Date();
        const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
        const timeStr = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        progressNotesData.push({
            date: dateStr, time: timeStr, author: 'Current User', noteType: 'Nursing Note', summary: 'New note', s:'', o:'', a:'', p:''
        });
        renderProgressNotes();
        pnModule(true); // Ensure new elements are in edit mode
        pnList.lastElementChild.click();
    });

    document.getElementById('save-progress-notes')?.addEventListener('click', async (e) => {
        if (!activePatientId) return;
        const btnElement = e.target;
        const originalText = btnElement.textContent;
        btnElement.textContent = "Saving...";
        
        const newNotes = Array.from(pnList.children).map(tr => ({
            date: tr.querySelector('.pn-date').value,
            time: tr.querySelector('.pn-time').value,
            author: tr.querySelector('.pn-author').value,
            noteType: tr.querySelector('.pn-type').value,
            summary: tr.querySelector('.pn-summary').value,
            s: tr.querySelector('.pn-s').value,
            o: tr.querySelector('.pn-o').value,
            a: tr.querySelector('.pn-a').value,
            p: tr.querySelector('.pn-p').value
        }));

        try {
            const response = await fetch(`${window.API_BASE}/careplan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: activePatientId, payload: { progressNotes: newNotes } }) // Note: we should merge with existing
            });
            // We need to fetch first to preserve nursingCarePlans
            const currentResp = await fetch(`${window.API_BASE}/careplan/${activePatientId}`);
            const currentData = await currentResp.json();
            const payload = currentData.data || {};
            payload.progressNotes = newNotes;

            const saveResp = await fetch(`${window.API_BASE}/careplan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: activePatientId, payload })
            });

            if (saveResp.ok) {
                btnElement.textContent = "Saved ✓";
                progressNotesData = newNotes;
                renderProgressNotes();
                pnModule(false);
            } else btnElement.textContent = "Failed";
        } catch(e) { btnElement.textContent = "Error!"; }
        setTimeout(() => btnElement.textContent = originalText, 2000);
    });

    // --- NURSING CARE PLAN ---
    const ncpList = document.getElementById('nursing-care-list');
    let ncpData = [];
    
    const ncpModule = setupEditModule('nursing-care-plan', 'edit-nursing-care', 'cancel-nursing-care', 'save-nursing-care', () => loadCarePlan(), ['add-nursing-care-btn'], 'nursing-care-list', '.ncp-action-col');

    const renderNursingCare = () => {
        ncpList.innerHTML = '';
        ncpData.forEach(row => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><input type="text" class="ncp-date" value="${row.date || ''}" readonly style="width: 100%;"></td>
                <td><input type="text" class="ncp-time" value="${row.time || ''}" readonly style="width: 100%;"></td>
                <td><textarea class="ncp-assessment" readonly style="width: 100%; height: 60px;">${row.assessment || ''}</textarea></td>
                <td><textarea class="ncp-diagnosis" readonly style="width: 100%; height: 60px;">${row.diagnosis || ''}</textarea></td>
                <td><textarea class="ncp-planning" readonly style="width: 100%; height: 60px;">${row.planning || ''}</textarea></td>
                <td><textarea class="ncp-intervention" readonly style="width: 100%; height: 60px;">${row.intervention || ''}</textarea></td>
                <td><textarea class="ncp-evaluation" readonly style="width: 100%; height: 60px;">${row.evaluation || ''}</textarea></td>
                <td class="ncp-action-col" style="display: none; text-align: center;"><button type="button" class="btn-delete" style="background:transparent; border:none; cursor:pointer;" title="Remove Row">🗑️</button></td>
            `;
            tr.querySelector('.btn-delete').addEventListener('click', () => tr.remove());
            ncpList.appendChild(tr);
        });
    };

    document.getElementById('add-nursing-care-btn')?.addEventListener('click', () => {
        const today = new Date();
        const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
        const timeStr = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        ncpData.push({
            date: dateStr, time: timeStr, assessment: '', diagnosis: '', planning: '', intervention: '', evaluation: ''
        });
        renderNursingCare();
        ncpModule(true);
    });

    document.getElementById('save-nursing-care')?.addEventListener('click', async (e) => {
        if (!activePatientId) return;
        const btnElement = e.target;
        const originalText = btnElement.textContent;
        btnElement.textContent = "Saving...";
        
        const newNcp = Array.from(ncpList.children).map(tr => ({
            date: tr.querySelector('.ncp-date').value,
            time: tr.querySelector('.ncp-time').value,
            assessment: tr.querySelector('.ncp-assessment').value,
            diagnosis: tr.querySelector('.ncp-diagnosis').value,
            planning: tr.querySelector('.ncp-planning').value,
            intervention: tr.querySelector('.ncp-intervention').value,
            evaluation: tr.querySelector('.ncp-evaluation').value
        }));

        try {
            const currentResp = await fetch(`${window.API_BASE}/careplan/${activePatientId}`);
            const currentData = await currentResp.json();
            const payload = currentData.data || {};
            payload.nursingCarePlans = newNcp;

            const saveResp = await fetch(`${window.API_BASE}/careplan`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: activePatientId, payload })
            });

            if (saveResp.ok) {
                btnElement.textContent = "Saved ✓";
                ncpData = newNcp;
                renderNursingCare();
                ncpModule(false);
            } else btnElement.textContent = "Failed";
        } catch(e) { btnElement.textContent = "Error!"; }
        setTimeout(() => btnElement.textContent = originalText, 2000);
    });

    // --- DATA LOADING ---
    const loadCarePlan = async () => {
        if (!activePatientId) return;
        try {
            const response = await fetch(`${window.API_BASE}/careplan/${activePatientId}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                progressNotesData = result.data.progressNotes || [];
                ncpData = result.data.nursingCarePlans || [];
            }
            renderProgressNotes();
            renderNursingCare();
            
        } catch (e) { console.error(e); }
        finally { 
            if (pnModule) pnModule(false); 
            if (ncpModule) ncpModule(false); 
        }
    };

    loadCarePlan();
});
