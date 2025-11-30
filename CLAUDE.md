# CLAUDE.md - Digitaler Kompetenzpass (Cloud Version)

**Last Updated:** 2025-11-30
**Repository:** baenni-coder/kompetenzenpass-cloud
**Language:** German (UI and comments)

## Project Overview

This is a cloud-based digital competency tracking system (Kompetenzpass) for educational settings. Students can self-assess their competencies using a star-rating system, while teachers can manage competencies, classes, and view student progress reports. All data is stored in Firebase Firestore with real-time synchronization.

### Purpose
- Students track their skill progress across various competencies
- Teachers manage competencies, classes, and monitor student progress
- **Teachers can bulk-create student accounts with auto-generated credentials**
- **Teachers can bulk-assign star ratings to multiple students at once**
- **Printable access credentials overview for easy distribution**
- Real-time cloud synchronization across devices
- PDF export functionality for competency reports

## Technology Stack

### Frontend
- **Vanilla JavaScript (ES6 Modules)** - No framework, pure JavaScript
- **HTML5** - Semantic markup with embedded Firebase config
- **CSS3** - Gradient backgrounds, animations, responsive design
- **Firebase SDK v10.7.1** (via CDN)
  - Firebase Auth - User authentication
  - Firestore - Real-time database

### External Libraries
- **jsPDF 2.5.1** - PDF generation for student reports
- **Firebase SDK** - Modular SDK loaded from `gstatic.com/firebasejs/10.7.1/`

### Hosting
- Designed for static hosting (GitHub Pages compatible)
- No build process or bundler
- All dependencies loaded via CDN

## File Structure

```
kompetenzenpass-cloud/
├── index.html                    # Main app structure & Firebase initialization
├── app-firebase.js               # Core application logic (~110KB)
├── style.css                     # All styling and animations (~14KB)
├── import-competencies.html      # Tool to import curriculum competencies
├── Kompetenzen-Lehrplan.csv      # Curriculum data (87 competency levels)
├── parse-csv.js                  # CSV parser utility
├── CLAUDE.md                     # This file - comprehensive documentation
└── README.md                     # Minimal project description
```

**Simple Architecture:** Core app in 3 files, plus import tool and curriculum data.

**NEW (2025-11-30):** Student management features including bulk creation, deletion, and printable credentials.

## Firebase Configuration

### Collections Schema

#### `users` Collection
```javascript
{
  name: string,           // Student/teacher name
  email: string,          // Authentication email
  role: string,           // "student" or "teacher"
  class: string,          // Class identifier (e.g., "7a")
  createdAt: timestamp,   // Account creation time
  lastActive: timestamp   // Last login time
}
```

#### `progress` Collection
```javascript
{
  ratings: {              // Object mapping competency level IDs to ratings
    [levelId]: number     // Rating value 0-5 stars (e.g., "IB-1-1-a": 4)
  },
  lastUpdated: timestamp  // Last modification time
}
```

#### `classes` Collection
```javascript
{
  name: string,           // Class name (e.g., "7a", "8b")
  description: string,    // Optional description (e.g., "Schuljahr 2024/25")
  grade: string,          // Grade level (e.g., "7", "8", "KiGa", "1./2.", "3./4.")
  createdBy: string,      // UID of teacher who created it
  createdAt: timestamp    // Creation time
}
```

#### `competencyAreas` Collection (NEW - Hierarchical Structure)
```javascript
{
  id: string,             // Area ID (e.g., "medien", "informatik")
  name: string,           // Area name (e.g., "Medien", "Informatik")
  emoji: string,          // Icon emoji (e.g., "📱", "💻")
  order: number           // Display order
}
```

#### `competencies` Collection (Updated - Hierarchical Structure)
```javascript
{
  id: string,             // Competency ID (e.g., "IB-1-1")
  areaId: string,         // Reference to competencyArea (e.g., "medien")
  name: string,           // Full competency description
  lpCodePrefix: string,   // LP code prefix (e.g., "IB.1.1")
  order: number           // Display order
}
```

#### `competencyLevels` Collection (NEW - Hierarchical Structure)
```javascript
{
  id: string,                    // Level ID (LP code with dashes, e.g., "IB-1-1-a")
  competencyId: string,          // Reference to parent competency (e.g., "IB-1-1")
  lpCode: string,                // Full LP code (e.g., "IB.1.1.a")
  description: string,           // Detailed level description
  cycles: array<string>,         // Cycles (e.g., ["Zyklus 1", "Zyklus 2"])
  grades: array<string>,         // Grade levels (e.g., ["KiGa", "1./2."])
  isBasicRequirement: boolean,   // Is this a "Grundanspruch"?
  order: number                  // Display order within competency
}
```

