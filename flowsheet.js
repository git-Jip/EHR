window.API_BASE = window.API_BASE || ((window.location.protocol === 'file:' || window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost' && window.location.port !== '3000') ? 'http://localhost:3000/api' : '/api');
document.addEventListener('DOMContentLoaded', () => {
    const activePatientId = localStorage.getItem('selectedPatientId');
    if (!activePatientId) {
        console.warn("No active patient selected for Flowsheet.");
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

    const vitalsModule = setupEditModule('vital-signs', 'edit-vital-signs', 'cancel-vital-signs', 'save-vital-signs', () => loadFlowsheet(), ['add-vitals-btn']);
    const intakeOutputModule = setupEditModule('intake-output', 'edit-intake-output', 'cancel-intake-output', 'save-intake-output', () => loadFlowsheet(), ['add-intake-btn', 'add-output-btn']);
    const headToToeModule = setupEditModule('head-to-toe', 'edit-head-to-toe', 'cancel-head-to-toe', 'save-head-to-toe', () => loadFlowsheet());
    const systemsModule = setupEditModule('systems', 'edit-systems', 'cancel-systems', 'save-systems', () => loadFlowsheet());

    // --- DOM BUILDERS ---
    const vitalsList = document.getElementById('vital-signs-list');
    const intakeList = document.getElementById('intake-list');
    const outputList = document.getElementById('output-list');

    const createVitalsRow = (time='', temp='', bp='', hr='', rr='', spo2='', pain='') => {
        const tr = document.createElement('tr');
        tr.className = 'dynamic-row';
        tr.innerHTML = `
            <td><input type="time" class="v-time" value="${time}" style="width:100%; border:1px solid var(--navy-blue); border-radius:4px; padding:4px;"></td>
            <td><input type="number" class="v-temp" value="${temp}" step="0.1" style="width:100%; border:1px solid var(--navy-blue); border-radius:4px; padding:4px;"></td>
            <td><input type="text" class="v-bp" value="${bp}" placeholder="120/80" style="width:100%; border:1px solid var(--navy-blue); border-radius:4px; padding:4px;"></td>
            <td><input type="number" class="v-hr" value="${hr}" style="width:100%; border:1px solid var(--navy-blue); border-radius:4px; padding:4px;"></td>
            <td><input type="number" class="v-rr" value="${rr}" style="width:100%; border:1px solid var(--navy-blue); border-radius:4px; padding:4px;"></td>
            <td><input type="number" class="v-spo2" value="${spo2}" style="width:100%; border:1px solid var(--navy-blue); border-radius:4px; padding:4px;"></td>
            <td><input type="number" class="v-pain" value="${pain}" min="0" max="10" style="width:100%; border:1px solid var(--navy-blue); border-radius:4px; padding:4px;"></td>
            <td><button type="button" class="btn-delete" style="background:transparent; border:none; cursor:pointer;" title="Delete">🗑️</button></td>
        `;
        tr.querySelector('.btn-delete').addEventListener('click', () => tr.remove());
        return tr;
    };

    const createIORow = (time='', type='', desc='', amt='') => {
        const tr = document.createElement('tr');
        tr.className = 'dynamic-row';
        tr.innerHTML = `
            <td><input type="time" class="io-time" value="${time}" style="width:100%; border:1px solid var(--navy-blue); border-radius:4px; padding:4px;"></td>
            <td><input type="text" class="io-type" value="${type}" style="width:100%; border:1px solid var(--navy-blue); border-radius:4px; padding:4px;"></td>
            <td><input type="text" class="io-desc" value="${desc}" style="width:100%; border:1px solid var(--navy-blue); border-radius:4px; padding:4px;"></td>
            <td><input type="number" class="io-amt" value="${amt}" style="width:100%; border:1px solid var(--navy-blue); border-radius:4px; padding:4px;"></td>
            <td><button type="button" class="btn-delete" style="background:transparent; border:none; cursor:pointer;" title="Delete">🗑️</button></td>
        `;
        tr.querySelector('.btn-delete').addEventListener('click', () => tr.remove());
        return tr;
    };

    // --- ADD BUTTON ACTIONS ---
    document.getElementById('add-vitals-btn')?.addEventListener('click', () => {
        vitalsList.appendChild(createVitalsRow());
    });

    document.getElementById('add-intake-btn')?.addEventListener('click', () => {
        intakeList.appendChild(createIORow());
    });

    document.getElementById('add-output-btn')?.addEventListener('click', () => {
        outputList.appendChild(createIORow());
    });

    // --- DATA LOADING ---
    const loadFlowsheet = async () => {
        if (!activePatientId) return;

        try {
            const response = await fetch(`${window.API_BASE}/flowsheet/${activePatientId}`);
            const result = await response.json();

            if (result.success && result.data) {
                const data = result.data;
                
                // Load Vitals
                if (data.vitals && vitalsList) {
                    vitalsList.innerHTML = '';
                    data.vitals.forEach(v => {
                        vitalsList.appendChild(createVitalsRow(v.time, v.temp, v.bp, v.hr, v.rr, v.spo2, v.pain));
                    });
                }
                
                // Load Intake
                if (data.intake && intakeList) {
                    intakeList.innerHTML = '';
                    data.intake.forEach(i => {
                        intakeList.appendChild(createIORow(i.time, i.type, i.desc, i.amt));
                    });
                }
                
                // Load Output
                if (data.output && outputList) {
                    outputList.innerHTML = '';
                    data.output.forEach(o => {
                        outputList.appendChild(createIORow(o.time, o.type, o.desc, o.amt));
                    });
                }
                
                // Load Head-to-Toe
                if (data.headToToe) {
                    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
                    // General Survey
                    setVal('htt-generalApp', data.headToToe.generalApp);
                    setVal('htt-loc', data.headToToe.loc);
                    setVal('htt-behavior', data.headToToe.behavior);
                    setVal('htt-distress', data.headToToe.distress);
                    // Skin
                    setVal('htt-skinColor', data.headToToe.skinColor);
                    setVal('htt-skinTurgor', data.headToToe.skinTurgor);
                    setVal('htt-skinIntegrity', data.headToToe.skinIntegrity);
                    setVal('htt-wounds', data.headToToe.wounds);
                    setVal('htt-hair', data.headToToe.hair);
                    setVal('htt-nails', data.headToToe.nails);
                    // Ears
                    setVal('htt-earCanal', data.headToToe.earCanal);
                    setVal('htt-hearing', data.headToToe.hearing);
                    setVal('htt-earDischarge', data.headToToe.earDischarge);
                    // Neck
                    setVal('htt-lymphNodes', data.headToToe.lymphNodes);
                    setVal('htt-jvd', data.headToToe.jvd);
                    setVal('htt-thyroid', data.headToToe.thyroid);
                    setVal('htt-rom', data.headToToe.rom);
                    // Mouth
                    setVal('htt-lips', data.headToToe.lips);
                    setVal('htt-teeth', data.headToToe.teeth);
                    setVal('htt-tongue', data.headToToe.tongue);
                    setVal('htt-throat', data.headToToe.throat);
                }
                
                // Load Systems & Legacy HeadToToe
                if (data.systems || data.headToToe) {
                    const src = data.systems || data.headToToe || {};
                    const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
                    const setChk = (id, val) => { const el = document.getElementById(id); if (el) el.checked = !!val; };
                    
                    if (src.respDetails) {
                        const r = src.respDetails;
                        setChk('resp-bp-norm', r.bpNorm); setChk('resp-bp-rapid', r.bpRapid); setChk('resp-bp-slow', r.bpSlow); setChk('resp-bp-irreg', r.bpIrreg); setChk('resp-bp-labor', r.bpLabor);
                        setChk('resp-bs-clear', r.bsClear); setChk('resp-bs-wheeze', r.bsWheeze); setChk('resp-bs-crack', r.bsCrack); setChk('resp-bs-dim', r.bsDim); setChk('resp-bs-stridor', r.bsStridor);
                        setVal('resp-findings', r.findings); setVal('resp-datetime', r.datetime);
                        setChk('resp-c-none', r.cNone); setChk('resp-c-dry', r.cDry); setChk('resp-c-prod', r.cProd); setChk('resp-c-freq', r.cFreq);
                        setChk('resp-cm-sym', r.cmSym); setChk('resp-cm-unequal', r.cmUnequal); setChk('resp-cm-retract', r.cmRetract);
                        setVal('resp-intervention', r.intervention);
                        setVal('resp-rr', r.rr); setVal('resp-spo2', r.spo2); setVal('resp-hr', r.hr);
                        setChk('resp-of-fever', r.ofFever); setChk('resp-of-sob', r.ofSob); setChk('resp-of-cp', r.ofCp); setVal('resp-of-other', r.ofOther);
                        setVal('resp-docnotes', r.docnotes);
                    } else { setVal('resp-findings', src.resp || ''); }

                    if (src.cardioDetails) {
                        const c = src.cardioDetails;
                        setVal('cardio-datetime', c.datetime); setVal('cardio-temp', c.temp); setVal('cardio-weight', c.weight); setVal('cardio-bp', c.bp); setVal('cardio-pain', c.pain);
                        setChk('cardio-of-gen', c.ofGen); setChk('cardio-of-life', c.ofLife); setChk('cardio-of-pmh', c.ofPmh); setVal('cardio-of-other', c.ofOther);
                        setChk('cardio-r-reg', c.rReg); setChk('cardio-r-irreg', c.rIrreg);
                        setChk('cardio-hr-norm', c.hrNorm); setChk('cardio-hr-brady', c.hrBrady); setChk('cardio-hr-tachy', c.hrTachy); setChk('cardio-hr-arryth', c.hrArryth);
                        setChk('cardio-hs-norm', c.hsNorm); setChk('cardio-hs-murmur', c.hsMurmur); setChk('cardio-hs-abnorm', c.hsAbnorm);
                        setChk('cardio-p-0', c.p0); setChk('cardio-p-1', c.p1); setChk('cardio-p-2', c.p2); setChk('cardio-p-3', c.p3); setChk('cardio-p-4', c.p4);
                        setChk('cardio-crt-norm', c.crtNorm); setChk('cardio-crt-abnorm', c.crtAbnorm);
                        setVal('cardio-findings', c.findings); setVal('cardio-intervention', c.intervention); setVal('cardio-docnotes', c.docnotes);
                    } else { setVal('cardio-findings', src.cardio || ''); }

                    if (src.giDetails) {
                        const g = src.giDetails;
                        setVal('gi-datetime', g.datetime); setVal('gi-pain', g.pain); setVal('gi-girth', g.girth); setVal('gi-lbm', g.lbm); setVal('gi-loi', g.loi);
                        setChk('gi-of-nonv', g.ofNonv); setChk('gi-of-appetite', g.ofAppetite); setChk('gi-of-stool', g.ofStool); setChk('gi-of-nodc', g.ofNodc); setVal('gi-of-other', g.ofOther);
                        setChk('gi-i-flat', g.iFlat); setChk('gi-i-round', g.iRound); setChk('gi-i-dist', g.iDist); setChk('gi-i-scaph', g.iScaph); setChk('gi-i-sym', g.iSym); setChk('gi-i-noscars', g.iNoscars); setChk('gi-i-noperi', g.iNoperi); setChk('gi-i-skin', g.iSkin);
                        setChk('gi-a-norm', g.aNorm); setChk('gi-a-hyper', g.aHyper); setChk('gi-a-hypo', g.aHypo); setChk('gi-a-absent', g.aAbsent); setChk('gi-a-nobruit', g.aNobruit);
                        setChk('gi-pe-tymp', g.peTymp); setChk('gi-pe-liv', g.peLiv); setChk('gi-pe-noshift', g.peNoshift);
                        setChk('gi-pa-soft', g.paSoft); setChk('gi-pa-nomass', g.paNomass); setChk('gi-pa-noguard', g.paNoguard); setChk('gi-pa-noreb', g.paNoreb);
                        setVal('gi-findings', g.findings); setVal('gi-intervention', g.intervention); setVal('gi-docnotes', g.docnotes);
                    } else { setVal('gi-findings', src.gi || ''); }

                    if (src.guDetails) {
                        const gu = src.guDetails;
                        setVal('gu-datetime', gu.datetime); setVal('gu-output', gu.output); setVal('gu-intake', gu.intake); setVal('gu-sg', gu.sg);
                        setChk('gu-os-fever', gu.osFever); setChk('gu-os-nausea', gu.osNausea); setChk('gu-os-bed', gu.osBed); setChk('gu-os-itch', gu.osItch); setVal('gu-os-other', gu.osOther);
                        setChk('gu-up-norm', gu.upNorm); setChk('gu-up-freq', gu.upFreq); setChk('gu-up-pain', gu.upPain); setChk('gu-up-diff', gu.upDiff); setChk('gu-up-incont', gu.upIncont); setChk('gu-up-unable', gu.upUnable);
                        setChk('gu-uc-clear', gu.ucClear); setChk('gu-uc-dark', gu.ucDark); setChk('gu-uc-cloudy', gu.ucCloudy); setChk('gu-uc-red', gu.ucRed); setChk('gu-uc-brown', gu.ucBrown);
                        setChk('gu-uo-norm', gu.uoNorm); setChk('gu-uo-foul', gu.uoFoul); setChk('gu-ua-norm', gu.uaNorm); setChk('gu-ua-dec', gu.uaDec); setChk('gu-ua-exc', gu.uaExc);
                        setChk('gu-pd-none', gu.pdNone); setChk('gu-pd-lower', gu.pdLower); setChk('gu-pd-flank', gu.pdFlank); setChk('gu-pd-burn', gu.pdBurn);
                        setChk('gu-go-norm', gu.goNorm); setChk('gu-go-red', gu.goRed); setChk('gu-go-swell', gu.goSwell); setChk('gu-go-rash', gu.goRash); setChk('gu-go-disch', gu.goDisch);
                        setVal('gu-findings', gu.findings); setVal('gu-intervention', gu.intervention); setVal('gu-docnotes', gu.docnotes);
                    } else { setVal('gu-findings', src.gu || ''); }

                    if (src.mskDetails) {
                        const m = src.mskDetails;
                        setVal('msk-datetime', m.datetime); setVal('msk-grip', m.grip); setVal('msk-jc', m.jc); setVal('msk-ll', m.ll); setVal('msk-pain', m.pain);
                        setChk('msk-of-gait', m.ofGait); setChk('msk-of-deform', m.ofDeform); setChk('msk-of-frac', m.ofFrac); setVal('msk-of-other', m.ofOther);
                        setChk('msk-mt-norm', m.mtNorm); setChk('msk-mt-hypo', m.mtHypo); setChk('msk-mt-hyper', m.mtHyper); setChk('msk-mt-spast', m.mtSpast); setChk('msk-mt-flac', m.mtFlac);
                        setChk('msk-jc-norm', m.jcNorm); setChk('msk-jc-swell', m.jcSwell); setChk('msk-jc-tend', m.jcTend); setChk('msk-jc-red', m.jcRed); setChk('msk-jc-deform', m.jcDeform);
                        setChk('msk-rom-full', m.romFull); setChk('msk-rom-lim', m.romLim); setChk('msk-rom-pain', m.romPain); setChk('msk-rom-stiff', m.romStiff); setChk('msk-rom-cont', m.romCont);
                        setChk('msk-pa-norm', m.paNorm); setChk('msk-pa-poor', m.paPoor); setChk('msk-pa-spine', m.paSpine);
                        setVal('msk-findings', m.findings); setVal('msk-intervention', m.intervention); setVal('msk-docnotes', m.docnotes);
                    } else { setVal('msk-findings', src.msk || ''); }

                    if (src.neuroDetails) {
                        const n = src.neuroDetails;
                        setVal('neuro-datetime', n.datetime);
                        setChk('neuro-loc-alert', n.locAlert); setChk('neuro-loc-drowsy', n.locDrowsy); setChk('neuro-loc-leth', n.locLeth); setChk('neuro-loc-stup', n.locStup); setChk('neuro-loc-coma', n.locComa);
                        setChk('neuro-gcs-e4', n.gcsE4); setChk('neuro-gcs-e3', n.gcsE3); setChk('neuro-gcs-e2', n.gcsE2); setChk('neuro-gcs-e1', n.gcsE1);
                        setChk('neuro-gcs-v5', n.gcsV5); setChk('neuro-gcs-v4', n.gcsV4); setChk('neuro-gcs-v3', n.gcsV3); setChk('neuro-gcs-v2', n.gcsV2); setChk('neuro-gcs-v1', n.gcsV1);
                        setChk('neuro-gcs-m6', n.gcsM6); setChk('neuro-gcs-m5', n.gcsM5); setChk('neuro-gcs-m4', n.gcsM4); setChk('neuro-gcs-m3', n.gcsM3); setChk('neuro-gcs-m2', n.gcsM2); setChk('neuro-gcs-m1', n.gcsM1);
                        setVal('neuro-pa-rsz', n.paRsz); setChk('neuro-pa-rbr', n.paRbr); setChk('neuro-pa-rsl', n.paRsl); setChk('neuro-pa-rnr', n.paRnr);
                        setVal('neuro-pa-lsz', n.paLsz); setChk('neuro-pa-lbr', n.paLbr); setChk('neuro-pa-lsl', n.paLsl); setChk('neuro-pa-lnr', n.paLnr);
                        setChk('neuro-pa-eq', n.paEq); setChk('neuro-pa-uneq', n.paUneq);
                        setChk('neuro-sen-intact', n.senIntact); setChk('neuro-sen-dec', n.senDec); setChk('neuro-sen-abs', n.senAbs);
                        setChk('neuro-or-per', n.orPer); setChk('neuro-or-time', n.orTime); setChk('neuro-or-sit', n.orSit); setChk('neuro-or-place', n.orPlace);
                        setChk('neuro-mf-us', n.mfUs); setChk('neuro-mf-uw', n.mfUw); setChk('neuro-mf-up', n.mfUp);
                        setChk('neuro-mf-ls', n.mfLs); setChk('neuro-mf-lw', n.mfLw); setChk('neuro-mf-lp', n.mfLp);
                        setChk('neuro-gs-rs', n.gsRs); setChk('neuro-gs-rw', n.gsRw); setChk('neuro-gs-ls', n.gsLs); setChk('neuro-gs-lw', n.gsLw);
                        setChk('neuro-ao-seiz', n.aoSeiz); setChk('neuro-ao-head', n.aoHead); setChk('neuro-ao-diz', n.aoDiz); setChk('neuro-ao-nv', n.aoNv);
                        setVal('neuro-findings', n.findings); setVal('neuro-intervention', n.intervention); setVal('neuro-docnotes', n.docnotes);
                    } else { setVal('neuro-findings', src.neuro || ''); }

                    if (src.psychDetails) {
                        const p = src.psychDetails;
                        setVal('psy-metric1', p.metric1); setVal('psy-metric2', p.metric2); setVal('psy-metric3', p.metric3);
                        setChk('psy-app-well', p.appWell); setChk('psy-app-dish', p.appDish); setChk('psy-app-poor', p.appPoor); setChk('psy-app-appr', p.appAppr); setChk('psy-app-inapp', p.appInapp);
                        setChk('psy-beh-calm', p.behCalm); setChk('psy-beh-coop', p.behCoop); setChk('psy-beh-rest', p.behRest); setChk('psy-beh-agit', p.behAgit); setChk('psy-beh-with', p.behWith); setChk('psy-beh-aggr', p.behAggr);
                        setChk('psy-mood-happ', p.moodHapp); setChk('psy-mood-sad', p.moodSad); setChk('psy-mood-anx', p.moodAnx); setChk('psy-mood-irri', p.moodIrri); setChk('psy-mood-depr', p.moodDepr); setChk('psy-mood-euph', p.moodEuph);
                        setChk('psy-aff-appr', p.affAppr); setChk('psy-aff-flat', p.affFlat); setChk('psy-aff-blun', p.affBlun); setChk('psy-aff-labi', p.affLabi); setChk('psy-aff-rest', p.affRest);
                        setChk('psy-spe-clear', p.speClear); setChk('psy-spe-slow', p.speSlow); setChk('psy-spe-rapid', p.speRapid); setChk('psy-spe-slur', p.speSlur); setChk('psy-spe-loud', p.speLoud); setChk('psy-spe-soft', p.speSoft);
                        setChk('psy-tp-logi', p.tpLogi); setChk('psy-tp-diso', p.tpDiso); setChk('psy-tp-flig', p.tpFlig); setChk('psy-tp-circ', p.tpCirc); setChk('psy-tp-tang', p.tpTang);
                        setChk('psy-tc-norm', p.tcNorm); setChk('psy-tc-delu', p.tcDelu); setChk('psy-tc-para', p.tcPara); setChk('psy-tc-obse', p.tcObse); setChk('psy-tc-suic', p.tcSuic);
                        setChk('psy-per-none', p.perNone); setChk('psy-per-audi', p.perAudi); setChk('psy-per-visu', p.perVisu); setChk('psy-per-tact', p.perTact);
                        setChk('psy-ins-good', p.insGood); setChk('psy-ins-part', p.insPart); setChk('psy-ins-no', p.insNo);
                        setChk('psy-mem-inta', p.memInta); setChk('psy-mem-mild', p.memMild); setChk('psy-mem-mode', p.memMode); setChk('psy-mem-seve', p.memSeve);
                        setChk('psy-ori-pers', p.oriPers); setChk('psy-ori-plac', p.oriPlac); setChk('psy-ori-time', p.oriTime); setChk('psy-ori-diso', p.oriDiso);
                        setChk('psy-jud-good', p.judGood); setChk('psy-jud-fair', p.judFair); setChk('psy-jud-poor', p.judPoor);
                        setVal('psy-findings', p.findings); setVal('psy-intervention', p.intervention); setVal('psy-datetime', p.datetime); setVal('psy-docnotes', p.docnotes);
                    }
                }
            }

            const setBtnText = (id, hasData) => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = hasData ? '✏️ Edit' : '✏️ Edit';
            };
            setBtnText('edit-vital-signs', result.data && result.data.vitals && result.data.vitals.length > 0);
            setBtnText('edit-intake-output', result.data && ((result.data.intake && result.data.intake.length > 0) || (result.data.output && result.data.output.length > 0)));
            setBtnText('edit-head-to-toe', result.data && result.data.headToToe && Object.values(result.data.headToToe).some(val => val.trim() !== ''));
            setBtnText('edit-systems', result.data && ((result.data.systems && Object.values(result.data.systems).some(val => val.trim() !== '')) || (result.data.headToToe && (result.data.headToToe.resp || result.data.headToToe.cardio || result.data.headToToe.gi || result.data.headToToe.gu || result.data.headToToe.msk || result.data.headToToe.neuro))));

        } catch (e) {
            console.error("Could not fetch flowsheet data", e);
        } finally {
            if (vitalsModule) vitalsModule(false);
            if (intakeOutputModule) intakeOutputModule(false);
            if (headToToeModule) headToToeModule(false);
            if (systemsModule) systemsModule(false);
        }
    };

    loadFlowsheet();

    // --- SAVE LOGIC ---
    const saveToServer = async (payloadSubset, btnElement, toggleModuleBack) => {
        if (!activePatientId) return;
        const originalText = btnElement.textContent;
        btnElement.textContent = "Saving...";
        try {
            const response = await fetch(`${window.API_BASE}/flowsheet`, {
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
                alert("Flowsheet data saved successfully!");
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

    document.getElementById('save-vital-signs')?.addEventListener('click', (e) => {
        const vitals = [];
        vitalsList.querySelectorAll('.dynamic-row').forEach(row => {
            vitals.push({
                time: row.querySelector('.v-time').value,
                temp: row.querySelector('.v-temp').value,
                bp: row.querySelector('.v-bp').value,
                hr: row.querySelector('.v-hr').value,
                rr: row.querySelector('.v-rr').value,
                spo2: row.querySelector('.v-spo2').value,
                pain: row.querySelector('.v-pain').value
            });
        });
        saveToServer({ vitals }, e.target, vitalsModule);
    });

    document.getElementById('save-intake-output')?.addEventListener('click', (e) => {
        const intake = [];
        intakeList.querySelectorAll('.dynamic-row').forEach(row => {
            intake.push({
                time: row.querySelector('.io-time').value,
                type: row.querySelector('.io-type').value,
                desc: row.querySelector('.io-desc').value,
                amt: row.querySelector('.io-amt').value
            });
        });

        const output = [];
        outputList.querySelectorAll('.dynamic-row').forEach(row => {
            output.push({
                time: row.querySelector('.io-time').value,
                type: row.querySelector('.io-type').value,
                desc: row.querySelector('.io-desc').value,
                amt: row.querySelector('.io-amt').value
            });
        });
        saveToServer({ intake, output }, e.target, intakeOutputModule);
    });

    document.getElementById('save-head-to-toe')?.addEventListener('click', (e) => {
        const headToToe = {
            generalApp: document.getElementById('htt-generalApp')?.value || '',
            loc: document.getElementById('htt-loc')?.value || '',
            behavior: document.getElementById('htt-behavior')?.value || '',
            distress: document.getElementById('htt-distress')?.value || '',
            
            skinColor: document.getElementById('htt-skinColor')?.value || '',
            skinTurgor: document.getElementById('htt-skinTurgor')?.value || '',
            skinIntegrity: document.getElementById('htt-skinIntegrity')?.value || '',
            wounds: document.getElementById('htt-wounds')?.value || '',
            hair: document.getElementById('htt-hair')?.value || '',
            nails: document.getElementById('htt-nails')?.value || '',
            
            earCanal: document.getElementById('htt-earCanal')?.value || '',
            hearing: document.getElementById('htt-hearing')?.value || '',
            earDischarge: document.getElementById('htt-earDischarge')?.value || '',
            
            lymphNodes: document.getElementById('htt-lymphNodes')?.value || '',
            jvd: document.getElementById('htt-jvd')?.value || '',
            thyroid: document.getElementById('htt-thyroid')?.value || '',
            rom: document.getElementById('htt-rom')?.value || '',
            
            lips: document.getElementById('htt-lips')?.value || '',
            teeth: document.getElementById('htt-teeth')?.value || '',
            tongue: document.getElementById('htt-tongue')?.value || '',
            throat: document.getElementById('htt-throat')?.value || ''
        };
        saveToServer({ headToToe }, e.target, headToToeModule);
    });

    document.getElementById('save-systems')?.addEventListener('click', (e) => {
        const getVal = id => document.getElementById(id)?.value || '';
        const getChk = id => document.getElementById(id)?.checked || false;
        
        const systems = {
            respDetails: {
                bpNorm: getChk('resp-bp-norm'), bpRapid: getChk('resp-bp-rapid'), bpSlow: getChk('resp-bp-slow'), bpIrreg: getChk('resp-bp-irreg'), bpLabor: getChk('resp-bp-labor'),
                bsClear: getChk('resp-bs-clear'), bsWheeze: getChk('resp-bs-wheeze'), bsCrack: getChk('resp-bs-crack'), bsDim: getChk('resp-bs-dim'), bsStridor: getChk('resp-bs-stridor'),
                findings: getVal('resp-findings'), datetime: getVal('resp-datetime'),
                cNone: getChk('resp-c-none'), cDry: getChk('resp-c-dry'), cProd: getChk('resp-c-prod'), cFreq: getChk('resp-c-freq'),
                cmSym: getChk('resp-cm-sym'), cmUnequal: getChk('resp-cm-unequal'), cmRetract: getChk('resp-cm-retract'),
                intervention: getVal('resp-intervention'),
                rr: getVal('resp-rr'), spo2: getVal('resp-spo2'), hr: getVal('resp-hr'),
                ofFever: getChk('resp-of-fever'), ofSob: getChk('resp-of-sob'), ofCp: getChk('resp-of-cp'), ofOther: getVal('resp-of-other'),
                docnotes: getVal('resp-docnotes')
            },
            cardioDetails: {
                datetime: getVal('cardio-datetime'), temp: getVal('cardio-temp'), weight: getVal('cardio-weight'), bp: getVal('cardio-bp'), pain: getVal('cardio-pain'),
                ofGen: getChk('cardio-of-gen'), ofLife: getChk('cardio-of-life'), ofPmh: getChk('cardio-of-pmh'), ofOther: getVal('cardio-of-other'),
                rReg: getChk('cardio-r-reg'), rIrreg: getChk('cardio-r-irreg'),
                hrNorm: getChk('cardio-hr-norm'), hrBrady: getChk('cardio-hr-brady'), hrTachy: getChk('cardio-hr-tachy'), hrArryth: getChk('cardio-hr-arryth'),
                hsNorm: getChk('cardio-hs-norm'), hsMurmur: getChk('cardio-hs-murmur'), hsAbnorm: getChk('cardio-hs-abnorm'),
                p0: getChk('cardio-p-0'), p1: getChk('cardio-p-1'), p2: getChk('cardio-p-2'), p3: getChk('cardio-p-3'), p4: getChk('cardio-p-4'),
                crtNorm: getChk('cardio-crt-norm'), crtAbnorm: getChk('cardio-crt-abnorm'),
                findings: getVal('cardio-findings'), intervention: getVal('cardio-intervention'), docnotes: getVal('cardio-docnotes')
            },
            giDetails: {
                datetime: getVal('gi-datetime'), pain: getVal('gi-pain'), girth: getVal('gi-girth'), lbm: getVal('gi-lbm'), loi: getVal('gi-loi'),
                ofNonv: getChk('gi-of-nonv'), ofAppetite: getChk('gi-of-appetite'), ofStool: getChk('gi-of-stool'), ofNodc: getChk('gi-of-nodc'), ofOther: getVal('gi-of-other'),
                iFlat: getChk('gi-i-flat'), iRound: getChk('gi-i-round'), iDist: getChk('gi-i-dist'), iScaph: getChk('gi-i-scaph'), iSym: getChk('gi-i-sym'), iNoscars: getChk('gi-i-noscars'), iNoperi: getChk('gi-i-noperi'), iSkin: getChk('gi-i-skin'),
                aNorm: getChk('gi-a-norm'), aHyper: getChk('gi-a-hyper'), aHypo: getChk('gi-a-hypo'), aAbsent: getChk('gi-a-absent'), aNobruit: getChk('gi-a-nobruit'),
                peTymp: getChk('gi-pe-tymp'), peLiv: getChk('gi-pe-liv'), peNoshift: getChk('gi-pe-noshift'),
                paSoft: getChk('gi-pa-soft'), paNomass: getChk('gi-pa-nomass'), paNoguard: getChk('gi-pa-noguard'), paNoreb: getChk('gi-pa-noreb'),
                findings: getVal('gi-findings'), intervention: getVal('gi-intervention'), docnotes: getVal('gi-docnotes')
            },
            guDetails: {
                datetime: getVal('gu-datetime'), output: getVal('gu-output'), intake: getVal('gu-intake'), sg: getVal('gu-sg'),
                osFever: getChk('gu-os-fever'), osNausea: getChk('gu-os-nausea'), osBed: getChk('gu-os-bed'), osItch: getChk('gu-os-itch'), osOther: getVal('gu-os-other'),
                upNorm: getChk('gu-up-norm'), upFreq: getChk('gu-up-freq'), upPain: getChk('gu-up-pain'), upDiff: getChk('gu-up-diff'), upIncont: getChk('gu-up-incont'), upUnable: getChk('gu-up-unable'),
                ucClear: getChk('gu-uc-clear'), ucDark: getChk('gu-uc-dark'), ucCloudy: getChk('gu-uc-cloudy'), ucRed: getChk('gu-uc-red'), ucBrown: getChk('gu-uc-brown'),
                uoNorm: getChk('gu-uo-norm'), uoFoul: getChk('gu-uo-foul'), uaNorm: getChk('gu-ua-norm'), uaDec: getChk('gu-ua-dec'), uaExc: getChk('gu-ua-exc'),
                pdNone: getChk('gu-pd-none'), pdLower: getChk('gu-pd-lower'), pdFlank: getChk('gu-pd-flank'), pdBurn: getChk('gu-pd-burn'),
                goNorm: getChk('gu-go-norm'), goRed: getChk('gu-go-red'), goSwell: getChk('gu-go-swell'), goRash: getChk('gu-go-rash'), goDisch: getChk('gu-go-disch'),
                findings: getVal('gu-findings'), intervention: getVal('gu-intervention'), docnotes: getVal('gu-docnotes')
            },
            mskDetails: {
                datetime: getVal('msk-datetime'), grip: getVal('msk-grip'), jc: getVal('msk-jc'), ll: getVal('msk-ll'), pain: getVal('msk-pain'),
                ofGait: getChk('msk-of-gait'), ofDeform: getChk('msk-of-deform'), ofFrac: getChk('msk-of-frac'), ofOther: getVal('msk-of-other'),
                mtNorm: getChk('msk-mt-norm'), mtHypo: getChk('msk-mt-hypo'), mtHyper: getChk('msk-mt-hyper'), mtSpast: getChk('msk-mt-spast'), mtFlac: getChk('msk-mt-flac'),
                jcNorm: getChk('msk-jc-norm'), jcSwell: getChk('msk-jc-swell'), jcTend: getChk('msk-jc-tend'), jcRed: getChk('msk-jc-red'), jcDeform: getChk('msk-jc-deform'),
                romFull: getChk('msk-rom-full'), romLim: getChk('msk-rom-lim'), romPain: getChk('msk-rom-pain'), romStiff: getChk('msk-rom-stiff'), romCont: getChk('msk-rom-cont'),
                paNorm: getChk('msk-pa-norm'), paPoor: getChk('msk-pa-poor'), paSpine: getChk('msk-pa-spine'),
                findings: getVal('msk-findings'), intervention: getVal('msk-intervention'), docnotes: getVal('msk-docnotes')
            },
            neuroDetails: {
                datetime: getVal('neuro-datetime'),
                locAlert: getChk('neuro-loc-alert'), locDrowsy: getChk('neuro-loc-drowsy'), locLeth: getChk('neuro-loc-leth'), locStup: getChk('neuro-loc-stup'), locComa: getChk('neuro-loc-coma'),
                gcsE4: getChk('neuro-gcs-e4'), gcsE3: getChk('neuro-gcs-e3'), gcsE2: getChk('neuro-gcs-e2'), gcsE1: getChk('neuro-gcs-e1'),
                gcsV5: getChk('neuro-gcs-v5'), gcsV4: getChk('neuro-gcs-v4'), gcsV3: getChk('neuro-gcs-v3'), gcsV2: getChk('neuro-gcs-v2'), gcsV1: getChk('neuro-gcs-v1'),
                gcsM6: getChk('neuro-gcs-m6'), gcsM5: getChk('neuro-gcs-m5'), gcsM4: getChk('neuro-gcs-m4'), gcsM3: getChk('neuro-gcs-m3'), gcsM2: getChk('neuro-gcs-m2'), gcsM1: getChk('neuro-gcs-m1'),
                paRsz: getVal('neuro-pa-rsz'), paRbr: getChk('neuro-pa-rbr'), paRsl: getChk('neuro-pa-rsl'), paRnr: getChk('neuro-pa-rnr'),
                paLsz: getVal('neuro-pa-lsz'), paLbr: getChk('neuro-pa-lbr'), paLsl: getChk('neuro-pa-lsl'), paLnr: getChk('neuro-pa-lnr'),
                paEq: getChk('neuro-pa-eq'), paUneq: getChk('neuro-pa-uneq'),
                senIntact: getChk('neuro-sen-intact'), senDec: getChk('neuro-sen-dec'), senAbs: getChk('neuro-sen-abs'),
                orPer: getChk('neuro-or-per'), orTime: getChk('neuro-or-time'), orSit: getChk('neuro-or-sit'), orPlace: getChk('neuro-or-place'),
                mfUs: getChk('neuro-mf-us'), mfUw: getChk('neuro-mf-uw'), mfUp: getChk('neuro-mf-up'),
                mfLs: getChk('neuro-mf-ls'), mfLw: getChk('neuro-mf-lw'), mfLp: getChk('neuro-mf-lp'),
                gsRs: getChk('neuro-gs-rs'), gsRw: getChk('neuro-gs-rw'), gsLs: getChk('neuro-gs-ls'), gsLw: getChk('neuro-gs-lw'),
                aoSeiz: getChk('neuro-ao-seiz'), aoHead: getChk('neuro-ao-head'), aoDiz: getChk('neuro-ao-diz'), aoNv: getChk('neuro-ao-nv'),
                findings: getVal('neuro-findings'), intervention: getVal('neuro-intervention'), docnotes: getVal('neuro-docnotes')
            },
            psychDetails: {
                metric1: getVal('psy-metric1'), metric2: getVal('psy-metric2'), metric3: getVal('psy-metric3'),
                appWell: getChk('psy-app-well'), appDish: getChk('psy-app-dish'), appPoor: getChk('psy-app-poor'), appAppr: getChk('psy-app-appr'), appInapp: getChk('psy-app-inapp'),
                behCalm: getChk('psy-beh-calm'), behCoop: getChk('psy-beh-coop'), behRest: getChk('psy-beh-rest'), behAgit: getChk('psy-beh-agit'), behWith: getChk('psy-beh-with'), behAggr: getChk('psy-beh-aggr'),
                moodHapp: getChk('psy-mood-happ'), moodSad: getChk('psy-mood-sad'), moodAnx: getChk('psy-mood-anx'), moodIrri: getChk('psy-mood-irri'), moodDepr: getChk('psy-mood-depr'), moodEuph: getChk('psy-mood-euph'),
                affAppr: getChk('psy-aff-appr'), affFlat: getChk('psy-aff-flat'), affBlun: getChk('psy-aff-blun'), affLabi: getChk('psy-aff-labi'), affRest: getChk('psy-aff-rest'),
                speClear: getChk('psy-spe-clear'), speSlow: getChk('psy-spe-slow'), speRapid: getChk('psy-spe-rapid'), speSlur: getChk('psy-spe-slur'), speLoud: getChk('psy-spe-loud'), speSoft: getChk('psy-spe-soft'),
                tpLogi: getChk('psy-tp-logi'), tpDiso: getChk('psy-tp-diso'), tpFlig: getChk('psy-tp-flig'), tpCirc: getChk('psy-tp-circ'), tpTang: getChk('psy-tp-tang'),
                tcNorm: getChk('psy-tc-norm'), tcDelu: getChk('psy-tc-delu'), tcPara: getChk('psy-tc-para'), tcObse: getChk('psy-tc-obse'), tcSuic: getChk('psy-tc-suic'),
                perNone: getChk('psy-per-none'), perAudi: getChk('psy-per-audi'), perVisu: getChk('psy-per-visu'), perTact: getChk('psy-per-tact'),
                insGood: getChk('psy-ins-good'), insPart: getChk('psy-ins-part'), insNo: getChk('psy-ins-no'),
                memInta: getChk('psy-mem-inta'), memMild: getChk('psy-mem-mild'), memMode: getChk('psy-mem-mode'), memSeve: getChk('psy-mem-seve'),
                oriPers: getChk('psy-ori-pers'), oriPlac: getChk('psy-ori-plac'), oriTime: getChk('psy-ori-time'), oriDiso: getChk('psy-ori-diso'),
                judGood: getChk('psy-jud-good'), judFair: getChk('psy-jud-fair'), judPoor: getChk('psy-jud-poor'),
                findings: getVal('psy-findings'), intervention: getVal('psy-intervention'), datetime: getVal('psy-datetime'), docnotes: getVal('psy-docnotes')
            }
        };
        saveToServer({ systems }, e.target, systemsModule);
    });

});
