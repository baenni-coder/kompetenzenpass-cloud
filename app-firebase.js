// Firebase Module importieren
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

import { 
    doc, 
    setDoc, 
    getDoc, 
    getDocs,
    collection, 
    query, 
    where, 
    onSnapshot,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    orderBy,
    limit
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ============= GLOBALE VARIABLEN =============
let currentUser = null;
let userRole = null; // 'student' oder 'teacher'
let competencies = [];
let unsubscribeListeners = [];

// ============= INITIALISIERUNG =============
window.addEventListener('DOMContentLoaded', () => {
    // Auth State Observer
    onAuthStateChanged(window.auth, async (user) => {
        if (user) {
            currentUser = user;
            await loadUserData();
        } else {
            currentUser = null;
            userRole = null;
            showLoginArea();
        }
    });
    
    // Kompetenzen laden
    loadCompetencies();
});

// ============= AUTHENTIFIZIERUNG =============

// Schüler Login
window.loginStudent = async function() {
    const email = document.getElementById('studentEmail').value;
    const password = document.getElementById('studentPassword').value;
    
    if (!email || !password) {
        showNotification('Bitte alle Felder ausfüllen!', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const userCredential = await signInWithEmailAndPassword(window.auth, email, password);
        showNotification('Erfolgreich eingeloggt!', 'success');
    } catch (error) {
        handleAuthError(error);
    } finally {
        showLoading(false);
    }
};

// Schüler Registrierung
window.registerStudent = async function() {
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const className = document.getElementById('registerClass').value;
    
    if (!name || !email || !password || !className) {
        showNotification('Bitte alle Felder ausfüllen!', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Passwort muss mindestens 6 Zeichen lang sein!', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        // Benutzer erstellen
        const userCredential = await createUserWithEmailAndPassword(window.auth, email, password);
        const user = userCredential.user;
        
        // Benutzerdaten in Firestore speichern
        await setDoc(doc(window.db, 'users', user.uid), {
            name: name,
            email: email,
            role: 'student',
            class: className,
            createdAt: serverTimestamp(),
            lastActive: serverTimestamp()
        });
        
        // Leeren Fortschritt anlegen
        await setDoc(doc(window.db, 'progress', user.uid), {
            ratings: {},
            lastUpdated: serverTimestamp()
        });
        
        showNotification('Registrierung erfolgreich! Du bist jetzt eingeloggt.', 'success');
    } catch (error) {
        handleAuthError(error);
    } finally {
        showLoading(false);
    }
};

// Lehrer Login
window.loginTeacher = async function() {
    const email = document.getElementById('teacherEmail').value;
    const password = document.getElementById('teacherPassword').value;
    
    if (!email || !password) {
        showNotification('Bitte alle Felder ausfüllen!', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const userCredential = await signInWithEmailAndPassword(window.auth, email, password);
        const user = userCredential.user;
        
        // Prüfen ob Benutzer Lehrer ist
        const userDoc = await getDoc(doc(window.db, 'users', user.uid));
        const userData = userDoc.data();
        
        if (userData.role !== 'teacher') {
            await signOut(window.auth);
            showNotification('Kein Lehrer-Account! Bitte als Schüler einloggen.', 'error');
            return;
        }
        
        showNotification('Willkommen im Lehrer-Dashboard!', 'success');
    } catch (error) {
        handleAuthError(error);
    } finally {
        showLoading(false);
    }
};

// Ausloggen
window.logoutUser = async function() {
    if (confirm('Möchtest du dich wirklich ausloggen?')) {
        showLoading(true);
        
        // Alle Listener abmelden
        unsubscribeListeners.forEach(unsubscribe => unsubscribe());
        unsubscribeListeners = [];
        
        try {
            await signOut(window.auth);
            showNotification('Erfolgreich ausgeloggt!', 'success');
        } catch (error) {
            showNotification('Fehler beim Ausloggen!', 'error');
        } finally {
            showLoading(false);
        }
    }
};

// ============= BENUTZERDATEN LADEN =============
async function loadUserData() {
    if (!currentUser) return;
    
    try {
        const userDoc = await getDoc(doc(window.db, 'users', currentUser.uid));
        
        if (!userDoc.exists()) {
            console.error('Benutzerdaten nicht gefunden!');
            await signOut(window.auth);
            return;
        }
        
        const userData = userDoc.data();
        userRole = userData.role;
        
        // Letzten Zugriff aktualisieren
        await updateDoc(doc(window.db, 'users', currentUser.uid), {
            lastActive: serverTimestamp()
        });
        
        // Je nach Rolle unterschiedliche Ansicht laden
        if (userRole === 'teacher') {
            showTeacherDashboard(userData);
        } else {
            showStudentArea(userData);
        }
    } catch (error) {
        console.error('Fehler beim Laden der Benutzerdaten:', error);
        showNotification('Fehler beim Laden der Daten!', 'error');
    }
}

// ============= KOMPETENZEN MANAGEMENT =============
async function loadCompetencies() {
    try {
        const querySnapshot = await getDocs(collection(window.db, 'competencies'));
        
        if (querySnapshot.empty) {
            // Wenn keine Kompetenzen existieren, Standard-Kompetenzen erstellen
            await createDefaultCompetencies();
            await loadCompetencies(); // Neu laden
            return;
        }
        
        competencies = [];
        querySnapshot.forEach((doc) => {
            competencies.push({ id: doc.id, ...doc.data() });
        });
        
        competencies.sort((a, b) => a.order - b.order);
    } catch (error) {
        console.error('Fehler beim Laden der Kompetenzen:', error);
    }
}

// Manuell Standard-Kompetenzen erstellen (für Debugging)
window.createDefaultCompetenciesManually = async function() {
    if (userRole !== 'teacher') {
        showNotification('Nur Lehrer können Kompetenzen erstellen!', 'error');
        return;
    }
    
    const defaultCompetencies = [
        { name: "👨‍💻 Programmieren", description: "Grundlagen der Programmierung verstehen", order: 1 },
        { name: "📝 Textverarbeitung", description: "Dokumente erstellen und formatieren", order: 2 },
        { name: "🔍 Internet-Recherche", description: "Informationen finden und bewerten", order: 3 },
        { name: "🎨 Digitale Medien", description: "Bilder und Videos bearbeiten", order: 4 },
        { name: "🔐 Digitale Sicherheit", description: "Sicher im Internet unterwegs", order: 5 },
        { name: "📊 Tabellenkalkulation", description: "Mit Daten und Formeln arbeiten", order: 6 }
    ];
    
    showLoading(true);
    
    try {
        for (const comp of defaultCompetencies) {
            await setDoc(doc(collection(window.db, 'competencies')), {
                ...comp,
                createdBy: currentUser.uid,
                createdAt: serverTimestamp()
            });
        }
        
        showNotification('Standard-Kompetenzen erstellt!', 'success');
        await loadCompetencies();
        await loadCompetencyManager();
    } catch (error) {
        console.error('Fehler:', error);
        showNotification('Fehler: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
};

// ============= SCHÜLER-BEREICH =============
async function showStudentArea(userData) {
    document.getElementById('loginArea').classList.add('hidden');
    document.getElementById('teacherArea').classList.add('hidden');
    document.getElementById('mainArea').classList.remove('hidden');
    
    document.getElementById('welcomeMessage').innerHTML = 
        `Hallo <strong>${userData.name}</strong>! Klasse: ${userData.class}`;
    
    // Fortschritt laden und Echtzeit-Updates einrichten
    const progressRef = doc(window.db, 'progress', currentUser.uid);
    
    const unsubscribe = onSnapshot(progressRef, (doc) => {
        if (doc.exists()) {
            const progress = doc.data();
            renderStudentCompetencies(progress.ratings || {});
        } else {
            renderStudentCompetencies({});
        }
    });
    
    unsubscribeListeners.push(unsubscribe);
}

// Kompetenzen für Schüler rendern
function renderStudentCompetencies(ratings) {
    const container = document.getElementById('competencies');
    container.innerHTML = '';
    
    // Gesamtfortschritt
    const overallDiv = document.createElement('div');
    overallDiv.className = 'overall-progress';
    const totalPossible = competencies.length * 5;
    const currentTotal = Object.values(ratings).reduce((sum, rating) => sum + rating, 0);
    const percentage = totalPossible > 0 ? Math.round((currentTotal / totalPossible) * 100) : 0;
    
    overallDiv.innerHTML = `
        <h3>📈 Gesamtfortschritt</h3>
        <div class="big-progress-bar">
            <div class="big-progress-fill" style="width: ${percentage}%">
                <span class="progress-text">${percentage}%</span>
            </div>
        </div>
    `;
    container.appendChild(overallDiv);
    
    // Einzelne Kompetenzen
    competencies.forEach(comp => {
        const rating = ratings[comp.id] || 0;
        
        const card = document.createElement('div');
        card.className = 'competency-card';
        
        card.innerHTML = `
            <div class="competency-header">
                <div class="competency-info">
                    <div class="competency-title">${comp.name}</div>
                    <div class="competency-description">${comp.description}</div>
                </div>
                <div class="stars" data-competency="${comp.id}">
                    ${createStars(comp.id, rating)}
                </div>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${rating * 20}%"></div>
            </div>
        `;
        
        container.appendChild(card);
    });
    
    // Event Listener für Sterne
    document.querySelectorAll('.star').forEach(star => {
        star.addEventListener('click', async function() {
            const competencyId = this.parentElement.dataset.competency;
            const rating = parseInt(this.dataset.rating);
            await updateRating(competencyId, rating);
        });
    });
}

// Bewertung aktualisieren (mit Cloud-Sync)
async function updateRating(competencyId, rating) {
    if (!currentUser) return;
    
    try {
        const progressRef = doc(window.db, 'progress', currentUser.uid);
        const progressDoc = await getDoc(progressRef);
        
        let ratings = {};
        if (progressDoc.exists()) {
            ratings = progressDoc.data().ratings || {};
        }
        
        ratings[competencyId] = rating;
        
        await updateDoc(progressRef, {
            ratings: ratings,
            lastUpdated: serverTimestamp()
        });
        
        showNotification('Bewertung gespeichert!', 'success');
        updateSyncStatus('saved');
    } catch (error) {
        console.error('Fehler beim Speichern:', error);
        showNotification('Fehler beim Speichern!', 'error');
        updateSyncStatus('error');
    }
}

// ============= LEHRER-DASHBOARD =============
async function showTeacherDashboard(userData) {
    document.getElementById('loginArea').classList.add('hidden');
    document.getElementById('mainArea').classList.add('hidden');
    document.getElementById('teacherArea').classList.remove('hidden');
    
    // Kompetenzen-Tab laden
    await loadCompetencyManager();
    
    // Echtzeit-Updates für Schülerdaten einrichten
    setupRealtimeStudentUpdates();
}

// Kompetenz-Manager für Lehrer
async function loadCompetencyManager() {
    const container = document.getElementById('competencyList');
    container.innerHTML = '';
    
    competencies.forEach(comp => {
        const item = document.createElement('div');
        item.className = 'competency-item';
        
        item.innerHTML = `
            <div class="competency-content">
                <div class="competency-name">${comp.name}</div>
                <div class="competency-desc">${comp.description}</div>
            </div>
            <div class="competency-actions">
                <button class="btn-icon" onclick="editCompetency('${comp.id}')" title="Bearbeiten">✏️</button>
                <button class="btn-icon delete" onclick="deleteCompetency('${comp.id}')" title="Löschen">🗑️</button>
            </div>
        `;
        
        container.appendChild(item);
    });
}

// Neue Kompetenz hinzufügen
window.addNewCompetency = async function() {
    const name = prompt('Name der Kompetenz (mit Emoji):');
    if (!name) return;
    
    const description = prompt('Beschreibung:');
    if (!description) return;
    
    showLoading(true);
    
    try {
        const newComp = {
            name: name,
            description: description,
            order: competencies.length + 1,
            createdBy: currentUser.uid,
            createdAt: serverTimestamp()
        };
        
        await setDoc(doc(collection(window.db, 'competencies')), newComp);
        
        showNotification('Kompetenz hinzugefügt!', 'success');
        await loadCompetencies();
        await loadCompetencyManager();
    } catch (error) {
        console.error('Fehler:', error);
        showNotification('Fehler beim Hinzufügen!', 'error');
    } finally {
        showLoading(false);
    }
};

// Echtzeit-Updates für Schülerdaten
function setupRealtimeStudentUpdates() {
    // Schüler in Echtzeit überwachen
    const q = query(collection(window.db, 'users'), where('role', '==', 'student'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const students = [];
        querySnapshot.forEach((doc) => {
            students.push({ id: doc.id, ...doc.data() });
        });
        
        updateStudentsList(students);
    });
    
    unsubscribeListeners.push(unsubscribe);
}

// Schülerliste aktualisieren
async function updateStudentsList(students) {
    const container = document.getElementById('studentsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    for (const student of students) {
        // Fortschritt abrufen
        const progressDoc = await getDoc(doc(window.db, 'progress', student.id));
        let progress = 0;
        
        if (progressDoc.exists()) {
            const ratings = progressDoc.data().ratings || {};
            const totalPossible = competencies.length * 5;
            const currentTotal = Object.values(ratings).reduce((sum, rating) => sum + rating, 0);
            progress = totalPossible > 0 ? Math.round((currentTotal / totalPossible) * 100) : 0;
        }
        
        const card = document.createElement('div');
        card.className = 'student-card';
        
        card.innerHTML = `
            <div class="student-name">${student.name}</div>
            <div class="student-info">Klasse: ${student.class}</div>
            <div class="student-info">Fortschritt: ${progress}%</div>
            <div class="student-progress">
                <div class="mini-progress-bar">
                    <div class="mini-progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
        `;
        
        container.appendChild(card);
    }
}

// ============= UI HELFER =============

// Tab wechseln
window.switchTab = function(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabId).classList.remove('hidden');
    event.target.classList.add('active');
};

// Login-Ansichten wechseln
window.showStudentLogin = function() {
    document.getElementById('loginTab').classList.add('active');
    document.getElementById('registerTab').classList.remove('active');
    document.getElementById('studentLoginForm').classList.remove('hidden');
    document.getElementById('studentRegisterForm').classList.add('hidden');
};

window.showStudentRegister = function() {
    document.getElementById('registerTab').classList.add('active');
    document.getElementById('loginTab').classList.remove('active');
    document.getElementById('studentRegisterForm').classList.remove('hidden');
    document.getElementById('studentLoginForm').classList.add('hidden');
};

window.showTeacherAuth = function() {
    document.getElementById('studentAuthBox').classList.add('hidden');
    document.getElementById('teacherAuthBox').classList.remove('hidden');
};

window.showStudentAuth = function() {
    document.getElementById('teacherAuthBox').classList.add('hidden');
    document.getElementById('studentAuthBox').classList.remove('hidden');
};

// Login-Bereich anzeigen
function showLoginArea() {
    document.getElementById('mainArea').classList.add('hidden');
    document.getElementById('teacherArea').classList.add('hidden');
    document.getElementById('loginArea').classList.remove('hidden');
}

// Sterne erstellen
function createStars(competencyId, currentRating) {
    let starsHTML = '';
    for (let i = 1; i <= 5; i++) {
        const filled = i <= currentRating ? 'filled' : '';
        starsHTML += `<span class="star ${filled}" data-rating="${i}">★</span>`;
    }
    return starsHTML;
}

// Lade-Anzeige
function showLoading(show) {
    const indicator = document.getElementById('loadingIndicator');
    if (show) {
        indicator.classList.remove('hidden');
    } else {
        indicator.classList.add('hidden');
    }
}

// Sync-Status Update
function updateSyncStatus(status) {
    const statusEl = document.getElementById('syncStatus');
    if (!statusEl) return;
    
    switch(status) {
        case 'saving':
            statusEl.textContent = '⏳ Speichern...';
            statusEl.style.color = '#ffa500';
            break;
        case 'saved':
            statusEl.textContent = '✅ Synchronisiert';
            statusEl.style.color = '#48bb78';
            break;
        case 'error':
            statusEl.textContent = '❌ Fehler';
            statusEl.style.color = '#f56565';
            break;
        default:
            statusEl.textContent = '✅ Synchronisiert';
            statusEl.style.color = '#48bb78';
    }
}

// Benachrichtigungen
window.showNotification = function(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#48bb78' : type === 'error' ? '#f56565' : '#667eea'};
        color: white;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        max-width: 300px;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
};

// Auth Fehler behandeln
function handleAuthError(error) {
    switch(error.code) {
        case 'auth/user-not-found':
            showNotification('Benutzer nicht gefunden!', 'error');
            break;
        case 'auth/wrong-password':
            showNotification('Falsches Passwort!', 'error');
            break;
        case 'auth/email-already-in-use':
            showNotification('E-Mail wird bereits verwendet!', 'error');
            break;
        case 'auth/invalid-email':
            showNotification('Ungültige E-Mail Adresse!', 'error');
            break;
        default:
            showNotification('Fehler: ' + error.message, 'error');
    }
}

// ============= PDF EXPORT (bleibt lokal) =============
window.exportProgress = async function() {
    if (!currentUser || userRole !== 'student') return;
    
    try {
        // Aktuelle Bewertungen holen
        const progressDoc = await getDoc(doc(window.db, 'progress', currentUser.uid));
        const userDoc = await getDoc(doc(window.db, 'users', currentUser.uid));
        
        if (!progressDoc.exists() || !userDoc.exists()) {
            showNotification('Keine Daten zum Exportieren!', 'error');
            return;
        }
        
        const ratings = progressDoc.data().ratings || {};
        const userData = userDoc.data();
        
        // PDF generieren (gleicher Code wie vorher)
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // ... [PDF-Generierung bleibt gleich wie im vorherigen Code]
        
        doc.save(`Kompetenzpass_${userData.name}_${new Date().toISOString().split('T')[0]}.pdf`);
        showNotification('PDF erfolgreich erstellt!', 'success');
    } catch (error) {
        console.error('Fehler beim Export:', error);
        showNotification('Fehler beim PDF-Export!', 'error');
    }
// ============= LEHRER: KOMPETENZEN IMPORT/EXPORT =============

// Kompetenzen importieren
window.importCompetencies = async function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        showLoading(true);
        
        try {
            const text = await file.text();
            const importedCompetencies = JSON.parse(text);
            
            if (!Array.isArray(importedCompetencies)) {
                throw new Error('Ungültiges Format!');
            }
            
            // Kompetenzen in Firestore speichern
            for (let i = 0; i < importedCompetencies.length; i++) {
                const comp = importedCompetencies[i];
                await setDoc(doc(collection(window.db, 'competencies')), {
                    name: comp.name || 'Neue Kompetenz',
                    description: comp.description || '',
                    order: comp.order || (competencies.length + i + 1),
                    createdBy: currentUser.uid,
                    createdAt: serverTimestamp()
                });
            }
            
            showNotification(`${importedCompetencies.length} Kompetenzen erfolgreich importiert!`, 'success');
            await loadCompetencies();
            await loadCompetencyManager();
        } catch (error) {
            console.error('Import-Fehler:', error);
            showNotification('Fehler beim Importieren: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    };
    
    input.click();
};

// Kompetenzen exportieren
window.exportCompetencies = async function() {
    try {
        showLoading(true);
        
        const exportData = competencies.map(comp => ({
            name: comp.name,
            description: comp.description,
            order: comp.order
        }));
        
        // JSON-Datei erstellen und herunterladen
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `kompetenzen_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        showNotification('Kompetenzen erfolgreich exportiert!', 'success');
    } catch (error) {
        console.error('Export-Fehler:', error);
        showNotification('Fehler beim Exportieren: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
};

// Kompetenz löschen
window.deleteCompetency = async function(competencyId) {
    if (!confirm('Möchtest du diese Kompetenz wirklich löschen?\n\nAchtung: Alle Schüler-Bewertungen für diese Kompetenz gehen verloren!')) {
        return;
    }
    
    showLoading(true);
    
    try {
        // Kompetenz löschen
        await deleteDoc(doc(window.db, 'competencies', competencyId));
        
        // Aus allen Schüler-Fortschritten entfernen
        const studentsQuery = query(collection(window.db, 'users'), where('role', '==', 'student'));
        const studentsSnapshot = await getDocs(studentsQuery);
        
        for (const studentDoc of studentsSnapshot.docs) {
            const progressRef = doc(window.db, 'progress', studentDoc.id);
            const progressDoc = await getDoc(progressRef);
            
            if (progressDoc.exists()) {
                const ratings = progressDoc.data().ratings || {};
                if (ratings[competencyId]) {
                    delete ratings[competencyId];
                    await updateDoc(progressRef, { ratings: ratings });
                }
            }
        }
        
        showNotification('Kompetenz erfolgreich gelöscht!', 'success');
        await loadCompetencies();
        await loadCompetencyManager();
    } catch (error) {
        console.error('Lösch-Fehler:', error);
        showNotification('Fehler beim Löschen: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
};

// Kompetenz bearbeiten
window.editCompetency = async function(competencyId) {
    try {
        const compDoc = await getDoc(doc(window.db, 'competencies', competencyId));
        
        if (!compDoc.exists()) {
            showNotification('Kompetenz nicht gefunden!', 'error');
            return;
        }
        
        const data = compDoc.data();
        
        const newName = prompt('Neuer Name:', data.name);
        if (newName === null) return; // Abbrechen
        
        const newDescription = prompt('Neue Beschreibung:', data.description);
        if (newDescription === null) return; // Abbrechen
        
        if (!newName.trim()) {
            showNotification('Name darf nicht leer sein!', 'error');
            return;
        }
        
        showLoading(true);
        
        await updateDoc(doc(window.db, 'competencies', competencyId), {
            name: newName.trim(),
            description: newDescription.trim()
        });
        
        showNotification('Kompetenz erfolgreich aktualisiert!', 'success');
        await loadCompetencies();
        await loadCompetencyManager();
    } catch (error) {
        console.error('Bearbeitungs-Fehler:', error);
        showNotification('Fehler beim Bearbeiten: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
};
};
