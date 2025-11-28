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

import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
    listAll
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// ============= GLOBALE VARIABLEN =============
let currentUser = null;
let userRole = null; // 'student' oder 'teacher'
let competencies = []; // Wird durch competencyLevels ersetzt
let competencyAreas = []; // Kompetenzbereiche (Medien, Informatik, Anwendungen)
let competencyGroups = []; // Kompetenz-Gruppen (übergeordnet)
let competencyLevels = []; // Konkrete Kompetenzstufen
let unsubscribeListeners = [];

// ============= KONSTANTEN =============
const MAX_RATING = 5; // Maximale Anzahl Sterne
const PROGRESS_THRESHOLD_EXCELLENT = 75; // >= 75% = Sehr gut
const PROGRESS_THRESHOLD_GOOD = 50; // >= 50% = In Arbeit
const MIN_NAME_LENGTH = 2;
const MIN_PASSWORD_LENGTH = 6;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in Bytes
const ALLOWED_FILE_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'video/mp4', 'video/quicktime', 'video/x-msvideo'
];

// ============= INITIALISIERUNG =============
window.addEventListener('DOMContentLoaded', async () => {
    // Kompetenzen zuerst laden (für beide Rollen benötigt)
    await loadCompetencies();

    // Auth State Observer
    onAuthStateChanged(window.auth, async (user) => {
        if (user) {
            currentUser = user;
            // Sicherstellen, dass Kompetenzen geladen sind
            if (competencies.length === 0) {
                await loadCompetencies();
            }
            await loadUserData();
        } else {
            currentUser = null;
            userRole = null;
            showLoginArea();
        }
    });
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

    // Email validieren
    if (!isValidEmail(email)) {
        showNotification('Bitte eine gültige E-Mail Adresse eingeben!', 'error');
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

    // Name validieren
    if (name.trim().length < MIN_NAME_LENGTH) {
        showNotification(`Name muss mindestens ${MIN_NAME_LENGTH} Zeichen lang sein!`, 'error');
        return;
    }

    // Email validieren
    if (!isValidEmail(email)) {
        showNotification('Bitte eine gültige E-Mail Adresse eingeben!', 'error');
        return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
        showNotification(`Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein!`, 'error');
        return;
    }

    // Klassenname validieren
    if (className.trim().length < 1) {
        showNotification('Bitte eine Klasse angeben!', 'error');
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

    // Email validieren
    if (!isValidEmail(email)) {
        showNotification('Bitte eine gültige E-Mail Adresse eingeben!', 'error');
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
async function loadCompetencies(gradeFilter = null) {
    try {
        // Kompetenzbereiche laden
        const areasSnapshot = await getDocs(collection(window.db, 'competencyAreas'));
        competencyAreas = [];
        areasSnapshot.forEach((doc) => {
            competencyAreas.push({ id: doc.id, ...doc.data() });
        });
        competencyAreas.sort((a, b) => (a.order || 0) - (b.order || 0));

        // Kompetenz-Gruppen laden (übergeordnete Kompetenzen)
        const groupsSnapshot = await getDocs(collection(window.db, 'competencies'));
        competencyGroups = [];
        groupsSnapshot.forEach((doc) => {
            competencyGroups.push({ id: doc.id, ...doc.data() });
        });
        competencyGroups.sort((a, b) => (a.order || 0) - (b.order || 0));

        // Kompetenzstufen laden
        let levelsQuery = collection(window.db, 'competencyLevels');
        const levelsSnapshot = await getDocs(levelsQuery);
        competencyLevels = [];

        levelsSnapshot.forEach((doc) => {
            const level = { id: doc.id, ...doc.data() };

            // Optional: Nach Klassenstufe filtern
            if (gradeFilter) {
                if (level.grades && level.grades.some(g => matchGrade(g, gradeFilter))) {
                    competencyLevels.push(level);
                }
            } else {
                competencyLevels.push(level);
            }
        });

        competencyLevels.sort((a, b) => (a.order || 0) - (b.order || 0));

        // Legacy: competencies Array mit Levels befüllen (für Rückwärtskompatibilität)
        competencies = competencyLevels;

        console.log(`Geladen: ${competencyAreas.length} Bereiche, ${competencyGroups.length} Gruppen, ${competencyLevels.length} Stufen`);

        // Wenn keine Daten vorhanden, Hinweis anzeigen
        if (competencyAreas.length === 0 && competencyLevels.length === 0) {
            console.warn('Keine Kompetenzen gefunden. Bitte Import-Tool verwenden.');
        }
    } catch (error) {
        console.error('Fehler beim Laden der Kompetenzen:', error);
    }
}

// Hilfsfunktion: Prüft ob eine Klassenstufe zum Filter passt
function matchGrade(grade, filter) {
    // Exakte Übereinstimmung
    if (grade === filter) return true;

    // Flexibles Matching (z.B. "7" passt zu "7.", "7./8.", etc.)
    const normalized = grade.replace(/[./]/g, '');
    const filterNormalized = filter.replace(/[./]/g, '');

    return normalized.includes(filterNormalized) || filterNormalized.includes(normalized);
}

// Standard-Kompetenzen erstellen
async function createDefaultCompetencies() {
    const defaultCompetencies = [
        { name: "👨‍💻 Programmieren", description: "Grundlagen der Programmierung verstehen", order: 1 },
        { name: "📝 Textverarbeitung", description: "Dokumente erstellen und formatieren", order: 2 },
        { name: "🔍 Internet-Recherche", description: "Informationen finden und bewerten", order: 3 },
        { name: "🎨 Digitale Medien", description: "Bilder und Videos bearbeiten", order: 4 },
        { name: "🔐 Digitale Sicherheit", description: "Sicher im Internet unterwegs", order: 5 },
        { name: "📊 Tabellenkalkulation", description: "Mit Daten und Formeln arbeiten", order: 6 }
    ];

    for (const comp of defaultCompetencies) {
        await setDoc(doc(collection(window.db, 'competencies')), {
            ...comp,
            createdAt: serverTimestamp(),
            createdBy: 'system'
        });
    }
}

// ============= SCHÜLER-BEREICH =============
async function showStudentArea(userData) {
    document.getElementById('loginArea').classList.add('hidden');
    document.getElementById('teacherArea').classList.add('hidden');
    document.getElementById('mainArea').classList.remove('hidden');

    document.getElementById('welcomeMessage').innerHTML =
        `Hallo <strong>${escapeHTML(userData.name)}</strong>! Klasse: ${escapeHTML(userData.class)}`;

    // Kompetenzen nach Klassenstufe filtern
    await loadCompetencies(userData.class);

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

// Kompetenzen für Schüler rendern (hierarchisch)
async function renderStudentCompetencies(ratings) {
    const container = document.getElementById('competencies');
    container.innerHTML = '';

    // Gesamtfortschritt
    const overallDiv = document.createElement('div');
    overallDiv.className = 'overall-progress';
    const percentage = calculateProgress(ratings);

    overallDiv.innerHTML = `
        <h3>📈 Gesamtfortschritt</h3>
        <div class="big-progress-bar">
            <div class="big-progress-fill" style="width: ${percentage}%">
                <span class="progress-text">${percentage}%</span>
            </div>
        </div>
    `;
    container.appendChild(overallDiv);

    // Hierarchisch nach Bereichen gruppieren
    for (const area of competencyAreas) {
        const areaDiv = document.createElement('div');
        areaDiv.className = 'competency-area';

        const areaHeader = document.createElement('h2');
        areaHeader.className = 'area-header';
        areaHeader.innerHTML = `${area.emoji} ${escapeHTML(area.name)}`;
        areaDiv.appendChild(areaHeader);

        // Alle Levels für diesen Bereich
        const levelsInArea = competencyLevels.filter(level => {
            const group = competencyGroups.find(g => g.id === level.competencyId);
            return group && group.areaId === area.id;
        });

        // Nach Gruppen zusammenfassen
        const groupedLevels = new Map();
        for (const level of levelsInArea) {
            if (!groupedLevels.has(level.competencyId)) {
                groupedLevels.set(level.competencyId, []);
            }
            groupedLevels.get(level.competencyId).push(level);
        }

        // Für jede Gruppe einen Abschnitt erstellen
        for (const [groupId, levels] of groupedLevels) {
            const group = competencyGroups.find(g => g.id === groupId);
            if (!group) continue;

            // Gruppen-Container
            const groupDiv = document.createElement('div');
            groupDiv.className = 'competency-group';

            // Gruppen-Titel (collapsible)
            const groupTitle = document.createElement('div');
            groupTitle.className = 'group-title';
            groupTitle.innerHTML = `
                <span class="group-toggle">▼</span>
                <span class="group-name">${escapeHTML(group.name)}</span>
                <span class="group-code">${escapeHTML(group.lpCodePrefix)}</span>
            `;
            groupTitle.onclick = function() {
                const levelsContainer = this.nextElementSibling;
                const toggle = this.querySelector('.group-toggle');
                if (levelsContainer.style.display === 'none') {
                    levelsContainer.style.display = 'block';
                    toggle.textContent = '▼';
                } else {
                    levelsContainer.style.display = 'none';
                    toggle.textContent = '▶';
                }
            };
            groupDiv.appendChild(groupTitle);

            // Levels-Container
            const levelsContainer = document.createElement('div');
            levelsContainer.className = 'levels-container';

            // Einzelne Kompetenzstufen
            for (const level of levels) {
                const rating = ratings[level.id] || 0;

                // Artefakte für diese Kompetenz zählen
                const artifacts = await loadArtifacts(level.id);
                const artifactCount = artifacts.length;

                const card = document.createElement('div');
                card.className = 'competency-card';

                const cycleText = level.cycles?.join(', ') || '';
                const gradeText = level.grades?.join(', ') || '';
                const basicReqBadge = level.isBasicRequirement ? '<span class="basic-req-badge">Grundanspruch</span>' : '';

                card.innerHTML = `
                    <div class="competency-header">
                        <div class="competency-info">
                            <div class="competency-title">
                                <strong>${escapeHTML(level.lpCode)}</strong>
                                ${basicReqBadge}
                                ${artifactCount > 0 ? `<span class="artifact-badge">${artifactCount} 📎</span>` : ''}
                            </div>
                            <div class="competency-description">${escapeHTML(level.description)}</div>
                            <div class="competency-meta">
                                ${cycleText ? `<span class="meta-tag">📚 ${cycleText}</span>` : ''}
                                ${gradeText ? `<span class="meta-tag">🎓 ${gradeText}</span>` : ''}
                            </div>
                        </div>
                        <div class="stars" data-competency="${escapeHTML(level.id)}">
                            ${createStars(level.id, rating)}
                        </div>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${rating * 20}%"></div>
                    </div>
                    <div class="competency-actions">
                        <button class="btn-artifact" onclick="showArtifactsModal('${escapeHTML(level.id)}', '${escapeHTML(level.lpCode)}')" title="Artefakte verwalten">
                            📎 Artefakte (${artifactCount})
                        </button>
                    </div>
                `;

                levelsContainer.appendChild(card);
            }

            groupDiv.appendChild(levelsContainer);
            areaDiv.appendChild(groupDiv);
        }

        container.appendChild(areaDiv);
    }

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
                <div class="competency-name">${escapeHTML(comp.name)}</div>
                <div class="competency-desc">${escapeHTML(comp.description)}</div>
            </div>
            <div class="competency-actions">
                <button class="btn-icon" onclick="editCompetency('${escapeHTML(comp.id)}')" title="Bearbeiten">✏️</button>
                <button class="btn-icon delete" onclick="deleteCompetency('${escapeHTML(comp.id)}')" title="Löschen">🗑️</button>
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

// ============= KLASSEN-VERWALTUNG =============

// Klassen laden und anzeigen
async function loadClassesManager() {
    const container = document.getElementById('classesList');
    if (!container) return;
    
    container.innerHTML = '<div style="text-align: center; padding: 20px;">Lade Klassen...</div>';
    
    try {
        const querySnapshot = await getDocs(collection(window.db, 'classes'));
        
        if (querySnapshot.empty) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #888;">
                    <p style="font-size: 18px; margin-bottom: 10px;">📚 Noch keine Klassen vorhanden</p>
                    <p>Erstelle deine erste Klasse mit dem Button oben!</p>
                </div>
            `;
            return;
        }
        
        const classes = [];
        querySnapshot.forEach((doc) => {
            classes.push({ id: doc.id, ...doc.data() });
        });
        
        // Nach Name sortieren
        classes.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        
        container.innerHTML = '';
        
        // Für jede Klasse eine Karte erstellen
        for (const classData of classes) {
            // Schüler-Anzahl und Durchschnittsfortschritt berechnen
            const studentsQuery = query(
                collection(window.db, 'users'), 
                where('role', '==', 'student'),
                where('class', '==', classData.name)
            );
            const studentsSnapshot = await getDocs(studentsQuery);
            const studentCount = studentsSnapshot.size;
            
            // Durchschnittsfortschritt berechnen
            let totalProgress = 0;
            let studentWithProgress = 0;
            
            for (const studentDoc of studentsSnapshot.docs) {
                const progressDoc = await getDoc(doc(window.db, 'progress', studentDoc.id));
                if (progressDoc.exists()) {
                    const ratings = progressDoc.data().ratings || {};
                    const progress = calculateProgress(ratings);
                    if (progress > 0) {
                        totalProgress += progress;
                        studentWithProgress++;
                    }
                }
            }
            
            const avgProgress = studentWithProgress > 0 ? Math.round(totalProgress / studentWithProgress) : 0;
            
            const card = document.createElement('div');
            card.className = 'class-card';
            card.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                margin-bottom: 15px;
                transition: transform 0.2s;
                cursor: pointer;
            `;
            
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h3 style="margin: 0 0 10px 0; font-size: 24px; color: #667eea;">
                            🏫 ${classData.name}
                        </h3>
                        <p style="color: #666; margin: 5px 0;">
                            ${classData.description || 'Keine Beschreibung'}
                        </p>
                        <div style="display: flex; gap: 20px; margin-top: 15px;">
                            <div>
                                <span style="color: #888; font-size: 14px;">Schüler:</span>
                                <strong style="font-size: 20px; color: #667eea; margin-left: 5px;">${studentCount}</strong>
                            </div>
                            <div>
                                <span style="color: #888; font-size: 14px;">Ø Fortschritt:</span>
                                <strong style="font-size: 20px; color: #48bb78; margin-left: 5px;">${avgProgress}%</strong>
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="editClass('${classData.id}')" 
                                class="btn-icon" 
                                title="Bearbeiten"
                                style="background: #667eea; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;">
                            ✏️
                        </button>
                        <button onclick="deleteClass('${classData.id}')" 
                                class="btn-icon delete" 
                                title="Löschen"
                                style="background: #f56565; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
            
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-2px)';
                card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            });
            
            container.appendChild(card);
        }
        
    } catch (error) {
        console.error('Fehler beim Laden der Klassen:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #f56565;">
                <p>❌ Fehler beim Laden der Klassen</p>
                <p style="font-size: 14px;">${error.message}</p>
            </div>
        `;
    }
}

// Neue Klasse erstellen
window.createClass = async function() {
    const name = prompt('Klassenname (z.B. "7a", "8b"):');
    if (!name || !name.trim()) return;
    
    const description = prompt('Beschreibung (z.B. "Schuljahr 2024/25"):') || '';
    
    showLoading(true);
    
    try {
        await setDoc(doc(collection(window.db, 'classes')), {
            name: name.trim(),
            description: description.trim(),
            createdBy: currentUser.uid,
            createdAt: serverTimestamp()
        });
        
        showNotification('Klasse erfolgreich erstellt!', 'success');
        await loadClassesManager();
    } catch (error) {
        console.error('Fehler beim Erstellen:', error);
        showNotification('Fehler beim Erstellen: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
};

// Klasse bearbeiten
window.editClass = async function(classId) {
    try {
        const classDoc = await getDoc(doc(window.db, 'classes', classId));
        
        if (!classDoc.exists()) {
            showNotification('Klasse nicht gefunden!', 'error');
            return;
        }
        
        const data = classDoc.data();
        
        const newName = prompt('Neuer Klassenname:', data.name);
        if (newName === null) return;
        
        const newDescription = prompt('Neue Beschreibung:', data.description || '');
        if (newDescription === null) return;
        
        if (!newName.trim()) {
            showNotification('Name darf nicht leer sein!', 'error');
            return;
        }
        
        showLoading(true);
        
        await updateDoc(doc(window.db, 'classes', classId), {
            name: newName.trim(),
            description: newDescription.trim()
        });
        
        showNotification('Klasse erfolgreich aktualisiert!', 'success');
        await loadClassesManager();
    } catch (error) {
        console.error('Bearbeitungs-Fehler:', error);
        showNotification('Fehler beim Bearbeiten: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
};

// Klasse löschen
window.deleteClass = async function(classId) {
    if (!confirm('Möchtest du diese Klasse wirklich löschen?\n\nHinweis: Die Schüler bleiben erhalten, nur die Klassengruppe wird gelöscht.')) {
        return;
    }
    
    showLoading(true);
    
    try {
        await deleteDoc(doc(window.db, 'classes', classId));
        
        showNotification('Klasse erfolgreich gelöscht!', 'success');
        await loadClassesManager();
    } catch (error) {
        console.error('Lösch-Fehler:', error);
        showNotification('Fehler beim Löschen: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
};

// ============= BERICHTE-FUNKTION =============

// Berichte-Tab initialisieren
async function loadReportsTab() {
    const classSelect = document.getElementById('reportClass');
    if (!classSelect) return;
    
    try {
        // Alle Klassen laden
        const classesSnapshot = await getDocs(collection(window.db, 'classes'));
        
        classSelect.innerHTML = '<option value="">Klasse wählen...</option>';
        
        const classes = [];
        classesSnapshot.forEach((doc) => {
            classes.push({ id: doc.id, ...doc.data() });
        });
        
        // Nach Name sortieren
        classes.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        
        classes.forEach(classData => {
            const option = document.createElement('option');
            option.value = classData.name;
            option.textContent = classData.name;
            classSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Fehler beim Laden der Klassen:', error);
    }
}

// Bericht generieren
window.generateReport = async function() {
    const className = document.getElementById('reportClass').value;
    const reportType = document.getElementById('reportType').value;
    const container = document.getElementById('reportContainer');
    
    if (!className) {
        showNotification('Bitte wähle zuerst eine Klasse!', 'error');
        return;
    }
    
    showLoading(true);
    container.innerHTML = '<div style="text-align: center; padding: 40px;">Generiere Bericht...</div>';
    
    try {
        // Schüler der Klasse laden
        const studentsQuery = query(
            collection(window.db, 'users'),
            where('role', '==', 'student'),
            where('class', '==', className)
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        
        if (studentsSnapshot.empty) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #888;">
                    <p style="font-size: 18px;">📚 Keine Schüler in Klasse "${className}" gefunden</p>
                </div>
            `;
            showLoading(false);
            return;
        }
        
        const students = [];
        for (const studentDoc of studentsSnapshot.docs) {
            const studentData = studentDoc.data();
            const progressDoc = await getDoc(doc(window.db, 'progress', studentDoc.id));

            let ratings = {};
            let totalProgress = 0;

            if (progressDoc.exists()) {
                ratings = progressDoc.data().ratings || {};
                totalProgress = calculateProgress(ratings);
            }
            
            students.push({
                id: studentDoc.id,
                name: studentData.name,
                email: studentData.email,
                ratings: ratings,
                totalProgress: totalProgress
            });
        }
        
        // Nach Namen sortieren
        students.sort((a, b) => a.name.localeCompare(b.name));
        
        // Bericht je nach Typ generieren
        if (reportType === 'overview') {
            generateOverviewReport(className, students, container);
        } else if (reportType === 'detailed') {
            generateDetailedReport(className, students, container);
        } else if (reportType === 'progress') {
            generateProgressReport(className, students, container);
        }
        
    } catch (error) {
        console.error('Fehler beim Generieren des Berichts:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #f56565;">
                <p>❌ Fehler beim Generieren des Berichts</p>
                <p style="font-size: 14px;">${error.message}</p>
            </div>
        `;
    } finally {
        showLoading(false);
    }
};

// Übersichtsbericht
function generateOverviewReport(className, students, container) {
    const avgProgress = students.length > 0 
        ? Math.round(students.reduce((sum, s) => sum + s.totalProgress, 0) / students.length) 
        : 0;
    
    let html = `
        <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0;">
                <div>
                    <h2 style="margin: 0; color: #667eea;">📊 Klassenübersicht: ${className}</h2>
                    <p style="color: #888; margin: 5px 0 0 0;">Übersicht aller Schüler</p>
                </div>
                <button onclick="exportReportAsPDF('${className}')" 
                        style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px;">
                    📄 Als PDF exportieren
                </button>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px;">
                    <div style="font-size: 14px; opacity: 0.9;">Schüler gesamt</div>
                    <div style="font-size: 36px; font-weight: bold; margin-top: 5px;">${students.length}</div>
                </div>
                <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 20px; border-radius: 10px;">
                    <div style="font-size: 14px; opacity: 0.9;">Durchschnitt</div>
                    <div style="font-size: 36px; font-weight: bold; margin-top: 5px;">${avgProgress}%</div>
                </div>
                <div style="background: linear-gradient(135deg, #f6ad55 0%, #ed8936 100%); color: white; padding: 20px; border-radius: 10px;">
                    <div style="font-size: 14px; opacity: 0.9;">Kompetenzen</div>
                    <div style="font-size: 36px; font-weight: bold; margin-top: 5px;">${competencies.length}</div>
                </div>
            </div>
            
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f7fafc; border-bottom: 2px solid #e2e8f0;">
                        <th style="padding: 15px; text-align: left; font-weight: 600; color: #4a5568;">Name</th>
                        <th style="padding: 15px; text-align: center; font-weight: 600; color: #4a5568;">Fortschritt</th>
                        <th style="padding: 15px; text-align: center; font-weight: 600; color: #4a5568;">Status</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    students.forEach((student, index) => {
        const bgColor = index % 2 === 0 ? '#ffffff' : '#f7fafc';
        const statusColor = student.totalProgress >= PROGRESS_THRESHOLD_EXCELLENT ? '#48bb78' :
                           student.totalProgress >= PROGRESS_THRESHOLD_GOOD ? '#f6ad55' : '#f56565';
        const statusText = student.totalProgress >= PROGRESS_THRESHOLD_EXCELLENT ? '✓ Sehr gut' :
                          student.totalProgress >= PROGRESS_THRESHOLD_GOOD ? '◐ In Arbeit' : '◯ Beginnend';
        
        html += `
            <tr style="background: ${bgColor}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 15px;">${escapeHTML(student.name)}</td>
                <td style="padding: 15px; text-align: center;">
                    <div style="background: #e2e8f0; height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="background: ${statusColor}; width: ${student.totalProgress}%; height: 100%;"></div>
                    </div>
                    <span style="font-size: 12px; color: #888; margin-top: 5px; display: block;">${student.totalProgress}%</span>
                </td>
                <td style="padding: 15px; text-align: center;">
                    <span style="color: ${statusColor}; font-weight: 600;">${statusText}</span>
                </td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
}

// Detaillierter Bericht
function generateDetailedReport(className, students, container) {
    let html = `
        <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0;">
                <div>
                    <h2 style="margin: 0; color: #667eea;">📋 Detaillierter Bericht: ${className}</h2>
                    <p style="color: #888; margin: 5px 0 0 0;">Alle Kompetenzen pro Schüler</p>
                </div>
                <button onclick="exportReportAsPDF('${className}')"
                        style="background: #667eea; color: white; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; font-size: 14px;">
                    📄 Als PDF exportieren
                </button>
            </div>
    `;
    
    students.forEach(student => {
        html += `
            <div style="margin-bottom: 30px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                <div style="background: #667eea; color: white; padding: 15px;">
                    <h3 style="margin: 0; font-size: 18px;">${escapeHTML(student.name)}</h3>
                    <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Gesamtfortschritt: ${student.totalProgress}%</p>
                </div>
                <div style="padding: 20px;">
        `;

        competencies.forEach(comp => {
            const rating = student.ratings[comp.id] || 0;
            const stars = '★'.repeat(rating) + '☆'.repeat(MAX_RATING - rating);
            const percentage = (rating / MAX_RATING) * 100;

            html += `
                <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #f0f0f0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="font-weight: 500;">${escapeHTML(comp.name)}</span>
                        <span style="color: #f6ad55; font-size: 18px;">${stars}</span>
                    </div>
                    <div style="font-size: 12px; color: #888; margin-bottom: 8px;">${escapeHTML(comp.description)}</div>
                    <div style="background: #e2e8f0; height: 6px; border-radius: 3px; overflow: hidden;">
                        <div style="background: #667eea; width: ${percentage}%; height: 100%;"></div>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    html += `</div>`;
    
    container.innerHTML = html;
}

// Fortschrittsbericht (Placeholder)
function generateProgressReport(className, students, container) {
    container.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); text-align: center;">
            <div style="font-size: 48px; margin-bottom: 20px;">📈</div>
            <h2 style="color: #667eea; margin-bottom: 10px;">Fortschritt über Zeit</h2>
            <p style="color: #888;">Diese Funktion wird in einer zukünftigen Version verfügbar sein.</p>
            <p style="color: #888; font-size: 14px; margin-top: 10px;">
                Hier werden Charts angezeigt, die den Fortschritt der Klasse über die Zeit darstellen.
            </p>
        </div>
    `;
}

// PDF Export für Berichte
window.exportReportAsPDF = async function(className) {
    try {
        const reportContainer = document.getElementById('reportContainer');
        const reportType = document.getElementById('reportType').value;

        if (!reportContainer || !reportContainer.innerHTML.trim()) {
            showNotification('Bitte erstelle zuerst einen Bericht!', 'error');
            return;
        }

        showNotification('PDF wird erstellt...', 'info');

        // Berichtstyp-Namen für Datei
        const reportTypeNames = {
            'overview': 'Uebersicht',
            'detailed': 'Detailliert',
            'progress': 'Fortschritt'
        };
        const typeName = reportTypeNames[reportType] || 'Bericht';

        // Aktuelles Datum für Dateinamen
        const date = new Date().toISOString().split('T')[0];
        const fileName = `Bericht_${typeName}_${className}_${date}.pdf`;

        // Klone den Container für PDF-Export (um Original nicht zu ändern)
        const clone = reportContainer.cloneNode(true);

        // Entferne den Export-Button aus dem Clone
        const exportButton = clone.querySelector('button[onclick*="exportReportAsPDF"]');
        if (exportButton) {
            exportButton.remove();
        }

        // PDF-Optionen
        const opt = {
            margin: [10, 10, 10, 10],
            filename: fileName,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                letterRendering: true
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'portrait'
            },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        // PDF generieren und herunterladen
        await html2pdf().set(opt).from(clone).save();

        showNotification('PDF erfolgreich erstellt!', 'success');
    } catch (error) {
        console.error('Fehler beim PDF-Export:', error);
        showNotification('Fehler beim PDF-Export: ' + error.message, 'error');
    }
};

// ============= DETAILLIERTE SCHÜLER-ANSICHT =============

// Schüler-Details anzeigen und bearbeiten
window.showStudentDetails = async function(studentId) {
    showLoading(true);

    try {
        const studentDoc = await getDoc(doc(window.db, 'users', studentId));
        const progressDoc = await getDoc(doc(window.db, 'progress', studentId));

        if (!studentDoc.exists()) {
            showNotification('Schüler nicht gefunden!', 'error');
            return;
        }

        const studentData = studentDoc.data();
        const ratings = progressDoc.exists() ? (progressDoc.data().ratings || {}) : {};

        // Fortschritt berechnen
        const progress = calculateProgress(ratings);

        // Artefakte des Schülers laden
        const allArtifacts = await loadStudentArtifacts(studentId);
        const totalArtifacts = allArtifacts.length;
        
        // Alle Klassen für Dropdown laden
        const classesSnapshot = await getDocs(collection(window.db, 'classes'));
        const classes = [];
        classesSnapshot.forEach((doc) => {
            classes.push({ id: doc.id, ...doc.data() });
        });
        classes.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        
        // Modal erstellen
        const modal = document.createElement('div');
        modal.id = 'studentModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s;
        `;
        
        let classOptions = '<option value="">Keine Klasse</option>';
        classes.forEach(classData => {
            const selected = classData.name === studentData.class ? 'selected' : '';
            classOptions += `<option value="${classData.name}" ${selected}>${classData.name}</option>`;
        });
        
        let competenciesHTML = '';
        competencies.forEach(comp => {
            const rating = ratings[comp.id] || 0;
            const stars = '★'.repeat(rating) + '☆'.repeat(MAX_RATING - rating);
            const percentage = (rating / MAX_RATING) * 100;

            competenciesHTML += `
                <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #f0f0f0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span style="font-weight: 500; font-size: 14px;">${escapeHTML(comp.name)}</span>
                        <span style="color: #f6ad55; font-size: 16px;">${stars}</span>
                    </div>
                    <div style="font-size: 12px; color: #888; margin-bottom: 8px;">${escapeHTML(comp.description)}</div>
                    <div style="background: #e2e8f0; height: 6px; border-radius: 3px; overflow: hidden;">
                        <div style="background: #667eea; width: ${percentage}%; height: 100%;"></div>
                    </div>
                </div>
            `;
        });
        
        modal.innerHTML = `
            <div style="background: white; border-radius: 16px; max-width: 600px; width: 90%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 16px 16px 0 0;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                            <h2 style="margin: 0; font-size: 24px;">👤 ${escapeHTML(studentData.name)}</h2>
                            <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">${escapeHTML(studentData.email)}</p>
                        </div>
                        <button onclick="document.getElementById('studentModal').remove()"
                                style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 18px;">
                            ✕
                        </button>
                    </div>
                    <div style="margin-top: 20px; display: flex; gap: 15px; flex-wrap: wrap;">
                        <div style="background: rgba(255,255,255,0.2); padding: 12px 20px; border-radius: 8px; flex: 1; min-width: 120px;">
                            <div style="font-size: 12px; opacity: 0.9;">Klasse</div>
                            <div style="font-size: 20px; font-weight: bold; margin-top: 2px;">${studentData.class || 'Keine'}</div>
                        </div>
                        <div style="background: rgba(255,255,255,0.2); padding: 12px 20px; border-radius: 8px; flex: 1; min-width: 120px;">
                            <div style="font-size: 12px; opacity: 0.9;">Fortschritt</div>
                            <div style="font-size: 20px; font-weight: bold; margin-top: 2px;">${progress}%</div>
                        </div>
                        <div style="background: rgba(255,255,255,0.2); padding: 12px 20px; border-radius: 8px; flex: 1; min-width: 120px;">
                            <div style="font-size: 12px; opacity: 0.9;">Artefakte</div>
                            <div style="font-size: 20px; font-weight: bold; margin-top: 2px;">${totalArtifacts} 📎</div>
                        </div>
                    </div>
                </div>
                
                <div style="padding: 25px;">
                    <div style="margin-bottom: 25px;">
                        <h3 style="margin: 0 0 15px 0; color: #667eea; font-size: 18px;">📝 Schüler bearbeiten</h3>
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #4a5568; font-size: 14px;">Name</label>
                            <input type="text" id="editStudentName" value="${studentData.name}" 
                                   style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                        </div>
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; margin-bottom: 5px; font-weight: 500; color: #4a5568; font-size: 14px;">Klasse</label>
                            <select id="editStudentClass" 
                                    style="width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px;">
                                ${classOptions}
                            </select>
                        </div>
                        <button onclick="saveStudentChanges('${studentId}')" 
                                style="background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; width: 100%;">
                            💾 Änderungen speichern
                        </button>
                    </div>

                    <div style="margin-bottom: 25px;">
                        <h3 style="margin: 0 0 15px 0; color: #667eea; font-size: 18px;">📊 Kompetenzen</h3>
                        ${competenciesHTML}
                    </div>

                    ${totalArtifacts > 0 ? `
                    <div>
                        <h3 style="margin: 0 0 15px 0; color: #667eea; font-size: 18px;">📎 Hochgeladene Artefakte (${totalArtifacts})</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; max-height: 300px; overflow-y: auto;">
                            ${allArtifacts.map(artifact => {
                                const isImage = artifact.fileType.startsWith('image/');
                                const uploadDate = artifact.uploadedAt ? new Date(artifact.uploadedAt.toMillis()).toLocaleDateString('de-DE') : 'Unbekannt';
                                const fileIcon = getFileIcon(artifact.fileType);
                                const compName = artifact.competencyName || 'Unbekannt';

                                return `
                                    <div style="background: #f8f9fa; border-radius: 8px; padding: 10px; text-align: center; border: 2px solid #e0e0e0;">
                                        <div style="margin-bottom: 8px;">
                                            ${isImage
                                                ? `<img src="${artifact.downloadUrl}" alt="${escapeHTML(artifact.fileName)}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 5px;">`
                                                : `<div style="font-size: 32px; margin: 10px 0;">${fileIcon}</div>`
                                            }
                                        </div>
                                        <div style="font-size: 10px; font-weight: bold; color: #333; margin-bottom: 3px; word-break: break-word;">
                                            ${escapeHTML(artifact.fileName.length > 20 ? artifact.fileName.substring(0, 20) + '...' : artifact.fileName)}
                                        </div>
                                        <div style="font-size: 9px; color: #888; margin-bottom: 3px;">
                                            ${escapeHTML(compName)}
                                        </div>
                                        <div style="font-size: 9px; color: #888;">
                                            ${uploadDate}
                                        </div>
                                        <button onclick="window.open('${artifact.downloadUrl}', '_blank')"
                                                style="background: #667eea; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 10px; margin-top: 5px; width: 100%;">
                                            📥 Öffnen
                                        </button>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
    } catch (error) {
        console.error('Fehler beim Laden der Schüler-Details:', error);
        showNotification('Fehler beim Laden der Details!', 'error');
    } finally {
        showLoading(false);
    }
};

// Schüler-Änderungen speichern
window.saveStudentChanges = async function(studentId) {
    const newName = document.getElementById('editStudentName').value;
    const newClass = document.getElementById('editStudentClass').value;

    if (!newName || !newName.trim()) {
        showNotification('Name darf nicht leer sein!', 'error');
        return;
    }

    showLoading(true);

    try {
        await updateDoc(doc(window.db, 'users', studentId), {
            name: newName.trim(),
            class: newClass
        });

        showNotification('Schüler erfolgreich aktualisiert!', 'success');

        // Modal sicher schließen (mit ID oder data-Attribut)
        const modal = document.getElementById('studentModal');
        if (modal) {
            modal.remove();
        }

        // Schülerliste neu laden
        setupRealtimeStudentUpdates();

    } catch (error) {
        console.error('Fehler beim Speichern:', error);
        showNotification('Fehler beim Speichern: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
};

// ============= LEHRER: KOMPETENZEN IMPORT/EXPORT/EDIT/DELETE =============

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
        // Zuerst aus allen Schüler-Fortschritten entfernen
        try {
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
        } catch (progressError) {
            // Fehler beim Aktualisieren der Progress-Daten ignorieren
            console.warn('Fehler beim Aktualisieren der Schüler-Fortschritte:', progressError);
        }
        
        // Dann Kompetenz löschen
        await deleteDoc(doc(window.db, 'competencies', competencyId));
        
        showNotification('Kompetenz erfolgreich gelöscht!', 'success');
        
        // Kompetenzen neu laden
        await loadCompetencies();
        await loadCompetencyManager();
        
    } catch (error) {
        console.error('Lösch-Fehler:', error);
        
        // Prüfen ob die Kompetenz trotzdem gelöscht wurde
        const checkDoc = await getDoc(doc(window.db, 'competencies', competencyId));
        
        if (!checkDoc.exists()) {
            // Kompetenz wurde erfolgreich gelöscht, trotz Fehler
            showNotification('Kompetenz erfolgreich gelöscht!', 'success');
            await loadCompetencies();
            await loadCompetencyManager();
        } else {
            // Tatsächlicher Fehler
            showNotification('Fehler beim Löschen: ' + error.message, 'error');
        }
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
        if (newName === null) return;
        
        const newDescription = prompt('Neue Beschreibung:', data.description);
        if (newDescription === null) return;
        
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
            progress = calculateProgress(ratings);
        }

        const card = document.createElement('div');
        card.className = 'student-card';
        card.style.cursor = 'pointer';
        card.onclick = () => showStudentDetails(student.id);

        // HTML escaping für Sicherheit
        const escapedName = escapeHTML(student.name);
        const escapedClass = escapeHTML(student.class || 'Keine');

        card.innerHTML = `
            <div class="student-name">${escapedName}</div>
            <div class="student-info">Klasse: ${escapedClass}</div>
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

// Schüler filtern (für Suchfeld)
window.filterStudents = function() {
    const searchTerm = document.getElementById('studentSearch')?.value.toLowerCase() || '';
    const classFilter = document.getElementById('classFilter')?.value || '';

    const allCards = document.querySelectorAll('.student-card');

    allCards.forEach(card => {
        const name = card.querySelector('.student-name')?.textContent.toLowerCase() || '';
        const classInfo = card.querySelector('.student-info')?.textContent || '';

        const matchesSearch = name.includes(searchTerm);
        const matchesClass = !classFilter || classInfo.includes(classFilter);

        if (matchesSearch && matchesClass) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
};

// Schülerliste manuell aktualisieren
window.refreshStudentList = function() {
    showNotification('Aktualisiere Schülerliste...', 'info');
    setupRealtimeStudentUpdates();
};

// ============= UI HELFER =============

// HTML Escaping für XSS-Schutz
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Email-Validierung
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Fortschritt berechnen (wiederverwendbare Funktion)
function calculateProgress(ratings) {
    if (!competencies.length) return 0;
    const totalPossible = competencies.length * MAX_RATING;
    const currentTotal = Object.values(ratings || {}).reduce((sum, rating) => sum + rating, 0);
    return totalPossible > 0 ? Math.round((currentTotal / totalPossible) * 100) : 0;
}

// Tab wechseln
window.switchTab = function(tabId, event) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });

    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(tabId).classList.remove('hidden');

    // Event kann undefined sein, wenn direkt aufgerufen
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // Fallback: Button anhand tabId finden
        const targetButton = document.querySelector(`button[onclick*="${tabId}"]`);
        if (targetButton) {
            targetButton.classList.add('active');
        }
    }

    // Daten für den jeweiligen Tab laden
    if (tabId === 'classes-tab') {
        loadClassesManager();
    } else if (tabId === 'students-tab') {
        // Schüler sind bereits geladen durch Realtime-Updates
    } else if (tabId === 'reports-tab') {
        loadReportsTab();
    }
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
    for (let i = 1; i <= MAX_RATING; i++) {
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

// ============= ARTEFAKT-UPLOAD UND -VERWALTUNG =============

// Artefakt hochladen
window.uploadArtifact = async function(competencyId, competencyName) {
    if (!currentUser || userRole !== 'student') {
        showNotification('Nur Schüler können Artefakte hochladen!', 'error');
        return;
    }

    // File Input erstellen
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ALLOWED_FILE_TYPES.join(',');

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Dateigröße prüfen
        if (file.size > MAX_FILE_SIZE) {
            showNotification(`Datei ist zu groß! Maximal ${MAX_FILE_SIZE / 1024 / 1024}MB erlaubt.`, 'error');
            return;
        }

        // Dateityp prüfen
        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            showNotification('Dieser Dateityp wird nicht unterstützt!', 'error');
            return;
        }

        // Beschreibung abfragen
        const description = prompt('Kurze Beschreibung des Artefakts (optional):') || '';

        showLoading(true);
        showNotification('Datei wird hochgeladen...', 'info');

        try {
            // Eindeutigen Dateinamen generieren
            const timestamp = Date.now();
            const fileName = `${timestamp}_${file.name}`;
            const storagePath = `artifacts/${currentUser.uid}/${competencyId}/${fileName}`;

            // Datei zu Firebase Storage hochladen
            const storageRef = ref(window.storage, storagePath);
            const snapshot = await uploadBytes(storageRef, file);

            // Download-URL abrufen
            const downloadUrl = await getDownloadURL(snapshot.ref);

            // Metadaten in Firestore speichern
            await setDoc(doc(collection(window.db, 'artifacts')), {
                userId: currentUser.uid,
                competencyId: competencyId,
                competencyName: competencyName,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
                storagePath: storagePath,
                downloadUrl: downloadUrl,
                description: description.trim(),
                uploadedAt: serverTimestamp()
            });

            showNotification('Artefakt erfolgreich hochgeladen! 🎉', 'success');

            // Artefakte neu laden
            await loadArtifacts(competencyId);

        } catch (error) {
            console.error('Upload-Fehler:', error);
            showNotification('Fehler beim Hochladen: ' + error.message, 'error');
        } finally {
            showLoading(false);
        }
    };

    input.click();
};

// Artefakte für eine Kompetenz laden
async function loadArtifacts(competencyId) {
    if (!currentUser) return [];

    try {
        const q = query(
            collection(window.db, 'artifacts'),
            where('userId', '==', currentUser.uid),
            where('competencyId', '==', competencyId)
        );

        const querySnapshot = await getDocs(q);
        const artifacts = [];

        querySnapshot.forEach((doc) => {
            artifacts.push({ id: doc.id, ...doc.data() });
        });

        // Nach Upload-Datum sortieren (neueste zuerst)
        artifacts.sort((a, b) => {
            const timeA = a.uploadedAt?.toMillis() || 0;
            const timeB = b.uploadedAt?.toMillis() || 0;
            return timeB - timeA;
        });

        return artifacts;

    } catch (error) {
        console.error('Fehler beim Laden der Artefakte:', error);
        return [];
    }
}

// Alle Artefakte eines Schülers laden (für Lehrer)
async function loadStudentArtifacts(studentId) {
    try {
        const q = query(
            collection(window.db, 'artifacts'),
            where('userId', '==', studentId)
        );

        const querySnapshot = await getDocs(q);
        const artifacts = [];

        querySnapshot.forEach((doc) => {
            artifacts.push({ id: doc.id, ...doc.data() });
        });

        // Nach Upload-Datum sortieren (neueste zuerst)
        artifacts.sort((a, b) => {
            const timeA = a.uploadedAt?.toMillis() || 0;
            const timeB = b.uploadedAt?.toMillis() || 0;
            return timeB - timeA;
        });

        return artifacts;

    } catch (error) {
        console.error('Fehler beim Laden der Schüler-Artefakte:', error);
        return [];
    }
}

// Artefakt löschen
window.deleteArtifact = async function(artifactId, storagePath) {
    if (!confirm('Möchtest du dieses Artefakt wirklich löschen?')) {
        return;
    }

    showLoading(true);

    try {
        // Datei aus Storage löschen
        const storageRef = ref(window.storage, storagePath);
        await deleteObject(storageRef);

        // Metadaten aus Firestore löschen
        await deleteDoc(doc(window.db, 'artifacts', artifactId));

        showNotification('Artefakt erfolgreich gelöscht!', 'success');

        // Ansicht aktualisieren
        if (userRole === 'student') {
            await loadUserData();
        }

    } catch (error) {
        console.error('Fehler beim Löschen:', error);
        showNotification('Fehler beim Löschen: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
};

// Artefakte für Schüler anzeigen
window.showArtifactsModal = async function(competencyId, competencyName) {
    showLoading(true);

    try {
        const artifacts = await loadArtifacts(competencyId);

        // Modal erstellen
        const modal = document.createElement('div');
        modal.id = 'artifactsModal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s;
        `;

        let artifactsHTML = '';

        if (artifacts.length === 0) {
            artifactsHTML = `
                <div style="text-align: center; padding: 40px; color: #888;">
                    <p style="font-size: 18px; margin-bottom: 10px;">📦 Noch keine Artefakte vorhanden</p>
                    <p style="font-size: 14px;">Lade dein erstes Artefakt hoch!</p>
                </div>
            `;
        } else {
            artifactsHTML = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">';

            artifacts.forEach(artifact => {
                const isImage = artifact.fileType.startsWith('image/');
                const uploadDate = artifact.uploadedAt ? new Date(artifact.uploadedAt.toMillis()).toLocaleDateString('de-DE') : 'Unbekannt';
                const fileIcon = getFileIcon(artifact.fileType);

                artifactsHTML += `
                    <div class="artifact-card" style="background: #f8f9fa; border-radius: 10px; padding: 15px; text-align: center; border: 2px solid #e0e0e0; transition: all 0.3s;">
                        <div style="margin-bottom: 10px;">
                            ${isImage
                                ? `<img src="${artifact.downloadUrl}" alt="${escapeHTML(artifact.fileName)}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 8px;">`
                                : `<div style="font-size: 48px; margin: 20px 0;">${fileIcon}</div>`
                            }
                        </div>
                        <div style="font-size: 12px; font-weight: bold; color: #333; margin-bottom: 5px; word-break: break-word;">
                            ${escapeHTML(artifact.fileName)}
                        </div>
                        <div style="font-size: 11px; color: #888; margin-bottom: 5px;">
                            ${formatFileSize(artifact.fileSize)}
                        </div>
                        <div style="font-size: 11px; color: #888; margin-bottom: 10px;">
                            ${uploadDate}
                        </div>
                        ${artifact.description ? `<div style="font-size: 11px; color: #666; font-style: italic; margin-bottom: 10px;">"${escapeHTML(artifact.description)}"</div>` : ''}
                        <div style="display: flex; gap: 5px; justify-content: center;">
                            <button onclick="window.open('${artifact.downloadUrl}', '_blank')"
                                    style="background: #667eea; color: white; border: none; padding: 6px 12px; border-radius: 5px; cursor: pointer; font-size: 12px;">
                                📥 Öffnen
                            </button>
                            <button onclick="deleteArtifact('${artifact.id}', '${artifact.storagePath}')"
                                    style="background: #f56565; color: white; border: none; padding: 6px 12px; border-radius: 5px; cursor: pointer; font-size: 12px;">
                                🗑️ Löschen
                            </button>
                        </div>
                    </div>
                `;
            });

            artifactsHTML += '</div>';
        }

        modal.innerHTML = `
            <div style="background: white; border-radius: 16px; max-width: 800px; width: 90%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 16px 16px 0 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h2 style="margin: 0; font-size: 20px;">📦 Meine Artefakte</h2>
                        <button onclick="document.getElementById('artifactsModal').remove()"
                                style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 18px;">
                            ✕
                        </button>
                    </div>
                    <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 14px;">${escapeHTML(competencyName)}</p>
                </div>

                <div style="padding: 25px;">
                    <div style="margin-bottom: 20px;">
                        <button onclick="uploadArtifact('${competencyId}', '${escapeHTML(competencyName)}'); document.getElementById('artifactsModal').remove();"
                                style="background: #48bb78; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 600; width: 100%;">
                            ➕ Neues Artefakt hochladen
                        </button>
                    </div>

                    ${artifactsHTML}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

    } catch (error) {
        console.error('Fehler beim Laden der Artefakte:', error);
        showNotification('Fehler beim Laden der Artefakte!', 'error');
    } finally {
        showLoading(false);
    }
};

// Dateityp-Icon ermitteln
function getFileIcon(fileType) {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word')) return '📝';
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📊';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📽️';
    if (fileType.startsWith('video/')) return '🎬';
    if (fileType.startsWith('text/')) return '📃';
    return '📁';
}

// Dateigröße formatieren
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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
        
        // PDF generieren
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Titel
        doc.setFontSize(20);
        doc.text('Digitaler Kompetenzpass', 20, 20);
        
        doc.setFontSize(12);
        doc.text(`Name: ${userData.name}`, 20, 35);
        doc.text(`Klasse: ${userData.class}`, 20, 42);
        doc.text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, 20, 49);
        
        // Kompetenzen
        let yPos = 65;
        doc.setFontSize(14);
        doc.text('Meine Kompetenzen:', 20, yPos);
        yPos += 10;
        
        doc.setFontSize(10);
        competencies.forEach(comp => {
            const rating = ratings[comp.id] || 0;
            const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
            
            doc.text(`${comp.name}: ${stars}`, 20, yPos);
            yPos += 7;
            
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }
        });
        
        doc.save(`Kompetenzpass_${userData.name}_${new Date().toISOString().split('T')[0]}.pdf`);
        showNotification('PDF erfolgreich erstellt!', 'success');
    } catch (error) {
        console.error('Fehler beim Export:', error);
        showNotification('Fehler beim PDF-Export!', 'error');
    }
};

// Fortschritt teilen (Placeholder)
window.shareProgress = function() {
    showNotification('Teilen-Funktion kommt bald!', 'info');
};