#### `competencyIndicators` Collection (NEW - Granular Assessment)
```javascript
{
  id: string,             // Indicator ID (auto-generated)
  levelId: string,        // Reference to competencyLevel
  text: string,           // "Ich kann..." statement (e.g., "Ich kann die Vor- und Nachteile von Nicknames im Internet erkennen")
  order: number,          // Display order within competency level
  createdBy: string,      // Teacher UID who created it
  createdAt: timestamp    // Creation time
}
```

**How Indicators Work:**
- Teachers define concrete "Ich kann..." statements for each competency level
- Students rate each indicator individually (1-5 stars)
- The parent competency level rating is automatically calculated as the average of all indicator ratings
- Indicators are optional - competency levels without indicators work as before with direct rating
- Indicator ratings are stored in the progress document with the key format: `indicator_[indicatorId]`

#### `artifacts` Collection (File Uploads)
```javascript
{
  userId: string,         // Student UID who uploaded
  competencyId: string,   // Associated competency level ID
  fileName: string,       // Original file name
  fileUrl: string,        // Firebase Storage URL
  fileType: string,       // MIME type
  uploadedAt: timestamp   // Upload time
}
```

### Firebase Security Considerations

⚠️ **Important:** The Firebase config (including API key) is exposed in `index.html:16-24`. This is typical for client-side Firebase apps, but security rules in Firestore are critical.

**Required Firestore Rules:**
- Students can read/write their own progress documents
- Students can read all competencies, areas, and levels
- Teachers can read all documents
- Teachers can write to: users, classes, competencyAreas, competencies, competencyLevels
- Authentication required for all operations
- See Firebase Console for complete rules implementation

## Hierarchical Competency Structure

**NEW Feature (2025-11-28):** The app now uses a three-level hierarchy based on the Swiss "Lehrplan Informatik & Medien":

### Structure Overview

```
📱 Competency Area (Kompetenzbereich)
  └── 📚 Competency Group (Kompetenz)
       └── ⭐ Competency Level (Kompetenzstufe)
            ├── LP Code (e.g., IB.1.1.a)
            ├── Description
            ├── Cycles (Zyklus 1-3)
            ├── Grade Levels (KiGa, 1./2., 3./4., 5./6., 7., 8., 9.)
            └── Basic Requirement Flag
```

### Three Competency Areas

1. **📱 Medien** - Media competencies
2. **💻 Informatik** - Computer science competencies
3. **🎯 Anwendungskompetenzen** - Application competencies

### Grade-Level Filtering

**How it works:**
1. Teachers assign a `grade` (e.g., "7", "8", "3./4.") when creating/editing a class
2. Students are assigned to a class (e.g., "7a")
3. App looks up the class's grade level in Firestore
4. Only competency levels matching that grade are displayed to students
5. Teachers see all competency levels (no filtering)

**Example:**
- Class "7a" has grade "7"
- Student in "7a" sees only competency levels with `grades` array containing "7" or "7./8."
- Flexible matching handles various formats

### Import Process

**Initial Setup:**
1. Open `import-competencies.html`
2. Login as teacher
3. Click "Import starten"
4. Tool imports 87 competency levels from `Kompetenzen-Lehrplan.csv`
5. Creates:
   - 3 competency areas
   - ~10 competency groups
   - 86-87 competency levels

**Data Source:** Official curriculum from Lehrplan Informatik & Medien

## Code Architecture

### Global State
```javascript
let currentUser = null;           // Firebase user object
let userRole = null;              // 'student' or 'teacher'
let competencies = [];            // Cached competency list
let unsubscribeListeners = [];    // Firestore listeners to cleanup
```

### Key Functions and Patterns

#### Authentication Flow
1. `onAuthStateChanged` observer monitors auth state (line 34)
2. On login → `loadUserData()` fetches user role
3. Role-based routing:
   - Students → `showStudentArea()`
   - Teachers → `showTeacherDashboard()`

#### Data Loading Pattern
```javascript
// Real-time listeners pattern
const unsubscribe = onSnapshot(docRef, (snapshot) => {
  // Update UI with new data
});
unsubscribeListeners.push(unsubscribe);  // Track for cleanup
```

