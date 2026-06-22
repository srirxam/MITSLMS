/* ============================================================
   MITS LMS — Student Portal App Logic
   🔥 All data loaded from Firebase via FireData service layer
   ============================================================ */

let currentUser, currentTest = null, testTimer = null, testAnswers = {}, currentQ = 0;
let currentVideoId = null, progressInterval = null, videoProgress = {};

// Cached data from Firebase
let _myCourses = [];
let _allTests = [];
let _allSubmissions = [];
let _myAttendance = {};

/* ── Init ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = requireAuth('student');
    if (!currentUser) return;

    // Load all data from Firebase
    await FireData.init();
    videoProgress = await FireData.getVideoProgress(currentUser.id);

    // Cache courses, tests, submissions for this session
    const allCourses = await FireData.getCourses();
    _myCourses = allCourses.filter(c => currentUser.enrolledCourses.includes(c.id));
    _allTests = await FireData.getTests();
    _allSubmissions = await FireData.getSubmissions();
    _myAttendance = await FireData.getAttendance(currentUser.id);

    setupUI();
    renderDashboard();
    document.getElementById('topDate').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
});

/* ── Refresh (mobile pull-to-refresh button) ─────────────── */
async function refreshApp() {
    const btn = document.getElementById('refreshBtn');
    if (btn) {
        btn.disabled = true;
        btn.classList.add('spinning');
    }

    try {
        // Invalidate all cached FireData
        FireData.invalidate('all');

        // Re-fetch everything fresh
        await FireData.init();
        videoProgress   = await FireData.getVideoProgress(currentUser.id);
        const allCourses = await FireData.getCourses();
        _myCourses      = allCourses.filter(c => currentUser.enrolledCourses.includes(c.id));
        _allTests        = await FireData.getTests();
        _allSubmissions  = await FireData.getSubmissions();
        _myAttendance    = await FireData.getAttendance(currentUser.id);

        // Re-render the currently active view
        const activeSection = document.querySelector('.page-content > section:not(.hidden)');
        const viewId = activeSection?.id?.replace('view-', '');
        const renders = {
            dashboard:  renderDashboard,
            courses:    renderCourses,
            videos:     renderVideos,
            materials:  renderMaterials,
            tests:      renderTests,
            attendance: renderAttendance,
            grades:     renderGrades,
        };
        if (viewId && renders[viewId]) renders[viewId]();

        showToast('✅ Data refreshed!', 'success');
    } catch (err) {
        console.error('Refresh failed:', err);
        showToast('❌ Refresh failed. Please try again.', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('spinning');
        }
    }
}

function setupUI() {
    const u = currentUser;
    document.getElementById('userName').textContent = u.name;
    document.getElementById('userId').textContent = u.id;
    document.getElementById('userAvatar').textContent = u.avatar;
    document.getElementById('userAvatar').style.background = u.avatarBg;
    document.getElementById('topUserName').textContent = u.name.split(' ')[0];
    const topChipAvatar = document.querySelector('#topUserChip .user-avatar');
    if (topChipAvatar) { topChipAvatar.textContent = u.avatar; topChipAvatar.style.background = u.avatarBg; }
    document.getElementById('welcomeTitle').textContent = `Welcome back, ${u.name.split(' ')[0]}! 👋`;
}

/* ── Navigation ────────────────────────────────────────────── */
function navigate(view, el) {
    document.querySelectorAll('.page-content > section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`view-${view}`).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');
    const titles = { dashboard: 'Dashboard', courses: 'My Courses', videos: 'Video Lectures', materials: 'Study Materials', tests: 'Tests', attendance: 'Attendance', grades: 'Grades' };
    document.getElementById('topBarTitle').textContent = titles[view] || view;
    const renders = { dashboard: renderDashboard, courses: renderCourses, videos: renderVideos, materials: renderMaterials, tests: renderTests, attendance: renderAttendance, grades: renderGrades };
    if (renders[view]) renders[view]();
    closeSidebarMobile();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('open');
    if (overlay) overlay.classList.toggle('active', sidebar.classList.contains('open'));
}

function closeSidebarMobile() {
    document.getElementById('sidebar').classList.remove('open');
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) overlay.classList.remove('active');
}

function toggleTheme() {
    const html = document.documentElement;
    const dark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', dark ? 'light' : 'dark');
    document.getElementById('themeIcon').textContent = dark ? '🌙' : '☀️';
    document.getElementById('themeLabel').textContent = dark ? 'Dark Mode' : 'Light Mode';
}

/* ── Helpers ───────────────────────────────────────────────── */
function getMyCourses() {
    return _myCourses;
}

function getCourseProgress(cid) {
    const course = _myCourses.find(c => c.id === cid);
    if (!course) return 0;
    let total = 0, done = 0;
    course.units.forEach(u => u.videos.forEach(v => {
        total++;
        const vp = videoProgress[v.id];
        if (vp && vp.completed) done++;
    }));
    return total ? Math.round((done / total) * 100) : 0;
}

