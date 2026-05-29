/**
 * CozyPlanner - Core Application Logic
 * Integrasi: Timer Pomodoro, Jadwal Kuliah, Tugas, & Pelacak Siklus Kesehatan
 */

// --- 1. STATE MANAGEMENT ---
let state = {
  theme: 'dark',
  privacyMode: false,
  activeTab: 'dashboard',
  timer: {
    mode: 'focus', // focus, shortBreak, longBreak
    timeLeft: 1500, // 25 minutes in seconds
    totalDuration: 1500,
    isRunning: false,
    totalFocusToday: 0 // in minutes
  },
  customDurations: {
    focus: 25,
    shortBreak: 5,
    longBreak: 15
  },
  focusHistory: [], // array of { time: '14:23', type: 'Fokus Belajar', minutes: 25 }
  classes: [
    // Default mock classes
    { id: 'c1', name: 'Algoritma & Struktur Data', professor: 'Dr. Eng. Rinaldi', day: 'Senin', color: 'indigo', start: '08:00', end: '09:40', room: 'Lab Komputasi' },
    { id: 'c2', name: 'Basis Data', professor: 'Prof. Sri Lestari', day: 'Senin', color: 'blue', start: '10:00', end: '11:40', room: 'Ruang 402' },
    { id: 'c3', name: 'Kecerdasan Buatan', professor: 'Dr. Ir. Ahmad', day: 'Rabu', color: 'teal', start: '13:00', end: '14:40', room: 'Zoom Online' },
    { id: 'c4', name: 'Interaksi Manusia & Komputer', professor: 'Fatimah, M.T.', day: 'Kamis', color: 'rose', start: '08:00', end: '09:40', room: 'Ruang C302' }
  ],
  tasks: [
    // Default mock tasks
    { id: 't1', title: 'Implementasi Binary Search Tree', course: 'Algoritma & Struktur Data', dueDate: '2026-06-01', dueTime: '23:59', priority: 'tinggi', status: 'progress', notes: 'Tugas praktikum, unggah file .cpp di LMS kuliah.' },
    { id: 't2', title: 'Normalisasi Database E-Commerce', course: 'Basis Data', dueDate: '2026-06-05', dueTime: '12:00', priority: 'sedang', status: 'todo', notes: 'Buat ERD dan skema relasi hingga bentuk normal ketiga (3NF).' },
    { id: 't3', title: 'Laporan UI/UX Redesign App', course: 'Interaksi Manusia & Komputer', dueDate: '2026-05-30', dueTime: '23:59', priority: 'tinggi', status: 'todo', notes: 'Kumpulkan dalam format PDF beserta link Figma prototipe.' }
  ],
  cycleParams: {
    lastPeriodDate: '2026-05-10', // Default mock date (May 10, 2026)
    cycleLength: 28,
    periodLength: 5
  },
  dailyLogs: {} // Key: YYYY-MM-DD, Value: { symptoms: [], moods: [] }
};

// LocalStorage Helper
function saveStateToStorage() {
  localStorage.setItem('cozy_planner_state', JSON.stringify(state));
}

function loadStateFromStorage() {
  const stored = localStorage.getItem('cozy_planner_state');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      state = { ...state, ...parsed };
      // Make sure nested structures are present
      if (!state.customDurations) state.customDurations = { focus: 25, shortBreak: 5, longBreak: 15 };
      if (!state.focusHistory) state.focusHistory = [];
      if (!state.classes) state.classes = [];
      if (!state.tasks) state.tasks = [];
      if (!state.cycleParams) state.cycleParams = { lastPeriodDate: '2026-05-10', cycleLength: 28, periodLength: 5 };
      if (!state.dailyLogs) state.dailyLogs = {};
    } catch (e) {
      console.error('Error loading state from localStorage:', e);
    }
  } else {
    // Save defaults
    saveStateToStorage();
  }
}

// --- 2. GLOBAL INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  loadStateFromStorage();
  
  // Apply Global Theme
  applyTheme(state.theme);
  
  // Set default cycle parameters in UI inputs
  document.getElementById('last-period-date').value = state.cycleParams.lastPeriodDate;
  document.getElementById('cycle-length').value = state.cycleParams.cycleLength;
  document.getElementById('period-length').value = state.cycleParams.periodLength;
  
  // Initialize Custom Timer Inputs UI
  document.getElementById('custom-focus').value = state.customDurations.focus;
  document.getElementById('custom-short').value = state.customDurations.shortBreak;
  document.getElementById('custom-long').value = state.customDurations.longBreak;
  
  // If timer was running before reload, reset it to safe paused state
  state.timer.isRunning = false;
  resetTimer();

  // Setup Event Listeners
  initEventListeners();
  
  // Start Realtime Clocks
  startRealtimeClock();
  
  // Render App components
  renderDashboard();
  renderWeeklySchedule();
  renderTasks();
  renderCycleCalendar();
  
  // Set Selected Health log date to today initially
  const todayStr = getTodayFormattedString();
  selectHealthLogDate(todayStr);

  // Apply Privacy Mode Visuals if true
  applyPrivacyModeUI(state.privacyMode);
  
  // Ongoing check for active classes
  setInterval(checkOngoingClasses, 30000); // Check every 30s
  checkOngoingClasses();
});

// Switch SPA Tabs
function switchTab(tabId) {
  state.activeTab = tabId;
  saveStateToStorage();
  
  // Navigation Buttons Active State
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  
  // Tab Panes Active State
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.getAttribute('id') === `tab-${tabId}`);
  });
  
  // Trigger specific tab renders if needed
  if (tabId === 'dashboard') {
    renderDashboard();
  } else if (tabId === 'jadwal') {
    renderWeeklySchedule();
  } else if (tabId === 'tugas') {
    renderTasks();
  } else if (tabId === 'siklus') {
    renderCycleCalendar();
  }
}

