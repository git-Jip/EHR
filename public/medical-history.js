window.API_BASE = window.API_BASE || ((window.location.protocol === 'file:' || window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' && window.location.port !== '3000') ? 'http://localhost:3000/api' : '/api');
document.addEventListener('DOMContentLoaded', () => {
    const activePatientId = localStorage.getItem('selectedPatientId');
    if (!activePatientId) {
        console.warn("No active patient selected for Medical History.");
    }

    // --- DOM ELEMENTS ---
    const addSurgeryBtn = document.getElementById('add-surgery-btn');
    const surgeryList = document.getElementById('surgical-history-list');
    const savePastHistoryBtn = document.getElementById('save-past-history');
    
    const addAllergyBtn = document.getElementById('add-allergy-btn');
    const allergiesList = document.getElementById('allergies-list');

    const immunizationTbody = document.getElementById('immunization-tbody');
    const saveImmunizationBtn = document.getElementById('save-immunization');

    const addRelativeBtn = document.getElementById('add-relative-btn');
    const familyList = document.getElementById('family-history-list');
    const saveFamilyBtn = document.getElementById('save-family-history');

    // Immunization Default Vacines
    const defaultVaccines = [
        "BCG", "Hepatitis B", "DPT", "Polio (OPV)", "Measles", 
        "MMR", "Varicella", "Influenza", "HPV", "Covid-19",
        "Pneumococcal", "Typhoid"
    ];

    const savePresentHistoryBtn = document.getElementById('save-present-history');

    // --- GENERIC EDIT MODULE SETUP ---
    const setupEditModule = (tabId, editBtnId, cancelBtnId, saveBtnId, cancelAction, addBtnIds = []) => {
        const tab = document.getElementById(tabId);
        const editBtn = document.getElementById(editBtnId);
        const cancelBtn = document.getElementById(cancelBtnId);
        const saveBtn = document.getElementById(saveBtnId);

        if (!tab || !editBtn || !cancelBtn || !saveBtn) return null;

        const setEditMode = (isEdit) => {
            tab.querySelectorAll('input, select').forEach(el => {
                if (el.type === 'checkbox' || el.tagName === 'SELECT') {
                    el.disabled = !isEdit;
                } else {
                    if (isEdit) el.removeAttribute('readonly');
                    else el.setAttribute('readonly', true);
                }
                
                // Add plain text styling specifically for medical history dynamic fields
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

    const presentModule = setupEditModule('present-history', 'edit-present-history', 'cancel-present-history', 'save-present-history', () => loadMedicalHistory());
    const pastModule = setupEditModule('past-history', 'edit-past-history', 'cancel-past-history', 'save-past-history', () => loadMedicalHistory(), ['add-surgery-btn', 'add-allergy-btn']);
    const immuneModule = setupEditModule('immunization', 'edit-immunization', 'cancel-immunization', 'save-immunization', () => loadMedicalHistory());
    const familyModule = setupEditModule('family-history', 'edit-family-history', 'cancel-family-history', 'save-family-history', () => loadMedicalHistory(), ['add-relative-btn']);

    // --- RENDER HELPERS ---
    const createSurgeryRow = (name = '', year = '', notes = '') => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.gap = '15px';
        div.style.alignItems = 'center';
        div.className = 'dynamic-row';
        div.innerHTML = `
            <input type="text" class="surgery-name" value="${name}" placeholder="Procedure" style="flex: 1.5; border: 1px solid var(--navy-blue); border-radius: 6px; padding: 8px;">
            <input type="text" class="surgery-year" value="${year}" placeholder="YYYY" style="flex: 0.5; border: 1px solid var(--navy-blue); border-radius: 6px; padding: 8px;">
            <input type="text" class="surgery-notes" value="${notes}" placeholder="Notes/Complications" style="flex: 2; border: 1px solid var(--navy-blue); border-radius: 6px; padding: 8px;">
            <button type="button" class="btn-delete">🗑️</button>
        `;
        div.querySelector('.btn-delete').addEventListener('click', () => div.remove());
        return div;
    };

    const createAllergyRow = (allergen = '', reaction = '', severity = '') => {
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.gap = '15px';
        div.style.alignItems = 'center';
        div.className = 'dynamic-row';
        div.innerHTML = `
            <input type="text" class="allergy-name" value="${allergen}" placeholder="Allergen" style="flex: 1.5; border: 1px solid var(--navy-blue); border-radius: 6px; padding: 8px;">
            <input type="text" class="allergy-reaction" value="${reaction}" placeholder="Reaction" style="flex: 1.5; border: 1px solid var(--navy-blue); border-radius: 6px; padding: 8px;">
            <input type="text" class="allergy-severity" value="${severity}" placeholder="Severity" style="flex: 1; border: 1px solid var(--navy-blue); border-radius: 6px; padding: 8px;">
            <button type="button" class="btn-delete">🗑️</button>
        `;
        div.querySelector('.btn-delete').addEventListener('click', () => div.remove());
        return div;
    };

    const createFamilyRow = (relation = '', condition = '', status = '', age = '') => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="family-relation" value="${relation}"></td>
            <td><input type="text" class="family-condition" value="${condition}"></td>
            <td><input type="text" class="family-status" value="${status}"></td>
            <td><input type="number" class="family-age" value="${age}"></td>
            <td><button type="button" class="btn-delete">🗑️</button></td>
        `;
        tr.querySelector('.btn-delete').addEventListener('click', () => tr.remove());
        return tr;
    };

    const createImmunizationRow = (vaccine = '', checked = false, date = '', notes = '') => {
        const tr = document.createElement('tr');
        tr.className = 'immunization-row';
        tr.innerHTML = `
            <td><span class="vaccine-name">${vaccine}</span></td>
            <td><input type="checkbox" class="vaccine-given" ${checked ? 'checked' : ''}></td>
            <td><input type="date" class="vaccine-date" value="${date}"></td>
            <td><input type="text" class="vaccine-notes" value="${notes}" placeholder="Note"></td>
        `;
        return tr;
    };

    // --- EVENT LISTENERS ---
    if (addSurgeryBtn) {
        addSurgeryBtn.addEventListener('click', () => {
            surgeryList.appendChild(createSurgeryRow());
        });
    }

    if (addAllergyBtn) {
        addAllergyBtn.addEventListener('click', () => {
            allergiesList.appendChild(createAllergyRow());
        });
    }

    if (addRelativeBtn) {
        addRelativeBtn.addEventListener('click', () => {
            familyList.appendChild(createFamilyRow());
        });
    }

    // --- LOAD DATA ---
    const loadMedicalHistory = async () => {
        if (!activePatientId) return;
        
        // Render default immunization rows first
        if (immunizationTbody) {
            immunizationTbody.innerHTML = '';
            defaultVaccines.forEach(v => {
                immunizationTbody.appendChild(createImmunizationRow(v));
            });
        }

        try {
            const response = await fetch(`${window.API_BASE}/medical-history/${activePatientId}`);
            const result = await response.json();
            
            if (result.success && result.data) {
                const data = result.data;
                
                // Present History
                if (data.presentHistory) {
                    const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };
                    setVal('pres-chief', data.presentHistory.chiefComplaint);
                    setVal('pres-hpi', data.presentHistory.hpi);
                    setVal('pres-onset', data.presentHistory.onset);
                    setVal('pres-duration', data.presentHistory.duration);
                    setVal('pres-severity', data.presentHistory.severity);
                    setVal('pres-aggravating', data.presentHistory.aggravating);
                    setVal('pres-relieving', data.presentHistory.relieving);
                    setVal('pres-symptoms', data.presentHistory.symptoms);
                }

                // Past History: Chronic Conditions
                if (data.chronicConditions) {
                    document.querySelectorAll('#chronic-conditions input[type="checkbox"]').forEach(cb => {
                        cb.checked = data.chronicConditions.includes(cb.value);
                    });
                }
                
                // Past History: Surgeries
                if (data.surgeries && surgeryList) {
                    surgeryList.innerHTML = '';
                    data.surgeries.forEach(s => {
                        surgeryList.appendChild(createSurgeryRow(s.name, s.year, s.notes));
                    });
                }
                
                // Past History: Allergies
                if (data.allergies && allergiesList) {
                    allergiesList.innerHTML = '';
                    data.allergies.forEach(a => {
                        allergiesList.appendChild(createAllergyRow(a.name, a.reaction, a.severity));
                    });
                }
                
                // Immunization
                if (data.immunization && immunizationTbody) {
                    immunizationTbody.innerHTML = ''; // Clear default, render from save
                    const defaultSet = new Set(defaultVaccines);
                    data.immunization.forEach(imm => {
                        immunizationTbody.appendChild(createImmunizationRow(imm.name, imm.given, imm.date, imm.notes));
                        defaultSet.delete(imm.name);
                    });
                    // add any missing defaults if not in save
                    defaultSet.forEach(v => {
                        immunizationTbody.appendChild(createImmunizationRow(v));
                    });
                }

                // Family History
                if (data.familyHistory && familyList) {
                    familyList.innerHTML = '';
                    data.familyHistory.forEach(f => {
                        familyList.appendChild(createFamilyRow(f.relation, f.condition, f.status, f.age));
                    });
                }
            }

            const setBtnText = (id, hasData) => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = hasData ? '✏️ Edit' : '➕ Add';
            };
            
            setBtnText('edit-present-history', result.data && result.data.presentHistory && result.data.presentHistory.trim() !== '');
            setBtnText('edit-past-history', result.data && ((result.data.surgeries && result.data.surgeries.length > 0) || (result.data.allergies && result.data.allergies.length > 0)));
            setBtnText('edit-immunization', result.data && result.data.immunization && result.data.immunization.some(val => val.given === true || val.notes.trim() !== ''));
            setBtnText('edit-family-history', result.data && result.data.familyHistory && result.data.familyHistory.length > 0);

        } catch (e) {
            console.error("Could not fetch medical history", e);
        } finally {
            if (presentModule) presentModule(false);
            if (pastModule) pastModule(false);
            if (immuneModule) immuneModule(false);
            if (familyModule) familyModule(false);
        }
    };

    loadMedicalHistory();

    // --- SAVE LOGIC ---
    const saveToServer = async (payloadSubset, btnElement, toggleModuleBack) => {
        if (!activePatientId) return;
        const originalText = btnElement.textContent;
        btnElement.textContent = "Saving...";
        try {
            const response = await fetch(`${window.API_BASE}/medical-history`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: activePatientId,
                    payload: payloadSubset
                })
            });
            const result = await response.json();
            if (result.success) {
                btnElement.textContent = "Saved ✓";
                if (toggleModuleBack) toggleModuleBack(false);
                alert("Medical History data saved successfully!");
                setTimeout(() => btnElement.textContent = originalText, 2000);
            } else {
                btnElement.textContent = "Failed";
                alert("Failed to save data. " + result.message);
                setTimeout(() => btnElement.textContent = originalText, 2000);
            }
        } catch(e) {
            console.error(e);
            btnElement.textContent = "Error!";
            alert("Connection error! Could not save data.");
            setTimeout(() => btnElement.textContent = originalText, 2000);
        }
    };

    if (savePresentHistoryBtn) {
        savePresentHistoryBtn.addEventListener('click', () => {
            const presentHistory = {
                chiefComplaint: document.getElementById('pres-chief')?.value || '',
                hpi: document.getElementById('pres-hpi')?.value || '',
                onset: document.getElementById('pres-onset')?.value || '',
                duration: document.getElementById('pres-duration')?.value || '',
                severity: document.getElementById('pres-severity')?.value || '',
                aggravating: document.getElementById('pres-aggravating')?.value || '',
                relieving: document.getElementById('pres-relieving')?.value || '',
                symptoms: document.getElementById('pres-symptoms')?.value || ''
            };
            saveToServer({ presentHistory }, savePresentHistoryBtn, presentModule);
        });
    }

    if (savePastHistoryBtn) {
        savePastHistoryBtn.addEventListener('click', () => {
            // Checkboxes
            const cboxes = Array.from(document.querySelectorAll('#chronic-conditions input[type="checkbox"]:checked'));
            const chronicConditions = cboxes.map(cb => cb.value);
            
            // Surgeries
            const surgeries = [];
            surgeryList.querySelectorAll('.dynamic-row').forEach(row => {
                surgeries.push({
                    name: row.querySelector('.surgery-name').value,
                    year: row.querySelector('.surgery-year').value,
                    notes: row.querySelector('.surgery-notes').value
                });
            });

            // Allergies
            const allergies = [];
            allergiesList.querySelectorAll('.dynamic-row').forEach(row => {
                allergies.push({
                    name: row.querySelector('.allergy-name').value,
                    reaction: row.querySelector('.allergy-reaction').value,
                    severity: row.querySelector('.allergy-severity').value
                });
            });

            saveToServer({
                chronicConditions,
                surgeries,
                allergies
            }, savePastHistoryBtn, pastModule);
        });
    }

    if (saveImmunizationBtn) {
        saveImmunizationBtn.addEventListener('click', () => {
            const immunization = [];
            immunizationTbody.querySelectorAll('.immunization-row').forEach(row => {
                immunization.push({
                    name: row.querySelector('.vaccine-name').textContent,
                    given: row.querySelector('.vaccine-given').checked,
                    date: row.querySelector('.vaccine-date').value,
                    notes: row.querySelector('.vaccine-notes').value
                });
            });
            saveToServer({ immunization }, saveImmunizationBtn, immuneModule);
        });
    }

    if (saveFamilyBtn) {
        saveFamilyBtn.addEventListener('click', () => {
             const familyHistory = [];
             familyList.querySelectorAll('tr').forEach(row => {
                 familyHistory.push({
                     relation: row.querySelector('.family-relation').value,
                     condition: row.querySelector('.family-condition').value,
                     status: row.querySelector('.family-status').value,
                     age: row.querySelector('.family-age').value
                 });
             });
             saveToServer({ familyHistory }, saveFamilyBtn, familyModule);
        });
    }
});
