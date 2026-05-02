const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

const isVercel = process.env.VERCEL === '1';
const getDataFilePath = (filename) => {
    if (isVercel) {
        const tmpPath = path.join('/tmp', filename);
        if (!fs.existsSync(tmpPath)) {
            const srcPath = path.join(__dirname, filename);
            if (fs.existsSync(srcPath)) {
                fs.copyFileSync(srcPath, tmpPath);
            } else {
                fs.writeFileSync(tmpPath, filename.endsWith('.json') ? "{}" : "");
            }
        }
        return tmpPath;
    }
    return path.join(__dirname, filename);
};

const CSV_FILE = getDataFilePath('users.csv');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

if (!isVercel) {
    app.use(express.static(path.join(__dirname, '..', 'public')));
}

// Ensure users CSV exists with header
if (!fs.existsSync(CSV_FILE)) {
    fs.writeFileSync(CSV_FILE, "Login ID,Password\n");
}

app.post('/api', (req, res) => {
    const { action, loginId, password } = req.body;

    if (!loginId || !password) {
        return res.status(400).json({ success: false, message: 'Please fill all fields' });
    }

    const fileContent = fs.readFileSync(CSV_FILE, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    
    // Parse existing users
    const users = lines.slice(1).map(line => {
        const [id, pwd] = line.split(',');
        return { id, pwd };
    });

    if (action === 'signup') {
        const userExists = users.some(u => u.id === loginId);
        
        if (userExists) {
            return res.json({ success: false, message: 'User already exists' });
        }
        
        const newLine = `${loginId},${password}\n`;
        fs.appendFileSync(CSV_FILE, newLine);
        return res.json({ success: true, message: 'Signup successful! Please login.' });

    } else if (action === 'login') {
        const validUser = users.find(u => u.id === loginId && u.pwd === password);
        
        if (validUser) {
            return res.json({ success: true, message: 'Login successful!' });
        } else {
            return res.json({ success: false, message: 'Invalid login ID or password' });
        }
    }

    return res.status(400).json({ success: false, message: 'Invalid action' });
});

// Endpoint for storing patient data
const PATIENT_CSV_FILE = getDataFilePath('patient.csv');
const PATIENT_HEADERS = "ID,First Name,Last Name,Middle Name,Date of Birth,Sex,Civil Status,Nationality,Religion,Address,Phone,Emergency Contact,Emergency Phone,Blood Type,Height,Weight,BMI,Admission Date,Ward,Attending Physician,Insurance Provider,Insurance ID\n";

// Ensure patient CSV exists with expanded headers
if (!fs.existsSync(PATIENT_CSV_FILE)) {
    fs.writeFileSync(PATIENT_CSV_FILE, PATIENT_HEADERS);
} else {
    // Check if old header format, and replace if necessary for tests
    const content = fs.readFileSync(PATIENT_CSV_FILE, 'utf-8');
    if (!content.startsWith("ID,First Name")) {
        fs.writeFileSync(PATIENT_CSV_FILE, PATIENT_HEADERS); // Overwrite to guarantee scheme matches requirements
    }
}

app.get('/api/patients', (req, res) => {
    const fileContent = fs.readFileSync(PATIENT_CSV_FILE, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    
    // Convert to JSON
    const headers = lines[0].split(',');
    const patients = lines.slice(1).map(line => {
        // Split by comma ignoring commas inside quotes
        const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        let obj = {};
        headers.forEach((header, i) => {
            let val = values[i] || '';
            if (val.startsWith('"') && val.endsWith('"')) { val = val.slice(1, -1); }
            obj[header.trim()] = val.trim();
        });
        return obj;
    });

    res.json({ success: true, count: patients.length, data: patients });
});

app.post('/api/patient', (req, res) => {
    // Generate an ID based on count
    const fileContent = fs.readFileSync(PATIENT_CSV_FILE, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    const currentCount = lines.length - 1;
    const generatedId = `PID-${1000 + currentCount + 1}`;
    const { 
        id, firstName, lastName, middleName, dateOfBirth, sex, civilStatus, nationality, religion,
        address, phone, emergencyContact, emergencyPhone,
        bloodType, height, weight, bmi, admissionDate, ward, attendingPhysician, insuranceProvider, insuranceId
    } = req.body;

    // Safety checks
    if (!firstName || !lastName) {
        return res.status(400).json({ success: false, message: 'First Name and Last Name are required' });
    }

    const targetId = id ? id : generatedId;

    const payloadOrdered = [
        targetId, firstName, lastName, middleName, dateOfBirth, sex, civilStatus, nationality, religion,
        address, phone, emergencyContact, emergencyPhone,
        bloodType, height, weight, bmi, admissionDate, ward, attendingPhysician, insuranceProvider, insuranceId
    ];

    // Escape commas implicitly
    const escapeCSV = (str) => {
        if (!str && str !== 0) return '';
        const rawStr = String(str);
        if (rawStr.includes(',')) { return `"${rawStr}"`; }
        return rawStr;
    };

    const newLine = payloadOrdered.map(escapeCSV).join(',');

    if (id) {
        // Make sure to preserve header
        let updatedLines = lines.map(line => {
            const rowArr = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
            if (rowArr[0] === id) {
                return newLine;
            }
            return line;
        });
        fs.writeFileSync(PATIENT_CSV_FILE, updatedLines.join('\n') + '\n');
        return res.json({ success: true, message: 'Patient Data Updated Successfully!' });
    } else {
        fs.appendFileSync(PATIENT_CSV_FILE, newLine + '\n');
        return res.json({ success: true, message: 'Patient Data Saved Successfully!' });
    }
});

// Endpoint for medical history data
const MEDICAL_HISTORY_FILE = getDataFilePath('medical_history.json');

// Ensure medical history exists
if (!fs.existsSync(MEDICAL_HISTORY_FILE)) {
    fs.writeFileSync(MEDICAL_HISTORY_FILE, JSON.stringify({}));
}

app.get('/api/medical-history/:id', (req, res) => {
    const { id } = req.params;
    try {
        const content = fs.readFileSync(MEDICAL_HISTORY_FILE, 'utf-8');
        const data = content ? JSON.parse(content) : {};
        if (data[id]) {
            return res.json({ success: true, data: data[id] });
        } else {
            return res.json({ success: true, data: null });
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Server read error' });
    }
});

app.post('/api/medical-history', (req, res) => {
    const { id, payload } = req.body;
    if (!id || !payload) {
        return res.status(400).json({ success: false, message: 'Patient ID and payload required' });
    }
    try {
        const content = fs.readFileSync(MEDICAL_HISTORY_FILE, 'utf-8');
        const data = content ? JSON.parse(content) : {};
        // Merge or overwrite
        data[id] = { ...data[id], ...payload };
        fs.writeFileSync(MEDICAL_HISTORY_FILE, JSON.stringify(data, null, 2));
        return res.json({ success: true, message: 'Saved successfully!' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Server write error' });
    }
});

// Endpoint for flowsheet data
const FLOWSHEET_FILE = getDataFilePath('flowsheet.json');

if (!fs.existsSync(FLOWSHEET_FILE)) {
    fs.writeFileSync(FLOWSHEET_FILE, JSON.stringify({}));
}

app.get('/api/flowsheet/:id', (req, res) => {
    const { id } = req.params;
    try {
        const content = fs.readFileSync(FLOWSHEET_FILE, 'utf-8');
        const data = content ? JSON.parse(content) : {};
        if (data[id]) {
            return res.json({ success: true, data: data[id] });
        } else {
            return res.json({ success: true, data: null });
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Server read error' });
    }
});

app.post('/api/flowsheet', (req, res) => {
    const { id, payload } = req.body;
    if (!id || !payload) {
        return res.status(400).json({ success: false, message: 'Patient ID and payload required' });
    }
    try {
        const content = fs.readFileSync(FLOWSHEET_FILE, 'utf-8');
        const data = content ? JSON.parse(content) : {};
        data[id] = { ...data[id], ...payload };
        fs.writeFileSync(FLOWSHEET_FILE, JSON.stringify(data, null, 2));
        return res.json({ success: true, message: 'Saved successfully!' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Server write error' });
    }
});

// Endpoint for results data
const RESULTS_FILE = getDataFilePath('results.json');

if (!fs.existsSync(RESULTS_FILE)) {
    fs.writeFileSync(RESULTS_FILE, JSON.stringify({}));
}

app.get('/api/results/:id', (req, res) => {
    const { id } = req.params;
    try {
        const content = fs.readFileSync(RESULTS_FILE, 'utf-8');
        const data = content ? JSON.parse(content) : {};
        if (data[id]) {
            return res.json({ success: true, data: data[id] });
        } else {
            return res.json({ success: true, data: null });
        }
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Server read error' });
    }
});

app.post('/api/results', (req, res) => {
    const { id, payload } = req.body;
    if (!id || !payload) {
        return res.status(400).json({ success: false, message: 'Patient ID and payload required' });
    }
    try {
        const content = fs.readFileSync(RESULTS_FILE, 'utf-8');
        const data = content ? JSON.parse(content) : {};
        data[id] = { ...data[id], ...payload };
        fs.writeFileSync(RESULTS_FILE, JSON.stringify(data, null, 2));
        return res.json({ success: true, message: 'Saved successfully!' });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: 'Server write error' });
    }
});

// Endpoint for MAR data
const MAR_FILE = getDataFilePath('mar.json');
if (!fs.existsSync(MAR_FILE)) fs.writeFileSync(MAR_FILE, JSON.stringify({}));

app.get('/api/mar/:id', (req, res) => {
    const { id } = req.params;
    try {
        const data = JSON.parse(fs.readFileSync(MAR_FILE, 'utf-8') || '{}');
        return res.json({ success: true, data: data[id] || null });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Server read error' });
    }
});

app.post('/api/mar', (req, res) => {
    const { id, payload } = req.body;
    try {
        const data = JSON.parse(fs.readFileSync(MAR_FILE, 'utf-8') || '{}');
        data[id] = { ...data[id], ...payload };
        fs.writeFileSync(MAR_FILE, JSON.stringify(data, null, 2));
        return res.json({ success: true, message: 'Saved successfully!' });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Server write error' });
    }
});

// Endpoint for Care Plan data
const CAREPLAN_FILE = getDataFilePath('careplan.json');
if (!fs.existsSync(CAREPLAN_FILE)) fs.writeFileSync(CAREPLAN_FILE, JSON.stringify({}));

app.get('/api/careplan/:id', (req, res) => {
    const { id } = req.params;
    try {
        const data = JSON.parse(fs.readFileSync(CAREPLAN_FILE, 'utf-8') || '{}');
        return res.json({ success: true, data: data[id] || null });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Server read error' });
    }
});

app.post('/api/careplan', (req, res) => {
    const { id, payload } = req.body;
    try {
        const data = JSON.parse(fs.readFileSync(CAREPLAN_FILE, 'utf-8') || '{}');
        data[id] = { ...data[id], ...payload };
        fs.writeFileSync(CAREPLAN_FILE, JSON.stringify(data, null, 2));
        return res.json({ success: true, message: 'Saved successfully!' });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Server write error' });
    }
});

// Endpoint for Navigator data
const NAVIGATOR_FILE = getDataFilePath('navigator.json');
if (!fs.existsSync(NAVIGATOR_FILE)) fs.writeFileSync(NAVIGATOR_FILE, JSON.stringify({}));

app.get('/api/navigator/:id', (req, res) => {
    const { id } = req.params;
    try {
        const data = JSON.parse(fs.readFileSync(NAVIGATOR_FILE, 'utf-8') || '{}');
        return res.json({ success: true, data: data[id] || null });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Server read error' });
    }
});

app.post('/api/navigator', (req, res) => {
    const { id, payload } = req.body;
    try {
        const data = JSON.parse(fs.readFileSync(NAVIGATOR_FILE, 'utf-8') || '{}');
        data[id] = { ...data[id], ...payload };
        fs.writeFileSync(NAVIGATOR_FILE, JSON.stringify(data, null, 2));
        return res.json({ success: true, message: 'Saved successfully!' });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Server write error' });
    }
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Node Server API running on http://localhost:${PORT}`);
    });
}

module.exports = app;