// Set up UI event listeners
function initEventListeners() {
  // Tab Buttons
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      switchTab(tab);
    });
  });

  // Dark/Light Theme Button
  document.getElementById('theme-toggle-btn').addEventListener('click', () => {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
  });

  // Privacy Mode Button
  document.getElementById('privacy-toggle-btn').addEventListener('click', togglePrivacyMode);

  // Pomodoro Controls
  document.getElementById('timer-start').addEventListener('click', toggleTimer);
  document.getElementById('timer-reset').addEventListener('click', resetTimer);
  document.getElementById('timer-skip').addEventListener('click', skipTimer);

  // Pomodoro Quick Modes
  document.querySelectorAll('.btn-mode').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.getAttribute('data-mode');
      setTimerMode(mode);
    });
  });

  // Pomodoro Custom Set Setelan
  document.getElementById('apply-custom-durations').addEventListener('click', () => {
    const focusVal = parseInt(document.getElementById('custom-focus').value) || 25;
    const shortVal = parseInt(document.getElementById('custom-short').value) || 5;
    const longVal = parseInt(document.getElementById('custom-long').value) || 15;
    
    state.customDurations = { focus: focusVal, shortBreak: shortVal, longBreak: longVal };
    saveStateToStorage();
    
    // Switch active mode to focus and apply duration
    document.querySelectorAll('.btn-mode').forEach(b => b.classList.remove('active'));
    document.querySelector('.btn-mode[data-mode="focus"]').classList.add('active');
    setTimerMode('focus');
    showAudioToast("Durasi kustom berhasil diterapkan! ⏱️");
  });

  // Ambient sound buttons
  document.querySelectorAll('.btn-ambient').forEach(btn => {
    btn.addEventListener('click', () => {
      const soundType = btn.getAttribute('data-sound');
      toggleAmbientSound(soundType, btn);
    });
  });
  
  // Ambient Sound Volume Control
  document.getElementById('ambient-volume').addEventListener('input', (e) => {
    setAmbientVolume(e.target.value);
  });
  
  document.getElementById('toggle-ambient-play').addEventListener('click', toggleAmbientPlayPause);

  // Cycle Parameters Save button
  document.getElementById('save-cycle-params').addEventListener('click', () => {
    const lastDate = document.getElementById('last-period-date').value;
    const cycleL = parseInt(document.getElementById('cycle-length').value) || 28;
    const periodL = parseInt(document.getElementById('period-length').value) || 5;
    
    if (!lastDate) {
      alert('Silakan pilih tanggal mulai menstruasi terakhir Anda.');
      return;
    }
    
    state.cycleParams = { lastPeriodDate: lastDate, cycleLength: cycleL, periodLength: periodL };
    saveStateToStorage();
    
    renderCycleCalendar();
    renderDashboard();
    showAudioToast("Prediksi siklus berhasil dihitung ulang! 🌸");
  });

  // Cycle Symptoms Log Save
  document.getElementById('save-daily-log-btn').addEventListener('click', saveDailySymptomLog);

  // Task Search and Filters
  document.getElementById('task-search-input').addEventListener('input', renderTasks);
  document.getElementById('filter-priority').addEventListener('change', renderTasks);
  document.getElementById('filter-sort').addEventListener('change', renderTasks);

  // Calendar prev/next buttons
  document.getElementById('prev-month-btn').addEventListener('click', () => adjustCalendarMonth(-1));
  document.getElementById('next-month-btn').addEventListener('click', () => adjustCalendarMonth(1));
}

// Theme Application
function applyTheme(theme) {
  state.theme = theme;
  saveStateToStorage();
  
  const body = document.body;
  const themeLabel = document.querySelector('.theme-label');
  
  if (theme === 'light') {
    body.classList.remove('dark-theme');
    body.classList.add('light-theme');
    if (themeLabel) themeLabel.textContent = "Tema Terang";
  } else {
    body.classList.remove('light-theme');
    body.classList.add('dark-theme');
    if (themeLabel) themeLabel.textContent = "Tema Gelap";
  }
}

// Privacy Mode Toggle
function togglePrivacyMode() {
  state.privacyMode = !state.privacyMode;
  saveStateToStorage();
  
  applyPrivacyModeUI(state.privacyMode);
}

function applyPrivacyModeUI(isActive) {
  const body = document.body;
  
  const navBtn = document.getElementById('nav-siklus-btn');
  const navLabel = document.getElementById('nav-siklus-label');
  const navIcon = document.getElementById('nav-siklus-icon');
  
  const healthCardTitle = document.getElementById('dash-health-title');
  const healthCardBadge = document.getElementById('dash-health-badge');
  const healthCardBtn = document.getElementById('dash-health-btn');
  
  const healthPageTitle = document.getElementById('health-page-title');
  const healthPageSubtitle = document.getElementById('health-page-subtitle');
  const btnPrivacyHint = document.getElementById('btn-privacy-hint');
  
  const eyeIcon = document.querySelector('.eye-icon');
  const eyeOffIcon = document.querySelector('.eye-off-icon');

  if (isActive) {
    body.classList.add('privacy-mode');
    if (eyeIcon) eyeIcon.style.display = 'none';
    if (eyeOffIcon) eyeOffIcon.style.display = 'block';
    
    // Rename Navigation Tab (Discretion)
    if (navLabel) navLabel.textContent = "Kesehatan Harian";
    if (navBtn) navBtn.setAttribute('title', "Kesehatan & Kebugaran Harian");
    // Swap icon elements inside sidebar button to normal pulse/heartbeat if necessary
    
    // Dashboard Card adjustments
    if (healthCardTitle) healthCardTitle.textContent = "Keseimbangan Tubuh";
    if (healthCardBadge) {
      healthCardBadge.textContent = "Kesehatan";
      healthCardBadge.className = "badge badge-teal";
    }
    if (healthCardBtn) {
      healthCardBtn.textContent = "Buka Kesehatan";
      healthCardBtn.className = "btn btn-sm btn-outline-teal";
    }
    
    // Page Main Titles
    if (healthPageTitle) healthPageTitle.textContent = "Laporan Kesehatan & Kebugaran Harian";
    if (healthPageSubtitle) healthPageSubtitle.textContent = "Pantau kondisi metabolisme tubuh, jadwal istirahat, serta kelola catatan kebugaran harian secara privat.";
    if (btnPrivacyHint) {
      btnPrivacyHint.textContent = "🛡️ Mode Privasi Aktif (Samaran)";
      btnPrivacyHint.className = "btn btn-teal";
    }
    
    // Change Calendar Legend Labels in Privacy Mode
    document.querySelectorAll('.legend-label').forEach(lbl => {
      const type = lbl.getAttribute('data-type');
      if (type === 'period') lbl.textContent = "Fase Istirahat (Rest)";
      if (type === 'fertile') lbl.textContent = "Fase Aktif Tinggi (High Energy)";
      if (type === 'ovulation') lbl.textContent = "Puncak Kebugaran (Peak)";
    });
  } else {
    body.classList.remove('privacy-mode');
    if (eyeIcon) eyeIcon.style.display = 'block';
    if (eyeOffIcon) eyeOffIcon.style.display = 'none';
    
    // Restore normal text labels
    if (navLabel) navLabel.textContent = "Kesehatan Siklus";
    if (navBtn) navBtn.setAttribute('title', "Pantau Siklus Menstruasi & Gejala");
    
    if (healthCardTitle) healthCardTitle.textContent = "Kesehatan Siklus";
    if (healthCardBadge) {
      healthCardBadge.textContent = "Siklus";
      healthCardBadge.className = "badge badge-rose";
    }
    if (healthCardBtn) {
      healthCardBtn.textContent = "Buka Kalender";
      healthCardBtn.className = "btn btn-sm btn-outline-rose";
    }
    
    if (healthPageTitle) healthPageTitle.textContent = "Pelacak Kesehatan Siklus Bulanan";
    if (healthPageSubtitle) healthPageSubtitle.textContent = "Pantau siklus datang bulan, masa subur, serta log gejala fisik harian secara mandiri.";
    if (btnPrivacyHint) {
      btnPrivacyHint.textContent = "🛡️ Aktifkan Mode Privasi (Samarkan UI)";
      btnPrivacyHint.className = "btn btn-rose";
    }

    document.querySelectorAll('.legend-label').forEach(lbl => {
      const type = lbl.getAttribute('data-type');
      if (type === 'period') lbl.textContent = "Menstruasi";
      if (type === 'fertile') lbl.textContent = "Masa Subur";
      if (type === 'ovulation') lbl.textContent = "Hari Ovulasi";
    });
  }
  
  // Re-render components that are affected by terminology
  renderDashboard();
  renderCycleCalendar();
}

