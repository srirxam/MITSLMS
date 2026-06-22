/* ============================================================
   MITS LMS — Teacher Portal App Logic
   🔥 All data loaded from Firebase via FireData service layer
   ============================================================ */

let currentUser, newQuestions = [], currentUserType = 'student';
let liveAttendance = {};

// Cached data from Firebase
let _allStudents = [];
let _allTeachers = [];
let _allCourses = [];
let _allTests = [];
let _allSubmissions = [];
let _allAttendance = {};
let _allVideoProgress = {};

/* ── Init ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = requireAuth('teacher');
    if (!currentUser) return;

    // Load all data from Firebase
    await FireData.init();
    _allStudents = await FireData.getStudents();
    _allTeachers = await FireData.getTeachers();
    _allCourses = await FireData.getCourses();
    _allTests = await FireData.getTests();
    _allSubmissions = await FireData.getSubmissions();
    _allAttendance = await FireData.getAllAttendance();
    _allVideoProgress = await FireData.getAllVideoProgress();

    setupUI();
    renderDashboard();
    document.getElementById('topDate').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
});

/* ── Refresh (mobile pull-to-refresh button) ─────────────── */
async function refreshApp() {
    const btn = document.getElementById('refreshBtn');
    const icon = btn;
    if (btn) {
        btn.disabled = true;
        icon.classList.add('spinning');
    }

    try {
        // Invalidate all cached FireData
        FireData.invalidate('all');

        // Re-fetch everything fresh
        await FireData.init();
        _allStudents     = await FireData.getStudents();
        _allTeachers     = await FireData.getTeachers();
        _allCourses      = await FireData.getCourses();
        _allTests        = await FireData.getTests();
        _allSubmissions  = await FireData.getSubmissions();
        _allAttendance   = await FireData.getAllAttendance();
        _allVideoProgress = await FireData.getAllVideoProgress();

        // Re-render the currently active view
        const activeSection = document.querySelector('.page-content > section:not(.hidden)');
        const viewId = activeSection?.id?.replace('view-', '');
        const renders = {
            dashboard:  renderDashboard,
            courses:    renderCourses,
            materials:  renderMaterials,
            attendance: () => renderAttendance('mark'),
            tests:      renderTests,
            progress:   renderProgress,
            users:      () => renderUsers('students'),
        };
        if (viewId && renders[viewId]) renders[viewId]();

        showToast('✅ Data refreshed!', 'success');
    } catch (err) {
        console.error('Refresh failed:', err);
        showToast('❌ Refresh failed. Please try again.', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            icon.classList.remove('spinning');
        }
    }
}

function setupUI() {
    const u = currentUser;
    document.getElementById('userName').textContent = u.name;
    document.getElementById('userId').textContent = u.id;
    document.getElementById('userAvatar').textContent = u.avatar;
    document.getElementById('userAvatar').style.background = u.avatarBg;
    document.getElementById('topUserName').textContent = u.name.split(' ').pop();
    document.getElementById('topAvatar').textContent = u.avatar;
    document.getElementById('topAvatar').style.background = u.avatarBg;

    const firstName = u.name.replace(/^(Prof\.|Dr\.)\s*/, '').split(' ')[0];
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    document.getElementById('teacherWelcome').textContent = `${greeting}, ${u.name}! 👋`;

    if (u.isAdmin || u.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    }
}

