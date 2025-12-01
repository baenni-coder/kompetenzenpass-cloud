# 🎓 Digitaler Kompetenzpass (Cloud Version)

Ein cloud-basiertes System zur Erfassung und Verfolgung von Kompetenzen im Bildungsbereich. Schüler können ihre Fähigkeiten selbst bewerten, während Lehrpersonen Kompetenzen verwalten, Klassen organisieren und Fortschrittsberichte einsehen.

## ✨ Features

### Für Schüler
- ⭐ **Selbstbewertung** mit 5-Sterne-System
- 📱 **Hierarchische Kompetenz-Struktur** basierend auf Lehrplan Informatik & Medien
- 🎯 **Automatische Filterung** nach Klassenstufe
- 💡 **Indikatoren** - Konkrete "Ich kann..."-Aussagen für granulare Bewertung
- 🏆 **Badges & Achievements** - 16 automatische Badges + unbegrenzt Lehrer-Badges (NEU 2025-12-01)
  - Automatische Vergabe bei Meilensteinen
  - Badge-Showcase im Dashboard
  - Animierte Benachrichtigungen
  - Seltenheitssystem: Common 🟢, Rare 🔵, Epic 🟣, Legendary 🟡
- 📊 **Fortschrittsanzeige** mit Gesamtübersicht
- 📎 **Artefakte hochladen** als Nachweise
- 📄 **PDF-Export** des persönlichen Kompetenzpasses (inkl. Badges)
- 🔄 **Echtzeit-Synchronisation** über alle Geräte

### Für Lehrpersonen
- 👥 **Schülerverwaltung** mit Klassen-Organisation
- ✨ **Bulk-Import** - Mehrere Schüler auf einmal anlegen (2025-11-30)
- 🔑 **Automatische Zugangsdaten** - Sichere Passwörter & E-Mail-Generierung
- 🖨️ **Druckbare Übersicht** - Zugangsdaten als Liste oder PDF exportieren
- 🗑️ **Schüler löschen** - Vollständige Datenlöschung inkl. Artefakte
- ⭐ **Bulk-Bewertung** - Mehreren Schülern gleichzeitig Sterne zuweisen (2025-11-30)
- 🏆 **Badge-Verwaltung** - Komplettes Badge-Management-System (NEU 2025-12-01)
  - Eigene Badges erstellen (Name, Emoji, Seltenheit, Farbe)
  - Badges manuell an Schüler verleihen (mit Begründung)
  - Übersicht aller System- und Custom-Badges
  - Kürzlich verliehene Badges einsehen
- 📚 **87 Lehrplan-Kompetenzen** vordefiniert (Import-Tool)
- 🏫 **Klassenstufen-Verwaltung** (KiGa bis 9. Klasse)
- 💡 **Indikator-Verwaltung** - "Ich kann..."-Aussagen für jede Kompetenzstufe definieren
- 📈 **Fortschritts-Reports** für einzelne Schüler und Klassen
- ⚙️ **Kompetenz-Management** (Erstellen, Bearbeiten, Löschen)
- 📊 **Echtzeit-Übersicht** aller Schülerfortschritte

## 🏗️ Hierarchische Kompetenz-Struktur

```
📱 Kompetenzbereich (z.B. "Medien")
  └── 📚 Kompetenz (z.B. "Die Schülerinnen und Schüler können sich in der physischen Umwelt...")
       └── ⭐ Kompetenzstufe (z.B. "IB.1.1.a - können sich über Erfahrungen...")
            ├── LP-Code: IB.1.1.a
            ├── Zyklus: 1, 2, oder 3
            ├── Klassenstufe: KiGa, 1./2., 3./4., 5./6., 7., 8., 9.
            └── Grundanspruch: Ja/Nein
```

**3 Kompetenzbereiche:**
1. 📱 **Medien** - Medienkompetenz
2. 💻 **Informatik** - Informatische Bildung
3. 🎯 **Anwendungskompetenzen** - Praktische Anwendungen

## 🚀 Schnellstart

### 1. Firebase Setup
1. Firebase-Projekt erstellen: https://console.firebase.google.com
2. Firestore Database aktivieren
3. Authentication aktivieren (E-Mail/Passwort)
4. Firebase Config in `index.html` eintragen (Zeile 18-25)

### 2. Firestore Security Rules
Wichtig! Firestore Rules in der Firebase Console setzen:
- Siehe `CLAUDE.md` für vollständige Rules
- Rules schützen Daten basierend auf Benutzer-Rollen

### 3. Kompetenzen importieren
1. `import-competencies.html` im Browser öffnen
2. Als Lehrer anmelden
3. Auf "Import starten" klicken
4. Wartet bis 87 Kompetenzstufen importiert sind

### 4. Erste Schritte
**Als Lehrer:**
1. Klasse erstellen mit Klassenstufe (z.B. "7a", Stufe "7")
2. **Schüler anlegen** mit Bulk-Import:
   - Tab "Schüler" → "➕ Mehrere Schüler anlegen"
   - Namen eingeben (einer pro Zeile)
   - E-Mail-Domain festlegen
   - Zugangsdaten ausdrucken oder als PDF speichern