// Real-time Indonesian Clock
function startRealtimeClock() {
  const clockEl = document.getElementById('realtime-clock');
  if (!clockEl) return;
  
  const timeNode = clockEl.querySelector('.clock-time');
  const dateNode = clockEl.querySelector('.clock-date');
  
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  function update() {
    // Get time (using local computer time, matching the 2026 current time metadata if running locally)
    const now = new Date();
    
    // HH:MM:SS format
    const hrs = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    timeNode.textContent = `${hrs}:${mins}:${secs}`;
    
    // Day, DD Month YYYY format
    const dayName = days[now.getDay()];
    const dateNum = now.getDate();
    const monthName = months[now.getMonth()];
    const yearNum = now.getFullYear();
    dateNode.textContent = `${dayName}, ${dateNum} ${monthName} ${yearNum}`;
  }
  
  update();
  setInterval(update, 1000);
}


// --- 3. DASHBOARD RENDERER ---
function renderDashboard() {
  // Update Focus Minutes
  const totalFocusEl = document.getElementById('dash-total-focus');
  if (totalFocusEl) {
    totalFocusEl.textContent = `${state.timer.totalFocusToday || 0} menit`;
  }
  
  // 1. Next Class Today Preview
  const nextClassBody = document.getElementById('dash-next-class-body');
  if (nextClassBody) {
    const daysIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const todayIndo = daysIndo[new Date().getDay()];
    
    // Get classes today, sorted by start time
    const todayClasses = state.classes
      .filter(c => c.day === todayIndo)
      .sort((a, b) => a.start.localeCompare(b.start));
    
    if (todayClasses.length > 0) {
      const nowStr = String(new Date().getHours()).padStart(2, '0') + ':' + String(new Date().getMinutes()).padStart(2, '0');
      
      // Find class that starts after now, or is ongoing
      let upcomingClass = todayClasses.find(c => c.start > nowStr);
      let ongoingClass = todayClasses.find(c => c.start <= nowStr && c.end >= nowStr);
      
      let targetClass = ongoingClass || upcomingClass || todayClasses[0];
      let statusLabel = ongoingClass ? "Sedang Berlangsung" : (upcomingClass ? "Berikutnya" : "Kuliah Pertama Hari Ini");
      
      nextClassBody.innerHTML = `
        <div class="dash-class-item" style="border-left-color: var(--color-${targetClass.color});">
          <div class="dash-class-details">
            <span class="badge badge-${targetClass.color}" style="font-size: 0.6rem; padding: 1px 4px; margin-bottom: 4px;">${statusLabel}</span>
            <h4>${targetClass.name}</h4>
            <p>${targetClass.professor || 'Tanpa Dosen'}</p>
            <span class="class-room-block mt-2 d-block">📍 ${targetClass.room || 'Tanpa Ruangan'}</span>
          </div>
          <div class="dash-class-time" style="color: var(--color-${targetClass.color});">
            ${targetClass.start} - ${targetClass.end}
          </div>
        </div>
      `;
    } else {
      nextClassBody.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="empty-icon"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
          <p>Tidak ada kuliah untuk hari ini (Bebas!).</p>
        </div>
      `;
    }
  }

  // 2. Next Deadlines Preview
  const taskCountBadge = document.getElementById('dash-tugas-count');
  const taskBody = document.getElementById('dash-tugas-body');
  
  if (taskBody) {
    // Uncompleted tasks
    const todoTasks = state.tasks.filter(t => t.status !== 'done');
    if (taskCountBadge) taskCountBadge.textContent = `${todoTasks.length} Tugas`;
    
    if (todoTasks.length > 0) {
      // Sort by closest due date
      const sortedTasks = [...todoTasks].sort((a, b) => {
        const dateA = new Date(a.dueDate + 'T' + a.dueTime);
        const dateB = new Date(b.dueDate + 'T' + b.dueTime);
        return dateA - dateB;
      }).slice(0, 2); // Show top 2 closest
      
      let html = '<div class="dash-tasks-list" style="display: flex; flex-direction: column; gap: 8px;">';
      sortedTasks.forEach(task => {
        const targetDate = new Date(task.dueDate + 'T' + task.dueTime);
        const now = new Date();
        const diffMs = targetDate - now;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        
        let cdText = `${diffDays} hari lagi`;
        let isUrgent = diffDays <= 2;
        if (diffDays === 0) cdText = "Hari ini!";
        if (diffDays < 0) cdText = "Terlambat!";
        
        html += `
          <div class="dash-task-item">
            <div class="dash-task-left">
              <span class="dash-task-dot ${task.priority}"></span>
              <span class="dash-task-title">${task.title}</span>
            </div>
            <span class="dash-task-countdown ${isUrgent ? 'urgent' : 'normal'}">${cdText}</span>
          </div>
        `;
      });
      html += '</div>';
      taskBody.innerHTML = html;
    } else {
      taskBody.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="empty-icon"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          <p>Hore! Semua tugasmu sudah selesai dikerjakan.</p>
        </div>
      `;
    }
  }

  // 3. Health Cycle Preview
  const cycleDayEl = document.getElementById('dash-cycle-day');
  const cycleStatusEl = document.getElementById('dash-cycle-status');
  const cycleNextEl = document.getElementById('dash-cycle-next');
  
  if (cycleDayEl && cycleStatusEl && cycleNextEl) {
    if (!state.cycleParams.lastPeriodDate) {
      cycleDayEl.textContent = "--";
      cycleStatusEl.textContent = "Isi data menstruasi";
      cycleNextEl.textContent = "Menunggu data parameter...";
      return;
    }
    
    // Calculations
    const today = new Date();
    const lastStart = new Date(state.cycleParams.lastPeriodDate);
    const timeDiff = today - lastStart;
    const diffDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    
    // Cycle Day (1-indexed based on cycle length modulo)
    const cycleDay = (diffDays % state.cycleParams.cycleLength) + 1;
    const currentCycleStart = new Date(lastStart.getTime() + Math.floor(diffDays / state.cycleParams.cycleLength) * state.cycleParams.cycleLength * 24 * 60 * 60 * 1000);
    const nextPeriodStart = new Date(currentCycleStart.getTime() + state.cycleParams.cycleLength * 24 * 60 * 60 * 1000);
    
    // Ovulation & Fertile Windows
    const ovulationDate = new Date(nextPeriodStart.getTime() - 14 * 24 * 60 * 60 * 1000);
    const fertileStart = new Date(ovulationDate.getTime() - 5 * 24 * 60 * 60 * 1000);
    const fertileEnd = new Date(ovulationDate.getTime() + 1 * 24 * 60 * 60 * 1000);
    
    cycleDayEl.textContent = cycleDay;
    
    // Formatting next predicted period date
    const opt = { day: 'numeric', month: 'short' };
    const formattedNext = nextPeriodStart.toLocaleDateString('id-ID', opt);
    
    // Predict cycle phase
    let phase = "";
    if (state.privacyMode) {
      // Discretion phase labeling
      if (cycleDay <= state.cycleParams.periodLength) {
        phase = "Fase Istirahat 🧘‍♀️";
      } else if (today >= fertileStart && today <= fertileEnd) {
        phase = "Fase Aktif Tinggi ⚡";
      } else {
        phase = "Fase Pemulihan 💚";
      }
      cycleNextEl.textContent = `Siklus istirahat: ${formattedNext}`;
    } else {
      // Normal Period Phase Labeling
      if (cycleDay <= state.cycleParams.periodLength) {
        phase = "Menstruasi 🌸";
      } else if (today.toDateString() === ovulationDate.toDateString()) {
        phase = "Hari Ovulasi! 🥚";
      } else if (today >= fertileStart && today <= fertileEnd) {
        phase = "Jendela Masa Subur 💕";
      } else {
        phase = "Fase Luteal (Normal) ✨";
      }
      cycleNextEl.textContent = `Prediksi haid: ${formattedNext}`;
    }
    
    cycleStatusEl.textContent = phase;
  }
}