#### UI Update Pattern
```javascript
// Always show loading indicator
showLoading(true);
try {
  // Perform async operation
  await someFirebaseOperation();
  showNotification('Success message', 'success');
} catch (error) {
  console.error('Error:', error);
  showNotification('Error message', 'error');
} finally {
  showLoading(false);
}
```

### Important Functions Reference

| Function | Location | Purpose |
|----------|----------|---------|
| `loginStudent()` | app-firebase.js:52 | Student authentication |
| `registerStudent()` | app-firebase.js:74 | New student registration |
| `loginTeacher()` | app-firebase.js:122 | Teacher authentication with role check |
| `loadUserData()` | app-firebase.js:176 | Load user profile and route to correct view |
| `loadCompetencies()` | app-firebase.js:209 | Fetch all competencies from Firestore |
| `updateRating()` | app-firebase.js:329 | Save student rating to Firestore |
| `showStudentDetails()` | app-firebase.js:1472 | Teacher view: Show/edit student details |
| `generateReport()` | app-firebase.js:683 | Generate class reports |
| `exportProgress()` | app-firebase.js:2844 | Export student progress as PDF |
| **`generatePassword()`** | **app-firebase.js:2916** | **Generate secure, readable passwords** |
| **`deleteStudent()`** | **app-firebase.js:2933** | **Delete student with all data (progress, artifacts)** |
| **`bulkCreateStudents()`** | **app-firebase.js:3009** | **Show bulk student creation dialog** |
| **`processBulkStudentCreation()`** | **app-firebase.js:3105** | **Process bulk student creation with credentials** |
| **`showAccessCredentials()`** | **app-firebase.js:3249** | **Display printable credentials overview** |
| **`showClassBulkRating()`** | **app-firebase.js:1156** | **Show bulk star rating dialog for a class** |
| **`executeBulkRating()`** | **app-firebase.js:1590** | **Execute bulk star assignment to multiple students** |
| **`updateStudentRating()`** | **app-firebase.js:1653** | **Update rating for a single student (used by bulk rating)** |

## UI Components

### Three Main Views

1. **Login Area** (`#loginArea`)
   - Student login/registration tabs
   - Teacher login (separate)
   - Role-based authentication

2. **Student Area** (`#mainArea`)
   - Welcome message with name and class
   - Overall progress bar
   - Competency cards with star ratings
   - Export and share buttons

3. **Teacher Dashboard** (`#teacherArea`)
   - Four tabs: Competencies, Students, Classes, Reports
   - Real-time student data
   - CRUD operations for competencies and classes
   - Report generation

### UI Patterns

**Tab Switching:**
```javascript
window.switchTab = function(tabId) {
  // Hide all tabs, show selected
  // Load data specific to that tab
}
```

**Modal Pattern:**
Used in `showStudentDetails()` - Creates a fixed overlay div dynamically

**Star Rating:**
- CSS classes: `.star` and `.star.filled`
- Click handlers update rating (1-5 stars)
- Visual feedback with animations

## Styling Conventions

### Color Palette
```css
Primary: #667eea (Purple)
Secondary: #764ba2 (Dark Purple)
Success: #48bb78 (Green)
Error: #f56565 (Red)
Info: #4299e1 (Blue)
Warning: #ed8936 (Orange)
```

### Key CSS Classes
- `.hidden` - Display none (toggled via JS)
- `.loading-overlay` - Full-screen loading indicator
- `.competency-card` - Student competency display
- `.student-card` - Teacher student grid item
- `.tab-content` - Tab panel (hidden by default)
- `.btn-icon` - Small icon buttons

### Animations
- `slideIn` - Component entry animation
- `slideInRight` / `slideOutRight` - Notification animations
- `starPop` - Star rating visual feedback
- `spin` - Loading spinner rotation

## Development Workflows

### Making Changes to Competencies
1. Teachers access "Kompetenzen" tab
2. Functions: `addNewCompetency()`, `editCompetency()`, `deleteCompetency()`
3. Changes sync to all students in real-time
4. Import/Export JSON format available

### Adding New Features

**Before Adding Code:**
1. Check if Firebase rules need updating
2. Consider real-time sync implications
3. Add loading states for async operations
4. Include error handling with user notifications
5. Test with both student and teacher roles