function getAttendancePct(cid) {
    const att = _myAttendance?.[cid];
    if (!att) return 0;
    return Math.round((att.present / att.total) * 100);
}

async function saveVideoProgress() {
    try {
        await FireData.saveVideoProgress(currentUser.id, videoProgress);
    } catch (err) {
        console.error('Failed to save video progress:', err);
    }
}

/* ── Dashboard ─────────────────────────────────────────────── */
function renderDashboard() {
    const courses = getMyCourses();
    const mySubmissions = _allSubmissions.filter(s => s.studentId === currentUser.id);
    const activeTests = _allTests.filter(t => t.status === 'active' && currentUser.enrolledCourses.includes(t.courseId));

    // Stat Cards
    let totalVids = 0, doneVids = 0;
    courses.forEach(c => c.units.forEach(u => u.videos.forEach(v => {
        totalVids++;
        if (videoProgress[v.id]?.completed) doneVids++;
    })));
    const avgAtt = courses.reduce((a, c) => a + getAttendancePct(c.id), 0) / (courses.length || 1);

    document.getElementById('statCards').innerHTML = [
        { icon: '📚', label: 'Courses Enrolled', val: courses.length, color: '#EFF6FF', iconBg: '#2563EB' },
        { icon: '📹', label: 'Videos Completed', val: `${doneVids}/${totalVids}`, color: '#F5F3FF', iconBg: '#7C3AED' },
        { icon: '📅', label: 'Avg Attendance', val: `${Math.round(avgAtt)}%`, color: '#F0FDF4', iconBg: '#16A34A' },
        { icon: '🧪', label: 'Tests Available', val: activeTests.length, color: '#FFFBEB', iconBg: '#D97706' },
    ].map(s => `
    <div class="stat-card">
      <div class="stat-icon" style="background:${s.color}"><span style="font-size:1.4rem">${s.icon}</span></div>
      <div>
        <div class="stat-value">${s.val}</div>
        <div class="stat-label">${s.label}</div>
      </div>
    </div>`).join('');

    // Course cards
    document.getElementById('dashCourseCards').innerHTML = courses.map(c => {
        const pct = getCourseProgress(c.id);
        return `<div class="course-card" onclick="navigate('videos',document.querySelector('[data-view=videos]'))">
      <div class="course-card-top">
        <div class="course-icon" style="background:${c.color}22">${c.icon}</div>
        <div><div class="course-title">${c.title}</div><div class="course-teacher">${c.teacher}</div></div>
      </div>
      <div class="course-card-bottom">
        <div style="flex:1">
          <div class="flex justify-between mb-2">
            <span class="course-progress-label">Progress</span>
            <span class="course-progress-label" style="color:var(--primary)">${pct}%</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
        </div>
      </div>
    </div>`;
    }).join('');

    // Attendance Summary
    document.getElementById('attendanceSummary').innerHTML = courses.map(c => {
        const att = _myAttendance?.[c.id] || { total: 0, present: 0 };
        const pct = att.total ? Math.round((att.present / att.total) * 100) : 0;
        const cls = pct >= 75 ? 'success' : 'danger';
        return `<div class="mb-4">
      <div class="flex justify-between text-sm mb-1">
        <span class="font-semibold">${c.icon} ${c.title}</span>
        <span class="badge badge-${cls}">${pct}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill ${cls}" style="width:${pct}%"></div></div>
      <div class="text-xs text-muted mt-1">${att.present}/${att.total} classes attended</div>
    </div>`;
    }).join('');

    // Upcoming tests
    document.getElementById('upcomingTests').innerHTML = _allTests
        .filter(t => currentUser.enrolledCourses.includes(t.courseId) && t.status !== 'completed')
        .map(t => {
            const c = _myCourses.find(x => x.id === t.courseId) || ((_allTests, FireData.getCourses()) && {});
            const allCourses = _myCourses;
            const course = allCourses.find(x => x.id === t.courseId);
            const done = mySubmissions.find(s => s.testId === t.id);
            return `<div class="test-card" style="margin-bottom:.75rem;padding:1rem">
        <div class="test-card-info">
          <div class="test-card-title text-sm">${t.title}</div>
          <div style="font-size:.75rem;color:var(--text-muted);margin-top:.2rem">${course?.icon || ''} ${course?.title || ''} · ${t.duration} min · ${t.totalMarks} marks</div>
        </div>
        ${done ? `<span class="badge badge-success">✅ ${done.pct}%</span>`
                    : t.status === 'active' ? `<button class="btn btn-primary btn-sm" onclick="startTest('${t.id}')">Start →</button>`
                        : `<span class="badge badge-warning">⏳ Upcoming</span>`}
      </div>`;
        }).join('') || '<div class="empty-state" style="padding:2rem"><div class="empty-icon">📋</div><p>No tests right now</p></div>';

    // Recent Activity
    const activities = [];
    Object.entries(videoProgress).forEach(([vid, vp]) => {
        const course = _myCourses.find(c => c.units.some(u => u.videos.some(v => v.id === vid)));
        const video = course?.units.flatMap(u => u.videos).find(v => v.id === vid);
        if (video && vp.pct > 0) activities.push({ icon: vp.completed ? '✅' : '▶️', text: `${vp.completed ? 'Completed' : 'Watching'}: ${video.title}`, sub: course?.title || '' });
    });
    mySubmissions.forEach(s => {
        const t = _allTests.find(x => x.id === s.testId);
        if (t) activities.push({ icon: s.pct >= 60 ? '🏆' : '📝', text: `Scored ${s.pct}% in ${t.title}`, sub: `${s.score}/${s.total} marks` });
    });
    document.getElementById('recentActivity').innerHTML = activities.length
        ? activities.slice(0, 5).map(a => `<div class="flex gap-3 mb-3">
        <span style="font-size:1.2rem">${a.icon}</span>
        <div><div class="text-sm font-medium">${a.text}</div><div class="text-xs text-muted">${a.sub}</div></div>
      </div>`).join('')
        : '<div class="empty-state" style="padding:1.5rem"><p>No recent activity</p></div>';
}