// --- 4. TIMER BELAJAR (POMODORO) LOGIC ---
let timerInterval = null;
let timerEndTime = null; // System time target in ms to avoid tab sleep drifts

function toggleTimer() {
  if (state.timer.isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function startTimer() {
  state.timer.isRunning = true;
  saveStateToStorage();
  
  // Toggle Play / Pause Icons
  document.querySelector('.play-icon').style.display = 'none';
  document.querySelector('.pause-icon').style.display = 'block';
  
  // Set system end time target based on remaining seconds
  timerEndTime = Date.now() + (state.timer.timeLeft * 1000);
  
  timerInterval = setInterval(() => {
    const remainingMs = timerEndTime - Date.now();
    const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));
    
    state.timer.timeLeft = remainingSecs;
    updateTimerDisplay();
    
    if (remainingSecs <= 0) {
      clearInterval(timerInterval);
      timerCompleted();
    }
  }, 200); // Poll fast for visually accurate countdowns
}

function pauseTimer() {
  state.timer.isRunning = false;
  clearInterval(timerInterval);
  saveStateToStorage();
  
  document.querySelector('.play-icon').style.display = 'block';
  document.querySelector('.pause-icon').style.display = 'none';
}

function resetTimer() {
  pauseTimer();
  
  let targetMins = 25;
  if (state.timer.mode === 'focus') targetMins = state.customDurations.focus;
  else if (state.timer.mode === 'shortBreak') targetMins = state.customDurations.shortBreak;
  else if (state.timer.mode === 'longBreak') targetMins = state.customDurations.longBreak;
  
  state.timer.timeLeft = targetMins * 60;
  state.timer.totalDuration = targetMins * 60;
  
  saveStateToStorage();
  updateTimerDisplay();
}

function skipTimer() {
  pauseTimer();
  // Auto advance modes
  if (state.timer.mode === 'focus') {
    setTimerMode('shortBreak');
    showAudioToast("Skip ke Rehat Singkat ☕");
  } else {
    setTimerMode('focus');
    showAudioToast("Kembali ke Sesi Fokus 💻");
  }
}

function setTimerMode(mode) {
  state.timer.mode = mode;
  
  let mins = 25;
  let accentColor = 'var(--color-amber)';
  let accentBg = 'var(--color-amber-bg)';
  let stateLabel = "Fokus Belajar";
  
  if (mode === 'focus') {
    mins = state.customDurations.focus;
    accentColor = 'var(--color-amber)';
    accentBg = 'var(--color-amber-bg)';
    stateLabel = "Fokus Belajar";
  } else if (mode === 'shortBreak') {
    mins = state.customDurations.shortBreak;
    accentColor = 'var(--color-teal)';
    accentBg = 'var(--color-teal-bg)';
    stateLabel = "Rehat Singkat";
  } else if (mode === 'longBreak') {
    mins = state.customDurations.longBreak;
    accentColor = 'var(--color-blue)';
    accentBg = 'var(--color-blue-bg)';
    stateLabel = "Rehat Panjang";
  }
  
  // Update colors variables dynamically in root
  document.documentElement.style.setProperty('--timer-accent', accentColor);
  document.documentElement.style.setProperty('--timer-accent-bg', accentBg);
  
  const stateLabelEl = document.getElementById('timer-state-label');
  if (stateLabelEl) stateLabelEl.textContent = stateLabel;

  state.timer.timeLeft = mins * 60;
  state.timer.totalDuration = mins * 60;
  saveStateToStorage();
  
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const displayVal = document.getElementById('timer-countdown');
  const dashDisplayVal = document.getElementById('dash-timer-time');
  const dashStatusEl = document.getElementById('dash-timer-status');
  
  const mins = Math.floor(state.timer.timeLeft / 60);
  const secs = state.timer.timeLeft % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  
  if (displayVal) displayVal.textContent = formattedTime;
  if (dashDisplayVal) dashDisplayVal.textContent = formattedTime;
  
  // Dashboard Status Text
  if (dashStatusEl) {
    if (state.timer.isRunning) {
      dashStatusEl.textContent = state.timer.mode === 'focus' ? "Fokus belajar..." : "Sedang rehat...";
    } else {
      dashStatusEl.textContent = "Timer dijeda";
    }
  }

  // Update SVG Progress Ring
  const circle = document.getElementById('timer-progress');
  if (circle) {
    const total = state.timer.totalDuration;
    const current = state.timer.timeLeft;
    const percentage = total > 0 ? current / total : 0;
    
    // Circumference for r=130 is 816.8 (2 * Math.PI * 130)
    const circ = 816.8;
    circle.style.strokeDashoffset = circ * (1 - percentage);
  }
}

// Session completion triggers
function timerCompleted() {
  playSynthesizedBell();
  
  const mode = state.timer.mode;
  
  if (mode === 'focus') {
    const focusMins = state.customDurations.focus;
    state.timer.totalFocusToday += focusMins;
    
    // Log history
    const now = new Date();
    const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    state.focusHistory.unshift({
      time: timeStr,
      type: 'Sesi Fokus Belajar',
      minutes: focusMins
    });
    
    saveStateToStorage();
    renderFocusHistory();
    renderDashboard();
    
    // Auto switch to break
    setTimerMode('shortBreak');
    showAudioToast("Hebat! Sesi belajar selesai. Waktunya istirahat! ☕");
  } else {
    // Switch back to focus
    setTimerMode('focus');
    showAudioToast("Istirahat selesai! Mari kembali fokus belajar! 💻");
  }
}

// Render Focus Log
function renderFocusHistory() {
  const historyList = document.getElementById('focus-history-list');
  if (!historyList) return;
  
  if (state.focusHistory.length === 0) {
    historyList.innerHTML = `<li class="empty-history">Belum ada sesi fokus yang diselesaikan hari ini. Semangat!</li>`;
    return;
  }
  
  historyList.innerHTML = state.focusHistory.slice(0, 5).map(item => `
    <li class="history-item">
      <span>🎯 ${item.type} (${item.minutes}m)</span>
      <span class="history-time">${item.time}</span>
    </li>
  `).join('');
}