function navigate(view, el) {
    if (view === 'users' && !(currentUser.isAdmin || currentUser.role === 'admin')) {
        showToast('Access denied: Admins only', 'error');
        return;
    }
    document.querySelectorAll('.page-content > section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`view-${view}`).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (el) el.classList.add('active');
    const titles = { dashboard: 'Dashboard', courses: 'Course Management', materials: 'Study Materials', attendance: 'Attendance', tests: 'Test Management', progress: 'Student Progress', users: 'User Management' };
    document.getElementById('topBarTitle').textContent = titles[view] || view;
    const renders = { dashboard: renderDashboard, courses: renderCourses, materials: renderMaterials, attendance: () => renderAttendance('mark'), tests: renderTests, progress: renderProgress, users: () => renderUsers('students') };
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

function getMyCourses() {
    if (currentUser.isAdmin || currentUser.role === 'admin') return _allCourses;
    return _allCourses.filter(c => currentUser.courses?.includes(c.id));
}

/* ── Dashboard ─────────────────────────────────────────────── */
function renderDashboard() {
    const courses = getMyCourses();
    const enrolled = courses.reduce((a, c) => a + c.totalStudents, 0);
    const activeTests = _allTests.filter(t => courses.some(c => c.id === t.courseId) && t.status === 'active');

    document.getElementById('teacherStats').innerHTML = [
        { icon: '📚', label: 'My Courses', val: courses.length, color: '#EFF6FF' },
        { icon: '👥', label: 'Total Students', val: enrolled, color: '#F5F3FF' },
        { icon: '📋', label: 'Active Tests', val: activeTests.length, color: '#F0FDF4' },
        { icon: '📹', label: 'Total Videos', val: courses.reduce((a, c) => a + c.units.reduce((b, u) => b + u.videos.length, 0), 0), color: '#FFFBEB' },
    ].map(s => `
    <div class="stat-card">
      <div class="stat-icon" style="background:${s.color}"><span style="font-size:1.4rem">${s.icon}</span></div>
      <div><div class="stat-value">${s.val}</div><div class="stat-label">${s.label}</div></div>
    </div>`).join('');

    // Courses overview table
    document.getElementById('teacherCourseOverview').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Course</th><th>Students</th><th>Units</th><th>Videos</th><th>Active Test</th></tr></thead>
        <tbody>
          ${courses.map(c => {
        const at = _allTests.find(t => t.courseId === c.id && t.status === 'active');
        return `<tr>
              <td><div class="flex items-center gap-2"><span>${c.icon}</span><strong>${c.title}</strong></div></td>
              <td>${c.totalStudents}</td>
              <td>${c.units.length}</td>
              <td>${c.units.reduce((a, u) => a + u.videos.length, 0)}</td>
              <td>${at ? `<span class="badge badge-success">✅ ${at.title}</span>` : '<span class="badge badge-muted">None</span>'}</td>
            </tr>`;
    }).join('')}
        </tbody>
      </table>
    </div>`;

    // Alerts
    document.getElementById('teacherAlerts').innerHTML = (() => {
        const alerts = [];
        _allStudents.forEach(s => {
            const att = _allAttendance[s.id];
            if (att) {
                Object.entries(att).forEach(([cid, data]) => {
                    if (data.total && (data.present / data.total) < 0.75) {
                        const c = _allCourses.find(x => x.id === cid);
                        alerts.push(`<div class="alert alert-warning mb-2"><span class="alert-icon">⚠️</span><span><strong>${s.name}</strong> — ${c?.title}: ${Math.round(data.present / data.total * 100)}% attendance</span></div>`);
                    }
                });
            }
        });
        const missing = _allTests.filter(t => courses.some(c => c.id === t.courseId) && t.status === 'active');
        missing.forEach(t => {
            const subs = _allSubmissions.filter(s => s.testId === t.id).length;
            const course = courses.find(c => c.id === t.courseId);
            if (course && subs < course.totalStudents)
                alerts.push(`<div class="alert alert-info mb-2"><span class="alert-icon">📋</span><span><strong>${t.title}</strong>: ${subs}/${course.totalStudents} submitted</span></div>`);
        });
        return alerts.length ? alerts.join('') : '<p class="text-muted text-sm">No alerts right now. All good! ✅</p>';
    })();

    // Recent submissions
    document.getElementById('recentSubmissions').innerHTML = _allSubmissions.slice(-5).reverse().map(s => {
        const t = _allTests.find(x => x.id === s.testId);
        const st = _allStudents.find(x => x.id === s.studentId);
        return `<div class="flex items-center gap-3 mb-3">
      <div class="user-avatar" style="background:${st?.avatarBg || '#2563EB'};width:34px;height:34px;font-size:.75rem">${st?.avatar || '?'}</div>
      <div style="flex:1">
        <div class="text-sm font-medium">${st?.name}</div>
        <div class="text-xs text-muted">${t?.title} · <span class="${s.pct >= 60 ? 'text-success' : 'text-danger'} font-semibold">${s.pct}%</span></div>
      </div>
      <span class="badge badge-${s.pct >= 60 ? 'success' : 'danger'}">${s.score}/${s.total}</span>
    </div>`;
    }).join('') || '<p class="text-muted text-sm">No submissions yet.</p>';

    // Recent video activity
    const activities = [];
    _allStudents.forEach(s => {
        const vp = _allVideoProgress[s.id] || {};
        Object.entries(vp).filter(([, d]) => d.pct > 0).slice(0, 2).forEach(([vid, d]) => {
            const course = _allCourses.find(c => c.units.some(u => u.videos.some(v => v.id === vid)));
            const video = course?.units.flatMap(u => u.videos).find(v => v.id === vid);
            if (video) activities.push({ student: s, video, d });
        });
    });
    document.getElementById('recentVideoActivity').innerHTML = activities.slice(0, 5).map(a =>
        `<div class="flex items-center gap-3 mb-3">
      <div class="user-avatar" style="background:${a.student.avatarBg};width:34px;height:34px;font-size:.75rem">${a.student.avatar}</div>
      <div style="flex:1">
        <div class="text-sm font-medium">${a.student.name}</div>
        <div class="text-xs text-muted">${a.video.title}</div>
      </div>
      <span class="badge badge-${a.d.completed ? 'success' : a.d.pct > 50 ? 'warning' : 'danger'}">${a.d.pct}%</span>
    </div>`
    ).join('') || '<p class="text-muted text-sm">No activity yet.</p>';
}

/* ── Courses ───────────────────────────────────────────────── */
function renderCourses() {
    document.getElementById('teacherCoursesList').innerHTML = getMyCourses().map(c => `
    <div class="card mb-6">
      <div class="card-header">
        <div class="flex items-center gap-3">
          <div class="course-icon" style="background:${c.color}22">${c.icon}</div>
          <div><div class="font-bold text-lg">${c.title}</div><div class="text-sm text-muted">${c.teacher} · ${c.totalStudents} students</div></div>
        </div>
        <div class="flex items-center gap-2">
          <span class="badge badge-primary">${c.units.length} Units</span>
          <span class="badge badge-secondary">${c.units.reduce((a, u) => a + u.videos.length, 0)} Videos</span>
          <button class="btn btn-ghost btn-sm" style="color:var(--danger); font-size:1.05rem; padding:4px; display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px;" onclick="deleteCourse('${c.id}')" title="Delete Course">🗑️</button>
        </div>
      </div>
      <div class="card-body" style="padding:0">
        ${c.units.map(u => `
          <div style="border-bottom:1px solid var(--border);padding:1rem 1.5rem">
            <div class="flex justify-between items-center mb-3">
              <div class="font-semibold">📁 ${u.title}</div>
              <div class="flex items-center gap-2">
                <span class="badge badge-muted">${u.videos.length} videos</span>
                <button class="btn btn-ghost btn-sm" style="color:var(--danger); font-size:1rem; padding:2px; display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px;" onclick="deleteUnit('${c.id}','${u.id}')" title="Delete Unit">🗑️</button>
              </div>
            </div>
            <div class="flex flex-col gap-2">
              ${u.videos.map(v => `
                <div class="flex items-center gap-3 p-3" style="background:var(--surface-2);border-radius:var(--radius);border:1px solid var(--border)">
                  <img src="https://img.youtube.com/vi/${v.youtubeId}/mqdefault.jpg" style="width:70px;height:44px;object-fit:cover;border-radius:6px" onerror="this.style.display='none'"/>
                  <div style="flex:1">
                    <div class="text-sm font-semibold">${v.title}</div>
                    <a href="https://youtube.com/watch?v=${v.youtubeId}" target="_blank" class="text-xs" style="color:var(--primary)">▶ youtube.com/watch?v=${v.youtubeId}</a>
                  </div>
                  <span class="text-xs text-muted">⏱ ${v.duration}</span>
                  <button class="btn btn-ghost btn-sm" style="color:var(--danger);flex-shrink:0" onclick="deleteVideo('${c.id}','${u.id}','${v.id}')" title="Delete video">🗑️</button>
                </div>`).join('')}
            </div>
          </div>`).join('')}
      </div>
    </div>`).join('');
}

async function deleteVideo(courseId, unitId, videoId) {
    if (!confirm('🗑️ Are you sure you want to delete this video? This cannot be undone.')) return;
    try {
        await FireData.deleteVideoFromUnit(courseId, unitId, videoId);
        // Update local cache
        const course = _allCourses.find(c => c.id === courseId);
        if (course) {
            const unit = course.units.find(u => u.id === unitId);
            if (unit) unit.videos = unit.videos.filter(v => v.id !== videoId);
        }
        showToast('🗑️ Video deleted successfully', 'info');
        renderCourses();
    } catch (err) {
        console.error('Failed to delete video:', err);
        showToast(`❌ Delete failed: ${err.message}`, 'error');
        alert(`Failed to delete video:\n\n${err.message}`);
    }
}

async function deleteUnit(courseId, unitId) {
    if (!confirm('🗑️ Are you sure you want to delete this unit? This will permanently delete the unit and all its video links. This cannot be undone.')) return;
    
    const course = _allCourses.find(c => c.id === courseId);
    if (!course) { showToast('Course not found', 'error'); return; }

    const unit = course.units.find(u => u.id === unitId);
    if (!unit) { showToast('Unit not found', 'error'); return; }

    try {
        // Filter out the unit
        const updatedUnits = course.units.filter(u => u.id !== unitId);

        // Update Firestore
        await FireData.updateCourseField(courseId, { units: updatedUnits });

        // Update local cache
        course.units = updatedUnits;

        showToast(`🗑️ Unit "${unit.title}" deleted successfully`, 'info');
        renderCourses();
        renderDashboard(); // Update video stats on dashboard
    } catch (err) {
        console.error('Failed to delete unit:', err);
        showToast(`❌ Unit deletion failed: ${err.message}`, 'error');
        alert(`Failed to delete unit:\n\n${err.message}`);
    }
}

async function deleteCourse(courseId) {
    if (!confirm('🗑️ Are you sure you want to delete this course? This will permanently delete the course, all its units, videos, and study materials. This cannot be undone.')) return;
    try {
        // 1. Delete course doc in Firestore
        await FireData.deleteCourse(courseId);

        // 2. Remove courseId from local teacher's courses list
        if (currentUser.courses) {
            currentUser.courses = currentUser.courses.filter(id => id !== courseId);
            sessionStorage.setItem('mits_user', JSON.stringify(currentUser));
        }

        // 3. Remove courseId mapping on the teacher document in Firestore
        try {
            await db.collection('teachers').doc(currentUser.id).update({
                courses: firebase.firestore.FieldValue.arrayRemove(courseId)
            });
        } catch (err) {
            console.warn('Could not update teacher course mapping:', err.message);
        }

        // Update active stats on dashboard
        _allCourses = _allCourses.filter(c => c.id !== courseId);

        showToast('🗑️ Course deleted successfully', 'info');
        renderCourses();
        renderDashboard();
    } catch (err) {
        console.error('Failed to delete course:', err);
        showToast(`❌ Course deletion failed: ${err.message}`, 'error');
        alert(`Failed to delete course:\n\n${err.message}`);
    }
}

/* ── Study Materials ───────────────────────────────────────── */
function renderMaterials() {
    document.getElementById('teacherMaterialsList').innerHTML = getMyCourses().map(c => {
        const materials = c.materials || [];
        return `
    <div class="card mb-6">
      <div class="card-header">
        <div class="flex items-center gap-3">
          <div class="course-icon" style="background:${c.color}22">${c.icon}</div>
          <div><div class="font-bold text-lg">${c.title}</div></div>
        </div>
        <span class="badge badge-primary">${materials.length} Materials</span>
      </div>
      <div class="card-body" style="padding:0">
        ${materials.length > 0 ? materials.map((m, idx) => {
            const isDrive = m.type === 'drive';
            const icon = isDrive ? '📂' : '📄';
            const meta = isDrive
                ? `Google Drive Link · Added: ${m.date}`
                : `${m.type.toUpperCase()} · ${m.size} · Uploaded: ${m.date}`;
            // Encode material data safely for onclick
            const mEncoded = encodeURIComponent(JSON.stringify(m));
            return `
          <div class="flex items-center justify-between p-4" style="border-bottom:1px solid var(--border)">
            <div class="flex items-center gap-3">
              <div class="course-icon" style="background:${isDrive ? '#1a73e822' : 'var(--surface-2)'};color:${isDrive ? '#1a73e8' : 'var(--primary)'};width:40px;height:40px;font-size:1.2rem">${icon}</div>
              <div>
                <div class="font-semibold text-sm">${m.title}</div>
                <div class="text-xs text-muted">${meta}</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button class="btn btn-outline btn-sm" onclick="viewMaterial(decodeURIComponent('${mEncoded}'))" style="color:var(--primary);gap:4px">👁️ View</button>
              <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="deleteMaterial('${c.id}', ${idx})">🗑️ Delete</button>
            </div>
          </div>`;
        }).join('') : '<div class="p-4 text-center text-muted text-sm">No study materials uploaded yet.</div>'}
      </div>
    </div>`;
    }).join('');
}

/** Open a material in the view modal */
function viewMaterial(mJson) {
    const m = JSON.parse(mJson);
    const modal = document.getElementById('viewMaterialTeacherModal');
    const title = document.getElementById('viewMatTeacherTitle');
    const body  = document.getElementById('viewMatTeacherBody');
    const dlBtn = document.getElementById('viewMatTeacherDlBtn');
    if (!modal) return;

    title.textContent = m.title;

    const isDrive = m.type === 'drive';
    const isPdf   = typeof m.type === 'string' && m.type.toLowerCase() === 'pdf';
    const isBase64 = m.fileUrl && m.fileUrl.startsWith('data:');

    // Build preview content
    if (m.fileUrl) {
        if (isDrive) {
            // Convert Google Drive share link → embed preview URL
            let embedUrl = m.fileUrl;
            const match = m.fileUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
            if (match) {
                embedUrl = `https://drive.google.com/file/d/${match[1]}/preview`;
            } else if (m.fileUrl.includes('docs.google.com')) {
                embedUrl = m.fileUrl.replace('/edit', '/preview').replace('/view', '/preview');
            }
            body.innerHTML = `
                <div style="border-radius:var(--radius);overflow:hidden;border:1px solid var(--border);height:520px">
                    <iframe src="${embedUrl}" width="100%" height="100%" style="border:none" allow="autoplay" allowfullscreen></iframe>
                </div>
                <p class="text-xs text-muted mt-2" style="text-align:center">📂 Previewing from Google Drive. <a href="${m.fileUrl}" target="_blank" style="color:var(--primary)">Open in Drive ↗</a></p>`;
        } else if (isPdf || isBase64) {
            body.innerHTML = `
                <div style="border-radius:var(--radius);overflow:hidden;border:1px solid var(--border);height:520px">
                    <iframe src="${m.fileUrl}" width="100%" height="100%" style="border:none" type="application/pdf"></iframe>
                </div>`;
        } else {
            // Non-PDF uploaded file — show info + open link
            body.innerHTML = `
                <div style="text-align:center;padding:2rem">
                    <div style="font-size:4rem;margin-bottom:1rem">📄</div>
                    <div class="font-bold text-lg mb-2">${m.title}</div>
                    <div class="text-sm text-muted mb-4">${m.type ? m.type.toUpperCase() : 'File'} · ${m.size || ''}</div>
                    <a href="${m.fileUrl}" target="_blank" class="btn btn-primary">⬇️ Download / Open File</a>
                </div>`;
        }
    } else {
        body.innerHTML = `<p class="text-muted text-center p-4">No preview available for this material.</p>`;
    }

    // Download button
    if (dlBtn && m.fileUrl) {
        dlBtn.style.display = '';
        dlBtn.onclick = () => window.open(m.fileUrl, '_blank');
        dlBtn.textContent = isDrive ? '↗️ Open in Drive' : '⬇️ Download File';
    } else if (dlBtn) {
        dlBtn.style.display = 'none';
    }

    modal.classList.add('open');
}