/* ── Courses ───────────────────────────────────────────────── */
function renderCourses() {
    document.getElementById('allCourseCards').innerHTML = getMyCourses().map(c => {
        const pct = getCourseProgress(c.id);
        const att = _myAttendance?.[c.id] || { total: 0, present: 0 };
        const attPct = att.total ? Math.round((att.present / att.total) * 100) : 0;
        const totalVids = c.units.reduce((a, u) => a + u.videos.length, 0);
        return `<div class="course-card" onclick="navigate('videos',document.querySelector('[data-view=videos]'))">
      <div class="course-card-top">
        <div class="course-icon" style="background:${c.color}22">${c.icon}</div>
        <div>
          <div class="course-title">${c.title}</div>
          <div class="course-teacher">${c.teacher}</div>
        </div>
      </div>
      <div class="card-body" style="padding:1rem 1.25rem">
        <p class="text-sm text-secondary" style="margin-bottom:.75rem">${c.description}</p>
        <div class="flex gap-4 text-xs text-muted mb-3">
          <span>📹 ${totalVids} Videos</span>
          <span>📁 ${c.units.length} Units</span>
          <span>👥 ${c.totalStudents} Students</span>
        </div>
        <div class="flex justify-between text-xs mb-1">
          <span class="font-semibold">Video Progress</span><span style="color:var(--primary)">${pct}%</span>
        </div>
        <div class="progress-bar mb-3"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="flex justify-between text-xs mb-1">
          <span class="font-semibold">Attendance</span>
          <span class="${attPct < 75 ? 'text-danger' : 'text-success'} font-semibold">${attPct}%</span>
        </div>
        <div class="progress-bar"><div class="progress-fill ${attPct < 75 ? 'danger' : 'success'}" style="width:${attPct}%"></div></div>
      </div>
    </div>`;
    }).join('');
}

/* ── Videos ────────────────────────────────────────────────── */
function renderVideos() {
    const courses = getMyCourses();
    document.getElementById('videoContent').innerHTML = courses.map(c => `
    <div class="card mb-6">
      <div class="card-header">
        <div class="flex items-center gap-2">
          <span style="font-size:1.3rem">${c.icon}</span>
          <h3 class="font-semibold">${c.title}</h3>
        </div>
        <span class="badge badge-primary">${getCourseProgress(c.id)}% complete</span>
      </div>
      <div class="card-body" style="padding:0">
        ${c.units.map(u => {
        const uDone = u.videos.filter(v => videoProgress[v.id]?.completed).length;
        return `<div class="unit-block" style="margin-bottom:0;border-bottom:1px solid var(--border)">
            <div class="unit-header">
              <span style="font-size:1rem">📁</span>
              <span class="unit-title">${u.title}</span>
              <span class="badge badge-${uDone === u.videos.length ? 'success' : 'primary'} ml-3">${uDone}/${u.videos.length}</span>
            </div>
            <div class="unit-videos">
              ${u.videos.map((v, i) => {
            const vp = videoProgress[v.id] || { pct: 0, completed: false };
            const status = vp.completed ? '✅' : vp.pct > 0 ? '🟡' : '⚪';
            return `<div class="video-row" onclick="openVideoModal('${v.id}','${v.youtubeId}','${v.title}','${c.id}')">
                  <div class="video-thumb">
                    <img src="https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg" alt="" onerror="this.style.display='none'"/>
                    <div class="play-overlay">▶</div>
                  </div>
                  <div class="video-info">
                    <div class="video-title">${v.title}</div>
                    <div class="video-meta">⏱ ${v.duration} · ${vp.pct > 0 ? vp.pct + '% watched' : 'Not started'}</div>
                    ${vp.pct > 0 && !vp.completed ? `<div class="progress-bar progress-bar-sm mt-1" style="width:120px"><div class="progress-fill" style="width:${vp.pct}%"></div></div>` : ''}
                  </div>
                  <span class="video-status">${status}</span>
                </div>`;
        }).join('')}
            </div>
          </div>`;
    }).join('')}
      </div>
    </div>
  `).join('');
}