// --- WEB AUDIO API BELL SYNTHESIS ---
function playSynthesizedBell() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    
    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.4, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    
    // Play dual clean crystalline chime (C5 & E5)
    playTone(523.25, ctx.currentTime, 0.6); // C5
    playTone(659.25, ctx.currentTime + 0.15, 0.8); // E5
  } catch(e) {
    console.error('AudioContext error:', e);
  }
}

// --- WEB AUDIO API AMBIENT COZY SOUND GENERATOR ---
let audioCtx = null;
let activeAmbientSources = {};
let ambientGainNode = null;

function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    ambientGainNode = audioCtx.createGain();
    ambientGainNode.gain.setValueAtTime(0.5, audioCtx.currentTime); // Default volume 0.5
    ambientGainNode.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function toggleAmbientSound(soundType, buttonEl) {
  initAudioContext();
  
  const isCurrentlyActive = buttonEl.classList.contains('active');
  
  // Deactivate all ambient sounds
  document.querySelectorAll('.btn-ambient').forEach(btn => btn.classList.remove('active'));
  stopAllAmbientSounds();
  
  if (isCurrentlyActive) {
    // We turned off the playing sound
    document.getElementById('ambient-player-bar').style.display = 'none';
    return;
  }
  
  // Activate selected sound
  buttonEl.classList.add('active');
  document.getElementById('ambient-player-bar').style.display = 'flex';
  
  const playerLabel = document.getElementById('playing-sound-label');
  let labelText = "Memutar: ";
  
  if (soundType === 'noise') {
    labelText += "White Noise (Fokus)";
    playWhiteNoiseSynth();
  } else if (soundType === 'rain') {
    labelText += "Suara Hujan (Rileks)";
    playRainSynth();
  } else if (soundType === 'forest') {
    labelText += "Hutan Alam (Pikiran)";
    playForestSynth();
  } else if (soundType === 'lofi') {
    labelText += "Lofi Chill (Gitar / Piano)";
    playLofiSynth();
  }
  
  playerLabel.textContent = labelText;
  document.getElementById('toggle-ambient-play').textContent = "⏸️";
}

function stopAllAmbientSounds() {
  Object.keys(activeAmbientSources).forEach(key => {
    const src = activeAmbientSources[key];
    if (src) {
      try { src.stop(); } catch(e) {}
    }
  });
  activeAmbientSources = {};
}

function setAmbientVolume(val) {
  if (ambientGainNode && audioCtx) {
    ambientGainNode.gain.setValueAtTime(val, audioCtx.currentTime);
  }
}

function toggleAmbientPlayPause() {
  const btn = document.getElementById('toggle-ambient-play');
  if (audioCtx) {
    if (audioCtx.state === 'running') {
      audioCtx.suspend();
      btn.textContent = "▶️";
    } else {
      audioCtx.resume();
      btn.textContent = "⏸️";
    }
  }
}

// 1. Synthesize Pure White Noise
function playWhiteNoiseSynth() {
  const bufferSize = 2 * audioCtx.sampleRate;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  
  const whiteNoiseSource = audioCtx.createBufferSource();
  whiteNoiseSource.buffer = noiseBuffer;
  whiteNoiseSource.loop = true;
  
  whiteNoiseSource.connect(ambientGainNode);
  whiteNoiseSource.start();
  activeAmbientSources['noise'] = whiteNoiseSource;
}

// 2. Synthesize Rain using Pink-like filtered noise and gentle modulation
function playRainSynth() {
  // Generate Pink Noise
  const bufferSize = 2 * audioCtx.sampleRate;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  
  let b0, b1, b2, b3, b4, b5, b6;
  b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    output[i] *= 0.11; // estimate volume
    b6 = white * 0.115926;
  }
  
  const pinkNoiseSource = audioCtx.createBufferSource();
  pinkNoiseSource.buffer = noiseBuffer;
  pinkNoiseSource.loop = true;
  
  // Rain filter: Bandpass around 1000Hz, low Q
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 600;
  filter.Q.value = 0.5;
  
  pinkNoiseSource.connect(filter);
  filter.connect(ambientGainNode);
  pinkNoiseSource.start();
  
  activeAmbientSources['rain'] = pinkNoiseSource;
}

// 3. Synthesize Forest (Gentle breeze & random bird chirps synthesizers!)
function playForestSynth() {
  // Breeze: low frequency noise modulator
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.frequency.value = 0.2; // Slow LFO
  osc.type = 'sine';
  
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 350;
  
  // Create noise buffer for breeze
  const bufferSize = 2 * audioCtx.sampleRate;
  const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }
  
  const breezeSource = audioCtx.createBufferSource();
  breezeSource.buffer = noiseBuffer;
  breezeSource.loop = true;
  
  // Modulate lowpass frequency with LFO
  const filterGain = audioCtx.createGain();
  filterGain.gain.value = 100;
  osc.connect(filterGain);
  filterGain.connect(filter.frequency);
  
  breezeSource.connect(filter);
  filter.connect(ambientGainNode);
  
  osc.start();
  breezeSource.start();
  
  activeAmbientSources['forest_lfo'] = osc;
  activeAmbientSources['forest'] = breezeSource;
  
  // Simulated periodic birds chirping
  let isBirdActive = true;
  const chirpChirp = () => {
    if (!activeAmbientSources['forest']) return;
    const now = audioCtx.currentTime;
    const chirpOsc = audioCtx.createOscillator();
    const chirpGain = audioCtx.createGain();
    
    chirpOsc.type = 'sine';
    chirpOsc.frequency.setValueAtTime(1800, now);
    chirpOsc.frequency.exponentialRampToValueAtTime(2800, now + 0.08);
    chirpOsc.frequency.setValueAtTime(2000, now + 0.1);
    chirpOsc.frequency.exponentialRampToValueAtTime(3000, now + 0.18);
    
    chirpGain.gain.setValueAtTime(0, now);
    chirpGain.gain.linearRampToValueAtTime(0.04, now + 0.02);
    chirpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    
    chirpOsc.connect(chirpGain);
    chirpGain.connect(ambientGainNode);
    chirpOsc.start(now);
    chirpOsc.stop(now + 0.25);
    
    // Repeat at random times
    setTimeout(chirpChirp, 4000 + Math.random() * 6000);
  };
  chirpChirp();
}

// 4. Synthesize Lofi Chill (Ambient slow warm repeating pads)
function playLofiSynth() {
  const osc1 = audioCtx.createOscillator();
  const osc2 = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  
  osc1.type = 'triangle';
  osc1.frequency.value = 130.81; // C3
  
  osc2.type = 'sine';
  osc2.frequency.value = 196.00; // G3 (Warm 5th chord)
  
  // Low filter to cut harsh high frequencies
  const lpf = audioCtx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 250; 
  
  // Volume modulation (LFO)
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  lfo.frequency.value = 0.15; // Slow volume pulse
  lfoGain.gain.value = 0.12;
  
  gain.gain.value = 0.18;
  
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);
  
  osc1.connect(lpf);
  osc2.connect(lpf);
  lpf.connect(gain);
  gain.connect(ambientGainNode);
  
  osc1.start();
  osc2.start();
  lfo.start();
  
  activeAmbientSources['lofi_osc1'] = osc1;
  activeAmbientSources['lofi_osc2'] = osc2;
  activeAmbientSources['lofi_lfo'] = lfo;
}