function closeViewMaterialTeacherModal() {
    const modal = document.getElementById('viewMaterialTeacherModal');
    if (modal) modal.classList.remove('open');
    // Clear iframe to stop loading
    const body = document.getElementById('viewMatTeacherBody');
    if (body) body.innerHTML = '';
}

function openAddMaterialModal() {
    const dl = document.getElementById('materialCoursesDatalist');
    if (dl) {
        dl.innerHTML = _allCourses.map(c => `<option value="${c.title}"></option>`).join('');
    }
    const input = document.getElementById('materialCourseInput');
    if (input) {
        input.value = '';
    }
    document.getElementById('matTitle').value = '';
    document.getElementById('matFile').value = '';
    document.getElementById('matDriveUrl').value = '';
    document.getElementById('matDrivePreview').classList.add('hidden');
    // Reset to file upload mode
    toggleMatSource('file');
    document.querySelector('input[name="matSourceMode"][value="file"]').checked = true;
    document.getElementById('addMaterialModal').classList.add('open');
}

/** Toggle between file upload panel and Google Drive link panel */
function toggleMatSource(mode) {
    const filePanel = document.getElementById('matFilePanel');
    const drivePanel = document.getElementById('matDrivePanel');
    const saveBtn = document.getElementById('matSaveBtn');
    const btnFile = document.getElementById('matBtnFile');
    const btnDrive = document.getElementById('matBtnDrive');

    if (mode === 'drive') {
        filePanel.classList.add('hidden');
        drivePanel.classList.remove('hidden');
        if (saveBtn) saveBtn.textContent = '🔗 Save Link';
        if (btnFile)  btnFile.classList.remove('mat-source-active');
        if (btnDrive) btnDrive.classList.add('mat-source-active');
    } else {
        filePanel.classList.remove('hidden');
        drivePanel.classList.add('hidden');
        if (saveBtn) saveBtn.textContent = '📤 Upload';
        if (btnFile)  btnFile.classList.add('mat-source-active');
        if (btnDrive) btnDrive.classList.remove('mat-source-active');
    }
}

/** Show a small preview when a Drive URL is pasted */
function previewDriveLink() {
    const url = document.getElementById('matDriveUrl')?.value.trim();
    const preview = document.getElementById('matDrivePreview');
    const previewUrl = document.getElementById('matDrivePreviewUrl');
    if (!preview || !previewUrl) return;

    if (url && (url.includes('drive.google.com') || url.includes('docs.google.com'))) {
        previewUrl.textContent = url;
        preview.classList.remove('hidden');
    } else {
        preview.classList.add('hidden');
    }
}