3. Zugangsdaten an Schüler verteilen

**Als Schüler:**
1. Mit erhaltenen Zugangsdaten anmelden
2. Kompetenzen bewerten (1-5 Sterne)
3. Optional: Artefakte hochladen
4. Fortschritt verfolgen

## 📁 Dateistruktur

```
kompetenzenpass-cloud/
├── index.html                    # Haupt-App
├── app-firebase.js               # App-Logik (~110KB, inkl. Schülerverwaltung)
├── style.css                     # Styling (~15KB)
├── import-competencies.html      # Import-Tool für Lehrplan-Kompetenzen
├── Kompetenzen-Lehrplan.csv      # Lehrplan-Daten (87 Kompetenzstufen)
├── parse-csv.js                  # CSV-Parser Utility
├── firestore.rules               # Firestore Security Rules
├── CLAUDE.md                     # Ausführliche Dokumentation
└── README.md                     # Diese Datei
```

## 💻 Tech Stack

- **Vanilla JavaScript** (ES6 Module) - Kein Framework
- **Firebase 10.7.1**
  - Authentication (E-Mail/Passwort)
  - Firestore (Echtzeit-Datenbank)
  - Storage (Datei-Uploads)
- **jsPDF** - PDF-Export
- **CSS3** - Animationen und responsive Design

## 🎯 Klassenstufen-Filter

Schüler sehen nur Kompetenzen ihrer Klassenstufe:

1. Lehrer weist Klasse eine Stufe zu (z.B. "7")
2. Schüler wird Klasse zugeordnet (z.B. "7a")
3. App zeigt nur Kompetenzen für Stufe "7"
4. Automatisches, flexibles Matching

## 📊 Firebase Collections

- **users** - Benutzer (Schüler & Lehrer)
- **classes** - Klassen mit Klassenstufe
- **progress** - Schüler-Bewertungen (inkl. Indikator-Bewertungen)
- **competencyAreas** - 3 Kompetenzbereiche
- **competencies** - Kompetenz-Gruppen
- **competencyLevels** - 87 Kompetenzstufen
- **competencyIndicators** - "Ich kann..."-Aussagen zu Kompetenzstufen
- **artifacts** - Hochgeladene Dateien
- **userBadges** - Verliehene Badges (NEU 2025-12-01)
- **customBadges** - Von Lehrern erstellte Badges (NEU 2025-12-01)

Details siehe `CLAUDE.md`

## 🔒 Sicherheit

- ✅ Firebase Authentication erforderlich
- ✅ Firestore Security Rules (Rollen-basiert)
- ✅ Input Sanitization
- ✅ File Upload Validierung
- ⚠️ API Key sichtbar (normal für Client-Apps, Rules schützen Daten)

## 📝 Lizenz

Dieses Projekt ist für Bildungszwecke gedacht.

## 🙏 Credits

Basierend auf dem Lehrplan Informatik & Medien (Schweiz)

## 📚 Dokumentation

Ausführliche Dokumentation für Entwickler: siehe **CLAUDE.md**

## 🐛 Known Issues

- Offline-Modus nicht unterstützt
- PDF-Export nur für einzelne Schüler (kein Klassen-Batch-Export)
- Firebase Auth-Konten werden beim Löschen nicht entfernt (erfordert Cloud Functions)

## ✅ Kürzlich implementiert

### 2025-12-01 - Badge System
- 🏆 **Badges & Achievements System**
  - 16 automatische Badges (Meilensteine, Bereichs-Experten, Zeitbasiert)
  - Lehrer können eigene Badges erstellen
  - Manuelle Badge-Vergabe mit Begründung
  - Badge-Showcase im Schüler-Dashboard (immer sichtbar)
  - Animierte Badge-Benachrichtigungen
  - Rarity-System (Common, Rare, Epic, Legendary)
  - PDF-Export inkl. Badges mit geometrischen Icons (Unicode-Workaround)

### 2025-11-30 - Schülerverwaltung & Bulk-Bewertung
- ✨ **Bulk-Import** für Schüler
- 🔑 **Automatische Passwort-Generierung**
- 🖨️ **Druckbare Zugangsdaten-Übersicht**
- 🗑️ **Schüler löschen** mit vollständiger Datenbereinigung
- ⭐ **Bulk-Bewertung** - Mehreren Schülern gleichzeitig Sterne zuweisen

## 🔮 Future Ideas

- Timeline des Kompetenzfortschritts
- Lehrer-Kommentare
- Eltern-Zugang (read-only)
- CSV-Import für Schülerlisten (zusätzlich zu Text-Input)
- Dark Mode
- Multi-Sprach-Support
- Passwort-Reset-Funktion
- Cloud Functions für vollständige User-Löschung
- Activity-Tracking für erweiterte zeitbasierte Badges
- Badge-Statistiken und Leaderboards pro Klasse