**Pattern to Follow:**
```javascript
window.myNewFeature = async function() {
  showLoading(true);
  try {
    // Your logic here
    await firebaseOperation();
    showNotification('Erfolg!', 'success');
  } catch (error) {
    console.error('Fehler:', error);
    showNotification('Fehler: ' + error.message, 'error');
  } finally {
    showLoading(false);
  }
};
```

### Testing Considerations

**Test Both Roles:**
- Student view: Rating updates, PDF export, UI responsiveness
- Teacher view: All CRUD operations, real-time updates, reports

**Browser Testing:**
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile responsive breakpoints (@media max-width: 600px)
- IndexedDB/LocalStorage for Firebase

### Deployment

**Static Hosting Steps:**
1. No build process required
2. Upload all 4 files to hosting
3. Ensure Firebase config is correct
4. Verify CORS settings for Firebase
5. Test authentication flow

**GitHub Pages:**
- Currently configured with `authDomain: "https://baenni-coder.github.io/"`
- Files can be deployed directly

### Student Management Workflows (NEW - 2025-11-30)

#### Bulk Student Creation
1. Teacher navigates to **Schüler** tab
2. Click "➕ Mehrere Schüler anlegen" button
3. Select target class from dropdown
4. Enter student names (one per line)
5. Configure email domain (e.g., `schule.example.com`)
6. Click "✨ Schüler-Accounts erstellen"
7. System generates:
   - Email addresses (`vorname.nachname@domain`)
   - Secure passwords (10 characters, readable)
   - Firebase Auth accounts
   - Firestore user documents
   - Empty progress documents
8. **Printable credentials overview** is displayed automatically
9. Teacher can print or save as PDF

**Technical Implementation:**
- Uses **secondary Firebase App instance** to avoid auth conflicts
- `initializeApp(config, 'Secondary')` creates isolated auth context
- Primary teacher auth remains active throughout process
- Secondary app is deleted after completion
- Prevents "Missing or insufficient permissions" errors

**Password Generation:**
- Uses `crypto.getRandomValues()` for cryptographic security
- Character set: `a-z, A-Z, 2-9` (excludes confusing chars like 0/O, 1/l/I)
- Default length: 10 characters
- Example: `a7XmN5pqRt`

**Email Generation:**
- Converts name to lowercase
- Replaces umlauts (ä→ae, ö→oe, ü→ue, ß→ss)
- Removes special characters
- Joins name parts with dots
- Example: "Max Müller" → `max.mueller@schule.example.com`

#### Student Deletion
1. Teacher clicks student in **Schüler** tab
2. Student details modal opens
3. Click red "🗑️ Löschen" button
4. Confirm deletion warning (explains consequences)
5. System deletes:
   - User document (`/users/{uid}`)
   - Progress document (`/progress/{uid}`)
   - All artifacts (`/artifacts` where `userId == uid`)
   - Storage files for artifacts
6. Modal closes automatically
7. Student list refreshes

**Important Notes:**
- Firebase Auth account is NOT deleted (requires admin SDK/Cloud Functions)
- Deletion is irreversible
- All student data is permanently removed
- Storage files are deleted individually with error handling

#### Credentials Overview Features
**Display:**
- App URL (auto-detected)
- Table with: #, Name, Email, Password
- Styled for printing
- Warning about password visibility

**Actions:**
- 🖨️ Print directly (browser print dialog)
- 📄 Save as PDF (via html2pdf.js)
- Close modal

**Security Note:**
Passwords are only shown once during creation. They cannot be retrieved later.

#### Bulk Star Rating for Classes (NEW - 2025-11-30)
Teachers can assign star ratings to multiple students at once through the **Klassen** tab.

**Workflow:**
1. Teacher navigates to **Klassen** tab
2. Click the green **⭐** button on a class card
3. **Bulk-Rating Dialog** opens with three steps:

   **Step 1: Select Students**
   - Individual checkboxes for each student
   - "✅ Alle auswählen" / "⬜ Keine auswählen" buttons
   - Live counter shows selected students
   - Students sorted alphabetically

   **Step 2: Choose Competency/Indicator**
   - 🔍 Search field to filter competencies
   - Hierarchical dropdown with:
     - Competency Areas (📱 Medien, 💻 Informatik, 🎯 Anwendungskompetenzen)
     - Competency Groups
     - Competency Levels (e.g., "IB.1.1.a - Description")
     - Indicators (indented under levels: "└─ Ich kann...")
   - Automatically filtered by class grade level
   - Selected competency preview shown below

   **Step 3: Assign Stars**
   - Interactive 5-star rating selector
   - Hover effects on stars
   - Current rating displayed ("X Sterne")