async function saveMaterial() {
    const courseTitle = document.getElementById('materialCourseInput')?.value.trim();
    if (!courseTitle) { showToast('Please enter or select a course', 'error'); return; }

    const course = _allCourses.find(c => c.title.toLowerCase() === courseTitle.toLowerCase() || c.id.toLowerCase() === courseTitle.toLowerCase());
    if (!course) { showToast('Course not found. Please select or type an existing course.', 'error'); return; }

    const cid = course.id;
    const title = document.getElementById('matTitle')?.value.trim();
    if (!title) { showToast('Please enter a material title', 'error'); return; }

    // Determine which mode is active
    const driveRadio = document.querySelector('input[name="matSourceMode"][value="drive"]');
    const isDriveMode = driveRadio && driveRadio.checked;

    const uploadBtn = document.getElementById('matSaveBtn');

    // ── Drive Link Mode ──────────────────────────────────────────
    if (isDriveMode) {
        const driveUrl = document.getElementById('matDriveUrl')?.value.trim();
        if (!driveUrl) { showToast('Please paste a Google Drive link', 'error'); return; }
        if (!driveUrl.includes('drive.google.com') && !driveUrl.includes('docs.google.com')) {
            showToast('Please enter a valid Google Drive URL', 'error');
            return;
        }

        try {
            const material = {
                id: `MAT-${Date.now()}`,
                title,
                type: 'drive',
                size: '—',
                date: new Date().toISOString().split('T')[0],
                fileName: title,
                fileUrl: driveUrl,
                driveLink: driveUrl
            };
            await FireData.saveMaterial(cid, material);
            showToast(`✅ Drive link "${title}" saved successfully`, 'success');
            closeModal('addMaterialModal');
            renderMaterials();
        } catch (err) {
            console.error('Failed to save Drive link:', err);
            showToast(`❌ Failed to save Drive link: ${err.message}`, 'error');
        }
        return;
    }

    // ── File Upload Mode ─────────────────────────────────────────
    const fileInput = document.getElementById('matFile');
    if (!fileInput.files.length) { showToast('Please attach a file', 'error'); return; }

    const file = fileInput.files[0];
    const ext = file.name.split('.').pop().toLowerCase() || 'pdf';
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);

    // Warn if file is very large (>5MB)
    if (file.size > 5 * 1024 * 1024) {
        showToast('❌ File too large. Please upload files under 5 MB.', 'error');
        return;
    }

    // Show uploading state
    if (uploadBtn) { uploadBtn.disabled = true; uploadBtn.textContent = '⏳ Uploading... 0%'; }

    try {
        let fileUrl = null;

        // 🔥 Step 1: Try Firebase Storage first
        try {
            const storageRef = storage.ref(`materials/${cid}/${Date.now()}_${file.name}`);
            const uploadTask = storageRef.put(file);

            // Listen to progress updates
            uploadTask.on('state_changed', (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                if (uploadBtn) {
                    uploadBtn.textContent = `⏳ Uploading... ${Math.round(progress)}%`;
                }
            });

            const snapshot = await uploadTask;
            fileUrl = await snapshot.ref.getDownloadURL();
            console.log('🔥 File uploaded to Firebase Storage:', fileUrl);
        } catch (storageErr) {
            console.warn('⚠️ Firebase Storage upload failed or timed out, checking base64 fallback:', storageErr.message);

            // 📦 Check if the file is too large for base64 Firestore fallback (max 700 KB)
            if (file.size > 700 * 1024) {
                throw new Error(`Firebase Storage is unreachable/failed, and this file (${sizeMb} MB) is too large for the Firestore fallback (max 700 KB). Please check your internet or upload a smaller file.`);
            }

            if (uploadBtn) { uploadBtn.textContent = '⏳ Converting file...'; }

            // 📦 Step 2: Fallback — convert file to base64 data URL and store in Firestore
            fileUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);  // gives "data:application/pdf;base64,..."
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsDataURL(file);
            });
            console.log('📦 File stored as base64 data URL (Firestore fallback)');
        }

        const material = {
            id: `MAT-${Date.now()}`,
            title,
            type: ext,
            size: sizeMb + ' MB',
            date: new Date().toISOString().split('T')[0],
            fileName: file.name,
            fileUrl   // always set — either Storage URL or base64 data URL
        };

        // 🔥 Save to Firestore
        await FireData.saveMaterial(cid, material);
        showToast(`✅ Material "${title}" uploaded successfully`, 'success');
        closeModal('addMaterialModal');
        renderMaterials();
    } catch (err) {
        console.error('Failed to upload material:', err);
        showToast(`❌ Material upload failed: ${err.message}`, 'error');
        alert(`Failed to upload material:\n\n${err.message}`);
    } finally {
        if (uploadBtn) { uploadBtn.disabled = false; uploadBtn.textContent = '📤 Upload'; }
    }
}


async function deleteMaterial(courseId, materialIndex) {
    try {
        // 🔥 Delete from Firebase
        await FireData.deleteMaterial(courseId, materialIndex);
        showToast('🗑️ Material deleted', 'info');
        renderMaterials();
    } catch (err) {
        console.error('Failed to delete material:', err);
        showToast(`❌ Material deletion failed: ${err.message}`, 'error');
        alert(`Failed to delete material:\n\n${err.message}`);
    }
}

