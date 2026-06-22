/* ============================================================
   MITS LMS — Firebase Seed Script
   Run this ONCE to upload all mock data to Firestore.
   After seeding, remove the <script> tag that loads this file.
   ============================================================ */

async function seedFirebase() {
  const btn = document.getElementById('seedBtn');
  const log = document.getElementById('seedLog');

  function logMsg(msg) {
    console.log(msg);
    if (log) log.innerHTML += `<div>${msg}</div>`;
  }

  if (btn) btn.disabled = true;
  logMsg('🔥 Starting Firebase seed...');

  try {
    const batch = db.batch();

    // ── Students ────────────────────────────────────────────
    logMsg('📤 Uploading students...');
    for (const s of MOCK_DATA.students) {
      batch.set(db.collection('students').doc(s.id), s);
    }

    // ── Teachers ────────────────────────────────────────────
    logMsg('📤 Uploading teachers...');
    for (const t of MOCK_DATA.teachers) {
      batch.set(db.collection('teachers').doc(t.id), t);
    }

    // ── Courses ─────────────────────────────────────────────
    logMsg('📤 Uploading courses...');
    for (const c of MOCK_DATA.courses) {
      batch.set(db.collection('courses').doc(c.id), c);
    }

    // ── Tests ───────────────────────────────────────────────
    logMsg('📤 Uploading tests...');
    for (const t of MOCK_DATA.tests) {
      batch.set(db.collection('tests').doc(t.id), t);
    }

    // ── Attendance ──────────────────────────────────────────
    logMsg('📤 Uploading attendance...');
    for (const [studentId, courseMap] of Object.entries(MOCK_DATA.attendance)) {
      batch.set(db.collection('attendance').doc(studentId), courseMap);
    }

    // ── Video Progress ──────────────────────────────────────
    logMsg('📤 Uploading video progress...');
    for (const [studentId, progress] of Object.entries(MOCK_DATA.videoProgress)) {
      batch.set(db.collection('videoProgress').doc(studentId), progress);
    }

    // ── Submissions ─────────────────────────────────────────
    logMsg('📤 Uploading submissions...');
    for (const sub of MOCK_DATA.submissions) {
      batch.set(db.collection('submissions').doc(sub.id), sub);
    }

    await batch.commit();
    logMsg('✅ All data uploaded to Firebase successfully!');
    alert('✅ Firebase seed complete! Check your Firestore Console.\n\nNow remove the seed script tag from your HTML.');
    if (btn) btn.textContent = '✅ Done!';

  } catch (err) {
    logMsg('❌ Error: ' + err.message);
    console.error(err);
    if (btn) { btn.disabled = false; btn.textContent = 'Retry Seed'; }
  }
}