// --- 5. JADWAL KULIAH LOGIC ---
function renderWeeklySchedule() {
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  
  // Clear all containers
  days.forEach(day => {
    const el = document.getElementById(`day-${day}-container`);
    if (el) el.innerHTML = '';
  });

  if (state.classes.length === 0) {
    days.forEach(day => {
      const el = document.getElementById(`day-${day}-container`);
      if (el) el.innerHTML = `<div class="empty-state" style="font-size:0.7rem;"><p>Kosong</p></div>`;
    });
    return;
  }

  // Group classes by day and sort by start time
  state.classes.forEach(c => {
    const container = document.getElementById(`day-${c.day}-container`);
    if (!container) return;
    
    const card = document.createElement('div');
    card.className = `class-card ${c.color}`;
    card.setAttribute('data-id', c.id);
    
    // Check if ongoing class
    const isOngoing = checkIsClassOngoing(c);
    if (isOngoing) {
      card.classList.add('ongoing');
    }
    
    card.innerHTML = `
      <div class="class-card-header">
        <span class="class-title">${c.name}</span>
        <button class="btn-delete-class" title="Hapus Jadwal" onclick="deleteClass('${c.id}', event)">×</button>
      </div>
      <p class="class-professor">${c.professor || ''}</p>
      <p class="class-time-block">⏰ ${c.start} - ${c.end}</p>
      <p class="class-room-block">📍 ${c.room || '-'}</p>
    `;
    
    container.appendChild(card);
  });
  
  // For columns that are still empty, place a simple placeholder
  days.forEach(day => {
    const el = document.getElementById(`day-${day}-container`);
    if (el && el.children.length === 0) {
      el.innerHTML = `<div class="empty-state" style="font-size:0.7rem;"><p>Bebas Kuliah</p></div>`;
    }
  });
}

function checkIsClassOngoing(c) {
  const daysMap = { 'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 };
  const targetDayNum = daysMap[c.day];
  
  const now = new Date();
  if (now.getDay() !== targetDayNum) return false;
  
  const currentHrs = now.getHours();
  const currentMins = now.getMinutes();
  const currentTimeVal = currentHrs * 60 + currentMins;
  
  const [startHrs, startMins] = c.start.split(':').map(Number);
  const startTimeVal = startHrs * 60 + startMins;
  
  const [endHrs, endMins] = c.end.split(':').map(Number);
  const endTimeVal = endHrs * 60 + endMins;
  
  return currentTimeVal >= startTimeVal && currentTimeVal <= endTimeVal;
}

function checkOngoingClasses() {
  document.querySelectorAll('.class-card').forEach(card => {
    const id = card.getAttribute('data-id');
    const c = state.classes.find(item => item.id === id);
    if (c) {
      const isOngoing = checkIsClassOngoing(c);
      card.classList.toggle('ongoing', isOngoing);
    }
  });
}

function addClassSubmit(e) {
  e.preventDefault();
  
  const name = document.getElementById('class-name').value;
  const professor = document.getElementById('class-professor').value;
  const day = document.getElementById('class-day').value;
  const color = document.getElementById('class-color').value;
  const start = document.getElementById('class-start').value;
  const end = document.getElementById('class-end').value;
  const room = document.getElementById('class-room').value;
  
  if (start >= end) {
    alert("Jam mulai kuliah harus lebih awal dibanding jam selesai.");
    return;
  }
  
  const newClass = {
    id: 'c_' + Date.now(),
    name, professor, day, color, start, end, room
  };
  
  state.classes.push(newClass);
  saveStateToStorage();
  
  renderWeeklySchedule();
  renderDashboard();
  closeModal('modal-add-class');
  
  // Clear inputs
  document.getElementById('form-add-class').reset();
  showAudioToast("Jadwal kuliah berhasil disimpan! 📅");
}

function deleteClass(id, event) {
  event.stopPropagation(); // Avoid card click events
  if (confirm("Apakah Anda yakin ingin menghapus jadwal kuliah ini?")) {
    state.classes = state.classes.filter(c => c.id !== id);
    saveStateToStorage();
    renderWeeklySchedule();
    renderDashboard();
    showAudioToast("Jadwal kuliah dihapus.");
  }
}


// --- 6. DEADLINE TUGAS LOGIC ---
function renderTasks() {
  const cardsTodo = document.getElementById('cards-todo');
  const cardsProgress = document.getElementById('cards-progress');
  const cardsDone = document.getElementById('cards-done');
  
  if (!cardsTodo || !cardsProgress || !cardsDone) return;
  
  cardsTodo.innerHTML = '';
  cardsProgress.innerHTML = '';
  cardsDone.innerHTML = '';
  
  const searchQuery = document.getElementById('task-search-input').value.toLowerCase();
  const priorityFilter = document.getElementById('filter-priority').value;
  const sortOption = document.getElementById('filter-sort').value;
  
  // Filter Tasks
  let filteredTasks = state.tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(searchQuery) || t.course.toLowerCase().includes(searchQuery);
    const matchPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchSearch && matchPriority;
  });
  
  // Sort Tasks
  filteredTasks.sort((a, b) => {
    const dateA = new Date(a.dueDate + 'T' + a.dueTime);
    const dateB = new Date(b.dueDate + 'T' + b.dueTime);
    
    if (sortOption === 'closest') return dateA - dateB;
    if (sortOption === 'furthest') return dateB - dateA;
    if (sortOption === 'priority') {
      const pWeights = { 'tinggi': 3, 'sedang': 2, 'rendah': 1 };
      return pWeights[b.priority] - pWeights[a.priority];
    }
    return 0;
  });

  let counts = { todo: 0, progress: 0, done: 0 };
  
  filteredTasks.forEach(task => {
    counts[task.status]++;
    
    const card = document.createElement('div');
    card.className = 'task-card';
    card.setAttribute('draggable', 'true');
    card.setAttribute('id', task.id);
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', task.id);
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });
    
    // Countdown calculation
    const dueDateTime = new Date(task.dueDate + 'T' + task.dueTime);
    const now = new Date();
    const diffMs = dueDateTime - now;
    
    let countdownText = "";
    let isUrgent = false;
    
    if (task.status === 'done') {
      countdownText = "Selesai dikerjakan! 🎉";
    } else if (diffMs < 0) {
      countdownText = "Terlambat!";
      isUrgent = true;
    } else {
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffDays > 0) {
        countdownText = `⏳ ${diffDays} hari lagi`;
        isUrgent = diffDays <= 2; // urgent if <= 2 days
      } else if (diffHours > 0) {
        countdownText = `⏳ ${diffHours} jam lagi`;
        isUrgent = true;
      } else {
        countdownText = `⏳ ${diffMins} menit lagi!`;
        isUrgent = true;
      }
    }
    
    card.innerHTML = `
      <div class="task-card-header">
        <span class="task-title">${task.title}</span>
        <span class="task-priority-dot ${task.priority}" title="Prioritas: ${task.priority}"></span>
      </div>
      ${task.course ? `<span class="task-course">${task.course}</span>` : ''}
      ${task.notes ? `<p class="task-notes-preview">${task.notes}</p>` : ''}
      <div class="task-card-footer">
        <span class="task-countdown ${isUrgent ? 'urgent' : 'normal'}">${countdownText}</span>
        <div style="display:flex; gap: 6px;">
          <!-- Inline quick status shifts for mobile accessibility -->
          ${task.status !== 'todo' ? `<button class="btn-delete-task" style="color:var(--color-orange);" title="Geser ke Belum Mulai" onclick="shiftTaskStatus('${task.id}', 'todo')">◀</button>` : ''}
          ${task.status !== 'done' ? `<button class="btn-delete-task" style="color:var(--color-teal);" title="Geser Maju" onclick="shiftTaskStatus('${task.id}', '${task.status === 'todo' ? 'progress' : 'done'}')">▶</button>` : ''}
          <button class="btn-delete-task" title="Hapus Tugas" onclick="deleteTask('${task.id}')">🗑️</button>
        </div>
      </div>
    `;
    
    if (task.status === 'todo') cardsTodo.appendChild(card);
    else if (task.status === 'progress') cardsProgress.appendChild(card);
    else if (task.status === 'done') cardsDone.appendChild(card);
  });
  
  // Update counts
  document.getElementById('count-todo').textContent = counts.todo;
  document.getElementById('count-progress').textContent = counts.progress;
  document.getElementById('count-done').textContent = counts.done;
  
  // Empty States inside column
  ['todo', 'progress', 'done'].forEach(col => {
    const listEl = document.getElementById(`cards-${col}`);
    if (listEl && listEl.children.length === 0) {
      listEl.innerHTML = `<div class="empty-state" style="border:1px dashed var(--border-color); border-radius: var(--radius-sm);"><p>Kosong</p></div>`;
    }
  });
}