/* ── Attendance ─────────────────────────────────────────────── */
function switchAttTab(tab, el) {
    document.querySelectorAll('#view-attendance .tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    if (tab === 'mark') renderAttendance('mark');
    else renderAttendance('report');
}

function renderAttendance(mode) {
    const courses = getMyCourses();
    if (mode === 'mark') {
        document.getElementById('attendanceContent').innerHTML = `
      <div class="card mb-4">
        <div class="card-body">
          <div class="grid-3 mb-4">
            <div class="form-group">
              <label class="form-label">Select Course</label>
              <select class="form-select" id="attCourse" onchange="loadStudentsForAtt()">
                ${courses.map(c => `<option value="${c.id}">${c.icon} ${c.title}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Date</label>
              <input type="date" class="form-input" id="attDate" value="${new Date().toISOString().split('T')[0]}"/>
            </div>
            <div class="form-group" style="justify-content:flex-end;flex-direction:row;align-items:flex-end">
              <button class="btn btn-outline btn-sm" onclick="markAllPresent()">✅ All Present</button>
              <button class="btn btn-ghost btn-sm" onclick="markAllAbsent()" style="margin-left:.5rem">❌ All Absent</button>
            </div>
          </div>
          <div id="attStudentList"></div>
          <button class="btn btn-primary mt-4 w-full" onclick="saveAttendance()">💾 Save Attendance</button>
        </div>
      </div>`;
        loadStudentsForAtt();
    } else {
        const studentRows = _allStudents.map(s => {
            const attData = _allAttendance[s.id] || {};
            const summary = courses.map(c => {
                const d = attData[c.id] || { total: 0, present: 0 };
                const pct = d.total ? Math.round(d.present / d.total * 100) : 0;
                return `<td><div class="pct-cell"><div class="pct-dot" style="background:${pct >= 75 ? 'var(--success)' : pct >= 60 ? 'var(--warning)' : 'var(--danger)'}"></div>${pct}%</div></td>`;
            }).join('');
            return `<tr>
        <td><div class="flex items-center gap-2"><div class="user-avatar" style="background:${s.avatarBg};width:30px;height:30px;font-size:.7rem">${s.avatar}</div>${s.name}</div></td>
        <td class="text-xs text-muted font-mono">${s.id}</td>
        ${summary}
      </tr>`;
        });
        document.getElementById('attendanceContent').innerHTML = `
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Student</th><th>ID</th>${courses.map(c => `<th>${c.icon} ${c.title.split(' ')[0]}</th>`).join('')}</tr></thead>
            <tbody>${studentRows.join('')}</tbody>
          </table>
        </div>
      </div>`;
    }
}

function loadStudentsForAtt() {
    const cid = document.getElementById('attCourse')?.value;
    if (!cid) return;
    const students = _allStudents.filter(s => s.enrolledCourses.includes(cid));
    liveAttendance = {};
    students.forEach(s => liveAttendance[s.id] = 'present');

    document.getElementById('attStudentList').innerHTML = students.map(s => `
    <div class="student-att-row">
      <div class="flex items-center gap-3">
        <div class="user-avatar" style="background:${s.avatarBg};width:34px;height:34px;font-size:.75rem">${s.avatar}</div>
        <div><div class="font-medium text-sm">${s.name}</div><div class="text-xs text-muted font-mono">${s.id}</div></div>
      </div>
      <div class="att-toggle" id="toggle_${s.id}">
        <button class="present-active" onclick="setAtt('${s.id}','present')">✅ Present</button>
        <button onclick="setAtt('${s.id}','absent')">❌ Absent</button>
      </div>
    </div>`).join('') || '<p class="text-muted text-sm">No students enrolled in this course.</p>';
}

function setAtt(studentId, status) {
    liveAttendance[studentId] = status;
    const tog = document.getElementById(`toggle_${studentId}`);
    if (tog) {
        tog.querySelector('button:first-child').className = status === 'present' ? 'present-active' : '';
        tog.querySelector('button:last-child').className = status === 'absent' ? 'absent-active' : '';
    }
}

function markAllPresent() { Object.keys(liveAttendance).forEach(id => setAtt(id, 'present')); }
function markAllAbsent() { Object.keys(liveAttendance).forEach(id => setAtt(id, 'absent')); }

async function saveAttendance() {
    const date = document.getElementById('attDate')?.value;
    const cid = document.getElementById('attCourse')?.value;
    const present = Object.values(liveAttendance).filter(v => v === 'present').length;
    const total = Object.keys(liveAttendance).length;

    try {
        // 🔥 Save each student's attendance to Firebase
        for (const [sid, status] of Object.entries(liveAttendance)) {
            // Get existing attendance data
            const existing = _allAttendance[sid]?.[cid] || { total: 0, present: 0, records: {} };
            existing.records[date] = status;
            existing.total++;
            if (status === 'present') existing.present++;

            await FireData.saveAttendance(sid, cid, existing);

            // Update local cache
            if (!_allAttendance[sid]) _allAttendance[sid] = {};
            _allAttendance[sid][cid] = existing;
        }

        showToast(`✅ Attendance saved! ${present}/${total} present`, 'success');
    } catch (err) {
        console.error('Failed to save attendance:', err);
        showToast(`❌ Attendance save failed: ${err.message}`, 'error');
        alert(`Failed to save attendance:\n\n${err.message}`);
    }
}

/* ── Tests ─────────────────────────────────────────────────── */
function renderTests() {
    const courses = getMyCourses();
    const tests = _allTests.filter(t => courses.some(c => c.id === t.courseId));
    document.getElementById('teacherTestsList').innerHTML = tests.map(t => {
        const c = _allCourses.find(x => x.id === t.courseId);
        const subs = _allSubmissions.filter(s => s.testId === t.id);
        const avgScore = subs.length ? Math.round(subs.reduce((a, s) => a + s.pct, 0) / subs.length) : 0;
        return `<div class="card mb-4">
      <div class="card-body">
        <div class="flex justify-between items-start mb-3">
          <div>
            <div class="font-bold text-lg">${t.title}</div>
            <div class="text-sm text-muted mt-1">${c?.icon} ${c?.title} · ${t.duration} min · ${t.totalMarks} marks</div>
          </div>
          <div class="flex items-center gap-2">
            <span class="badge badge-${t.status === 'active' ? 'success' : t.status === 'upcoming' ? 'warning' : 'muted'}">${t.status === 'active' ? '🟢 Live' : t.status === 'upcoming' ? '⏳ Upcoming' : '✅ Ended'}</span>
            <button class="btn btn-ghost btn-sm" style="color:var(--danger);font-size:1rem;padding:4px;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center" onclick="deleteTest('${t.id}')" title="Delete Test">🗑️</button>
          </div>
        </div>
        <div class="flex gap-6 text-sm mb-3">
          <span>❓ ${t.questions.length} questions</span>
          <span>📝 ${subs.length} submissions</span>
          ${subs.length ? `<span>📊 Avg: ${avgScore}%</span>` : ''}
          <span>✅ Pass: ${t.passingMarks}/${t.totalMarks}</span>
        </div>
        ${subs.length ? `
          <div class="table-wrap">
            <table>
              <thead><tr><th>Student</th><th>Score</th><th>%</th><th>Status</th></tr></thead>
              <tbody>${subs.map(s => {
            const st = _allStudents.find(x => x.id === s.studentId);
            const pass = s.score >= t.passingMarks;
            return `<tr>
                  <td><div class="flex items-center gap-2"><div class="user-avatar" style="background:${st?.avatarBg};width:26px;height:26px;font-size:.65rem">${st?.avatar}</div>${st?.name}</div></td>
                  <td>${s.score}/${s.total}</td>
                  <td>${s.pct}%</td>
                  <td><span class="badge badge-${pass ? 'success' : 'danger'}">${pass ? 'Pass' : 'Fail'}</span></td>
                </tr>`;
        }).join('')}</tbody>
            </table>
          </div>` : '<p class="text-muted text-sm">No submissions yet.</p>'}
      </div>
    </div>`;
    }).join('') || '<div class="empty-state"><div class="empty-icon">📋</div><h3>No tests created yet</h3><p>Click "Create Test" to add one</p></div>';
}

async function deleteTest(testId) {
    if (!confirm('🗑️ Are you sure you want to delete this test? This cannot be undone.')) return;
    try {
        await FireData.deleteTest(testId);
        // Update local cache
        _allTests = _allTests.filter(t => t.id !== testId);
        _allSubmissions = _allSubmissions.filter(s => s.testId !== testId);
        showToast('🗑️ Test deleted successfully', 'info');
        renderTests();
        renderDashboard();
    } catch (err) {
        console.error('Failed to delete test:', err);
        showToast(`❌ Delete failed: ${err.message}`, 'error');
        alert(`Failed to delete test:\n\n${err.message}`);
    }
}

/* ── Progress Tracker ──────────────────────────────────────── */
function renderProgress() {
    const courses = getMyCourses();
    document.getElementById('progressContent').innerHTML = courses.map(c => {
        const students = _allStudents.filter(s => s.enrolledCourses.includes(c.id));
        const allVideos = c.units.flatMap(u => u.videos);

        // 1. Generate Desktop Table HTML
        const tableRows = students.map(s => {
            const vp = _allVideoProgress[s.id] || {};
            const unitCols = c.units.map(u => {
                const vids = u.videos;
                const done = vids.filter(v => vp[v.id]?.completed).length;
                const pct = vids.length ? Math.round(done / vids.length * 100) : 0;
                const col = pct >= 80 ? 'var(--success)' : pct >= 50 ? 'var(--warning)' : 'var(--danger)';
                return `<td><div class="pct-cell"><div class="pct-dot" style="background:${col}"></div><div><div class="text-sm font-medium">${pct}%</div><div class="text-xs text-muted">${done}/${vids.length} done</div></div></div></td>`;
            }).join('');
            const totalDone = allVideos.filter(v => vp[v.id]?.completed).length;
            const overallPct = allVideos.length ? Math.round(totalDone / allVideos.length * 100) : 0;
            const oCol = overallPct >= 80 ? 'success' : overallPct >= 50 ? 'warning' : 'danger';
            return `<tr>
                <td><div class="flex items-center gap-2"><div class="user-avatar" style="background:${s.avatarBg};width:30px;height:30px;font-size:.7rem">${s.avatar}</div><div><div class="text-sm font-medium">${s.name}</div><div class="text-xs text-muted font-mono">${s.id}</div></div></div></td>
                ${unitCols}
                <td><span class="badge badge-${oCol}">${overallPct}%</span></td>
              </tr>`;
        }).join('');

        const tableHtml = `
      <div class="table-wrap desktop-table">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              ${c.units.map(u => `<th>${u.title}</th>`).join('')}
              <th>Overall</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>`;

        // 2. Generate Mobile Cards List HTML
        const mobileCardsHtml = students.map(s => {
            const vp = _allVideoProgress[s.id] || {};
            const totalDone = allVideos.filter(v => vp[v.id]?.completed).length;
            const overallPct = allVideos.length ? Math.round(totalDone / allVideos.length * 100) : 0;
            const oCol = overallPct >= 80 ? 'success' : overallPct >= 50 ? 'warning' : 'danger';

            const unitItems = c.units.map(u => {
                const vids = u.videos;
                const done = vids.filter(v => vp[v.id]?.completed).length;
                const pct = vids.length ? Math.round(done / vids.length * 100) : 0;
                const col = pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger';
                return `
              <div class="unit-progress-item">
                <div class="flex justify-between text-xs mb-1" style="font-weight: 500;">
                  <span class="text-secondary">${u.title}</span>
                  <span class="text-${col} font-semibold">${pct}% (${done}/${vids.length})</span>
                </div>
                <div class="progress-bar progress-bar-sm">
                  <div class="progress-fill ${col}" style="width:${pct}%"></div>
                </div>
              </div>`;
            }).join('');

            return `
          <div class="student-progress-card">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <div class="user-avatar" style="background:${s.avatarBg};width:32px;height:32px;font-size:.75rem">${s.avatar}</div>
                <div>
                  <div class="font-bold text-sm">${s.name}</div>
                  <div class="text-xs text-muted font-mono">${s.id}</div>
                </div>
              </div>
              <span class="badge badge-${oCol}">${overallPct}% Overall</span>
            </div>
            <div class="flex flex-col gap-2">
              ${unitItems || '<div class="text-xs text-muted">No units created yet</div>'}
            </div>
          </div>`;
        }).join('') || '<div class="text-center text-muted text-sm p-4">No student records found.</div>';

        const mobileCardsContainerHtml = `
      <div class="mobile-cards-list">
        ${mobileCardsHtml}
      </div>`;

        return `
    <div class="card mb-6">
      <div class="card-header">
        <div class="flex items-center gap-2"><span>${c.icon}</span><h3 class="font-semibold">${c.title}</h3></div>
        <span class="badge badge-primary">${students.length} students</span>
      </div>
      ${tableHtml}
      ${mobileCardsContainerHtml}
    </div>`;
    }).join('');
}

/* ── User Management ───────────────────────────────────────── */
function switchUserTab(tab, el) {
    document.querySelectorAll('#view-users .tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    renderUsers(tab);
}

function renderUsers(type) {
    const list = type === 'students' ? _allStudents : _allTeachers;
    const userType = type === 'students' ? 'student' : 'teacher';

    // Desktop table rows
    const tableRows = list.map(u => `<tr>
      <td><div class="flex items-center gap-2"><div class="user-avatar" style="background:${u.avatarBg};width:30px;height:30px;font-size:.7rem">${u.avatar}</div><strong>${u.name}</strong></div></td>
      <td class="font-mono text-xs">${u.id}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="openEditUserModal('${u.id}','${userType}')">✏️ Edit</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="deleteUser('${u.id}','${userType}')">🗑️ Delete</button>
      </td>
    </tr>`).join('');

    // Mobile card rows
    const mobileCards = list.map(u => `
      <div class="user-mobile-card">
        <div class="user-mobile-card-header">
          <div class="flex items-center gap-2">
            <div class="user-avatar" style="background:${u.avatarBg};width:38px;height:38px;font-size:.82rem">${u.avatar}</div>
            <div>
              <div class="font-semibold text-sm">${u.name}</div>
              <div class="text-xs text-muted font-mono">${u.id}</div>
            </div>
          </div>
        </div>
        <div class="user-mobile-card-actions">
          <button class="btn btn-outline btn-sm" onclick="openEditUserModal('${u.id}','${userType}')">✏️ Edit</button>
          <button class="btn btn-sm" style="background:var(--danger-light);color:var(--danger);border:1.5px solid var(--danger)" onclick="deleteUser('${u.id}','${userType}')">🗑️ Delete</button>
        </div>
      </div>`).join('');

    document.getElementById('usersContent').innerHTML = `
      <div class="card desktop-table">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>ID</th><th>Actions</th></tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </div>
      </div>
      <div class="mobile-cards-list">${mobileCards}</div>`;
}

/* ── Edit User Modal ────────────────────────────────────────── */
function openEditUserModal(userId, type) {
    const list = type === 'student' ? _allStudents : _allTeachers;
    const user = list.find(u => u.id === userId);
    if (!user) { showToast('User not found', 'error'); return; }

    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUserType').value = type;
    document.getElementById('editUserName').value = user.name || '';
    document.getElementById('editUserDept').value = user.dept || '';
    document.getElementById('editUserEmail').value = user.email || '';
    document.getElementById('editUserPhone').value = user.phone || '';
    document.getElementById('editUserPassword').value = user.password || '';

    // Populate Courses Checkbox List
    const coursesListContainer = document.getElementById('editUserCoursesList');
    const coursesLabel = document.getElementById('editCoursesLabel');
    if (coursesLabel) {
        coursesLabel.textContent = type === 'student' ? 'Enrolled Courses' : 'Assigned Courses';
    }

    if (coursesListContainer) {
        coursesListContainer.innerHTML = _allCourses.map(c => {
            const isEnrolled = type === 'student'
                ? (user.enrolledCourses || []).includes(c.id)
                : (user.courses || []).includes(c.id);
            return `
                <label class="flex items-center gap-2 text-sm" style="cursor:pointer; padding: .25rem 0;">
                    <input type="checkbox" name="editUserCourses" value="${c.id}" ${isEnrolled ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;" />
                    <span>${c.icon} ${c.title}</span>
                </label>
            `;
        }).join('') || '<div class="text-xs text-muted">No courses available</div>';
    }

    document.getElementById('editUserModal').classList.add('open');
}

async function updateUser() {
    const id = document.getElementById('editUserId').value;
    const type = document.getElementById('editUserType').value; // 'student' or 'teacher'
    const name = document.getElementById('editUserName').value.trim();
    const dept = document.getElementById('editUserDept').value.trim();
    const email = document.getElementById('editUserEmail').value.trim();
    const phone = document.getElementById('editUserPhone').value.trim();
    const password = document.getElementById('editUserPassword').value.trim();

    if (!name || !email || !password) { showToast('Please fill in all required fields', 'error'); return; }

    const list = type === 'student' ? _allStudents : _allTeachers;
    const userIndex = list.findIndex(u => u.id === id);
    if (userIndex === -1) { showToast('User not found', 'error'); return; }

    const existingUser = list[userIndex];
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const selectedCourses = Array.from(document.querySelectorAll('input[name="editUserCourses"]:checked')).map(cb => cb.value);

    const updatedUser = {
        ...existingUser,
        name,
        dept,
        email,
        phone,
        password,
        avatar: initials,
        [type === 'student' ? 'enrolledCourses' : 'courses']: selectedCourses
    };

    try {
        if (type === 'student') {
            await FireData.createStudent(updatedUser);
            _allStudents[userIndex] = updatedUser;
        } else {
            await FireData.createTeacher(updatedUser);
            _allTeachers[userIndex] = updatedUser;
        }

        // Update currently logged-in user session if editing self
        if (id === currentUser.id) {
            const sessionUser = { ...updatedUser, role: currentUser.role };
            sessionStorage.setItem('mits_user', JSON.stringify(sessionUser));
            currentUser = sessionUser;
            setupUI();
        }

        showToast(`✅ User account updated: ${id}`, 'success');
        closeModal('editUserModal');
        renderUsers(type === 'student' ? 'students' : 'teachers');
    } catch (err) {
        console.error('Failed to update account:', err);
        showToast(`❌ Account update failed: ${err.message}`, 'error');
        alert(`Failed to update account:\n\n${err.message}`);
    }
}

async function deleteUser(userId, type) {
    if (!confirm(`⚠️ Are you sure you want to delete this ${type} (${userId})? This action cannot be undone.`)) return;

    try {
        if (type === 'student') {
            await FireData.deleteStudent(userId);
            _allStudents = _allStudents.filter(u => u.id !== userId);
        } else {
            await FireData.deleteTeacher(userId);
            _allTeachers = _allTeachers.filter(u => u.id !== userId);
        }
        showToast(`🗑️ User ${userId} deleted successfully`, 'success');
        renderUsers(type === 'student' ? 'students' : 'teachers');
    } catch (err) {
        console.error('Failed to delete user:', err);
        showToast(`❌ Deletion failed: ${err.message}`, 'error');
        alert(`Failed to delete user:\n\n${err.message}`);
    }
}

/* ── Add Video Modal ───────────────────────────────────────── */
function openAddVideoModal() {
    const sel = document.getElementById('videoCourse');
    if (sel) {
        sel.innerHTML = getMyCourses().map(c => `<option value="${c.id}">${c.icon} ${c.title}</option>`).join('');
        loadUnitsForVideo();
    }
    toggleVideoUnitMode('select');
    document.getElementById('addVideoModal').classList.add('open');
}

function toggleVideoUnitMode(mode) {
    const selectWrapper = document.getElementById('videoUnitSelectWrapper');
    const createWrapper = document.getElementById('videoUnitCreateWrapper');
    const radioSelect = document.querySelector('input[name="videoUnitMode"][value="select"]');
    const radioCreate = document.querySelector('input[name="videoUnitMode"][value="create"]');
    
    if (mode === 'select') {
        if (selectWrapper) selectWrapper.classList.remove('hidden');
        if (createWrapper) createWrapper.classList.add('hidden');
        if (radioSelect) radioSelect.checked = true;
    } else {
        if (selectWrapper) selectWrapper.classList.add('hidden');
        if (createWrapper) createWrapper.classList.remove('hidden');
        if (radioCreate) radioCreate.checked = true;
        const input = document.getElementById('videoNewUnitTitle');
        if (input) {
            input.value = '';
            input.focus();
        }
    }
}

async function createUnitInline() {
    const cid = document.getElementById('videoCourse')?.value;
    const title = document.getElementById('videoNewUnitTitle')?.value.trim();
    if (!title) { showToast('Please enter a unit title', 'error'); return; }

    const course = _allCourses.find(c => c.id === cid);
    if (!course) { showToast('Course not found', 'error'); return; }

    const newUnit = {
        id: `U-${Date.now()}`,
        title: title,
        order: course.units.length + 1,
        videos: []
    };

    const btn = document.getElementById('btnCreateUnitInline');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Creating...'; }

    try {
        course.units.push(newUnit);
        await FireData.updateCourseField(cid, { units: course.units });
        
        showToast(`✅ Unit "${title}" created successfully`, 'success');
        
        // Reload units dropdown and automatically select the new unit
        loadUnitsForVideo();
        const videoUnitSelect = document.getElementById('videoUnit');
        if (videoUnitSelect) videoUnitSelect.value = newUnit.id;
        
        // Switch view back to select mode
        toggleVideoUnitMode('select');
        
        // Refresh main course management UI if open in background
        renderCourses();
    } catch (err) {
        console.error('Failed to save inline unit:', err);
        showToast(`❌ Unit creation failed: ${err.message}`, 'error');
        alert(`Failed to save unit:\n\n${err.message}`);
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = 'Create & Select'; }
    }
}

function loadUnitsForVideo() {
    const cid = document.getElementById('videoCourse')?.value;
    const course = _allCourses.find(c => c.id === cid);
    if (course) {
        document.getElementById('videoUnit').innerHTML = course.units.map(u => `<option value="${u.id}">${u.title}</option>`).join('');
    }
}

function previewYT() {
    const url = document.getElementById('ytUrl')?.value || '';
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    if (match) {
        const vid = match[1];
        document.getElementById('ytPreviewFrame').src = `https://www.youtube.com/embed/${vid}`;
        document.getElementById('ytPreviewInfo').innerHTML = `<div class="text-sm font-semibold">YouTube ID: <code>${vid}</code></div>`;
        document.getElementById('ytPreview').classList.remove('hidden');
        if (!document.getElementById('vtTitle').value)
            document.getElementById('vtTitle').value = 'Video Lecture – ' + vid;
    }
}

async function saveVideo() {
    const cid = document.getElementById('videoCourse')?.value;
    const uid = document.getElementById('videoUnit')?.value;
    const url = document.getElementById('ytUrl')?.value || '';
    const title = document.getElementById('vtTitle')?.value || '';
    const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    if (!match) { showToast('Please enter a valid YouTube URL', 'error'); return; }
    const ytId = match[1];

    const course = _allCourses.find(c => c.id === cid);
    if (!course) { showToast('Course not found', 'error'); return; }

    const videoData = { id: `V${Date.now()}`, title, youtubeId: ytId, duration: '--:--', order: 0 };

    // Find unit to get correct order
    const unit = course.units.find(u => u.id === uid);
    if (unit) {
        videoData.order = unit.videos.length + 1;
    }

    try {
        // 🔥 Save to Firebase
        await FireData.addVideoToUnit(cid, uid, videoData);
        showToast(`✅ Video "${title}" added to ${unit?.title || 'unit'}`, 'success');
        closeModal('addVideoModal');
        renderCourses();
    } catch (err) {
        console.error('Failed to save video:', err);
        showToast(`❌ Video save failed: ${err.message}`, 'error');
        alert(`Failed to save video:\n\n${err.message}`);
    }
}

/* ── Add Unit Modal ────────────────────────────────────────── */
function openAddUnitModal() {
    const sel = document.getElementById('unitCourse');
    if (sel) {
        sel.innerHTML = getMyCourses().map(c => `<option value="${c.id}">${c.icon} ${c.title}</option>`).join('');
    }
    document.getElementById('newUnitTitle').value = '';
    document.getElementById('addUnitModal').classList.add('open');
}

async function saveUnit() {
    const cid = document.getElementById('unitCourse')?.value;
    const title = document.getElementById('newUnitTitle')?.value.trim();
    if (!title) { showToast('Please enter a unit title', 'error'); return; }

    const course = _allCourses.find(c => c.id === cid);
    if (!course) { showToast('Course not found', 'error'); return; }

    const newUnit = {
        id: `U-${Date.now()}`,
        title: title,
        order: course.units.length + 1,
        videos: []
    };

    // Show saving state
    const saveBtn = document.querySelector('#addUnitModal .btn-primary');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ Saving...'; }

    try {
        course.units.push(newUnit);
        await FireData.updateCourseField(cid, { units: course.units });
        showToast(`✅ Unit "${title}" created successfully`, 'success');
        closeModal('addUnitModal');
        renderCourses();
    } catch (err) {
        console.error('Failed to save unit:', err);
        showToast(`❌ Unit creation failed: ${err.message}`, 'error');
        alert(`Failed to save unit:\n\n${err.message}`);
    } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '💾 Save Unit'; }
    }
}

