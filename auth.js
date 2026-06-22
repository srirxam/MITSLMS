/* ============================================================
   MITS LMS — Shared Auth & Toast Utilities
   🔥 Updated for Firebase integration
   ============================================================ */

function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'toastOut .3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function getUser() {
    try {
        return JSON.parse(sessionStorage.getItem('mits_user'));
    } catch { return null; }
}

function requireAuth(expectedRole) {
    const user = getUser();
    if (!user) { window.location.href = expectedRole === 'student' ? 'student-login.html' : 'teacher-login.html'; return null; }
    if (expectedRole === 'student' && user.role !== 'student') { window.location.href = 'student-login.html'; return null; }
    if (expectedRole === 'teacher' && !['teacher', 'admin'].includes(user.role)) { window.location.href = 'teacher-login.html'; return null; }
    return user;
}

function logout(role) {
    sessionStorage.removeItem('mits_user');
    // 🔥 Also sign out from Firebase Auth (future-proofing)
    try {
        if (typeof firebase !== 'undefined' && firebase.auth) {
            firebase.auth().signOut().catch(() => {});
        }
    } catch (e) { /* ignore */ }
    window.location.href = role === 'student' ? 'student-login.html' : 'teacher-login.html';
}
