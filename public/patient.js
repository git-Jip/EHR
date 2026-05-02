window.API_BASE = window.API_BASE || ((window.location.protocol === 'file:' || window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' && window.location.port !== '3000') ? 'http://localhost:3000/api' : '/api');
document.addEventListener('DOMContentLoaded', () => {

    // --- PATIENT LIST LOGIC ---
    const patientListDOM = document.getElementById('patientListDOM');
    const totalPatientCount = document.getElementById('total-patient-count');
    const searchInput = document.getElementById('patientSearchInput');

    let allPatients = [];

    const fetchPatients = async () => {
        try {
            const response = await fetch(`${window.API_BASE}/patients`);
            const result = await response.json();
            
            if (result.success) {
                allPatients = result.data;
                totalPatientCount.textContent = result.count.toLocaleString();
                renderPatients(allPatients);
            } else {
                patientListDOM.innerHTML = '<p style="text-align: center; color: red;">Failed to load patients.</p>';
            }
        } catch (err) { 
            patientListDOM.innerHTML = '<p style="text-align: center; color: red;">Could not connect to the backend server.</p>';
            console.error(err);
        }
    };

    const renderPatients = (patients) => {
        if (!patientListDOM) return;
        
        patientListDOM.innerHTML = '';
        if (patients.length === 0) {
            patientListDOM.innerHTML = '<p style="text-align: center; color: #666;">No patients found.</p>';
            return;
        }

        patients.forEach(p => {
            const row = document.createElement('div');
            row.className = 'patient-row';
            row.innerHTML = `
                <div class="patient-info">
                    <span class="patient-icon">👤</span>
                    <span>${p['First Name']} ${p['Last Name']} (ID - ${p['ID']})</span>
                </div>
                <button class="btn-status">Status</button>
            `;
            // Redirect to patient dashboard on click
            row.addEventListener('click', () => {
                localStorage.setItem('selectedPatientId', p['ID']);
                window.location.href = 'patientDashboard.html';
            });
            patientListDOM.appendChild(row);
        });
    };

    if (patientListDOM) {
        fetchPatients();
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = allPatients.filter(p => {
                    const fullName = `${p['First Name']} ${p['Last Name']}`.toLowerCase();
                    const id = (p['ID'] || '').toLowerCase();
                    return fullName.includes(term) || id.includes(term);
                });
                renderPatients(filtered);
            });
        }
    }


    // --- ADD PATIENT FORM LOGIC ---
    const addPatientForm = document.getElementById('add-patient-form');
    const msgDiv = document.getElementById('patient-message');

    if (addPatientForm) {
        addPatientForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            msgDiv.textContent = 'Saving patient data...';
            msgDiv.style.color = '#ffeb3b';

            // Gather all elements
            const payload = {
                firstName: document.getElementById('firstName')?.value || '',
                lastName: document.getElementById('lastName')?.value || '',
                middleName: document.getElementById('middleName')?.value || '',
                dateOfBirth: document.getElementById('dateOfBirth')?.value || '',
                sex: document.getElementById('sex')?.value || '',
                civilStatus: document.getElementById('civilStatus')?.value || '',
                nationality: document.getElementById('nationality')?.value || '',
                religion: document.getElementById('religion')?.value || '',
                
                address: document.getElementById('address')?.value || '',
                phone: document.getElementById('phone')?.value || '',
                emergencyContact: document.getElementById('emergencyContact')?.value || '',
                emergencyPhone: document.getElementById('emergencyPhone')?.value || '',
                
                bloodType: document.getElementById('bloodType')?.value || '',
                height: document.getElementById('height')?.value || '',
                weight: document.getElementById('weight')?.value || '',
                bmi: document.getElementById('bmi')?.value || '',
                admissionDate: document.getElementById('admissionDate')?.value || '',
                ward: document.getElementById('ward')?.value || '',
                attendingPhysician: document.getElementById('attendingPhysician')?.value || '',
                insuranceProvider: document.getElementById('insuranceProvider')?.value || '',
                insuranceId: document.getElementById('insuranceId')?.value || ''
            };

            try {
                const response = await fetch(`${window.API_BASE}/patient`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const result = await response.json();
                
                msgDiv.textContent = result.message;
                msgDiv.style.color = result.success ? '#90EE90' : '#FFB6C1';
                
                if (result.success) {
                    addPatientForm.reset();
                    // Close instantly
                    window.location.href = 'patientList.html';
                }
            } catch (err) {
                msgDiv.textContent = 'Could not connect to the server.';
                msgDiv.style.color = '#FFB6C1';
                console.error(err);
            }
        });
    }

    // --- DEMOGRAPHICS POPULATION & SAVE LOGIC ---
    const demoForm = document.getElementById('demo-form');
    const demoMsgDiv = document.getElementById('demo-message');
    const subtitle = document.getElementById('dash-patient-subtitle');
    
    const selectedId = localStorage.getItem('selectedPatientId');

    const loadPatientData = () => {
        if (selectedId && subtitle) {
            fetch(`${window.API_BASE}/patients`)
                .then(res => res.json())
                .then(result => {
                    if (result.success) {
                        const p = result.data.find(x => x['ID'] === selectedId);
                        if (p) {
                            subtitle.textContent = `Patient: ${p['First Name']} ${p['Last Name']} (${p['ID']})`;
                            
                            if (demoForm) {
                                const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
                                const panelId = document.getElementById('demo-panel-id');
                                if (panelId) panelId.textContent = `Patient ID: #${p['ID']}`;
                                
                                setVal('demo-patientId', p['ID']);
                                setVal('demo-firstName', p['First Name']);
                                setVal('demo-lastName', p['Last Name']);
                                setVal('demo-dateOfBirth', p['Date of Birth']);
                                setVal('demo-sex', p['Sex']);
                                setVal('demo-civilStatus', p['Civil Status']);
                                setVal('demo-nationality', p['Nationality']);
                                setVal('demo-religion', p['Religion']);
                                
                                setVal('demo-address', p['Address']);
                                setVal('demo-phone', p['Phone']);
                                setVal('demo-emergencyContact', p['Emergency Contact']);
                                setVal('demo-emergencyPhone', p['Emergency Phone']);
                                
                                setVal('demo-bloodType', p['Blood Type']);
                                setVal('demo-height', p['Height']);
                                setVal('demo-weight', p['Weight']);
                                setVal('demo-bmi', p['BMI']);
                                setVal('demo-admissionDate', p['Admission Date']);
                                setVal('demo-ward', p['Ward']);
                                setVal('demo-attendingPhysician', p['Attending Physician']);
                                setVal('demo-insuranceProvider', p['Insurance Provider']);
                                setVal('demo-insuranceId', p['Insurance ID']);
                                
                                // Lock fields again safely
                                const inputs = demoForm.querySelectorAll('input');
                                const selects = demoForm.querySelectorAll('select');
                                inputs.forEach(input => input.setAttribute('readonly', true));
                                selects.forEach(select => select.setAttribute('disabled', true));
                                
                                const editBtn = document.getElementById('edit-demo-btn');
                                const cancelBtn = document.getElementById('cancel-demo-btn');
                                const saveBtn = document.getElementById('save-demo-btn');
                                
                                if (editBtn) {
                                    editBtn.style.display = 'inline-block';
                                    const hasDemographicsFields = p['First Name'] || p['Address'] || p['Phone'];
                                    editBtn.innerHTML = hasDemographicsFields ? '✏️ Edit' : '➕ Add';
                                }
                                if (cancelBtn) cancelBtn.style.display = 'none';
                                if (saveBtn) saveBtn.style.display = 'none';
                            }
                        }
                    }
                });
        }
    };
    
    loadPatientData();

    const editBtn = document.getElementById('edit-demo-btn');
    const cancelBtn = document.getElementById('cancel-demo-btn');
    const saveBtn = document.getElementById('save-demo-btn');

    if (editBtn && saveBtn && demoForm) {
        editBtn.addEventListener('click', () => {
            // Remove readonly from inputs, disabled from selects
            const inputs = demoForm.querySelectorAll('input');
            const selects = demoForm.querySelectorAll('select');
            
            inputs.forEach(input => {
                if (input.id !== 'demo-patientId') { // keep Patient ID readonly
                    input.removeAttribute('readonly');
                }
            });
            
            selects.forEach(select => {
                select.removeAttribute('disabled');
            });
            
            // Hide edit button, show save button
            editBtn.style.display = 'none';
            if (cancelBtn) cancelBtn.style.display = 'inline-block';
            saveBtn.style.display = 'inline-block';
        });

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                loadPatientData();
            });
        }
    }

    if (demoForm) {
        demoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            demoMsgDiv.textContent = 'Saving patient demographics...';
            demoMsgDiv.style.color = '#ffeb3b';

            // Gather all elements
            const payload = {
                id: document.getElementById('demo-patientId')?.value || '',
                firstName: document.getElementById('demo-firstName')?.value || '',
                lastName: document.getElementById('demo-lastName')?.value || '',
                // Middle name is absent from image 2, default to blank
                middleName: '',
                dateOfBirth: document.getElementById('demo-dateOfBirth')?.value || '',
                sex: document.getElementById('demo-sex')?.value || '',
                civilStatus: document.getElementById('demo-civilStatus')?.value || '',
                nationality: document.getElementById('demo-nationality')?.value || '',
                religion: document.getElementById('demo-religion')?.value || '',
                
                address: document.getElementById('demo-address')?.value || '',
                phone: document.getElementById('demo-phone')?.value || '',
                emergencyContact: document.getElementById('demo-emergencyContact')?.value || '',
                emergencyPhone: document.getElementById('demo-emergencyPhone')?.value || '',
                
                bloodType: document.getElementById('demo-bloodType')?.value || '',
                height: document.getElementById('demo-height')?.value || '',
                weight: document.getElementById('demo-weight')?.value || '',
                bmi: document.getElementById('demo-bmi')?.value || '',
                admissionDate: document.getElementById('demo-admissionDate')?.value || '',
                ward: document.getElementById('demo-ward')?.value || '',
                attendingPhysician: document.getElementById('demo-attendingPhysician')?.value || '',
                insuranceProvider: document.getElementById('demo-insuranceProvider')?.value || '',
                insuranceId: document.getElementById('demo-insuranceId')?.value || ''
            };

            try {
                const response = await fetch(`${window.API_BASE}/patient`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const result = await response.json();
                
                demoMsgDiv.textContent = 'Demographics saved successfully!';
                demoMsgDiv.style.color = result.success ? '#90EE90' : '#FFB6C1';
                
                if (result.success) {
                    // Make inputs readonly again
                    const inputs = demoForm.querySelectorAll('input');
                    const selects = demoForm.querySelectorAll('select');
                    
                    inputs.forEach(input => {
                        input.setAttribute('readonly', true);
                    });
                    
                    selects.forEach(select => {
                        select.setAttribute('disabled', true);
                    });
                    
                    if (editBtn) editBtn.style.display = 'inline-block';
                    if (cancelBtn) cancelBtn.style.display = 'none';
                    if (saveBtn) saveBtn.style.display = 'none';
                }
            } catch (err) {
                demoMsgDiv.textContent = 'Could not connect to the server.';
                demoMsgDiv.style.color = '#FFB6C1';
                console.error(err);
            }
        });
    }
});
