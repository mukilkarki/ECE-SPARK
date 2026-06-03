// ============================================================
// CREO ECE Career OS — app.js
// Complete Application Logic
// ============================================================
// NOTE: FIREBASE_CONFIG, OPENROUTER_API_KEY, CLOUDINARY_CLOUD_NAME,
// and CLOUDINARY_UPLOAD_PRESET are globals defined in firebase.js
// which is loaded BEFORE this script in index.html.

// ---- Firebase Init ----
firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db = firebase.firestore();

// ---- Global State ----
let currentUser = null;
let userProfile = {};
let subjects = [];
let habits = [];
let studySessions = [];
let notes = [];
let certifications = [];
let internships = [];
let projects = [];
let ctfChallenges = [];
let cyberSkills = {
  networking: 40, linux: 35, python: 50,
  web_sec: 20, pentest: 15, crypto: 25,
  forensics: 10, malware: 5, cloud: 10
};
let roadmapProgress = {};
let aiChatHistory = [];

// ---- Pomodoro State ----
let pomoTimer = null;
let pomoSeconds = 25 * 60;
let pomoTotal = 25 * 60;
let pomoRunning = false;
let pomoMode = 'work';
let pomoSessionCount = 0;
let pomoTotalMins = 0;
let pomoMiniTimer = null;
let pomoMiniSeconds = 25 * 60;
let pomoMiniRunning = false;

// ---- Charts ----
let charts = {};

// ============================================================
// SPLASH & INIT
// ============================================================
window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
  setTimeout(() => {
    document.getElementById('splash').classList.add('fade-out');
    setTimeout(() => { document.getElementById('splash').style.display = 'none'; }, 500);
  }, 1800);

  auth.onAuthStateChanged(user => {
    if (user) {
      currentUser = user;
      loadApp();
    } else {
      showAuthScreen();
    }
  });
});

function showAuthScreen() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  lucide.createIcons();
}

async function loadApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  await loadUserProfile();
  updateHeaderUI();
  navigate('dashboard');
  lucide.createIcons();
  refreshAISuggestions();
}

// ============================================================
// AUTH FUNCTIONS
// ============================================================
function showLogin() { toggleAuthForms('login-form'); }
function showSignup() { toggleAuthForms('signup-form'); }
function showForgotPassword() { toggleAuthForms('forgot-form'); }
function toggleAuthForms(active) {
  ['login-form','signup-form','forgot-form'].forEach(id => {
    document.getElementById(id).classList.toggle('hidden', id !== active);
  });
}
window.showLogin = showLogin;
window.showSignup = showSignup;
window.showForgotPassword = showForgotPassword;

window.togglePassword = function(inputId) {
  const inp = document.getElementById(inputId);
  inp.type = inp.type === 'password' ? 'text' : 'password';
};

window.loginUser = async function() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  if (!email || !password) { showAuthError(errEl, 'Please fill all fields.'); return; }
  try {
    const btn = document.querySelector('#login-form .btn-auth');
    btn.disabled = true; btn.innerHTML = '<span>Signing in...</span>';
    await auth.signInWithEmailAndPassword(email, password);
  } catch(e) {
    showAuthError(document.getElementById('login-error'), getAuthError(e.code));
    const btn = document.querySelector('#login-form .btn-auth');
    btn.disabled = false; btn.innerHTML = '<span>Sign In</span><i data-lucide="arrow-right"></i>';
    lucide.createIcons();
  }
};

window.signupUser = async function() {
  const name = document.getElementById('signup-name').value.trim();
  const college = document.getElementById('signup-college').value.trim();
  const sem = document.getElementById('signup-semester').value;
  const cgpa = parseFloat(document.getElementById('signup-cgpa').value) || 0;
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const errEl = document.getElementById('signup-error');
  if (!name || !email || !password) { showAuthError(errEl, 'Please fill all required fields.'); return; }
  if (password.length < 8) { showAuthError(errEl, 'Password must be at least 8 characters.'); return; }
  try {
    const btn = document.querySelector('#signup-form .btn-auth');
    btn.disabled = true; btn.innerHTML = '<span>Creating account...</span>';
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await db.collection('users').doc(cred.user.uid).set({
      name, email, college, semester: sem, cgpa,
      branch: 'ECE', targetCgpa: 9.0, goal: 'cyber_ai', bio: '',
      avatarUrl: '', createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch(e) {
    showAuthError(document.getElementById('signup-error'), getAuthError(e.code));
    const btn = document.querySelector('#signup-form .btn-auth');
    btn.disabled = false; btn.innerHTML = '<span>Create Account</span><i data-lucide="arrow-right"></i>';
    lucide.createIcons();
  }
};

window.resetPassword = async function() {
  const email = document.getElementById('forgot-email').value.trim();
  const msgEl = document.getElementById('forgot-msg');
  if (!email) { showAuthError(msgEl, 'Please enter your email.'); return; }
  try {
    await auth.sendPasswordResetEmail(email);
    msgEl.className = 'auth-error auth-success';
    msgEl.textContent = '✓ Reset link sent! Check your inbox.';
    msgEl.classList.remove('hidden');
  } catch(e) {
    showAuthError(msgEl, getAuthError(e.code));
  }
};

window.logoutUser = async function() {
  await auth.signOut();
  currentUser = null; userProfile = {};
  subjects = []; habits = []; notes = []; certifications = [];
  internships = []; projects = []; ctfChallenges = [];
  aiChatHistory = [];
  clearAllCharts();
  showToast('Signed out successfully', 'info');
};

function showAuthError(el, msg) {
  el.textContent = msg; el.classList.remove('hidden');
  el.className = 'auth-error';
}
function getAuthError(code) {
  const msgs = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-in-use': 'Email already in use.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/weak-password': 'Password is too weak.',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
    'auth/invalid-credential': 'Invalid email or password.',
  };
  return msgs[code] || 'An error occurred. Please try again.';
}

// ============================================================
// NAVIGATION
// ============================================================
window.navigate = function(page) {
  document.querySelectorAll('.page').forEach(p => {
    p.classList.add('hidden'); p.classList.remove('active');
  });
  const el = document.getElementById(`page-${page}`);
  if (el) { el.classList.remove('hidden'); el.classList.add('active'); }

  document.querySelectorAll('.sidebar-item').forEach(i => {
    i.classList.toggle('active', i.dataset.page === page);
  });
  document.querySelectorAll('.bnav-item').forEach(i => {
    i.classList.toggle('active', i.dataset.page === page);
  });

  closeSidebar();
  lucide.createIcons();

  const loaders = {
    'dashboard': loadDashboard,
    'semester': loadSemester,
    'productivity': loadProductivity,
    'notes': loadNotes,
    'cybersec': () => { switchCyberTab('roadmap'); loadCyberSkills(); },
    'placement': () => { switchPlacementTab('resume'); loadProjects(); loadInternships(); },
    'analytics': loadAnalytics,
    'profile': loadProfile,
    'ai-assistant': () => lucide.createIcons()
  };
  if (loaders[page]) loaders[page]();
};

window.toggleSidebar = function() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('hidden');
};
window.closeSidebar = function() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.add('hidden');
};

// ============================================================
// PROFILE / USER DATA
// ============================================================
async function loadUserProfile() {
  if (!currentUser) return;
  try {
    const doc = await db.collection('users').doc(currentUser.uid).get();
    if (doc.exists) {
      userProfile = doc.data();
    } else {
      userProfile = { name: currentUser.displayName || 'Student', email: currentUser.email, semester: '1', cgpa: '0', college: '', branch: 'ECE' };
    }
  } catch(e) { console.error(e); }
}

function updateHeaderUI() {
  const name = userProfile.name || 'Student';
  const avatarUrl = userProfile.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=00f5c4&color=0a0a0f&bold=true`;
  document.getElementById('sidebar-name').textContent = name;
  document.getElementById('header-avatar').src = avatarUrl;
  document.getElementById('sidebar-avatar').src = avatarUrl;
}

function loadProfile() {
  const p = userProfile;
  const name = p.name || '';
  const avatarUrl = p.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name||'S')}&background=00f5c4&color=0a0a0f&bold=true`;
  document.getElementById('profile-avatar-img').src = avatarUrl;
  document.getElementById('profile-name-display').textContent = name;
  document.getElementById('profile-email-display').textContent = currentUser?.email || '';
  document.getElementById('profile-name-input').value = name;
  document.getElementById('profile-college-input').value = p.college || '';
  document.getElementById('profile-branch-input').value = p.branch || 'ECE';
  document.getElementById('profile-sem-input').value = p.semester || '1';
  document.getElementById('profile-cgpa-input').value = p.cgpa || '';
  document.getElementById('profile-target-cgpa-input').value = p.targetCgpa || '';
  document.getElementById('profile-goal-input').value = p.goal || 'cyber_ai';
  document.getElementById('profile-bio-input').value = p.bio || '';
  lucide.createIcons();
}