/* ── Create Test Modal ─────────────────────────────────────── */
function openCreateTestModal() {
    newQuestions = [];
    document.getElementById('questionsList').innerHTML = '';
    document.getElementById('qCount').textContent = '0 added';
    const sel = document.getElementById('tstCourse');
    if (sel) sel.innerHTML = getMyCourses().map(c => `<option value="${c.id}">${c.icon} ${c.title}</option>`).join('');
    document.getElementById('createTestModal').classList.add('open');
}

function addQuestion() {
    const idx = newQuestions.length;
    newQuestions.push({ text: '', type: 'mcq', options: ['', '', '', ''], correct: 'A', marks: 2 });
    document.getElementById('questionsList').innerHTML += `
    <div class="q-builder" id="qb_${idx}">
      <div class="q-builder-header">
        <span class="font-semibold text-sm">Question ${idx + 1}</span>
        <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="removeQuestion(${idx})">✕ Remove</button>
      </div>
      <div class="flex flex-col gap-3">
        <input type="text" class="form-input" placeholder="Question text" oninput="newQuestions[${idx}].text=this.value"/>
        ${['A', 'B', 'C', 'D'].map((l, i) => `<div class="input-group">
          <span class="input-icon" style="font-size:.8rem;font-weight:700;color:var(--primary)">${l}.</span>
          <input type="text" class="form-input" placeholder="Option ${l}" oninput="newQuestions[${idx}].options[${i}]=this.value"/>
        </div>`).join('')}
        <div class="grid-3">
          <div class="form-group">
            <label class="form-label">Correct Answer</label>
            <select class="form-select" onchange="newQuestions[${idx}].correct=this.value">
              <option>A</option><option>B</option><option>C</option><option>D</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Marks</label>
            <input type="number" class="form-input" value="2" min="1" oninput="newQuestions[${idx}].marks=+this.value"/>
          </div>
        </div>
      </div>
    </div>`;
    document.getElementById('qCount').textContent = `${newQuestions.length} added`;
}

