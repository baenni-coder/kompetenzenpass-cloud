# CLAUDE.md - Digitaler Kompetenzpass (Cloud Version)

**Last Updated:** 2025-11-18
**Repository:** baenni-coder/kompetenzenpass-cloud
**Language:** German (UI and comments)

## Project Overview

This is a cloud-based digital competency tracking system (Kompetenzpass) for educational settings. Students can self-assess their competencies using a star-rating system, while teachers can manage competencies, classes, and view student progress reports. All data is stored in Firebase Firestore with real-time synchronization.

### Purpose
- Students track their skill progress across various competencies
- Teachers manage competencies, classes, and monitor student progress
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
├── index.html          # Main app structure & Firebase initialization
├── app-firebase.js     # Core application logic (58KB)
├── style.css           # All styling and animations
└── README.md           # Minimal project description
```

**Simple Architecture:** All code is in 3 main files with no subdirectories.

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
  ratings: {              // Object mapping competency IDs to ratings
    [competencyId]: number  // Rating value 0-5 stars
  },
  lastUpdated: timestamp  // Last modification time
}
```

#### `competencies` Collection
```javascript
{
  name: string,           // Competency name with emoji (e.g., "👨‍💻 Programmieren")
  description: string,    // Short description
  order: number,          // Display order
  createdBy: string,      // UID of teacher who created it
  createdAt: timestamp    // Creation time
}
```

#### `classes` Collection
```javascript
{
  name: string,           // Class name (e.g., "7a", "8b")
  description: string,    // Optional description (e.g., "Schuljahr 2024/25")
  createdBy: string,      // UID of teacher who created it
  createdAt: timestamp    // Creation time
}
```

### Firebase Security Considerations

⚠️ **Important:** The Firebase config (including API key) is exposed in `index.html:16-24`. This is typical for client-side Firebase apps, but security rules in Firestore are critical.

**Expected Firestore Rules Pattern:**
- Students can read/write their own progress documents
- Students can read all competencies
- Teachers have broader read/write access
- Authentication required for all operations

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
| `showStudentDetails()` | app-firebase.js:915 | Teacher view: Show/edit student details |
| `generateReport()` | app-firebase.js:683 | Generate class reports |
| `exportProgress()` | app-firebase.js:1467 | Export student progress as PDF |

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
3. **No data export bulk operations** - PDF only for individual students
4. **Progress report over time** - Placeholder, not implemented
5. **No user management** - Teachers can't be created from UI
6. **No password reset** - Not implemented
7. **Limited report customization** - Fixed formats only

## Future Enhancement Ideas

Based on code structure:
- Timeline/history of competency progress
- Badges/achievements system
- Teacher comments on student progress
- Parent access with read-only view
- Bulk operations (import students from CSV)
- Custom competency templates
- Multi-language support
- Dark mode toggle

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