// Kanban Drag and Drop Logic
function allowDrop(e) {
  e.preventDefault();
}

function dropTask(e, targetStatus) {
  e.preventDefault();
  const id = e.dataTransfer.getData('text/plain');
  shiftTaskStatus(id, targetStatus);
}

function shiftTaskStatus(id, newStatus) {
  const task = state.tasks.find(t => t.id === id);
  if (task) {
    task.status = newStatus;
    saveStateToStorage();
    renderTasks();
    renderDashboard();
  }
}

function addTaskSubmit(e) {
  e.preventDefault();
  
  const title = document.getElementById('task-title').value;
  const course = document.getElementById('task-course').value;
  const dueDate = document.getElementById('task-due-date').value;
  const dueTime = document.getElementById('task-due-time').value;
  const priority = document.getElementById('task-priority').value;
  const status = document.getElementById('task-column').value;
  const notes = document.getElementById('task-notes').value;
  
  const newTask = {
    id: 't_' + Date.now(),
    title, course, dueDate, dueTime, priority, status, notes
  };
  
  state.tasks.push(newTask);
  saveStateToStorage();
  
  renderTasks();
  renderDashboard();
  closeModal('modal-add-task');
  
  document.getElementById('form-add-task').reset();
  showAudioToast("Tugas baru berhasil disimpan! 📝");
}

function deleteTask(id) {
  if (confirm("Apakah Anda yakin ingin menghapus tugas ini?")) {
    state.tasks = state.tasks.filter(t => t.id !== id);
    saveStateToStorage();
    renderTasks();
    renderDashboard();
    showAudioToast("Tugas telah dihapus.");
  }
}


// --- 7. KALENDER MENSTRUASI & KESEHATAN LOGIC ---
let calendarCurrentDate = new Date(); // Stores month we are currently viewing
let selectedHealthDateString = ""; // Stores 'YYYY-MM-DD' that user selected to log symptoms

function renderCycleCalendar() {
  const gridContainer = document.getElementById('calendar-days-grid');
  const titleEl = document.getElementById('calendar-month-year');
  if (!gridContainer || !titleEl) return;
  
  gridContainer.innerHTML = '';
  
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  
  const viewYear = calendarCurrentDate.getFullYear();
  const viewMonth = calendarCurrentDate.getMonth();
  
  titleEl.textContent = `${months[viewMonth]} ${viewYear}`;
  
  // First day of month (0-indexed Sunday)
  const firstDayObj = new Date(viewYear, viewMonth, 1);
  // Get start day in Indonesian grid (where Monday is index 0, Sunday is index 6)
  let startOffset = firstDayObj.getDay() - 1; 
  if (startOffset < 0) startOffset = 6; // Sunday is 6
  
  // Total days in viewed month
  const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();
  
  // Previous month total days (to fill start grid offsets nicely)
  const prevMonthTotalDays = new Date(viewYear, viewMonth, 0).getDate();
  
  // Predictions definitions based on Last Period Start parameters
  const lastStartStr = state.cycleParams.lastPeriodDate;
  let predictionArrays = { periodDays: {}, fertileDays: {}, ovulationDays: {} };
  
  if (lastStartStr) {
    const lastStart = new Date(lastStartStr);
    const cycleL = state.cycleParams.cycleLength;
    const periodL = state.cycleParams.periodLength;
    
    // We calculate prediction dates for 3 cycles backward and 5 cycles forward to cover any calendar page scroll
    for (let c = -3; c < 6; c++) {
      const cycleOffsetMs = c * cycleL * 24 * 60 * 60 * 1000;
      const basePeriodStart = new Date(lastStart.getTime() + cycleOffsetMs);
      
      // Menstrual days
      for (let d = 0; d < periodL; d++) {
        const pDay = new Date(basePeriodStart.getTime() + d * 24 * 60 * 60 * 1000);
        predictionArrays.periodDays[getFormattedString(pDay)] = true;
      }
      
      // Ovulation day (14 days before next predicted period)
      const nextPStart = new Date(basePeriodStart.getTime() + cycleL * 24 * 60 * 60 * 1000);
      const ovDay = new Date(nextPStart.getTime() - 14 * 24 * 60 * 60 * 1000);
      predictionArrays.ovulationDays[getFormattedString(ovDay)] = true;
      
      // Fertile days (ovDay - 5 days up to ovDay + 1 day)
      for (let f = -5; f <= 1; f++) {
        const fDay = new Date(ovDay.getTime() + f * 24 * 60 * 60 * 1000);
        predictionArrays.fertileDays[getFormattedString(fDay)] = true;
      }
    }
  }

  // 1. Fill leading offset blocks with empty/previous month dates
  for (let i = startOffset; i > 0; i--) {
    const cell = document.createElement('div');
    cell.className = 'calendar-date-cell other-month';
    cell.textContent = prevMonthTotalDays - i + 1;
    gridContainer.appendChild(cell);
  }
  
  // 2. Render actual month days
  const today = new Date();
  const todayStr = getFormattedString(today);
  
  for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-date-cell';
    cell.textContent = dayNum;
    
    const loopDate = new Date(viewYear, viewMonth, dayNum);
    const loopDateStr = getFormattedString(loopDate);
    
    cell.setAttribute('data-date', loopDateStr);
    
    // Class markers based on predictions
    if (predictionArrays.periodDays[loopDateStr]) {
      cell.classList.add('period');
    } else if (predictionArrays.ovulationDays[loopDateStr]) {
      cell.classList.add('ovulation');
    } else if (predictionArrays.fertileDays[loopDateStr]) {
      cell.classList.add('fertile');
    }
    
    // Check if it's today
    if (loopDateStr === todayStr) {
      cell.classList.add('today');
    }
    
    // Check if it's the currently selected date in logger
    if (loopDateStr === selectedHealthDateString) {
      cell.classList.add('selected');
    }
    
    // Check if symptom logs exist for this date
    if (state.dailyLogs[loopDateStr]) {
      const log = state.dailyLogs[loopDateStr];
      const hasSymptoms = (log.symptoms && log.symptoms.length > 0) || (log.moods && log.moods.length > 0);
      if (hasSymptoms) {
        const dot = document.createElement('span');
        dot.className = 'logged-dot';
        cell.appendChild(dot);
      }
    }
    
    // Handle Click
    cell.addEventListener('click', () => {
      document.querySelectorAll('.calendar-date-cell').forEach(c => c.classList.remove('selected'));
      cell.classList.add('selected');
      selectHealthLogDate(loopDateStr);
    });
    
    gridContainer.appendChild(cell);
  }
  
  // Render Predictions text boxes on the side bar
  renderAnalysisSummaryText();
}