function removeQuestion(idx) {
    newQuestions.splice(idx, 1);
    document.getElementById('questionsList').innerHTML = '';
    document.getElementById('qCount').textContent = `${newQuestions.length} added`;
    const tmp = [...newQuestions];
    newQuestions = [];
    tmp.forEach(() => addQuestion());
}

async function saveTest() {
    const title = document.getElementById('tstTitle')?.value;
    const cid = document.getElementById('tstCourse')?.value;
    if (!title || !cid) { showToast('Please fill in all fields', 'error'); return; }

    const testData = {
        id: `TST-${Date.now()}`,
        courseId: cid,
        title,
        teacherId: currentUser.id,
        duration: +document.getElementById('tstDuration').value || 30,
        totalMarks: +document.getElementById('tstTotal').value || 50,
        passingMarks: +document.getElementById('tstPass').value || 25,
        status: 'active',
        questions: newQuestions.length ? newQuestions : (_allTests[0]?.questions || [])
    };

    try {
        // 🔥 Save to Firebase
        await FireData.createTest(testData);
        // Update local cache
        _allTests.push(testData);

        showToast(`✅ Test "${title}" published successfully!`, 'success');
        closeModal('createTestModal');
        renderTests();
    } catch (err) {
        console.error('Failed to publish test:', err);
        showToast(`❌ Test publish failed: ${err.message}`, 'error');
        alert(`Failed to publish test:\n\n${err.message}`);
    }
}

