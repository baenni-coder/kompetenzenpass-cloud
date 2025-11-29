# 🎓 Digitaler Kompetenzpass (Cloud Version)

Ein cloud-basiertes System zur Erfassung und Verfolgung von Kompetenzen im Bildungsbereich. Schüler können ihre Fähigkeiten selbst bewerten, während Lehrpersonen Kompetenzen verwalten, Klassen organisieren und Fortschrittsberichte einsehen.

## ✨ Features

### Für Schüler
- ⭐ **Selbstbewertung** mit 5-Sterne-System
- 📱 **Hierarchische Kompetenz-Struktur** basierend auf Lehrplan Informatik & Medien
- 🎯 **Automatische Filterung** nach Klassenstufe
- 💡 **Indikatoren** - Konkrete "Ich kann..."-Aussagen für granulare Bewertung
- 📊 **Fortschrittsanzeige** mit Gesamtübersicht
- 📎 **Artefakte hochladen** als Nachweise
- 📄 **PDF-Export** des persönlichen Kompetenzpasses
- 🔄 **Echtzeit-Synchronisation** über alle Geräte

### Für Lehrpersonen
- 👥 **Schülerverwaltung** mit Klassen-Organisation
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
2. Schüler registrieren oder Zugänge erstellen
3. Schüler zur Klasse zuweisen

**Als Schüler:**
1. Registrieren oder mit Zugangsdaten anmelden
2. Kompetenzen bewerten (1-5 Sterne)
3. Artefakte hochladen
4. Fortschritt verfolgen

## 📁 Dateistruktur

```
kompetenzenpass-cloud/
├── index.html                    # Haupt-App
├── app-firebase.js               # App-Logik (~100KB, inkl. Indikatoren)
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
- Keine Batch-Operations für Schüler-Import
- PDF-Export nur für einzelne Schüler

## 🔮 Future Ideas

- Timeline des Kompetenzfortschritts
- Badges/Achievements System
- Lehrer-Kommentare
- Eltern-Zugang (read-only)
- CSV-Import für Schülerlisten
- Dark Mode
- Multi-Sprach-Support
