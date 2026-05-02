window.API_BASE = window.API_BASE || ((window.location.protocol === 'file:' || window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' && window.location.port !== '3000') ? 'http://localhost:3000/api' : '/api');
document.addEventListener('DOMContentLoaded', () => {
    const activePatientId = localStorage.getItem('selectedPatientId');
    if (!activePatientId) {
        console.warn("No active patient selected for Results.");
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
                if (el.type === 'checkbox' || el.tagName === 'SELECT' || el.type === 'file') {
                    if (el.type === 'file') {
                        el.style.display = isEdit ? 'block' : 'none';
                    } else {
                        el.disabled = !isEdit;
                    }
                } else {
                    if (isEdit) el.removeAttribute('readonly');
                    else el.setAttribute('readonly', true);
                }
                
                // Add plain text styling specifically for dynamic fields
                if (el.tagName !== 'SELECT' && el.type !== 'checkbox' && el.type !== 'file') {
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

    const labModule = setupEditModule('laboratory', 'edit-lab', 'cancel-lab', 'save-lab', () => loadResults(), ['add-lab-btn']);
    const imagingModule = setupEditModule('imaging-ecg', 'edit-imaging', 'cancel-imaging', 'save-imaging', () => loadResults(), ['add-imaging-btn']);

    // --- DOM BUILDERS ---
    const labList = document.getElementById('laboratory-list');
    const imagingList = document.getElementById('imaging-list');

    const createLabRow = (test='', val='', unit='', ref='') => {
        const tr = document.createElement('tr');
        tr.className = 'dynamic-row';
        tr.innerHTML = `
            <td><input type="text" class="l-test" value="${test}" style="width:100%; border:1px solid var(--navy-blue); border-radius:4px; padding:4px;"></td>
            <td><input type="text" class="l-val" value="${val}" style="width:100%; border:1px solid var(--navy-blue); border-radius:4px; padding:4px;"></td>
            <td><input type="text" class="l-unit" value="${unit}" style="width:100%; border:1px solid var(--navy-blue); border-radius:4px; padding:4px;"></td>
            <td><input type="text" class="l-ref" value="${ref}" style="width:100%; border:1px solid var(--navy-blue); border-radius:4px; padding:4px;"></td>
            <td><button type="button" class="btn-delete" style="background:transparent; border:none; cursor:pointer;" title="Delete">🗑️</button></td>
        `;
        tr.querySelector('.btn-delete').addEventListener('click', () => tr.remove());
        return tr;
    };

    const createImagingPanel = (type='Chest X-Ray', date='', desc='', imgSrc='') => {
        const div = document.createElement('div');
        div.className = 'imaging-panel dynamic-row';
        
        let typeOptions = ['Chest X-Ray', 'ECG', 'CT Scan', 'MRI', 'Ultrasound', 'Other'];
        let optionsHtml = typeOptions.map(opt => `<option value="${opt}" ${opt === type ? 'selected' : ''}>${opt}</option>`).join('');

        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <div style="display: flex; gap: 15px; flex: 1;">
                    <div style="flex: 1;">
                        <label style="display:block; font-weight:bold; margin-bottom: 5px;">Type of Imaging</label>
                        <select class="i-type" style="width:100%; border:1px solid var(--navy-blue); border-radius:4px; padding:6px;">
                            ${optionsHtml}
                        </select>
                    </div>
                    <div style="flex: 1;">
                        <label style="display:block; font-weight:bold; margin-bottom: 5px;">Date</label>
                        <input type="date" class="i-date" value="${date}" style="width:100%; border:1px solid var(--navy-blue); border-radius:4px; padding:6px;">
                    </div>
                </div>
                <button type="button" class="btn-delete" style="background:transparent; border:none; cursor:pointer; font-size: 1.2rem; margin-left: 15px;" title="Delete Panel">🗑️</button>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display:block; font-weight:bold; margin-bottom: 5px;">Interpretation / Description</label>
                <textarea class="i-desc" rows="3" style="width:100%; border:1px solid var(--navy-blue); border-radius:4px; padding:6px; font-family: inherit;">${desc}</textarea>
            </div>

            <div style="margin-bottom: 10px;">
                <label style="display:block; font-weight:bold; margin-bottom: 5px;">Attachment File</label>
                <input type="file" class="i-file" accept="image/*" style="margin-bottom: 10px;">
                <div class="image-preview-container" style="${imgSrc ? 'display: block;' : 'display: none;'}">
                    <img class="i-preview" src="${imgSrc || ''}" alt="Preview" />
                </div>
                <input type="hidden" class="i-base64" value="${imgSrc || ''}">
            </div>
        `;

        div.querySelector('.btn-delete').addEventListener('click', () => div.remove());

        // Handle File Upload and Preview
        const fileInput = div.querySelector('.i-file');
        const previewContainer = div.querySelector('.image-preview-container');
        const previewImg = div.querySelector('.i-preview');
        const base64Input = div.querySelector('.i-base64');

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (readerEvent) => {
                    const result = readerEvent.target.result;
                    previewImg.src = result;
                    base64Input.value = result;
                    previewContainer.style.display = 'block';
                };
                reader.readAsDataURL(file);
            } else {
                previewImg.src = '';
                base64Input.value = '';
                previewContainer.style.display = 'none';
            }
        });

        return div;
    };

    // --- ADD BUTTON ACTIONS ---
    document.getElementById('add-lab-btn')?.addEventListener('click', () => {
        labList.appendChild(createLabRow());
    });

    document.getElementById('add-imaging-btn')?.addEventListener('click', () => {
        imagingList.appendChild(createImagingPanel());
    });

    // --- DATA LOADING ---
    const loadResults = async () => {
        if (!activePatientId) return;

        try {
            const response = await fetch(`${window.API_BASE}/results/${activePatientId}`);
            const result = await response.json();

            let hasLab = false;
            let hasImaging = false;

            if (result.success && result.data) {
                const data = result.data;
                
                // Load Laboratory
                if (data.laboratory && labList) {
                    hasLab = data.laboratory.length > 0;
                    labList.innerHTML = '';
                    data.laboratory.forEach(l => {
                        labList.appendChild(createLabRow(l.test, l.val, l.unit, l.ref));
                    });
                }
                
                // Load Imaging finding
                if (data.imaging && imagingList) {
                    hasImaging = data.imaging.length > 0;
                    imagingList.innerHTML = '';
                    data.imaging.forEach(i => {
                        imagingList.appendChild(createImagingPanel(i.type, i.date, i.desc, i.imgSrc));
                    });
                }
            }

            const setBtnText = (id, hasData) => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = hasData ? '✏️ Edit' : '➕ Add';
            };
            setBtnText('edit-lab', hasLab);
            setBtnText('edit-imaging', hasImaging);

        } catch (e) {
            console.error("Could not fetch results data", e);
        } finally {
            if (labModule) labModule(false);
            if (imagingModule) imagingModule(false);
        }
    };

    loadResults();

    // --- SAVE LOGIC ---
    const saveToServer = async (payloadSubset, btnElement, toggleModuleBack) => {
        if (!activePatientId) return;
        const originalText = btnElement.textContent;
        btnElement.textContent = "Saving...";
        try {
            const response = await fetch(`${window.API_BASE}/results`, {
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
                alert("Results data saved successfully!");
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

    document.getElementById('save-lab')?.addEventListener('click', (e) => {
        const laboratory = [];
        labList.querySelectorAll('.dynamic-row').forEach(row => {
            laboratory.push({
                test: row.querySelector('.l-test').value,
                val: row.querySelector('.l-val').value,
                unit: row.querySelector('.l-unit').value,
                ref: row.querySelector('.l-ref').value
            });
        });
        saveToServer({ laboratory }, e.target, labModule);
    });

    document.getElementById('save-imaging')?.addEventListener('click', (e) => {
        const imaging = [];
        imagingList.querySelectorAll('.dynamic-row').forEach(panel => {
            imaging.push({
                type: panel.querySelector('.i-type').value,
                date: panel.querySelector('.i-date').value,
                desc: panel.querySelector('.i-desc').value,
                imgSrc: panel.querySelector('.i-base64').value
            });
        });
        saveToServer({ imaging }, e.target, imagingModule);
    });

});
