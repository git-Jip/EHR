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

    const medicationList = [
        "Magnesium Sulfate", "Hydralazine", "Nifedipine (IR)", "Calcium Gluconate",
        "Paracetamol", "Ibuprofen", "Aspirin", "Mefenamic Acid", "Naproxen",
        "Amoxicillin", "Azithromycin", "Cefuroxime", "Ciprofloxacin",
        "Metronidazole", "Doxycycline", "Amlodipine", "Losartan", "Metoprolol"
    ];

    const dosageList = [
        "1 mg", "2 mg", "5 mg", "10 mg", "20 mg", "25 mg", "40 mg", "50 mg", "75 mg", "100 mg"
    ];

    const drugClasses = {
        'Nifedipine (IR)': ['Calcium Channel Blockers'],
        'Amlodipine': ['Calcium Channel Blockers'],
        'Metoprolol': ['Beta Blockers']
    };

    const interactionRules = [
        { 
            drugs: ['Magnesium Sulfate', 'Nifedipine (IR)'], 
            mechanism: 'Synergistic calcium channel blockade.',
            risk: 'Exaggerated muscle weakness and respiratory depression.', 
            action: 'Monitor DTRs hourly, ensure Calcium Gluconate is ready.' 
        },
        { 
            drugs: ['Magnesium Sulfate', 'Calcium Channel Blockers'], 
            mechanism: 'Potentiation of neuromuscular blockade.',
            risk: 'Cardiac suppression, neuromuscular blockade.', 
            action: 'Use with caution, continuous monitoring required.' 
        },
        { 
            drugs: ['Hydralazine', 'Metoprolol'], 
            mechanism: 'Combined peripheral vasodilation and heart rate reduction.',
            risk: 'Excessive blood pressure drop.', 
            action: 'Monitor BP, adjust dose if needed.' 
        },
        { 
            drugs: ['Hydralazine', 'Diuretics'], 
            mechanism: 'Additive hypotensive effects.',
            risk: 'Increased hypotensive effect.', 
            action: 'Monitor BP and fluid balance.' 
        },
        { 
            drugs: ['Nifedipine (IR)', 'Beta Blockers'], 
            mechanism: 'Enhanced suppression of SA and AV node function.',
            risk: 'Hypotension, heart failure.', 
            action: 'Use cautiously, monitor cardiac status.' 
        },
        { 
            drugs: ['Calcium Gluconate', 'Digoxin'], 
            mechanism: 'Hypercalcemia increases cardiotoxic effects of digitalis.',
            risk: 'Cardiac arrhythmias.', 
            action: 'Avoid rapid IV administration, monitor ECG.' 
        },
        { 
            drugs: ['Calcium Gluconate', 'Ceftriaxone'], 
            mechanism: 'Formation of insoluble calcium-ceftriaxone salts.',
            risk: 'IV precipitation (can be fatal).', 
            action: 'Do not mix or co-administer IV.' 
        }
    ];

    const showAlerts = (conflicts) => {
        const modal = document.getElementById('interaction-modal');
        const content = document.getElementById('alert-content');
        if (!modal || !content) return;

        content.innerHTML = conflicts.map(c => `
            <div class="alert-card">
                <div class="alert-card-header">
                    <div class="red-dot"></div>
                    <div class="critical-label">CRITICAL</div>
                </div>
                <div class="drug-combination" style="margin-bottom: 12px;">${c.drug1} + ${c.drug2}</div>
                <div class="alert-detail-row">
                    <span class="alert-detail-label">Mechanism:</span> ${c.rule.mechanism || 'Combined drug effects.'}
                </div>
                <div class="alert-detail-row">
                    <span class="alert-detail-label">Risk:</span> ${c.rule.risk}
                </div>
                <div class="alert-detail-row">
                    <span class="alert-detail-label">Action:</span> ${c.rule.action}
                </div>
            </div>
        `).join('');
        
        modal.style.display = 'flex';
    };

    document.getElementById('close-alert-btn')?.addEventListener('click', () => {
        document.getElementById('interaction-modal').style.display = 'none';
    });

    const checkInteractions = () => {
        const currentMeds = Array.from(document.querySelectorAll('.m-med')).map(el => el.value).filter(v => v !== '');
        const conflicts = [];
        
        for (let i = 0; i < currentMeds.length; i++) {
            for (let j = i + 1; j < currentMeds.length; j++) {
                const med1 = currentMeds[i];
                const med2 = currentMeds[j];
                const classes1 = drugClasses[med1] || [];
                const classes2 = drugClasses[med2] || [];

                for (const rule of interactionRules) {
                    const [r1, r2] = rule.drugs;
                    
                    const match1 = (med1 === r1 || classes1.includes(r1));
                    const match2 = (med2 === r2 || classes2.includes(r2));
                    const reverseMatch1 = (med1 === r2 || classes1.includes(r2));
                    const reverseMatch2 = (med2 === r1 || classes2.includes(r1));

                    if ((match1 && match2) || (reverseMatch1 && reverseMatch2)) {
                        // Avoid duplicates if same interaction is caught twice (e.g. by class and by name)
                        if (!conflicts.some(c => (c.drug1 === med1 && c.drug2 === med2) || (c.drug1 === med2 && c.drug2 === med1))) {
                            conflicts.push({ drug1: med1, drug2: med2, rule });
                        }
                    }
                }
            }
        }

        if (conflicts.length > 0) {
            showAlerts(conflicts);
            return true;
        }
        return false;
    };

    const createMARPanel = (med='', dose='', route='', freq='', prov='', ind='', start='') => {
        const div = document.createElement('div');
        div.className = 'mar-panel-view dynamic-row';
        
        const medOptions = medicationList.map(m => `<option value="${m}" ${m === med ? 'selected' : ''}>${m}</option>`).join('');
        const doseOptions = dosageList.map(d => `<option value="${d}" ${d === dose ? 'selected' : ''}>${d}</option>`).join('');

        div.innerHTML = `
            <div style="flex: 1;">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom: 10px;">
                    <div style="flex: 1.5;">
                        <label style="display: block; font-size: 0.75rem; color: #666; margin-bottom: 2px;">Medication</label>
                        <select class="m-med" style="font-size: 1rem; font-weight: bold; width: 100%; border: 1px solid var(--navy-blue); border-radius: 4px; padding: 6px; background-color: white;">
                            <option value="">Select Medication...</option>
                            ${medOptions}
                        </select>
                    </div>
                    <div style="flex: 1;">
                        <label style="display: block; font-size: 0.75rem; color: #666; margin-bottom: 2px;">Dosage</label>
                        <select class="m-dose" style="font-size: 1rem; font-weight: bold; color: #3498db; width: 100%; border: 1px solid var(--navy-blue); border-radius: 4px; padding: 6px; background-color: white;">
                            <option value="">Select Dose...</option>
                            ${doseOptions}
                        </select>
                    </div>
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
        div.querySelector('.m-med').addEventListener('change', () => checkInteractions());
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
        if (checkInteractions()) {
            // Alert already shown by checkInteractions
            return;
        }
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