window.saveProfile = async function() {
  if (!currentUser) return;
  const updated = {
    name: document.getElementById('profile-name-input').value.trim(),
    college: document.getElementById('profile-college-input').value.trim(),
    branch: document.getElementById('profile-branch-input').value.trim(),
    semester: document.getElementById('profile-sem-input').value,
    cgpa: parseFloat(document.getElementById('profile-cgpa-input').value) || 0,
    targetCgpa: parseFloat(document.getElementById('profile-target-cgpa-input').value) || 0,
    goal: document.getElementById('profile-goal-input').value,
    bio: document.getElementById('profile-bio-input').value.trim(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  try {
    await db.collection('users').doc(currentUser.uid).update(updated);
    userProfile = { ...userProfile, ...updated };
    updateHeaderUI();
    loadProfile();
    showToast('Profile saved!', 'success');
  } catch(e) { showToast('Failed to save: ' + e.message, 'error'); }
};

window.changePassword = function() {
  openModal('Change Password', `
    <div class="form-group"><label>New Password</label><input type="password" id="new-pass" placeholder="Min 8 characters" /></div>
    <div class="form-group"><label>Confirm Password</label><input type="password" id="confirm-pass" placeholder="Repeat password" /></div>
  `, [{label:'Change Password', action: async () => {
    const np = document.getElementById('new-pass').value;
    const cp = document.getElementById('confirm-pass').value;
    if (np !== cp) { showToast('Passwords do not match', 'error'); return; }
    if (np.length < 8) { showToast('Minimum 8 characters', 'error'); return; }
    try {
      await currentUser.updatePassword(np);
      showToast('Password changed!', 'success');
      closeAllModals();
    } catch(e) { showToast(e.message, 'error'); }
  }, cls: 'btn-primary'}]);
};

window.confirmDeleteAccount = function() {
  openModal('Delete Account', `
    <p style="color:var(--red);font-size:0.9rem">⚠️ This action is irreversible. All your data will be permanently deleted.</p>
    <div class="form-group" style="margin-top:1rem"><label>Type DELETE to confirm</label><input type="text" id="delete-confirm" placeholder="DELETE" /></div>
  `, [{label:'Delete Account', action: async () => {
    if (document.getElementById('delete-confirm').value !== 'DELETE') { showToast('Type DELETE to confirm', 'warning'); return; }
    try {
      await db.collection('users').doc(currentUser.uid).delete();
      await currentUser.delete();
      showToast('Account deleted', 'info');
    } catch(e) { showToast('Re-authenticate and try again', 'error'); }
  }, cls: 'btn-danger'}]);
};

window.uploadProfilePhoto = function() {
  if (!CLOUDINARY_CLOUD_NAME || CLOUDINARY_CLOUD_NAME === 'YOUR_CLOUD_NAME') {
    showToast('Configure Cloudinary in firebase.js first', 'warning'); return;
  }
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    showToast('Uploading...', 'info');
    try {
      const url = await uploadToCloudinary(file);
      await db.collection('users').doc(currentUser.uid).update({ avatarUrl: url });
      userProfile.avatarUrl = url;
      updateHeaderUI(); loadProfile();
      showToast('Photo updated!', 'success');
    } catch(err) { showToast('Upload failed', 'error'); }
  };
  input.click();
};

// ============================================================
// DASHBOARD
// ============================================================
async function loadDashboard() {
  updateWelcomeText();
  document.getElementById('dash-cgpa').textContent = userProfile.cgpa || '—';
  document.getElementById('dash-sem').textContent = (userProfile.semester ? `Sem ${userProfile.semester}` : '—');

  await Promise.all([loadSubjectsForDash(), loadHabitsForDash(), loadNotesForDash(), loadExamsForDash()]);
  loadCyberSkillsMini();
  updateStreak();
}

function updateWelcomeText() {
  const h = new Date().getHours();
  const greet = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
  const name = (userProfile.name || 'Student').split(' ')[0];
  document.getElementById('welcome-text').textContent = `${greet}, ${name}! 👋`;
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  document.getElementById('welcome-date').textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

async function loadSubjectsForDash() {
  try {
    const snap = await db.collection('users').doc(currentUser.uid).collection('subjects').get();
    subjects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (subjects.length > 0) {
      const avg = subjects.reduce((s, sub) => s + (parseFloat(sub.attendance) || 0), 0) / subjects.length;
      document.getElementById('dash-attendance').textContent = avg.toFixed(0) + '%';
    }
  } catch(e) {}
}

async function loadHabitsForDash() {
  try {
    const snap = await db.collection('users').doc(currentUser.uid).collection('habits').get();
    habits = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderHabitsMini();
  } catch(e) {}
}

function renderHabitsMini() {
  const el = document.getElementById('dash-habits');
  if (!habits.length) { el.innerHTML = '<div class="empty-state-sm">No habits yet — add some!</div>'; return; }
  const today = todayKey();
  el.innerHTML = habits.slice(0, 4).map(h => `
    <div class="habit-mini-item">
      <div class="habit-mini-check ${(h.completedDates||[]).includes(today) ? 'done' : ''}" onclick="toggleHabitMini('${h.id}', this)">
        ${(h.completedDates||[]).includes(today) ? '✓' : ''}
      </div>
      <span class="habit-mini-name">${h.icon||'⚡'} ${h.name}</span>
      <span class="habit-mini-streak">${h.streak||0}🔥</span>
    </div>
  `).join('');
}

window.toggleHabitMini = async function(habitId, el) {
  const today = todayKey();
  const habit = habits.find(h => h.id === habitId);
  if (!habit) return;
  const completed = (habit.completedDates || []).includes(today);
  if (!completed) {
    habit.completedDates = [...(habit.completedDates || []), today];
    habit.streak = (habit.streak || 0) + 1;
    el.classList.add('done'); el.textContent = '✓';
  } else {
    habit.completedDates = (habit.completedDates || []).filter(d => d !== today);
    habit.streak = Math.max(0, (habit.streak || 1) - 1);
    el.classList.remove('done'); el.textContent = '';
  }
  await db.collection('users').doc(currentUser.uid).collection('habits').doc(habitId).update({
    completedDates: habit.completedDates, streak: habit.streak
  });
};

async function loadNotesForDash() {
  try {
    const snap = await db.collection('users').doc(currentUser.uid).collection('notes').orderBy('createdAt','desc').limit(3).get();
    notes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const el = document.getElementById('dash-notes');
    if (!notes.length) { el.innerHTML = '<div class="empty-state-sm">No notes yet</div>'; return; }
    el.innerHTML = notes.map(n => `
      <div class="note-mini-item" onclick="window.open('${n.cloudinaryUrl||'#'}','_blank')">
        <span>${getFileIcon(n.type)}</span>
        <span style="flex:1;font-size:0.8rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(n.title)}</span>
        <span class="note-type-badge">${n.type||'doc'}</span>
      </div>
    `).join('');
  } catch(e) {}
}

async function loadExamsForDash() {
  const el = document.getElementById('dash-exams');
  const upcoming = subjects.filter(s => s.examDate && new Date(s.examDate) > new Date())
    .sort((a,b) => new Date(a.examDate) - new Date(b.examDate)).slice(0,3);
  if (!upcoming.length) { el.innerHTML = '<div class="empty-state-sm">No exams scheduled</div>'; return; }
  el.innerHTML = upcoming.map(s => `
    <div class="exam-mini-item">
      <span style="flex:1;font-size:0.8rem;font-weight:600">${escHtml(s.name)}</span>
      <span class="exam-date">${formatDate(s.examDate)}</span>
    </div>
  `).join('');
}

function loadCyberSkillsMini() {
  const el = document.getElementById('dash-cyber-skills');
  const topSkills = Object.entries(cyberSkills).slice(0, 5);
  if (!topSkills.length) { el.innerHTML = '<div class="empty-state-sm">No skills tracked</div>'; return; }
  el.innerHTML = topSkills.map(([k, v]) => `
    <div class="skill-mini-item">
      <span style="font-size:0.78rem;min-width:80px;color:var(--text-2)">${k.replace(/_/g,' ')}</span>
      <div class="skill-mini-bar"><div class="skill-mini-fill" style="width:${v}%"></div></div>
      <span style="font-family:var(--font-mono);font-size:0.72rem;color:var(--cyan)">${v}%</span>
    </div>
  `).join('');
}

function updateStreak() {
  const today = todayKey();
  const sessions = JSON.parse(localStorage.getItem(`streak_${currentUser?.uid}`) || '[]');
  let streak = 0;
  let d = new Date();
  while(true) {
    const key = d.toISOString().split('T')[0];
    if (sessions.includes(key)) { streak++; d.setDate(d.getDate()-1); } else break;
  }
  document.getElementById('dash-streak').textContent = `${streak}🔥`;
}

async function refreshAISuggestions() {
  const el = document.getElementById('dash-ai-suggestions');
  if (!el) return;
  el.innerHTML = '<div class="ai-suggestion-loading"><div class="typing-dots"><span></span><span></span><span></span></div><span>Generating personalized suggestions...</span></div>';

  const profile = userProfile;
  const prompt = `You are a career advisor for an ECE student targeting Cybersecurity + AI engineering.
Student: ${profile.name||'ECE Student'}, Semester ${profile.semester||1}, CGPA ${profile.cgpa||0}/${profile.targetCgpa||9.0}.
Give exactly 3 concise, actionable study/career suggestions for today. 
Format as a JSON array: [{"icon":"emoji","text":"suggestion"}]
Keep each suggestion under 20 words. Focus on cybersecurity certifications, CTF practice, and skill building.`;

  try {
    const res = await callOpenRouter(prompt, 300);
    const clean = res.replace(/```json|```/g,'').trim();
    let suggestions;
    try { suggestions = JSON.parse(clean); } catch { suggestions = [{icon:'🎯',text:'Practice a TryHackMe room today to build pentesting skills.'},{icon:'📚',text:'Review OWASP Top 10 vulnerabilities — essential for web security.'},{icon:'⚡',text:'Implement a Python port scanner to understand networking fundamentals.'}]; }
    el.innerHTML = suggestions.slice(0,3).map(s => `
      <div class="ai-suggestion-item">
        <span style="font-size:1.2rem;margin-right:6px">${s.icon||'⚡'}</span>${escHtml(s.text)}
      </div>
    `).join('');
  } catch(e) {
    el.innerHTML = `
      <div class="ai-suggestion-item">🎯 Complete one TryHackMe room today to sharpen your pentesting skills.</div>
      <div class="ai-suggestion-item">📚 Study the OWASP Top 10 — critical knowledge for web application security.</div>
      <div class="ai-suggestion-item">⚡ Write a Python script to automate a repetitive security task.</div>
    `;
  }
}
window.refreshAISuggestions = refreshAISuggestions;

// ============================================================
// SEMESTER TRACKER
// ============================================================
async function loadSemester() {
  try {
    const snap = await db.collection('users').doc(currentUser.uid).collection('subjects').get();
    subjects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderSubjects();
    updateSemesterStats();
  } catch(e) { showToast('Error loading subjects', 'error'); }
}

function renderSubjects() {
  const list = document.getElementById('subjects-list');
  const empty = document.getElementById('subjects-empty');
  if (!subjects.length) { list.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  list.innerHTML = subjects.map(s => {
    const att = parseFloat(s.attendance) || 0;
    const attClass = att >= 75 ? 'att-ok' : att >= 60 ? 'att-warn' : 'att-bad';
    return `
    <div class="subject-card" id="subj-${s.id}">
      <div class="subject-card-header">
        <div>
          <div class="subject-name">${escHtml(s.name)}</div>
          <div class="subject-code">${escHtml(s.code||'')}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="subject-credits">${s.credits||0} credits</span>
          <div class="subject-card-actions">
            <button onclick="editSubject('${s.id}')" title="Edit"><i data-lucide="edit-2"></i></button>
            <button onclick="deleteSubject('${s.id}')" title="Delete"><i data-lucide="trash-2"></i></button>
          </div>
        </div>
      </div>
      <div class="subject-stats">
        <div class="subj-stat"><div class="val">${s.internalMark||0}/30</div><div class="lbl">Internal</div></div>
        <div class="subj-stat"><div class="val">${s.attendance||0}%</div><div class="lbl">Attendance</div></div>
        <div class="subj-stat"><div class="val">${s.examDate ? formatDate(s.examDate) : '—'}</div><div class="lbl">Exam Date</div></div>
      </div>
      <div class="attendance-bar">
        <div class="att-bar-label"><span>Attendance</span><span>${att}%</span></div>
        <div class="att-bar-track"><div class="att-bar-fill ${attClass}" style="width:${att}%"></div></div>
      </div>
    </div>`;
  }).join('');
  lucide.createIcons();
}

function updateSemesterStats() {
  const totalCredits = subjects.reduce((s,sub) => s + (parseInt(sub.credits)||0), 0);
  const avgInternal = subjects.length ? (subjects.reduce((s,sub) => s + (parseFloat(sub.internalMark)||0), 0) / subjects.length).toFixed(1) : 0;
  const avgAtt = subjects.length ? (subjects.reduce((s,sub) => s + (parseFloat(sub.attendance)||0), 0) / subjects.length).toFixed(0) : 0;
  document.getElementById('sem-total-credits').textContent = totalCredits;
  document.getElementById('sem-avg-internal').textContent = avgInternal;
  document.getElementById('sem-avg-attendance').textContent = avgAtt + '%';
  const sgpa = predictSGPA(subjects);
  document.getElementById('sem-predicted-sgpa').textContent = sgpa;
}

function predictSGPA(subs) {
  if (!subs.length) return '—';
  const gradeMap = (mark) => {
    if (mark >= 27) return 10; if (mark >= 24) return 9; if (mark >= 21) return 8;
    if (mark >= 18) return 7; if (mark >= 15) return 6; return 5;
  };
  let totalGradePoints = 0, totalCredits = 0;
  subs.forEach(s => {
    const c = parseInt(s.credits)||0;
    const g = gradeMap(parseFloat(s.internalMark)||0);
    totalGradePoints += c * g; totalCredits += c;
  });
  return totalCredits ? (totalGradePoints / totalCredits).toFixed(2) : '—';
}

window.showAddSubjectModal = function() {
  openModal('Add Subject', `
    <div class="form-group"><label>Subject Name *</label><input type="text" id="m-subj-name" placeholder="e.g. Digital Signal Processing" /></div>
    <div class="form-row">
      <div class="form-group"><label>Subject Code</label><input type="text" id="m-subj-code" placeholder="e.g. EC6403" /></div>
      <div class="form-group"><label>Credits *</label><input type="number" id="m-subj-credits" placeholder="3" min="1" max="5" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Internal Mark (/30)</label><input type="number" id="m-subj-internal" placeholder="0" min="0" max="30" /></div>
      <div class="form-group"><label>Attendance (%)</label><input type="number" id="m-subj-att" placeholder="0" min="0" max="100" /></div>
    </div>
    <div class="form-group"><label>Exam Date</label><input type="date" id="m-subj-exam" /></div>
  `, [{label:'Add Subject', action: saveSubject, cls:'btn-primary'}]);
};

async function saveSubject() {
  const name = document.getElementById('m-subj-name').value.trim();
  if (!name) { showToast('Subject name required', 'warning'); return; }
  const data = {
    name, code: document.getElementById('m-subj-code').value.trim(),
    credits: parseInt(document.getElementById('m-subj-credits').value)||3,
    internalMark: parseFloat(document.getElementById('m-subj-internal').value)||0,
    attendance: parseFloat(document.getElementById('m-subj-att').value)||0,
    examDate: document.getElementById('m-subj-exam').value,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  try {
    await db.collection('users').doc(currentUser.uid).collection('subjects').add(data);
    closeAllModals(); await loadSemester();
    showToast('Subject added!', 'success');
  } catch(e) { showToast('Error: ' + e.message, 'error'); }
}

window.editSubject = async function(id) {
  const s = subjects.find(x => x.id === id); if (!s) return;
  openModal('Edit Subject', `
    <div class="form-group"><label>Subject Name</label><input type="text" id="m-subj-name" value="${escHtml(s.name)}" /></div>
    <div class="form-row">
      <div class="form-group"><label>Code</label><input type="text" id="m-subj-code" value="${escHtml(s.code||'')}" /></div>
      <div class="form-group"><label>Credits</label><input type="number" id="m-subj-credits" value="${s.credits||3}" min="1" max="5" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Internal (/30)</label><input type="number" id="m-subj-internal" value="${s.internalMark||0}" min="0" max="30" /></div>
      <div class="form-group"><label>Attendance (%)</label><input type="number" id="m-subj-att" value="${s.attendance||0}" min="0" max="100" /></div>
    </div>
    <div class="form-group"><label>Exam Date</label><input type="date" id="m-subj-exam" value="${s.examDate||''}" /></div>
  `, [{label:'Save Changes', action: async () => {
    const data = {
      name: document.getElementById('m-subj-name').value.trim(),
      code: document.getElementById('m-subj-code').value.trim(),
      credits: parseInt(document.getElementById('m-subj-credits').value)||3,
      internalMark: parseFloat(document.getElementById('m-subj-internal').value)||0,
      attendance: parseFloat(document.getElementById('m-subj-att').value)||0,
      examDate: document.getElementById('m-subj-exam').value,
    };
    await db.collection('users').doc(currentUser.uid).collection('subjects').doc(id).update(data);
    closeAllModals(); await loadSemester();
    showToast('Subject updated!', 'success');
  }, cls:'btn-primary'}]);
};

window.deleteSubject = async function(id) {
  if (!confirm('Delete this subject?')) return;
  await db.collection('users').doc(currentUser.uid).collection('subjects').doc(id).delete();
  await loadSemester();
  showToast('Subject deleted', 'info');
};

// ============================================================
// PRODUCTIVITY — POMODORO
// ============================================================
function loadProductivity() {
  renderHabitsFull();
  loadStudySessions();
  renderWeeklyFocusChart();
  lucide.createIcons();
}

window.setPomoMode = function(mode, mins) {
  pomoMode = mode; pomoSeconds = mins * 60; pomoTotal = pomoSeconds;
  pomoRunning = false; clearInterval(pomoTimer);
  updatePomoDisplay();
  document.getElementById('pomo-icon').setAttribute('data-lucide','play');
  document.getElementById('pomo-toggle-btn').classList.remove('running');
  ['pomo-work','pomo-short','pomo-long'].forEach(id => document.getElementById(id)?.classList.remove('active'));
  document.getElementById(`pomo-${mode === 'work' ? 'work' : mode === 'short' ? 'short' : 'long'}`)?.classList.add('active');
  const labels = {work:'Focus Time', short:'Short Break', long:'Long Break'};
  document.getElementById('pomo-label').textContent = labels[mode];
  updatePomoRing();
  lucide.createIcons();
};

window.togglePomo = function() {
  if (pomoRunning) {
    pomoRunning = false; clearInterval(pomoTimer);
    document.getElementById('pomo-icon').setAttribute('data-lucide','play');
  } else {
    pomoRunning = true;
    pomoTimer = setInterval(() => {
      pomoSeconds--;
      updatePomoDisplay();
      updatePomoRing();
      syncPomoMini();
      if (pomoSeconds <= 0) {
        clearInterval(pomoTimer); pomoRunning = false;
        onPomoComplete();
      }
    }, 1000);
    document.getElementById('pomo-icon').setAttribute('data-lucide','pause');
  }
  lucide.createIcons();
};

window.resetPomo = function() {
  pomoRunning = false; clearInterval(pomoTimer);
  pomoSeconds = pomoTotal;
  updatePomoDisplay(); updatePomoRing();
  document.getElementById('pomo-icon').setAttribute('data-lucide','play');
  lucide.createIcons();
};
window.skipPomo = function() {
  clearInterval(pomoTimer); pomoRunning = false;
  onPomoComplete();
};

function onPomoComplete() {
  if (pomoMode === 'work') {
    pomoSessionCount++; pomoTotalMins += pomoTotal / 60;
    document.getElementById('pomo-sessions').textContent = pomoSessionCount;
    document.getElementById('pomo-total-mins').textContent = Math.round(pomoTotalMins);
    document.getElementById('pomo-mini-count').textContent = pomoSessionCount;
    saveStudySession(pomoTotal / 60);
    updateStreakStorage();
    showToast('🍅 Pomodoro complete! Great focus session!', 'success');
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('CREO ECE: Pomodoro Complete!', { body: 'Take a break — you earned it!', icon: '/icon.png' });
    }
    setPomoMode('short', 5);
  } else {
    showToast('Break time over! Back to work!', 'info');
    setPomoMode('work', 25);
  }
  document.getElementById('pomo-icon').setAttribute('data-lucide','play');
  lucide.createIcons();
}

function updatePomoDisplay() {
  const m = Math.floor(pomoSeconds / 60).toString().padStart(2,'0');
  const s = (pomoSeconds % 60).toString().padStart(2,'0');
  const time = `${m}:${s}`;
  const el = document.getElementById('pomo-time');
  if (el) el.textContent = time;
}

function updatePomoRing() {
  const circle = document.getElementById('pomo-circle');
  if (!circle) return;
  const circumference = 553;
  const progress = pomoSeconds / pomoTotal;
  circle.style.strokeDashoffset = circumference * (1 - progress);
  const colors = {work:'var(--cyan)', short:'var(--green)', long:'var(--purple)'};
  circle.style.stroke = colors[pomoMode] || 'var(--cyan)';
}

function syncPomoMini() {
  const el = document.getElementById('pomo-mini-time');
  if (el) {
    const m = Math.floor(pomoSeconds/60).toString().padStart(2,'0');
    const s = (pomoSeconds%60).toString().padStart(2,'0');
    el.textContent = `${m}:${s}`;
  }
}

// Mini Pomodoro (Dashboard)
window.togglePomoMini = function() {
  if (pomoMiniRunning) {
    pomoMiniRunning = false; clearInterval(pomoMiniTimer);
    document.querySelector('#pomo-mini-btn i').setAttribute('data-lucide','play');
  } else {
    pomoMiniRunning = true;
    pomoMiniTimer = setInterval(() => {
      pomoMiniSeconds--;
      const m = Math.floor(pomoMiniSeconds/60).toString().padStart(2,'0');
      const s = (pomoMiniSeconds%60).toString().padStart(2,'0');
      document.getElementById('pomo-mini-time').textContent = `${m}:${s}`;
      if (pomoMiniSeconds <= 0) {
        clearInterval(pomoMiniTimer); pomoMiniRunning = false;
        pomoMiniSeconds = 25*60;
        const cnt = parseInt(document.getElementById('pomo-mini-count').textContent||0)+1;
        document.getElementById('pomo-mini-count').textContent = cnt;
        document.getElementById('pomo-mini-time').textContent = '25:00';
        document.querySelector('#pomo-mini-btn i').setAttribute('data-lucide','play');
        showToast('🍅 Focus session complete!', 'success');
        lucide.createIcons();
      }
    }, 1000);
    document.querySelector('#pomo-mini-btn i').setAttribute('data-lucide','pause');
  }
  lucide.createIcons();
};
window.resetPomoMini = function() {
  pomoMiniRunning = false; clearInterval(pomoMiniTimer);
  pomoMiniSeconds = 25*60;
  document.getElementById('pomo-mini-time').textContent = '25:00';
  document.querySelector('#pomo-mini-btn i').setAttribute('data-lucide','play');
  lucide.createIcons();
};

function updateStreakStorage() {
  const key = `streak_${currentUser?.uid}`;
  const sessions = JSON.parse(localStorage.getItem(key)||'[]');
  const today = todayKey();
  if (!sessions.includes(today)) { sessions.push(today); localStorage.setItem(key, JSON.stringify(sessions)); }
}

async function saveStudySession(mins) {
  if (!currentUser) return;
  try {
    await db.collection('users').doc(currentUser.uid).collection('studySessions').add({
      date: new Date().toISOString(), subject: 'Pomodoro Session',
      duration: mins, pomodoroCount: 1,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } catch(e) {}
}

// ============================================================
// HABITS
// ============================================================
async function renderHabitsFull() {
  try {
    const snap = await db.collection('users').doc(currentUser.uid).collection('habits').get();
    habits = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) {}
  const list = document.getElementById('habits-list');
  const today = todayKey();
  if (!habits.length) {
    list.innerHTML = '<div class="empty-state-sm" style="padding:1rem;text-align:center;color:var(--text-3)">No habits yet. Build good habits daily!</div>';
    return;
  }
  list.innerHTML = habits.map(h => {
    const done = (h.completedDates||[]).includes(today);
    return `
    <div class="habit-item" id="habit-${h.id}">
      <div class="habit-icon">${h.icon||'⚡'}</div>
      <div class="habit-info">
        <div class="habit-name">${escHtml(h.name)}</div>
        <div class="habit-streak">${h.streak||0}🔥 day streak</div>
      </div>
      <button class="habit-check-btn ${done?'done':''}" onclick="toggleHabitFull('${h.id}',this)">${done?'✓':'○'}</button>
      <button class="habit-delete-btn" onclick="deleteHabit('${h.id}')"><i data-lucide="trash-2"></i></button>
    </div>`;
  }).join('');
  lucide.createIcons();
}

window.showAddHabitModal = function() {
  openModal('Add Habit', `
    <div class="form-group"><label>Habit Name *</label><input type="text" id="m-habit-name" placeholder="e.g. Study Cybersecurity 1hr" /></div>
    <div class="form-row">
      <div class="form-group"><label>Icon (Emoji)</label><input type="text" id="m-habit-icon" placeholder="🛡️" maxlength="2" /></div>
      <div class="form-group"><label>Target Days/Week</label><input type="number" id="m-habit-days" placeholder="7" min="1" max="7" /></div>
    </div>
  `, [{label:'Add Habit', action: async () => {
    const name = document.getElementById('m-habit-name').value.trim();
    if (!name) { showToast('Habit name required', 'warning'); return; }
    await db.collection('users').doc(currentUser.uid).collection('habits').add({
      name, icon: document.getElementById('m-habit-icon').value || '⚡',
      targetDays: parseInt(document.getElementById('m-habit-days').value)||7,
      streak: 0, completedDates: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    closeAllModals(); renderHabitsFull();
    showToast('Habit added!', 'success');
  }, cls:'btn-primary'}]);
};

window.toggleHabitFull = async function(id, btn) {
  const today = todayKey();
  const habit = habits.find(h => h.id === id); if (!habit) return;
  const done = (habit.completedDates||[]).includes(today);
  if (!done) {
    habit.completedDates = [...(habit.completedDates||[]), today];
    habit.streak = (habit.streak||0) + 1;
    btn.classList.add('done'); btn.textContent = '✓';
    showToast(`${habit.icon||'⚡'} ${habit.name} — done!`, 'success');
  } else {
    habit.completedDates = (habit.completedDates||[]).filter(d => d !== today);
    habit.streak = Math.max(0,(habit.streak||1)-1);
    btn.classList.remove('done'); btn.textContent = '○';
  }
  const sibling = btn.parentElement.querySelector('.habit-streak');
  if (sibling) sibling.textContent = `${habit.streak}🔥 day streak`;
  await db.collection('users').doc(currentUser.uid).collection('habits').doc(id).update({ completedDates: habit.completedDates, streak: habit.streak });
};

window.deleteHabit = async function(id) {
  if (!confirm('Delete this habit?')) return;
  await db.collection('users').doc(currentUser.uid).collection('habits').doc(id).delete();
  habits = habits.filter(h => h.id !== id);
  renderHabitsFull();
  showToast('Habit deleted', 'info');
};

// ============================================================
// STUDY LOG
// ============================================================
async function loadStudySessions() {
  try {
    const snap = await db.collection('users').doc(currentUser.uid).collection('studySessions').orderBy('createdAt','desc').limit(10).get();
    studySessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderStudySessions();
  } catch(e) {}
}

function renderStudySessions() {
  const el = document.getElementById('study-sessions');
  if (!studySessions.length) {
    el.innerHTML = '<div style="color:var(--text-3);font-size:0.82rem;padding:0.5rem">No study sessions logged yet.</div>';
    return;
  }
  el.innerHTML = studySessions.map(s => `
    <div class="study-session-item">
      <span class="session-subject">${escHtml(s.subject||'Study Session')}</span>
      <span class="session-duration">${s.duration||0}min</span>
      <span class="session-date">${s.date ? new Date(s.date).toLocaleDateString('en-IN',{month:'short',day:'numeric'}) : ''}</span>
    </div>
  `).join('');
}

window.showLogStudyModal = function() {
  const subjOptions = subjects.map(s => `<option value="${escHtml(s.name)}">${escHtml(s.name)}</option>`).join('');
  openModal('Log Study Session', `
    <div class="form-group"><label>Subject</label>
      <select id="m-sess-subject"><option value="Self Study">Self Study</option>${subjOptions}<option value="CTF Practice">CTF Practice</option><option value="Certification Study">Certification Study</option></select>
    </div>
    <div class="form-group"><label>Duration (minutes)</label><input type="number" id="m-sess-duration" placeholder="60" min="5" max="480" /></div>
    <div class="form-group"><label>Notes</label><textarea id="m-sess-notes" rows="2" placeholder="What did you study?"></textarea></div>
  `, [{label:'Log Session', action: async () => {
    const data = {
      subject: document.getElementById('m-sess-subject').value,
      duration: parseInt(document.getElementById('m-sess-duration').value)||0,
      notes: document.getElementById('m-sess-notes').value.trim(),
      date: new Date().toISOString(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('users').doc(currentUser.uid).collection('studySessions').add(data);
    closeAllModals(); await loadStudySessions();
    showToast('Session logged!', 'success');
    updateStreakStorage();
  }, cls:'btn-primary'}]);
};

function renderWeeklyFocusChart() {
  const ctx = document.getElementById('weeklyFocusChart');
  if (!ctx) return;
  destroyChart('weeklyFocus');
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const data = days.map(() => Math.floor(Math.random() * 120 + 20));
  charts.weeklyFocus = new Chart(ctx, {
    type: 'bar',
    data: { labels: days, datasets: [{ label: 'Focus (min)', data, backgroundColor: 'rgba(0,245,196,0.3)', borderColor: 'rgba(0,245,196,0.8)', borderWidth: 2, borderRadius: 6 }] },
    options: getChartOptions('Focus Minutes')
  });
}

// ============================================================
// AI ASSISTANT
// ============================================================
const QUICK_PROMPTS = {
  summarize: 'I need help summarizing my ECE study notes. Can you explain how to effectively summarize technical topics like Digital Signal Processing, VLSI Design, or Communication Systems? Also, give me a sample structured summary format for a complex ECE topic.',
  explain_ece: 'Can you explain a fundamental ECE concept in detail? Choose one of: Phase-Locked Loop (PLL), MOSFET operation, Fourier Transform applications in signal processing, or Op-Amp circuits. Make it clear with examples.',
  explain_cyber: 'Explain a key cybersecurity concept in depth. Choose: Buffer Overflow exploitation, SQL Injection with examples, Cross-Site Scripting (XSS) attack types, or Public Key Infrastructure (PKI). Include how to defend against it.',
  quiz: 'Generate a 5-question multiple choice quiz on cybersecurity fundamentals for an ECE student. Include topics like networking, web security, cryptography, and Linux. Format with question, options A-D, and the correct answer marked.',
  interview: 'Generate 10 important technical interview questions for a Cybersecurity / Security Engineer role, suitable for an ECE final-year student. Include questions on networking, web app security, cryptography, and Linux. Provide brief expected answers.',
  roadmap: 'Create a detailed 6-month learning roadmap for an ECE student (current semester 5) who wants to become a Cybersecurity + AI Engineer. Include: monthly goals, specific skills to learn, certifications to target, platforms to use (TryHackMe, HackTheBox), and projects to build.',
  ctf: 'Give me tips and hints for solving common CTF challenge categories: Web Exploitation, Cryptography, Binary Exploitation (pwn), Reverse Engineering, and Forensics. Include recommended tools for each category.',
  resume: 'Help me build an ATS-optimized resume for a Cybersecurity/Security Engineer internship as an ECE student. What sections should I include? What skills are most important to highlight? Provide a template structure.'
};

window.quickPrompt = function(type) {
  const prompt = QUICK_PROMPTS[type];
  if (prompt) {
    document.getElementById('ai-input').value = prompt;
    navigate('ai-assistant');
    setTimeout(() => sendAIMessage(), 100);
  }
};

window.sendAIMessage = async function() {
  const input = document.getElementById('ai-input');
  const msg = input.value.trim();
  if (!msg) return;

  const sendBtn = document.getElementById('ai-send-btn');
  sendBtn.disabled = true;
  input.value = '';
  autoResizeTextarea(input);

  appendChatMessage('user', msg);
  const loadingId = appendChatLoading();

  aiChatHistory.push({ role: 'user', content: msg });

  try {
    const model = document.getElementById('ai-model-select').value;
    const systemPrompt = `You are CREO AI, a specialized assistant for ECE (Electronics & Communication Engineering) students targeting careers in Cybersecurity and AI Engineering.

Your expertise includes:
- ECE subjects: Digital Electronics, Signal Processing, VLSI, Embedded Systems, Communication Systems, Microprocessors
- Cybersecurity: Network Security, Web App Security (OWASP), Penetration Testing, CTF challenges, Cryptography, Malware Analysis, Linux Security
- AI/ML: Machine Learning fundamentals, Deep Learning, Neural Networks, AI applications in security
- Career guidance: Certifications (CompTIA Security+, CEH, OSCP), internships, resume building, interview prep
- Platforms: TryHackMe, HackTheBox, PicoCTF, Coursera, edX

Format responses clearly with:
- Use **bold** for important terms
- Use bullet points for lists
- Use \`code blocks\` for commands/code
- Include practical examples when explaining concepts
- Keep responses concise but comprehensive`;

    const response = await callOpenRouterWithHistory(systemPrompt, aiChatHistory, model);
    removeChatLoading(loadingId);
    appendChatMessage('assistant', response);
    aiChatHistory.push({ role: 'assistant', content: response });

    if (aiChatHistory.length > 20) aiChatHistory = aiChatHistory.slice(-20);
  } catch(e) {
    removeChatLoading(loadingId);
    appendChatMessage('assistant', '⚠️ Sorry, I encountered an error. Please check your OpenRouter API key in firebase.js. Make sure OPENROUTER_API_KEY is set correctly.');
  }
  sendBtn.disabled = false;
};

function appendChatMessage(role, content) {
  const container = document.getElementById('ai-chat-messages');
  const div = document.createElement('div');
  div.className = `ai-msg ${role}`;
  const formatted = formatMarkdown(content);
  div.innerHTML = role === 'user'
    ? `<div class="ai-bubble">${formatted}</div><div class="ai-avatar">👤</div>`
    : `<div class="ai-avatar">🤖</div><div class="ai-bubble">${formatted}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function appendChatLoading() {
  const id = 'loading-' + Date.now();
  const container = document.getElementById('ai-chat-messages');
  const div = document.createElement('div');
  div.className = 'ai-msg ai-msg-loading';
  div.id = id;
  div.innerHTML = `<div class="ai-avatar">🤖</div><div class="ai-bubble"><div class="typing-dots"><span></span><span></span><span></span></div><span>Thinking...</span></div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeChatLoading(id) {
  document.getElementById(id)?.remove();
}

function formatMarkdown(text) {
  return text
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<strong style="color:var(--cyan)">$1</strong>')
    .replace(/^## (.+)$/gm, '<strong style="font-size:1rem">$1</strong>')
    .replace(/^# (.+)$/gm, '<strong style="font-size:1.1rem">$1</strong>')
    .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^([^<])/, '<p>$1').replace(/([^>])$/, '$1</p>');
}

window.handleAIEnter = function(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAIMessage(); }
};
window.autoResizeTextarea = function(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
};

window.generateAISummary = async function() {
  const name = document.getElementById('res-name').value;
  const languages = document.getElementById('res-languages').value;
  const tools = document.getElementById('res-tools').value;
  const college = userProfile.college || 'Engineering College';
  const cgpa = userProfile.cgpa || '8.0';
  const prompt = `Write a 2-3 sentence professional resume summary for an ECE student named ${name||'Student'} from ${college} with CGPA ${cgpa}. 
Skills include: Languages: ${languages||'Python, C++'}, Tools: ${tools||'Linux, Git'}.
They're targeting Cybersecurity + AI Engineering roles. Make it ATS-friendly, impactful, and concise. Return only the summary text.`;
  try {
    showToast('Generating AI summary...', 'info');
    const res = await callOpenRouter(prompt, 200);
    document.getElementById('res-summary').value = res.replace(/^"|"$/g,'').trim();
    showToast('Summary generated!', 'success');
  } catch(e) { showToast('Failed to generate summary', 'error'); }
};

// ============================================================
// NOTES SYSTEM
// ============================================================
async function loadNotes() {
  try {
    const snap = await db.collection('users').doc(currentUser.uid).collection('notes').orderBy('createdAt','desc').get();
    notes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderNotes(notes);
  } catch(e) { renderNotes([]); }
}

function renderNotes(notesList) {
  const grid = document.getElementById('notes-grid');
  const empty = document.getElementById('notes-empty');
  lucide.createIcons();
  if (!notesList.length) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  grid.innerHTML = notesList.map(n => `
    <div class="note-card" onclick="openNote('${n.id}')">
      <div class="note-card-type-icon">${getFileIcon(n.type)}</div>
      <div class="note-card-title">${escHtml(n.title)}</div>
      <div class="note-card-subject">${escHtml(n.subject||'')}</div>
      <div class="note-card-tags">${(n.tags||[]).map(t=>`<span class="note-tag">${escHtml(t)}</span>`).join('')}</div>
      <div class="note-card-actions">
        ${n.cloudinaryUrl ? `<a href="${n.cloudinaryUrl}" target="_blank" onclick="event.stopPropagation()">📥 Open</a>` : ''}
        <button onclick="event.stopPropagation();deleteNote('${n.id}')"><i data-lucide="trash-2"></i></button>
      </div>
    </div>
  `).join('');
  lucide.createIcons();
}

window.searchNotes = function() {
  const q = document.getElementById('notes-search').value.toLowerCase();
  const type = document.getElementById('notes-filter-type').value;
  const filtered = notes.filter(n => {
    const matchesText = !q || n.title?.toLowerCase().includes(q) || n.subject?.toLowerCase().includes(q) || (n.tags||[]).some(t=>t.toLowerCase().includes(q));
    const matchesType = !type || n.type === type;
    return matchesText && matchesType;
  });
  renderNotes(filtered);
};

window.openNote = function(id) {
  const n = notes.find(x => x.id === id);
  if (n?.cloudinaryUrl) window.open(n.cloudinaryUrl, '_blank');
};

window.showUploadNoteModal = function() {
  openModal('Upload Note', `
    <div class="form-group"><label>Title *</label><input type="text" id="m-note-title" placeholder="e.g. DSP Unit 3 Notes" /></div>
    <div class="form-row">
      <div class="form-group"><label>Subject</label><input type="text" id="m-note-subject" placeholder="e.g. DSP" /></div>
      <div class="form-group"><label>Type</label>
        <select id="m-note-type"><option value="pdf">PDF</option><option value="image">Image</option><option value="doc">Document</option><option value="link">Link</option></select>
      </div>
    </div>
    <div class="form-group"><label>Tags (comma separated)</label><input type="text" id="m-note-tags" placeholder="e.g. unit3, signals, filter" /></div>
    <div id="m-note-file-section" class="form-group"><label>Upload File</label>
      <input type="file" id="m-note-file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp" />
    </div>
    <div id="m-note-link-section" class="form-group hidden"><label>URL / Link</label><input type="text" id="m-note-link" placeholder="https://..." /></div>
    <div id="m-note-upload-status" style="font-size:0.82rem;color:var(--cyan);margin-top:0.5rem"></div>
  `, [{label:'Save Note', action: uploadNote, cls:'btn-primary'}]);

  document.getElementById('m-note-type').addEventListener('change', function() {
    const isLink = this.value === 'link';
    document.getElementById('m-note-file-section').classList.toggle('hidden', isLink);
    document.getElementById('m-note-link-section').classList.toggle('hidden', !isLink);
  });
};

async function uploadNote() {
  const title = document.getElementById('m-note-title').value.trim();
  if (!title) { showToast('Title required', 'warning'); return; }
  const type = document.getElementById('m-note-type').value;
  const subject = document.getElementById('m-note-subject').value.trim();
  const tags = document.getElementById('m-note-tags').value.split(',').map(t=>t.trim()).filter(Boolean);
  let cloudinaryUrl = '', publicId = '';

  if (type !== 'link') {
    const file = document.getElementById('m-note-file').files[0];
    if (!file) { showToast('Please select a file', 'warning'); return; }
    const statusEl = document.getElementById('m-note-upload-status');
    statusEl.textContent = 'Uploading to Cloudinary...';
    try {
      const result = await uploadToCloudinary(file);
      cloudinaryUrl = result.secure_url || result;
      publicId = result.public_id || '';
      statusEl.textContent = '✓ Uploaded successfully!';
    } catch(e) {
      showToast('Upload failed. Check Cloudinary config in firebase.js', 'error');
      return;
    }
  } else {
    cloudinaryUrl = document.getElementById('m-note-link').value.trim();
  }

  await db.collection('users').doc(currentUser.uid).collection('notes').add({
    title, type, subject, tags, cloudinaryUrl, publicId,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  closeAllModals(); await loadNotes();
  showToast('Note saved!', 'success');
}

window.deleteNote = async function(id) {
  if (!confirm('Delete this note?')) return;
  await db.collection('users').doc(currentUser.uid).collection('notes').doc(id).delete();
  notes = notes.filter(n => n.id !== id);
  renderNotes(notes);
  showToast('Note deleted', 'info');
};

// ============================================================
// CLOUDINARY UPLOAD
// ============================================================
async function uploadToCloudinary(file) {
  if (!CLOUDINARY_CLOUD_NAME || CLOUDINARY_CLOUD_NAME === 'YOUR_CLOUD_NAME') {
    throw new Error('Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME in firebase.js');
  }
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', `creo-ece/${currentUser.uid}`);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Cloudinary upload failed');
  const data = await res.json();
  return data.secure_url;
}

// ============================================================
// CYBERSECURITY HUB
// ============================================================
window.switchCyberTab = function(tab) {
  document.querySelectorAll('.cyber-tab-content').forEach(el => el.classList.add('hidden'));
  document.getElementById(`cyber-${tab}`)?.classList.remove('hidden');
  document.querySelectorAll('.cyber-tab').forEach((b,i) => {
    const tabs = ['roadmap','certs','ctf','skills'];
    b.classList.toggle('active', tabs[i] === tab);
  });
  if (tab === 'certs') loadCerts();
  if (tab === 'ctf') loadCTF();
  if (tab === 'skills') { loadCyberSkills(); renderSkillsRadar(); }
  loadRoadmapProgress();
  lucide.createIcons();
};

async function loadRoadmapProgress() {
  try {
    const doc = await db.collection('users').doc(currentUser.uid).get();
    roadmapProgress = doc.data()?.roadmapProgress || {};
    document.querySelectorAll('.roadmap-item').forEach(item => {
      const skill = item.dataset.skill;
      if (roadmapProgress[skill]) {
        item.querySelector('.ri-check').textContent = '✅';
        item.classList.add('completed');
      }
    });
  } catch(e) {}
}

window.toggleRoadmapItem = async function(el) {
  const item = el.closest('.roadmap-item');
  const skill = item.dataset.skill;
  const done = el.textContent === '✅';
  if (!done) {
    el.textContent = '✅'; item.classList.add('completed');
    roadmapProgress[skill] = true;
    showToast('Skill marked complete! 🎉', 'success');
  } else {
    el.textContent = '☐'; item.classList.remove('completed');
    delete roadmapProgress[skill];
  }
  await db.collection('users').doc(currentUser.uid).update({ roadmapProgress });
};

async function loadCerts() {
  try {
    const snap = await db.collection('users').doc(currentUser.uid).collection('certifications').get();
    certifications = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCerts();
  } catch(e) {}
}

function renderCerts() {
  const el = document.getElementById('certs-list');
  if (!certifications.length) { el.innerHTML = '<div class="empty-state-sm" style="padding:1rem">No certifications tracked yet.</div>'; return; }
  el.innerHTML = certifications.map(c => `
    <div class="cert-card">
      <div class="cert-status ${c.status||'planned'}"></div>
      <div class="cert-info">
        <div class="cert-name">${escHtml(c.name)}</div>
        <div class="cert-provider">${escHtml(c.provider||'')} ${c.completedDate ? '· ' + formatDate(c.completedDate) : ''}</div>
      </div>
      <span class="cert-category">${c.category||'Security'}</span>
      ${c.credentialUrl ? `<a href="${c.credentialUrl}" target="_blank" style="font-size:0.75rem;color:var(--cyan)">View</a>` : ''}
      <button onclick="deleteCert('${c.id}')" style="color:var(--text-3);padding:4px"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
    </div>
  `).join('');
  lucide.createIcons();
}

window.showAddCertModal = function() {
  openModal('Track Certification', `
    <div class="form-group"><label>Certification Name *</label><input type="text" id="m-cert-name" placeholder="e.g. CompTIA Security+" /></div>
    <div class="form-row">
      <div class="form-group"><label>Provider</label><input type="text" id="m-cert-provider" placeholder="e.g. CompTIA" /></div>
      <div class="form-group"><label>Category</label>
        <select id="m-cert-cat"><option>Security</option><option>Networking</option><option>Cloud</option><option>AI/ML</option><option>Development</option></select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Status</label>
        <select id="m-cert-status"><option value="planned">Planned</option><option value="in-progress">In Progress</option><option value="completed">Completed</option></select>
      </div>
      <div class="form-group"><label>Completed Date</label><input type="date" id="m-cert-date" /></div>
    </div>
    <div class="form-group"><label>Credential URL</label><input type="text" id="m-cert-url" placeholder="https://..." /></div>
  `, [{label:'Add Certification', action: async () => {
    const name = document.getElementById('m-cert-name').value.trim();
    if (!name) { showToast('Name required', 'warning'); return; }
    await db.collection('users').doc(currentUser.uid).collection('certifications').add({
      name, provider: document.getElementById('m-cert-provider').value.trim(),
      category: document.getElementById('m-cert-cat').value,
      status: document.getElementById('m-cert-status').value,
      completedDate: document.getElementById('m-cert-date').value,
      credentialUrl: document.getElementById('m-cert-url').value.trim(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    closeAllModals(); await loadCerts();
    showToast('Certification added!', 'success');
  }, cls:'btn-primary'}]);
};

window.deleteCert = async function(id) {
  if (!confirm('Delete this certification?')) return;
  await db.collection('users').doc(currentUser.uid).collection('certifications').doc(id).delete();
  certifications = certifications.filter(c => c.id !== id);
  renderCerts();
};

async function loadCTF() {
  try {
    const snap = await db.collection('users').doc(currentUser.uid).collection('ctfChallenges').get();
    ctfChallenges = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCTF();
  } catch(e) {}
}

function renderCTF() {
  const total = ctfChallenges.length;
  const solved = ctfChallenges.filter(c => c.solved).length;
  const points = ctfChallenges.reduce((s,c) => s + (c.points||0), 0);
  document.getElementById('ctf-total').textContent = total;
  document.getElementById('ctf-solved').textContent = solved;
  document.getElementById('ctf-points').textContent = points;
  const el = document.getElementById('ctf-list');
  if (!ctfChallenges.length) { el.innerHTML = '<div class="empty-state-sm" style="padding:1rem">No CTF challenges logged yet.</div>'; return; }
  el.innerHTML = ctfChallenges.map(c => `
    <div class="ctf-card">
      <div class="ctf-${c.solved?'solved':'unsolved'}-dot"></div>
      <div class="ctf-info">
        <div class="ctf-name">${escHtml(c.name)}</div>
        <div class="ctf-meta">${escHtml(c.platform||'')} · ${escHtml(c.category||'')} ${c.date ? '· '+formatDate(c.date) : ''}</div>
      </div>
      <div class="ctf-points">${c.points||0}pts</div>
      <button onclick="deleteCTF('${c.id}')" style="color:var(--text-3);padding:4px"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
    </div>
  `).join('');
  lucide.createIcons();
}

window.showAddCTFModal = function() {
  openModal('Log CTF Challenge', `
    <div class="form-group"><label>Challenge Name *</label><input type="text" id="m-ctf-name" placeholder="e.g. Web Exploitation #1" /></div>
    <div class="form-row">
      <div class="form-group"><label>Platform</label>
        <select id="m-ctf-platform"><option>TryHackMe</option><option>HackTheBox</option><option>PicoCTF</option><option>CTFTime</option><option>PortSwigger</option><option>Other</option></select>
      </div>
      <div class="form-group"><label>Category</label>
        <select id="m-ctf-cat"><option>Web</option><option>Crypto</option><option>Forensics</option><option>Pwn</option><option>Reverse</option><option>Misc</option></select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Points</label><input type="number" id="m-ctf-pts" placeholder="100" min="0" /></div>
      <div class="form-group"><label>Date</label><input type="date" id="m-ctf-date" value="${todayKey()}" /></div>
    </div>
    <div class="form-group"><label>Status</label>
      <select id="m-ctf-solved"><option value="true">Solved ✅</option><option value="false">Attempted</option></select>
    </div>
  `, [{label:'Log Challenge', action: async () => {
    const name = document.getElementById('m-ctf-name').value.trim();
    if (!name) { showToast('Challenge name required', 'warning'); return; }
    await db.collection('users').doc(currentUser.uid).collection('ctfChallenges').add({
      name, platform: document.getElementById('m-ctf-platform').value,
      category: document.getElementById('m-ctf-cat').value,
      points: parseInt(document.getElementById('m-ctf-pts').value)||0,
      date: document.getElementById('m-ctf-date').value,
      solved: document.getElementById('m-ctf-solved').value === 'true',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    closeAllModals(); await loadCTF();
    showToast('CTF challenge logged!', 'success');
  }, cls:'btn-primary'}]);
};

window.deleteCTF = async function(id) {
  await db.collection('users').doc(currentUser.uid).collection('ctfChallenges').doc(id).delete();
  ctfChallenges = ctfChallenges.filter(c => c.id !== id);
  renderCTF();
};

function loadCyberSkills() {
  const el = document.getElementById('skills-list');
  if (!el) return;
  const skillLabels = { networking:'Networking', linux:'Linux/CLI', python:'Python', web_sec:'Web Security', pentest:'Pen Testing', crypto:'Cryptography', forensics:'Forensics', malware:'Malware Analysis', cloud:'Cloud Security' };
  el.innerHTML = Object.entries(cyberSkills).map(([k,v]) => `
    <div class="skill-bar-item">
      <div class="skill-bar-header">
        <span class="skill-bar-name">${skillLabels[k]||k}</span>
        <span class="skill-bar-val">${v}%</span>
      </div>
      <div class="skill-bar-track"><div class="skill-bar-fill" style="width:${v}%"></div></div>
    </div>
  `).join('');
}

window.showUpdateSkillModal = function() {
  const skillLabels = { networking:'Networking', linux:'Linux/CLI', python:'Python', web_sec:'Web Security', pentest:'Pen Testing', crypto:'Cryptography', forensics:'Forensics', malware:'Malware Analysis', cloud:'Cloud Security' };
  const fields = Object.entries(cyberSkills).map(([k,v]) => `
    <div class="form-group">
      <label>${skillLabels[k]||k} <span style="color:var(--cyan);font-family:var(--font-mono)">${v}%</span></label>
      <input type="range" id="skill-${k}" value="${v}" min="0" max="100" style="width:100%;accent-color:var(--cyan)" oninput="document.querySelector('label[for=skill-${k}] span').textContent=this.value+'%'" />
    </div>
  `).join('');
  openModal('Update Cyber Skills', fields, [{label:'Save Skills', action: async () => {
    Object.keys(cyberSkills).forEach(k => {
      cyberSkills[k] = parseInt(document.getElementById(`skill-${k}`)?.value) || 0;
    });
    await db.collection('users').doc(currentUser.uid).update({ cyberSkills });
    closeAllModals(); loadCyberSkills(); renderSkillsRadar();
    showToast('Skills updated!', 'success');
  }, cls:'btn-primary'}]);
};

function renderSkillsRadar() {
  const ctx = document.getElementById('skillsRadarChart');
  if (!ctx) return;
  destroyChart('skillsRadar');
  const labels = ['Networking','Linux','Python','Web Sec','Pen Test','Crypto','Forensics','Malware','Cloud'];
  const data = Object.values(cyberSkills);
  charts.skillsRadar = new Chart(ctx, {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        label: 'Skill Level', data,
        backgroundColor: 'rgba(0,245,196,0.15)',
        borderColor: 'rgba(0,245,196,0.8)',
        borderWidth: 2, pointBackgroundColor: 'var(--cyan)',
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      scales: { r: { beginAtZero: true, max: 100, ticks: { color: 'rgba(255,255,255,0.3)', backdropColor:'transparent', stepSize: 20 }, grid: { color: 'rgba(255,255,255,0.08)' }, angleLines: { color: 'rgba(255,255,255,0.08)' }, pointLabels: { color: 'rgba(255,255,255,0.6)', font: { size: 10 } } } },
      plugins: { legend: { display: false } }
    }
  });
}

// ============================================================
// PLACEMENT HUB
// ============================================================
window.switchPlacementTab = function(tab) {
  document.querySelectorAll('.placement-tab-content').forEach(el => el.classList.add('hidden'));
  document.getElementById(`placement-${tab}`)?.classList.remove('hidden');
  document.querySelectorAll('.placement-tab').forEach((b,i) => {
    const tabs = ['resume','projects','internships'];
    b.classList.toggle('active', tabs[i] === tab);
  });
  if (tab === 'projects') loadProjects();
  if (tab === 'internships') loadInternships();
  lucide.createIcons();
};

window.previewResume = function() {
  const name = document.getElementById('res-name').value || userProfile.name || 'Your Name';
  const email = document.getElementById('res-email').value || currentUser?.email || '';
  const phone = document.getElementById('res-phone').value || '';
  const linkedin = document.getElementById('res-linkedin').value || '';
  const github = document.getElementById('res-github').value || '';
  const languages = document.getElementById('res-languages').value || '';
  const tools = document.getElementById('res-tools').value || '';
  const frameworks = document.getElementById('res-frameworks').value || '';
  const platforms = document.getElementById('res-platforms').value || '';
  const summary = document.getElementById('res-summary').value || '';

  const projectsHtml = projects.slice(0,3).map(p => `
    <div style="margin-bottom:0.5rem">
      <strong>${escHtml(p.title)}</strong> <span style="color:var(--text-3)">· ${(p.techStack||[]).join(', ')}</span>
      <div style="font-size:0.8rem;color:var(--text-2)">${escHtml(p.description||'')}</div>
    </div>
  `).join('');

  const certsHtml = certifications.filter(c=>c.status==='completed').slice(0,3).map(c => `<li>${escHtml(c.name)} — ${escHtml(c.provider||'')}</li>`).join('');

  const html = `
    <div class="resume-actual">
      <h2>${escHtml(name)}</h2>
      <div class="res-contact">${[email,phone,linkedin,github].filter(Boolean).join(' | ')}</div>
      ${summary ? `<h3>Summary</h3><p>${escHtml(summary)}</p>` : ''}
      <h3>Education</h3>
      <p><strong>${escHtml(userProfile.college||'Your College')}</strong> — B.E. Electronics & Communication Engineering</p>
      <p>CGPA: ${userProfile.cgpa||'—'} | Semester: ${userProfile.semester||'—'}</p>
      <h3>Technical Skills</h3>
      ${languages ? `<p><strong>Languages:</strong> ${escHtml(languages)}</p>` : ''}
      ${tools ? `<p><strong>Security Tools:</strong> ${escHtml(tools)}</p>` : ''}
      ${frameworks ? `<p><strong>Frameworks:</strong> ${escHtml(frameworks)}</p>` : ''}
      ${platforms ? `<p><strong>Platforms:</strong> ${escHtml(platforms)}</p>` : ''}
      ${projectsHtml ? `<h3>Projects</h3>${projectsHtml}` : ''}
      ${certsHtml ? `<h3>Certifications</h3><ul>${certsHtml}</ul>` : ''}
    </div>
  `;
  document.getElementById('resume-preview').innerHTML = html;
  showToast('Resume preview generated!', 'success');
};

window.generateResumePDF = function() {
  previewResume();
  setTimeout(() => {
    const content = document.getElementById('resume-preview').innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html><html><head><title>Resume</title>
      <style>
        body{font-family:Arial,sans-serif;max-width:800px;margin:2rem auto;color:#000;font-size:12px;line-height:1.5}
        h2{color:#00c8a0;border-bottom:2px solid #00c8a0;padding-bottom:5px}
        h3{color:#333;margin:10px 0 5px;font-size:11px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #ccc}
        p,li{margin:3px 0} ul{padding-left:15px} strong{color:#000}
        @media print{@page{margin:1.5cm}}
      </style></head><body>${content.replace(/var\(--[\w-]+\)/g,'#333').replace(/class="[^"]*"/g,'')}</body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
    showToast('Opening print dialog...', 'info');
  }, 300);
};

async function loadProjects() {
  try {
    const snap = await db.collection('users').doc(currentUser.uid).collection('projects').get();
    projects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderProjects();
  } catch(e) {}
}

function renderProjects() {
  const grid = document.getElementById('projects-grid');
  const empty = document.getElementById('projects-empty');
  if (!projects.length) { grid.innerHTML = ''; empty?.classList.remove('hidden'); return; }
  empty?.classList.add('hidden');
  grid.innerHTML = projects.map(p => `
    <div class="project-card">
      <div class="project-header">
        <div class="project-title">${escHtml(p.title)}</div>
        <span class="project-status status-${p.status||'planned'}">${p.status||'Planned'}</span>
      </div>
      <div class="project-desc">${escHtml(p.description||'')}</div>
      <div class="project-tech">${(p.techStack||[]).map(t=>`<span class="tech-tag">${escHtml(t)}</span>`).join('')}</div>
      <div class="project-links">
        ${p.githubUrl ? `<a href="${p.githubUrl}" target="_blank"><i data-lucide="github"></i> GitHub</a>` : ''}
        ${p.liveUrl ? `<a href="${p.liveUrl}" target="_blank"><i data-lucide="external-link"></i> Live</a>` : ''}
        <button onclick="deleteProject('${p.id}')" style="color:var(--text-3);font-size:0.8rem;padding:2px 6px">Delete</button>
      </div>
    </div>
  `).join('');
  lucide.createIcons();
}

window.showAddProjectModal = function() {
  openModal('Add Project', `
    <div class="form-group"><label>Project Title *</label><input type="text" id="m-proj-title" placeholder="e.g. Network Packet Analyzer" /></div>
    <div class="form-group"><label>Description</label><textarea id="m-proj-desc" rows="3" placeholder="Brief description of the project..."></textarea></div>
    <div class="form-group"><label>Tech Stack (comma separated)</label><input type="text" id="m-proj-tech" placeholder="Python, Scapy, Linux" /></div>
    <div class="form-row">
      <div class="form-group"><label>GitHub URL</label><input type="text" id="m-proj-github" placeholder="https://github.com/..." /></div>
      <div class="form-group"><label>Live URL</label><input type="text" id="m-proj-live" placeholder="https://..." /></div>
    </div>
    <div class="form-group"><label>Status</label>
      <select id="m-proj-status"><option value="completed">Completed</option><option value="in-progress">In Progress</option><option value="planned">Planned</option></select>
    </div>
  `, [{label:'Add Project', action: async () => {
    const title = document.getElementById('m-proj-title').value.trim();
    if (!title) { showToast('Title required', 'warning'); return; }
    await db.collection('users').doc(currentUser.uid).collection('projects').add({
      title, description: document.getElementById('m-proj-desc').value.trim(),
      techStack: document.getElementById('m-proj-tech').value.split(',').map(t=>t.trim()).filter(Boolean),
      githubUrl: document.getElementById('m-proj-github').value.trim(),
      liveUrl: document.getElementById('m-proj-live').value.trim(),
      status: document.getElementById('m-proj-status').value,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    closeAllModals(); await loadProjects();
    showToast('Project added!', 'success');
  }, cls:'btn-primary'}]);
};

window.deleteProject = async function(id) {
  if (!confirm('Delete this project?')) return;
  await db.collection('users').doc(currentUser.uid).collection('projects').doc(id).delete();
  projects = projects.filter(p => p.id !== id);
  renderProjects();
};

async function loadInternships() {
  try {
    const snap = await db.collection('users').doc(currentUser.uid).collection('internships').get();
    internships = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderInternships();
  } catch(e) {}
}

function renderInternships() {
  const list = document.getElementById('internships-list');
  const empty = document.getElementById('internships-empty');
  if (!internships.length) { list.innerHTML = ''; empty?.classList.remove('hidden'); return; }
  empty?.classList.add('hidden');
  list.innerHTML = internships.map(i => `
    <div class="internship-card">
      <div class="internship-logo">${i.company?.[0]||'🏢'}</div>
      <div class="internship-info">
        <div class="internship-role">${escHtml(i.role||'')}</div>
        <div class="internship-company">${escHtml(i.company||'')} · ${i.type||'Internship'}</div>
        <div class="internship-meta">${i.startDate||''} ${i.endDate ? '→ '+i.endDate : ''} ${i.stipend ? '· ₹'+i.stipend+'/month' : ''}</div>
      </div>
      <span class="internship-status status-${i.status||'planned'}">${i.status||'Planned'}</span>
      <button onclick="deleteInternship('${i.id}')" style="color:var(--text-3);padding:4px"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
    </div>
  `).join('');
  lucide.createIcons();
}

window.showAddInternshipModal = function() {
  openModal('Add Internship', `
    <div class="form-row">
      <div class="form-group"><label>Company *</label><input type="text" id="m-int-company" placeholder="e.g. Cisco, DRDO" /></div>
      <div class="form-group"><label>Role *</label><input type="text" id="m-int-role" placeholder="e.g. Security Intern" /></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Type</label>
        <select id="m-int-type"><option>Remote</option><option>On-site</option><option>Hybrid</option></select>
      </div>
      <div class="form-group"><label>Status</label>
        <select id="m-int-status"><option value="planned">Planned</option><option value="in-progress">Ongoing</option><option value="completed">Completed</option></select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Start Date</label><input type="date" id="m-int-start" /></div>
      <div class="form-group"><label>End Date</label><input type="date" id="m-int-end" /></div>
    </div>
    <div class="form-group"><label>Stipend (₹/month)</label><input type="number" id="m-int-stipend" placeholder="e.g. 15000" /></div>
  `, [{label:'Add Internship', action: async () => {
    const company = document.getElementById('m-int-company').value.trim();
    const role = document.getElementById('m-int-role').value.trim();
    if (!company || !role) { showToast('Company and role required', 'warning'); return; }
    await db.collection('users').doc(currentUser.uid).collection('internships').add({
      company, role, type: document.getElementById('m-int-type').value,
      status: document.getElementById('m-int-status').value,
      startDate: document.getElementById('m-int-start').value,
      endDate: document.getElementById('m-int-end').value,
      stipend: parseInt(document.getElementById('m-int-stipend').value)||0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    closeAllModals(); await loadInternships();
    showToast('Internship added!', 'success');
  }, cls:'btn-primary'}]);
};

window.deleteInternship = async function(id) {
  await db.collection('users').doc(currentUser.uid).collection('internships').doc(id).delete();
  internships = internships.filter(i => i.id !== id);
  renderInternships();
};

// ============================================================
// ANALYTICS
// ============================================================
function loadAnalytics() {
  renderWeeklyStudyChart();
  renderAttendanceChart();
  renderMonthlyProgressChart();
  renderSkillGrowthChart();
  renderHabitChart();
  renderCgpaTrendChart();
}

function renderWeeklyStudyChart() {
  const ctx = document.getElementById('weeklyStudyChart'); if (!ctx) return;
  destroyChart('weeklyStudy');
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  charts.weeklyStudy = new Chart(ctx, {
    type: 'bar',
    data: { labels: days, datasets: [{ label: 'Study Hours', data: days.map(() => +(Math.random()*3+0.5).toFixed(1)), backgroundColor: 'rgba(0,245,196,0.3)', borderColor: 'rgba(0,245,196,0.9)', borderWidth: 2, borderRadius: 6 }] },
    options: getChartOptions('Hours')
  });
}

function renderAttendanceChart() {
  const ctx = document.getElementById('attendanceChart'); if (!ctx) return;
  destroyChart('attendance');
  const labels = subjects.length ? subjects.map(s=>s.name?.substring(0,8)||'Sub') : ['DSP','VLSI','CN','MP','EC'];
  const data = subjects.length ? subjects.map(s=>parseFloat(s.attendance)||0) : [85,72,90,68,78];
  charts.attendance = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: ['rgba(0,245,196,0.7)','rgba(168,85,247,0.7)','rgba(59,130,246,0.7)','rgba(249,115,22,0.7)','rgba(34,197,94,0.7)'], borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' }] },
    options: { responsive: true, plugins: { legend: { labels: { color: 'rgba(255,255,255,0.6)', font: { size: 10 } } } } }
  });
}

function renderMonthlyProgressChart() {
  const ctx = document.getElementById('monthlyProgressChart'); if (!ctx) return;
  destroyChart('monthly');
  const months = ['Jan','Feb','Mar','Apr','May','Jun'];
  charts.monthly = new Chart(ctx, {
    type: 'line',
    data: { labels: months, datasets: [{ label: 'Study Score', data: months.map(() => Math.floor(Math.random()*30+60)), borderColor: 'rgba(168,85,247,0.9)', backgroundColor: 'rgba(168,85,247,0.1)', borderWidth: 2, fill: true, tension: 0.4, pointBackgroundColor: 'var(--purple)' }] },
    options: getChartOptions('Score')
  });
}

function renderSkillGrowthChart() {
  const ctx = document.getElementById('skillGrowthChart'); if (!ctx) return;
  destroyChart('skillGrowth');
  const months = ['Jan','Feb','Mar','Apr','May','Jun'];
  charts.skillGrowth = new Chart(ctx, {
    type: 'line',
    data: { labels: months, datasets: [
      { label: 'Cybersecurity', data: [10,20,28,38,45,55], borderColor: 'rgba(0,245,196,0.9)', borderWidth: 2, tension: 0.4, fill: false, pointBackgroundColor: 'var(--cyan)' },
      { label: 'AI/ML', data: [5,10,18,25,35,42], borderColor: 'rgba(168,85,247,0.9)', borderWidth: 2, tension: 0.4, fill: false, pointBackgroundColor: 'var(--purple)' }
    ] },
    options: getChartOptions('Skill %')
  });
}

function renderHabitChart() {
  const ctx = document.getElementById('habitChart'); if (!ctx) return;
  destroyChart('habit');
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  charts.habit = new Chart(ctx, {
    type: 'bar',
    data: { labels: days, datasets: [{ label: 'Habits Completed', data: days.map(() => Math.floor(Math.random()*5+1)), backgroundColor: 'rgba(34,197,94,0.5)', borderColor: 'rgba(34,197,94,0.9)', borderWidth: 2, borderRadius: 4 }] },
    options: getChartOptions('Habits')
  });
}

function renderCgpaTrendChart() {
  const ctx = document.getElementById('cgpaTrendChart'); if (!ctx) return;
  destroyChart('cgpa');
  const sems = ['Sem 1','Sem 2','Sem 3','Sem 4','Sem 5','Sem 6'];
  charts.cgpa = new Chart(ctx, {
    type: 'line',
    data: { labels: sems, datasets: [{ label: 'CGPA', data: [7.2,7.8,8.1,8.3,8.5,parseFloat(userProfile.cgpa)||8.5], borderColor: 'rgba(249,115,22,0.9)', backgroundColor: 'rgba(249,115,22,0.1)', borderWidth: 2, fill: true, tension: 0.4, pointBackgroundColor: 'var(--orange)' }] },
    options: getChartOptions('CGPA')
  });
}

function getChartOptions(yLabel) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: 'rgba(255,255,255,0.6)', font: { size: 10 } } } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10 } } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: 'rgba(255,255,255,0.5)', font: { size: 10 } }, title: { display: true, text: yLabel, color: 'rgba(255,255,255,0.3)', font: { size: 9 } } }
    }
  };
}

function destroyChart(key) {
  if (charts[key]) { charts[key].destroy(); delete charts[key]; }
}
function clearAllCharts() {
  Object.keys(charts).forEach(k => destroyChart(k));
}

// ============================================================
// OPENROUTER API
// ============================================================
async function callOpenRouter(prompt, maxTokens = 1000) {
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'YOUR_OPENROUTER_API_KEY') {
    throw new Error('OpenRouter API key not configured');
  }
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.href,
      'X-Title': 'CREO ECE Career OS'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-exp:free',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callOpenRouterWithHistory(systemPrompt, history, model, maxTokens = 1000) {
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'YOUR_OPENROUTER_API_KEY') {
    throw new Error('OpenRouter API key not configured. Please add your key in firebase.js');
  }
  const messages = [{ role: 'system', content: systemPrompt }, ...history];
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.href,
      'X-Title': 'CREO ECE Career OS'
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, messages })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || 'No response received.';
}

// ============================================================
// THEME
// ============================================================
window.toggleTheme = function() {
  const html = document.documentElement;
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('creo-theme', next);
  const icon = document.getElementById('theme-icon');
  if (icon) { icon.setAttribute('data-lucide', next === 'dark' ? 'sun' : 'moon'); lucide.createIcons(); }
  if (Object.keys(charts).length) { clearAllCharts(); if (document.getElementById('page-analytics').classList.contains('active')) loadAnalytics(); }
};

(function initTheme() {
  const saved = localStorage.getItem('creo-theme');
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved);
    window.addEventListener('DOMContentLoaded', () => {
      const icon = document.getElementById('theme-icon');
      if (icon) { icon.setAttribute('data-lucide', saved === 'dark' ? 'sun' : 'moon'); lucide.createIcons(); }
    });
  }
})();

// ============================================================
// MODALS
// ============================================================
function openModal(title, body, actions = []) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = body;
  const footer = document.getElementById('modal-footer');
  footer.innerHTML = '';
  actions.forEach(a => {
    const btn = document.createElement('button');
    btn.className = a.cls || 'btn-secondary';
    btn.textContent = a.label;
    btn.onclick = a.action;
    footer.appendChild(btn);
  });
  document.getElementById('modal-overlay').classList.remove('hidden');
  lucide.createIcons();
}

window.closeAllModals = function() {
  document.getElementById('modal-overlay').classList.add('hidden');
};
window.closeModal = function(e) {
  if (e.target === document.getElementById('modal-overlay')) closeAllModals();
};

// ============================================================
// NOTIFICATIONS
// ============================================================
window.showNotifications = function() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
  showToast('Notifications: All caught up! ✓', 'info');
};

// ============================================================
// TOAST
// ============================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  toast.innerHTML = `<span>${icons[type]||'ℹ'}</span><span>${escHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toast-out 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ============================================================
// HELPERS
// ============================================================
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function todayKey() { return new Date().toISOString().split('T')[0]; }
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
function getFileIcon(type) {
  const icons = { pdf: '📄', image: '🖼️', doc: '📝', link: '🔗' };
  return icons[type] || '📄';
}