/* ── Study Materials ───────────────────────────────────────── */
function renderMaterials() {
    const courses = getMyCourses();
    document.getElementById('materialsContent').innerHTML = courses.map(c => {
        const materials = c.materials || [];
        return `
    <div class="card mb-6">
      <div class="card-header">
        <div class="flex items-center gap-2">
          <span style="font-size:1.3rem">${c.icon}</span>
          <h3 class="font-semibold">${c.title}</h3>
        </div>
        <span class="badge badge-primary">${materials.length} files</span>
      </div>
      <div class="card-body" style="padding:0">
        ${materials.length > 0 ? materials.map((m, idx) => {
            const isDrive = m.type === 'drive';
            const icon = isDrive ? '📂' : '📄';
            const iconBg = isDrive ? '#1a73e822' : 'var(--surface-2)';
            const iconColor = isDrive ? '#1a73e8' : 'var(--primary)';
            const meta = isDrive
                ? `Google Drive Link · ${m.date || ''}`
                : `${(m.type || 'file').toUpperCase()} · ${m.size || ''} · Uploaded: ${m.date || ''}`;
            return `
          <div class="flex items-center justify-between p-4" style="border-bottom:1px solid var(--border)">
            <div class="flex items-center gap-3">
              <div class="course-icon" style="background:${iconBg};color:${iconColor};width:40px;height:40px;font-size:1.2rem">${icon}</div>
              <div>
                <div class="font-semibold text-sm">${m.title}</div>
                <div class="text-xs text-muted">${meta}</div>
              </div>
            </div>
            <div class="flex gap-2">
              ${m.fileUrl
                ? isDrive
                    ? `<button class="btn btn-primary btn-sm" onclick="openDriveLink('${c.id}',${idx})">🔗 Open in Drive</button>`
                    : `<button class="btn btn-outline btn-sm" onclick="viewMaterial('${c.id}',${idx})">👁️ View</button>
                       <button class="btn btn-primary btn-sm" onclick="downloadMaterialFile('${c.id}',${idx})">⬇️ Download</button>`
                : `<span class="text-xs" style="color:var(--danger);padding:.4rem .75rem">⚠️ File not available</span>`
              }
            </div>
          </div>`;
        }).join('') : '<div class="p-4 text-center text-muted text-sm">No study materials available for this course.</div>'}
      </div>
    </div>`;
    }).join('');
}

function _getMaterialByIndex(courseId, idx) {
    const course = _myCourses.find(c => c.id === courseId);
    return course?.materials?.[idx] || null;
}

/* ── Detect environment ─────────────────────────────────────── */
function _isNativeApp() {
    return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}
function _isMobileBrowser() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/* ── Open a Google Drive link (mobile-safe) ─────────────────── */
function openDriveLink(courseId, idx) {
    const m = _getMaterialByIndex(courseId, idx);
    if (!m?.fileUrl) { showToast('File not available', 'error'); return; }

    // Use anchor click — the most reliable way to open external URLs on
    // both mobile browsers and Capacitor WebViews without popup blockers.
    const a = document.createElement('a');
    a.href = m.fileUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('🔗 Opening Google Drive...', 'info');
}