4. **Live Preview** shows: "X Schüler(n) werden Y Sterne zugewiesen"
5. **"✅ Bewertungen zuweisen"** button (enabled when all selections complete)
6. **Confirmation dialog** with details and warning about overwriting
7. **Batch update** to Firestore (sequential for error handling)
8. **Success notification** with count or partial success warning
9. Dialog auto-closes on success

**Technical Details:**
- **Overwrites existing ratings** (does not add/increment)
- Supports both **competency levels** (e.g., `level_IB-1-1-a`) and **indicators** (e.g., `indicator_xyz123`)
- Uses `setDoc()` with `merge: true` for safe updates
- Individual error handling per student (continues on failure)
- No Firebase batch writes (sequential for better error reporting)
- Grade-level filtering matches class's assigned grade
- Search function filters by LP code and description text

**Key Functions:**
- `showClassBulkRating(classId, className)` - Opens modal
- `loadCompetencyOptionsForBulkRating(gradeFilter)` - Loads hierarchical competencies
- `updateBulkRatingPreview()` - Updates live preview and enables/disables button
- `executeBulkRating()` - Performs batch updates
- `updateStudentRating(studentId, competencyKey, rating)` - Updates single student

**Use Cases:**
- After teaching a topic (e.g., "Cybermobbing"), assign 3 stars to all students
- Assign baseline competencies to a new class
- Update multiple students who passed a specific assessment
- Quick progress updates after group activities

**Limitations:**
- One competency per operation (for clarity and teacher control)
- Sequential updates (not parallel) for error tracking
- No "add stars" mode, only "set stars"
- Cannot bulk-assign multiple competencies at once

## Common Tasks for AI Assistants

### Adding a New Competency Field
1. Update Firestore schema in `competencies` collection
2. Modify `createDefaultCompetencies()` function
3. Update `loadCompetencyManager()` UI rendering
4. Update `addNewCompetency()` to include new field
5. Update import/export functions

### Adding a New Report Type
1. Add option to `#reportType` select in index.html
2. Create new `generate[Type]Report()` function
3. Call from `generateReport()` switch/if statement
4. Follow existing HTML generation pattern

### Modifying Student Dashboard
1. Student UI rendered in `renderStudentCompetencies()`
2. Real-time updates via `onSnapshot` listener
3. Star rating handlers in event listeners (line 319)

### Adding Admin Features
1. Create new user role check in `loadUserData()`
2. Add new UI area (like teacherArea)
3. Protect Firebase operations with role checks

## Security Best Practices

### Current Implementation
- Role stored in Firestore `users` collection
- Role checked on teacher login (line 141)
- Client-side role enforcement only

### Recommendations for Production
⚠️ **Critical:** Client-side security is not sufficient!

**Required for Production:**
1. Implement Firestore Security Rules based on user roles
2. Use Firebase Functions for sensitive operations
3. Validate all inputs server-side
4. Implement rate limiting
5. Add email verification for registration

**Example Rule Pattern:**
```javascript
// Allow students to only modify their own progress
match /progress/{userId} {
  allow read, write: if request.auth.uid == userId
                     && get(/databases/$(database)/documents/users/$(userId)).data.role == 'student';
}
```

## Internationalization Notes

Currently hardcoded to German:
- All UI strings in German
- Comments in German
- No i18n framework

**To Add English:**
1. Create translation object/file
2. Replace hardcoded strings with keys
3. Add language toggle
4. Store preference in localStorage or user profile

## Performance Considerations

### Current Optimizations
- Competencies cached in memory after first load
- Real-time listeners prevent polling
- CSS animations hardware-accelerated

### Potential Improvements
- Lazy load jsPDF (only when exporting)
- Paginate student lists for large classes
- Debounce search/filter inputs
- Cache student progress data
- Use Firestore query limits

## Error Handling

### Auth Errors
Handled in `handleAuthError()` (line 1447):
- User not found
- Wrong password
- Email in use
- Invalid email

### Firestore Errors
Generally caught and logged with user notification:
```javascript
showNotification('Fehler beim Laden!', 'error');
```

### Missing Robustness
- No offline handling
- No retry logic
- No conflict resolution for concurrent edits

## Browser Compatibility

**Requirements:**
- ES6 module support
- Fetch API
- CSS Grid
- Flexbox
- LocalStorage