/* ── Create User Modal ─────────────────────────────────────── */
function openCreateUserModal(type) {
    currentUserType = type;
    document.getElementById('createUserTitle').textContent = type === 'student' ? '➕ Add Student' : '➕ Add Teacher';
    document.getElementById('generatedId').style.display = 'none';
    document.getElementById('newUserName').value = '';
    document.getElementById('newUserEmail').value = '';
    document.getElementById('newUserPhone').value = '';
    document.getElementById('createUserModal').classList.add('open');
}

async function createUser() {
    const name = document.getElementById('newUserName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim();
    const dept = document.getElementById('newUserDept').value;
    if (!name || !email) { showToast('Please fill in all required fields', 'error'); return; }

    const year = new Date().getFullYear();
    const list = currentUserType === 'student' ? _allStudents : _allTeachers;
    const prefix = currentUserType === 'student' ? `STU-${year}` : `TCH-${dept.toUpperCase().slice(0, 4)}`;
    const newId = `${prefix}-${String(list.length + 1).padStart(4, '0')}`;
    const tempPwd = `${name.split(' ')[0]}@${year}`;
    const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    const colors = ['#2563EB', '#7C3AED', '#16A34A', '#D97706', '#DC2626', '#0891B2'];
    const avatarBg = colors[Math.floor(Math.random() * colors.length)];

    try {
        if (currentUserType === 'student') {
            const userData = { id: newId, password: tempPwd, name, dept, email, phone: document.getElementById('newUserPhone').value, avatar: initials, avatarBg, enrolledCourses: [] };
            // 🔥 Save to Firebase
            await FireData.createStudent(userData);
            _allStudents.push(userData);
        } else {
            const userData = { id: newId, password: tempPwd, name, dept, email, phone: document.getElementById('newUserPhone').value, avatar: initials, avatarBg, isAdmin: false, courses: [] };
            // 🔥 Save to Firebase
            await FireData.createTeacher(userData);
            _allTeachers.push(userData);
        }

        document.getElementById('genIdValue').textContent = newId;
        document.getElementById('genPwdValue').textContent = tempPwd;
        document.getElementById('generatedId').style.display = 'flex';
        showToast(`✅ ${currentUserType === 'student' ? 'Student' : 'Teacher'} account created: ${newId}`, 'success');
        renderUsers(currentUserType + 's');
    } catch (err) {
        console.error('Failed to create account:', err);
        showToast(`❌ Account creation failed: ${err.message}`, 'error');
        alert(`Failed to create account:\n\n${err.message}`);
    }
}

/* ── Add Course Modal ──────────────────────────────────────── */
let selectedCourseColor = '#2563EB';

function openAddCourseModal() {
    // Reset fields
    document.getElementById('newCourseTitle').value = '';
    document.getElementById('newCourseDesc').value = '';
    document.getElementById('newCourseIcon').value = '';
    document.getElementById('newCourseDept').value = '';
    selectedCourseColor = '#2563EB';

    // Reset colour picker selection
    document.querySelectorAll('#courseColorPicker .color-swatch').forEach(s => s.classList.remove('selected'));
    const firstSwatch = document.querySelector('#courseColorPicker .color-swatch[data-color="#2563EB"]');
    if (firstSwatch) firstSwatch.classList.add('selected');

    // Hide preview
    document.getElementById('newCoursePreview').classList.add('hidden');

    // Reset preview defaults
    document.getElementById('previewIcon').textContent = '📚';
    document.getElementById('previewIcon').style.background = '#2563EB22';
    document.getElementById('previewTitle').textContent = 'Course Title';
    document.getElementById('previewDesc').textContent = 'Description goes here';

    // Attach live-preview listeners (once per open is fine)
    document.getElementById('newCourseTitle').oninput = updateCoursePreview;
    document.getElementById('newCourseDesc').oninput  = updateCoursePreview;
    document.getElementById('newCourseIcon').oninput  = updateCoursePreview;

    document.getElementById('addCourseModal').classList.add('open');
}

function selectCourseColor(el, color) {
    selectedCourseColor = color;
    document.querySelectorAll('#courseColorPicker .color-swatch').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
    updateCoursePreview();
}

function updateCoursePreview() {
    const title = document.getElementById('newCourseTitle').value.trim();
    const desc  = document.getElementById('newCourseDesc').value.trim();
    const icon  = document.getElementById('newCourseIcon').value.trim() || '📚';
    const preview = document.getElementById('newCoursePreview');

    if (title || desc) {
        preview.classList.remove('hidden');
        document.getElementById('previewIcon').textContent = icon;
        document.getElementById('previewIcon').style.background = selectedCourseColor + '22';
        document.getElementById('previewTitle').textContent = title || 'Course Title';
        document.getElementById('previewDesc').textContent  = desc  || 'No description yet';
    } else {
        preview.classList.add('hidden');
    }
}

async function saveNewCourse() {
    const title = document.getElementById('newCourseTitle').value.trim();
    const dept  = document.getElementById('newCourseDept').value.trim();
    const desc  = document.getElementById('newCourseDesc').value.trim();
    const icon  = document.getElementById('newCourseIcon').value.trim() || '📚';

    if (!title) { showToast('Please enter a course title', 'error'); return; }
    if (!dept)  { showToast('Please enter a department',   'error'); return; }

    const deptCode = dept.slice(0, 3).toUpperCase();
    const newId    = `CRS-${deptCode}-${String(Date.now()).slice(-4)}`;

    const newCourse = {
        id:            newId,
        title,
        dept,
        teacherId:     currentUser.id,
        teacher:       currentUser.name,
        description:   desc || `${title} — added by ${currentUser.name}`,
        icon,
        color:         selectedCourseColor,
        totalStudents: 0,
        units:         [],
        materials:     []
    };

    try {
        // 🔥 Save to Firebase
        await FireData.saveCourse(newCourse);

        // Update teacher record in Firestore
        try {
            await db.collection('teachers').doc(currentUser.id).update({
                courses: firebase.firestore.FieldValue.arrayUnion(newId)
            });
        } catch (err) {
            console.warn('Could not update teacher courses:', err.message);
        }

        // Update local cache
        _allCourses.push(newCourse);
        if (!currentUser.courses) currentUser.courses = [];
        currentUser.courses.push(newId);

        showToast(`✅ Course "${title}" created successfully!`, 'success');
        closeModal('addCourseModal');
        renderCourses();
        renderDashboard();
    } catch (err) {
        console.error('Failed to create course:', err);
        showToast(`❌ Course creation failed: ${err.message}`, 'error');
        alert(`Failed to create course:\n\n${err.message}`);
    }
}

/* ── Modal Helpers ─────────────────────────────────────────── */
function closeModal(id) {
    document.getElementById(id)?.classList.remove('open');
}

document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
});