function adjustCalendarMonth(dir) {
  calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + dir);
  renderCycleCalendar();
}

function renderAnalysisSummaryText() {
  const nextPeriodVal = document.getElementById('cycle-next-period');
  const nextFertileVal = document.getElementById('cycle-next-fertile');
  const countdownDaysVal = document.getElementById('cycle-countdown-days');
  
  if (!nextPeriodVal || !nextFertileVal || !countdownDaysVal) return;
  
  if (!state.cycleParams.lastPeriodDate) {
    nextPeriodVal.textContent = "--";
    nextFertileVal.textContent = "--";
    countdownDaysVal.textContent = "Data kosong";
    return;
  }
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const lastStart = new Date(state.cycleParams.lastPeriodDate);
  const cycleL = state.cycleParams.cycleLength;
  const periodL = state.cycleParams.periodLength;
  
  const timeDiff = today - lastStart;
  const diffDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  
  // Predict next start date
  const periodsPassedCount = Math.floor(diffDays / cycleL);
  let nextPeriodStart = new Date(lastStart.getTime() + (periodsPassedCount + 1) * cycleL * 24 * 60 * 60 * 1000);
  
  // If today is past the calculated nextPeriodStart (e.g. they missed inputting new actual date), push forward
  if (today > nextPeriodStart) {
    nextPeriodStart = new Date(nextPeriodStart.getTime() + cycleL * 24 * 60 * 60 * 1000);
  }
  
  const ovulationDate = new Date(nextPeriodStart.getTime() - 14 * 24 * 60 * 60 * 1000);
  const fertileStart = new Date(ovulationDate.getTime() - 5 * 24 * 60 * 60 * 1000);
  const fertileEnd = new Date(ovulationDate.getTime() + 1 * 24 * 60 * 60 * 1000);
  
  const opt = { day: 'numeric', month: 'long', year: 'numeric' };
  const optShort = { day: 'numeric', month: 'short' };
  
  nextPeriodVal.textContent = nextPeriodStart.toLocaleDateString('id-ID', opt);
  nextFertileVal.textContent = `${fertileStart.toLocaleDateString('id-ID', optShort)} - ${fertileEnd.toLocaleDateString('id-ID', optShort)}`;
  
  // Countdown
  const countdownMs = nextPeriodStart - today;
  const countdownDays = Math.ceil(countdownMs / (1000 * 60 * 60 * 24));
  
  if (state.privacyMode) {
    countdownDaysVal.textContent = `${countdownDays} Hari Lagi (Kondisi Stabil)`;
  } else {
    countdownDaysVal.textContent = `${countdownDays} Hari Lagi`;
  }
}

// Health Daily Symptoms Log
function selectHealthLogDate(dateString) {
  selectedHealthDateString = dateString;
  
  const labelEl = document.getElementById('selected-log-date');
  if (labelEl) {
    const dateObj = new Date(dateString);
    const opt = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    labelEl.textContent = dateObj.toLocaleDateString('id-ID', opt);
  }
  
  // Clear checkboxes first
  document.querySelectorAll('input[name="symptom"]').forEach(chk => chk.checked = false);
  document.querySelectorAll('input[name="mood"]').forEach(chk => chk.checked = false);
  
  // Enable save button
  const saveBtn = document.getElementById('save-daily-log-btn');
  if (saveBtn) saveBtn.removeAttribute('disabled');
  
  // Check if log exists and load data
  if (state.dailyLogs[dateString]) {
    const log = state.dailyLogs[dateString];
    
    if (log.symptoms) {
      log.symptoms.forEach(s => {
        const chk = document.querySelector(`input[name="symptom"][value="${s}"]`);
        if (chk) chk.checked = true;
      });
    }
    
    if (log.moods) {
      log.moods.forEach(m => {
        const chk = document.querySelector(`input[name="mood"][value="${m}"]`);
        if (chk) chk.checked = true;
      });
    }
  }
}

function saveDailySymptomLog() {
  if (!selectedHealthDateString) return;
  
  let checkedSymptoms = [];
  document.querySelectorAll('input[name="symptom"]:checked').forEach(chk => {
    checkedSymptoms.push(chk.value);
  });
  
  let checkedMoods = [];
  document.querySelectorAll('input[name="mood"]:checked').forEach(chk => {
    checkedMoods.push(chk.value);
  });
  
  if (checkedSymptoms.length === 0 && checkedMoods.length === 0) {
    // Delete log if emptied
    delete state.dailyLogs[selectedHealthDateString];
  } else {
    state.dailyLogs[selectedHealthDateString] = {
      symptoms: checkedSymptoms,
      moods: checkedMoods
    };
  }
  
  saveStateToStorage();
  
  // Refresh Calendar visual dot
  renderCycleCalendar();
  showAudioToast("Catatan kesehatan berhasil disimpan! ✅");
}


// --- 8. HELPER FUNCTIONS ---
function getTodayFormattedString() {
  return getFormattedString(new Date());
}

function getFormattedString(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Dialog Modal Helper Controls
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 250);
  }
}

// Close Modal when clicking background overlay
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    closeModal(e.target.id);
  }
});

// Toast indicators
let toastTimeout = null;
function showAudioToast(message) {
  const indicator = document.getElementById('audio-synthesizer-indicator');
  if (!indicator) return;
  
  indicator.textContent = message;
  indicator.style.display = 'block';
  
  if (toastTimeout) clearTimeout(toastTimeout);
  
  toastTimeout = setTimeout(() => {
    indicator.style.display = 'none';
  }, 3500);
}