**Minimum Versions:**
- Chrome 61+
- Firefox 60+
- Safari 11+
- Edge 79+

## Git Workflow

### Commit Patterns (from history)
- Most commits: "Update app-firebase.js" or "Update index.html"
- No conventional commits pattern
- Direct commits to main branch

### Recommended for AI Assistants
When making changes:
1. Create feature branch: `claude/feature-name-sessionid`
2. Make focused, atomic commits
3. Use descriptive commit messages (what changed and why)
4. Push to remote feature branch
5. Create PR when ready

## Known Limitations

1. **No offline support** - Requires internet connection
2. **Client-side only validation** - No server-side security enforcement
3. **Progress report over time** - Placeholder, not implemented
4. **No teacher account management** - Teachers can't be created from UI
5. **No password reset** - Not implemented
6. **Limited report customization** - Fixed formats only
7. **Auth account deletion** - Firebase Auth accounts not deleted when student is removed (requires Cloud Functions)

## Implemented Features (Previously Limitations)

✅ **Bulk student creation** - Teachers can create multiple students at once (2025-11-30)
✅ **Student deletion** - Complete removal of student data (2025-11-30)
✅ **Credentials management** - Printable/PDF access credentials overview (2025-11-30)
✅ **Bulk star rating** - Teachers can assign ratings to multiple students simultaneously (2025-11-30)

## Future Enhancement Ideas

Based on code structure:
- Timeline/history of competency progress
- Badges/achievements system
- Teacher comments on student progress
- Parent access with read-only view
- CSV import for student lists (in addition to bulk text input)
- Custom competency templates
- Multi-language support
- Dark mode toggle
- Password reset functionality
- Cloud Functions for complete user deletion (including Auth)

## Debugging Tips

### Enable Firebase Debug Mode
```javascript
// Add to console
localStorage.setItem('debug', 'firestore:*');
```

### Common Issues

**Students can't see competencies:**
- Check `loadCompetencies()` was called
- Verify Firestore connection
- Check browser console for errors

**Ratings not saving:**
- Verify user is authenticated (`currentUser` not null)
- Check Firestore rules allow write
- Look for errors in `updateRating()` function

**Teacher dashboard empty:**
- Verify role is 'teacher' in Firestore
- Check collections exist in Firestore
- Verify real-time listeners setup

## Key Files Deep Dive

### index.html (210 lines)
- Firebase config embedded (lines 16-24)
- Three main areas: login, student, teacher (all in one file)
- Inline script initializes Firebase modules
- jsPDF loaded from CDN

### app-firebase.js (1528 lines)
Structure:
- Lines 1-23: Imports from Firebase SDK
- Lines 25-47: Global vars and initialization
- Lines 49-173: Authentication functions
- Lines 175-206: User data loading
- Lines 208-245: Competency management
- Lines 247-326: Student area rendering
- Lines 328-355: Rating updates
- Lines 357-425: Teacher dashboard
- Lines 427-647: Class management
- Lines 649-910: Reports generation
- Lines 912-1081: Student details modal
- Lines 1083-1259: Competency CRUD for teachers
- Lines 1261-1315: Real-time student updates
- Lines 1317-1464: UI helpers and utilities
- Lines 1466-1528: PDF export and sharing

### style.css (634 lines)
- Mobile-first with responsive breakpoints
- Heavy use of gradients and transitions
- CSS Grid for student/class cards
- Flexbox for layouts
- Custom animations defined

## Contact & Resources

**Firebase Console:** Check your Firebase project for Firestore data
**Browser DevTools:** Network tab shows Firebase requests
**Firebase Documentation:** https://firebase.google.com/docs

---

## Quick Start for AI Assistants

1. **Understand the role system**: Student vs Teacher - different UIs and permissions
2. **Follow the async pattern**: Always use showLoading() and try/catch
3. **Real-time is key**: Use onSnapshot for data that changes
4. **German language**: UI strings and comments are in German
5. **No build step**: Changes to files are immediately reflected
6. **Test both roles**: Create both student and teacher accounts
7. **Firebase first**: All data operations go through Firestore

**Most Common Request**: "Add new competency field" or "Modify student dashboard"
**Most Complex Part**: Teacher reports with real-time aggregation
**Most Fragile Part**: Role-based access (client-side only currently)

When in doubt, check how existing similar features are implemented. The codebase is consistent in its patterns.