/* ── Open / View a material ─────────────────────────────────── */
function viewMaterial(courseId, idx) {
    const m = _getMaterialByIndex(courseId, idx);
    if (!m?.fileUrl) { showToast('File not available', 'error'); return; }

    // Drive links — handled by openDriveLink(); this is only for uploaded files
    if (m.type === 'drive') {
        openDriveLink(courseId, idx);
        return;
    }

    if (m.fileUrl.startsWith('data:')) {
        // Base64 content — create a local blob URL and open it inline
        try {
            const [header, base64] = m.fileUrl.split(',');
            const mime = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
            const bytes = atob(base64);
            const buf = new Uint8Array(bytes.length);
            for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
            const blob = new Blob([buf], { type: mime });
            const blobUrl = URL.createObjectURL(blob);

            // Open synchronously — avoids popup blocker on any browser/WebView
            const win = window.open(blobUrl, '_blank');
            if (!win) {
                // Fallback for strict WebViews: navigate via anchor click
                const a = document.createElement('a');
                a.href = blobUrl;
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        } catch (err) {
            console.error('viewMaterial base64 decode failed:', err);
            showToast('Could not open file. Try downloading instead.', 'error');
        }
    } else {
        // Firebase Storage HTTPS URL — use anchor click for mobile compatibility
        const a = document.createElement('a');
        a.href = m.fileUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

/* ── Download a material ────────────────────────────────────── */
async function downloadMaterialFile(courseId, idx) {
    const m = _getMaterialByIndex(courseId, idx);
    if (!m?.fileUrl) { showToast('File not available', 'error'); return; }

    const fileName = m.fileName || `${m.title}.${m.type || 'pdf'}`;

    // ── Path 1: Base64 data URL (Firestore fallback) ─────────────
    if (m.fileUrl.startsWith('data:')) {
        try {
            // Convert to blob
            const [header, base64] = m.fileUrl.split(',');
            const mime = header.match(/:(.*?);/)?.[1] || 'application/octet-stream';
            const bytes = atob(base64);
            const buf = new Uint8Array(bytes.length);
            for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
            const blob = new Blob([buf], { type: mime });

            // Try Web Share API first (Android Chrome supports file sharing)
            if (navigator.share && navigator.canShare) {
                const file = new File([blob], fileName, { type: mime });
                if (navigator.canShare({ files: [file] })) {
                    try {
                        await navigator.share({ files: [file], title: m.title });
                        showToast('✅ Share menu opened — save to Downloads', 'success');
                        return;
                    } catch (shareErr) {
                        if (shareErr.name !== 'AbortError') {
                            console.warn('Share failed, falling back:', shareErr);
                        } else {
                            // User cancelled — don't fallback
                            return;
                        }
                    }
                }
            }

            // Fallback: anchor download (works on desktop Chrome / Firefox)
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
            showToast(`✅ Downloading: ${m.title}`, 'success');
        } catch (err) {
            console.error('Base64 download failed:', err);
            showToast('❌ Download failed. Try the View button instead.', 'error');
        }
        return;
    }

    // ── Path 2: Firebase Storage HTTPS URL ───────────────────────
    showToast('⬇️ Opening file...', 'info');

    // Drive links should be opened, not downloaded
    if (m.type === 'drive') {
        openDriveLink(courseId, idx);
        return;
    }

    // Use anchor click which works reliably on both mobile and desktop.
    // On mobile Chrome, the browser handles the file download natively.
    const a = document.createElement('a');
    a.href = m.fileUrl;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    // Only set download attribute on desktop (mobile ignores it for cross-origin URLs)
    if (!_isNativeApp() && !_isMobileBrowser()) {
        a.download = fileName;
    }
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (_isNativeApp() || _isMobileBrowser()) {
        showToast('✅ File opened — tap ⋮ menu to save', 'success');
    } else {
        showToast(`✅ Downloading: ${m.title}`, 'success');
    }
}

/* ── Video Modal ───────────────────────────────────────────── */

function openVideoModal(videoId, ytId, title, courseId) {
    currentVideoId = videoId;
    const vp = videoProgress[videoId] || { pct: 0, completed: false, watched: 0 };
    document.getElementById('videoModalTitle').textContent = `📹 ${title}`;
    const startTime = vp.pct > 0 && !vp.completed ? `&start=${Math.floor(vp.watched || 0)}` : '';
    document.getElementById('ytFrame').src = `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0${startTime}`;
    document.getElementById('videoInfo').innerHTML = `
    <div class="flex justify-between items-center">
      <div>
        <div class="font-semibold">${title}</div>
        <div class="text-sm text-muted mt-1">Current progress: <strong>${vp.pct}%</strong> watched</div>
      </div>
      <button class="btn btn-success btn-sm" onclick="markVideoComplete('${videoId}')">✅ Mark Complete</button>
    </div>
    ${vp.pct > 0 ? `<div class="progress-bar mt-2"><div class="progress-fill" style="width:${vp.pct}%"></div></div>` : ''}
  `;
    document.getElementById('videoModal').classList.add('open');

    // Simulate progress (in real app, use YT IFrame API)
    clearInterval(progressInterval);
    progressInterval = setInterval(() => {
        if (!videoProgress[videoId]) videoProgress[videoId] = { pct: 0, completed: false, watched: 0 };
        const vp = videoProgress[videoId];
        if (!vp.completed) {
            vp.pct = Math.min((vp.pct || 0) + 2, 100);
            vp.watched = Math.floor(vp.pct * 7.5);
            if (vp.pct >= 80) vp.completed = true;
            saveVideoProgress();
        }
    }, 5000);
}

function markVideoComplete(videoId) {
    videoProgress[videoId] = { pct: 100, completed: true, watched: 999 };
    saveVideoProgress();
    showToast('🏆 Video marked as complete!', 'success');
    closeVideoModal();
}

function closeVideoModal() {
    clearInterval(progressInterval);
    document.getElementById('ytFrame').src = '';
    document.getElementById('videoModal').classList.remove('open');
}

/* ── Tests ─────────────────────────────────────────────────── */
function renderTests(tab = 'available') {
    const myTests = _allTests.filter(t => currentUser.enrolledCourses.includes(t.courseId));
    const mySubmissions = _allSubmissions.filter(s => s.studentId === currentUser.id);
    const submittedIds = mySubmissions.map(s => s.testId);

    const tabs = {
        available: myTests.filter(t => t.status === 'active' && !submittedIds.includes(t.id)),
        completed: myTests.filter(t => submittedIds.includes(t.id)),
        upcoming: myTests.filter(t => t.status === 'upcoming')
    };

    const list = tabs[tab] || [];
    document.getElementById('testListContainer').innerHTML = list.length
        ? list.map(t => {
            const c = _myCourses.find(x => x.id === t.courseId);
            const sub = mySubmissions.find(s => s.testId === t.id);
            return `<div class="test-card">
          <div class="test-card-info">
            <div class="test-card-title">${c?.icon} ${t.title}</div>
            <div class="test-card-meta">
              <span>📚 ${c?.title}</span>
              <span>⏱ ${t.duration} min</span>
              <span>🎯 ${t.totalMarks} marks</span>
              <span>✅ Pass: ${t.passingMarks}</span>
            </div>
            ${sub ? `<div class="flex gap-3 mt-2">
              <span class="badge badge-${sub.pct >= 80 ? 'success' : sub.pct >= 50 ? 'warning' : 'danger'}">Score: ${sub.score}/${sub.total} (${sub.pct}%)</span>
              <span class="badge badge-muted">⏱ ${sub.time} min taken</span>
            </div>` : ''}
          </div>
          ${sub
                    ? `<span class="badge badge-${sub.pct >= t.passingMarks / t.totalMarks * 100 ? 'success' : 'danger'}">${sub.pct >= t.passingMarks / t.totalMarks * 100 ? '✅ Pass' : '❌ Fail'}</span>`
                    : t.status === 'active'
                        ? `<button class="btn btn-primary" onclick="startTest('${t.id}')">Start Test →</button>`
                        : `<span class="badge badge-warning">⏳ Not yet open</span>`}
        </div>`;
        }).join('')
        : `<div class="empty-state"><div class="empty-icon">📋</div><h3>No ${tab} tests</h3></div>`;
}

function switchTestTab(tab, el) {
    document.querySelectorAll('#view-tests .tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    renderTests(tab);
}

/* ── Test Engine ───────────────────────────────────────────── */
function startTest(testId) {
    currentTest = _allTests.find(t => t.id === testId);
    if (!currentTest) return;
    testAnswers = {};
    currentQ = 0;
    renderTestModal();
    document.getElementById('testModal').classList.add('open');
    startTimer(currentTest.duration * 60);
}

function renderTestModal() {
    const q = currentTest.questions[currentQ];
    const total = currentTest.questions.length;
    document.getElementById('testModalTitle').textContent = `${currentTest.title} · Q${currentQ + 1}/${total}`;
    document.getElementById('testModalBody').innerHTML = `
    <div class="q-navigator">${currentTest.questions.map((_, i) =>
        `<div class="q-nav-btn ${testAnswers[i] !== undefined ? 'answered' : ''} ${i === currentQ ? 'current' : ''}" onclick="jumpQ(${i})">${i + 1}</div>`
    ).join('')}</div>
    <div class="question-block">
      <div class="question-text"><span class="question-num">Q${currentQ + 1}.</span> ${q.text} <span class="badge badge-muted text-xs">${q.marks} mark${q.marks > 1 ? 's' : ''}</span></div>
      <div class="options-list">${q.options.map((opt, idx) => {
        const letters = ['A', 'B', 'C', 'D'];
        const sel = testAnswers[currentQ] === letters[idx];
        return `<div class="option-item ${sel ? 'selected' : ''}" onclick="selectAnswer('${letters[idx]}',${idx})">
          <div class="option-radio"></div>
          <span><strong>${letters[idx]}.</strong> ${opt}</span>
        </div>`;
    }).join('')}</div>
    </div>`;
    document.getElementById('testModalFooter').innerHTML = `
    <button class="btn btn-ghost" onclick="prevQ()" ${currentQ === 0 ? 'disabled' : ''}>← Prev</button>
    <span class="text-sm text-muted">${Object.keys(testAnswers).length} of ${total} answered</span>
    ${currentQ < total - 1
            ? `<button class="btn btn-primary" onclick="nextQ()">Next →</button>`
            : `<button class="btn btn-success" onclick="submitTest()">✅ Submit Test</button>`}`;
}

function selectAnswer(letter, optIdx) {
    testAnswers[currentQ] = letter;
    renderTestModal();
}
function nextQ() { if (currentQ < currentTest.questions.length - 1) { currentQ++; renderTestModal(); } }
function prevQ() { if (currentQ > 0) { currentQ--; renderTestModal(); } }
function jumpQ(i) { currentQ = i; renderTestModal(); }

function startTimer(seconds) {
    clearInterval(testTimer);
    let rem = seconds;
    const el = document.getElementById('testTimer');
    const update = () => {
        const m = Math.floor(rem / 60).toString().padStart(2, '0');
        const s = (rem % 60).toString().padStart(2, '0');
        el.textContent = `${m}:${s}`;
        el.className = `timer-badge${rem <= 300 ? ' warning' : ''}${rem <= 60 ? ' danger' : ''}`;
        if (rem <= 0) { clearInterval(testTimer); submitTest(); }
        rem--;
    };
    update();
    testTimer = setInterval(update, 1000);
}

async function submitTest() {
    clearInterval(testTimer);
    let score = 0;
    currentTest.questions.forEach((q, i) => {
        if (testAnswers[i] === q.correct) score += q.marks;
    });
    const pct = Math.round((score / currentTest.totalMarks) * 100);
    const pass = score >= currentTest.passingMarks;

    const submission = {
        id: `SUB-${Date.now()}`,
        testId: currentTest.id,
        studentId: currentUser.id,
        score,
        total: currentTest.totalMarks,
        pct,
        time: currentTest.duration
    };

    try {
        await FireData.saveSubmission(submission);
        // Update local submissions cache
        _allSubmissions.push(submission);
    } catch (err) {
        console.error('Failed to submit test:', err);
        showToast(`❌ Submission failed: ${err.message}`, 'error');
        alert(`Failed to submit test:\n\n${err.message}`);
        return;
    }

    document.getElementById('testModalTitle').textContent = '📊 Test Results';
    document.getElementById('testTimer').textContent = '';
    document.getElementById('testModalBody').innerHTML = `
    <div style="text-align:center;padding:1rem">
      <div class="score-circle" style="border-color:${pass ? 'var(--success)' : 'var(--danger)'}; background:${pass ? 'var(--success-light)' : 'var(--danger-light)'}">
        <div class="score-num" style="color:${pass ? 'var(--success)' : 'var(--danger)'}">${score}</div>
        <div class="score-total">/ ${currentTest.totalMarks}</div>
      </div>
      <h3 class="font-bold text-xl mb-1">${pass ? '🎉 Passed!' : '😔 Better luck next time'}</h3>
      <p class="text-secondary mb-4">You scored <strong>${pct}%</strong> · Passing: ${Math.round(currentTest.passingMarks / currentTest.totalMarks * 100)}%</p>
      <div class="flex gap-4 justify-center">
        <div class="stat-card" style="padding:.75rem 1.25rem;border-color:${pass ? '#86EFAC' : '#FCA5A5'}">
          <div class="stat-value">${pct}%</div><div class="stat-label">Score</div>
        </div>
        <div class="stat-card" style="padding:.75rem 1.25rem">
          <div class="stat-value">${Object.keys(testAnswers).length}/${currentTest.questions.length}</div><div class="stat-label">Attempted</div>
        </div>
      </div>
    </div>`;
    document.getElementById('testModalFooter').innerHTML = `<button class="btn btn-primary" onclick="closeTestModal()">✅ Done</button>`;
    showToast(`Test submitted! Score: ${score}/${currentTest.totalMarks} (${pct}%)`, pass ? 'success' : 'warning');
}

function closeTestModal() {
    clearInterval(testTimer);
    document.getElementById('testModal').classList.remove('open');
    renderTests('completed');
    navigate('tests', document.querySelector('[data-view=tests]'));
}

/* ── Attendance ─────────────────────────────────────────────── */
function renderAttendance() {
    const courses = getMyCourses();
    document.getElementById('attendanceContent').innerHTML = `
    <div class="grid-2">
      ${courses.map(c => {
        const att = _myAttendance?.[c.id] || { total: 20, present: 15, records: {} };
        const pct = att.total ? Math.round((att.present / att.total) * 100) : 0;
        const low = pct < 75;
        return `<div class="card">
          <div class="card-header">
            <div class="flex items-center gap-2"><span>${c.icon}</span><h3 class="font-semibold">${c.title}</h3></div>
            <span class="badge badge-${pct >= 75 ? 'success' : pct >= 60 ? 'warning' : 'danger'}">${pct}%</span>
          </div>
          <div class="card-body">
            ${low ? `<div class="alert alert-danger mb-4"><span class="alert-icon">⚠️</span><span>Attendance below 75%! Please attend classes regularly.</span></div>` : ''}
            <div class="grid-3 mb-4" style="gap:.75rem">
              <div class="stat-card" style="padding:1rem">
                <div class="stat-value text-success">${att.present}</div>
                <div class="stat-label">Present</div>
              </div>
              <div class="stat-card" style="padding:1rem">
                <div class="stat-value text-danger">${att.total - att.present}</div>
                <div class="stat-label">Absent</div>
              </div>
              <div class="stat-card" style="padding:1rem">
                <div class="stat-value">${att.total}</div>
                <div class="stat-label">Total</div>
              </div>
            </div>
            ${renderCalendar(att.records || {})}
          </div>
        </div>`;
    }).join('')}
    </div>`;
}

function renderCalendar(records) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const recordDates = Object.keys(records);
    if (!recordDates.length) return '<p class="text-muted text-sm">No attendance records yet.</p>';

    // Get month from first record
    const firstDate = new Date(recordDates[0]);
    const year = firstDate.getFullYear();
    const month = firstDate.getMonth();
    const monthName = firstDate.toLocaleString('default', { month: 'long' });
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let html = `<div class="text-sm font-semibold mb-2">${monthName} ${year}</div>
    <div class="att-calendar">
    ${days.map(d => `<div class="att-day-label">${d}</div>`).join('')}
    ${Array.from({ length: firstDay }, () => `<div class="att-day empty"></div>`).join('')}
    ${Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1;
        const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const status = records[key] || '';
        return `<div class="att-day ${status || 'empty'}">${d}</div>`;
    }).join('')}
    </div>`;
    return html;
}

/* ── Grades ─────────────────────────────────────────────────── */
function renderGrades() {
    const subs = _allSubmissions.filter(s => s.studentId === currentUser.id);

    // ── Desktop Table ────────────────────────────────────────────
    const tableHtml = `
    <div class="table-wrap desktop-table">
      <table>
        <thead><tr><th>Test</th><th>Course</th><th>Score</th><th>Percentage</th><th>Status</th></tr></thead>
        <tbody>
          ${subs.length ? subs.map(s => {
            const t = _allTests.find(x => x.id === s.testId);
            const c = _myCourses.find(x => x.id === t?.courseId);
            const pass = s.score >= (t?.passingMarks || 0);
            return `<tr>
              <td class="font-medium">${t?.title || '-'}</td>
              <td>${c?.icon || ''} ${c?.title || '-'}</td>
              <td>${s.score}/${s.total}</td>
              <td>
                <div class="flex items-center gap-2">
                  <div class="progress-bar" style="width:80px"><div class="progress-fill ${s.pct >= 60 ? 'success' : 'danger'}" style="width:${s.pct}%"></div></div>
                  <span class="text-sm font-medium">${s.pct}%</span>
                </div>
              </td>
              <td><span class="badge badge-${pass ? 'success' : 'danger'}">${pass ? '✅ Pass' : '❌ Fail'}</span></td>
            </tr>`;
          }).join('') : `<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--text-muted)">No test submissions yet</td></tr>`}
        </tbody>
      </table>
    </div>`;

    // ── Mobile Cards ─────────────────────────────────────────────
    const mobileHtml = subs.length ? subs.map(s => {
        const t = _allTests.find(x => x.id === s.testId);
        const c = _myCourses.find(x => x.id === t?.courseId);
        const pass = s.score >= (t?.passingMarks || 0);
        const pctColor = s.pct >= 60 ? 'success' : 'danger';
        return `
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:1rem;margin-bottom:.85rem;box-shadow:var(--shadow-sm)">
          <div class="flex justify-between items-start mb-3">
            <div style="flex:1;min-width:0">
              <div class="font-semibold text-sm" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t?.title || 'Test'}</div>
              <div class="text-xs text-muted mt-1">${c?.icon || ''} ${c?.title || '-'}</div>
            </div>
            <span class="badge badge-${pass ? 'success' : 'danger'}" style="flex-shrink:0;margin-left:.5rem">${pass ? '✅ Pass' : '❌ Fail'}</span>
          </div>
          <div class="flex items-center gap-3 mb-2">
            <div style="flex:1">
              <div class="flex justify-between text-xs mb-1" style="font-weight:600">
                <span style="color:var(--text-secondary)">Score</span>
                <span style="color:var(--${pctColor})">${s.pct}%</span>
              </div>
              <div class="progress-bar"><div class="progress-fill ${pctColor}" style="width:${s.pct}%"></div></div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div class="text-xs text-muted">Marks</div>
              <div class="font-bold text-sm">${s.score}<span class="text-muted font-medium">/${s.total}</span></div>
            </div>
          </div>
        </div>`;
    }).join('') : `<div class="text-center text-muted text-sm p-4">No test submissions yet</div>`;

    document.getElementById('gradesContent').innerHTML = `
    <div class="card">
      <div class="card-header"><h3 class="font-semibold">📊 My Test Results</h3></div>
      ${tableHtml}
      <div class="mobile-cards-list" style="padding:1rem">${mobileHtml}</div>
    </div>`;
}
