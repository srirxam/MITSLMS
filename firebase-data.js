/* ============================================================
   MITS LMS — Firebase Data Service Layer
   All Firestore reads/writes go through this module.
   Falls back to MOCK_DATA when Firebase is unreachable.
   ============================================================ */

const FireData = (() => {

  // ─── Cache ──────────────────────────────────────────────────
  // After first fetch, data is cached so we don't re-fetch every render.
  // Call FireData.init() once at page load to pre-populate caches.
  let _students     = null;
  let _teachers     = null;
  let _courses      = null;
  let _tests        = null;
  let _submissions  = null;
  let _attendance   = {};   // keyed by studentId
  let _videoProgress = {};  // keyed by studentId
  let _initialized  = false;
  let _usingFirestore = false;

  // ─── Helpers ────────────────────────────────────────────────
  function snapToArray(snap) {
    const arr = [];
    snap.forEach(doc => arr.push(doc.data()));
    return arr;
  }

  // ─── Init (preload everything) ──────────────────────────────
  async function init() {
    if (_initialized) return;
    try {
      const [stuSnap, tchSnap, crsSnap, tstSnap, subSnap] = await Promise.all([
        db.collection('students').get(),
        db.collection('teachers').get(),
        db.collection('courses').get(),
        db.collection('tests').get(),
        db.collection('submissions').get(),
      ]);
      _students    = snapToArray(stuSnap);
      _teachers    = snapToArray(tchSnap);
      _courses     = snapToArray(crsSnap);
      _tests       = snapToArray(tstSnap);
      _submissions = snapToArray(subSnap);
      _initialized = true;
      _usingFirestore = true;
      console.log('🔥 FireData: All collections loaded from Firestore');

      // Update local storage backup with firestore data for offline fallback
      localStorage.setItem('mock_students', JSON.stringify(_students));
      localStorage.setItem('mock_teachers', JSON.stringify(_teachers));
      localStorage.setItem('mock_courses', JSON.stringify(_courses));
      localStorage.setItem('mock_tests', JSON.stringify(_tests));
      localStorage.setItem('mock_submissions', JSON.stringify(_submissions));
    } catch (err) {
      console.warn('⚠️ FireData.init failed, using MOCK_DATA/localStorage:', err.message);
      _students    = JSON.parse(localStorage.getItem('mock_students')) || MOCK_DATA.students;
      _teachers    = JSON.parse(localStorage.getItem('mock_teachers')) || MOCK_DATA.teachers;
      _courses     = JSON.parse(localStorage.getItem('mock_courses')) || MOCK_DATA.courses;
      _tests       = JSON.parse(localStorage.getItem('mock_tests')) || MOCK_DATA.tests;
      _submissions = JSON.parse(localStorage.getItem('mock_submissions')) || MOCK_DATA.submissions;
      
      // Ensure MOCK_DATA in memory matches localStorage
      MOCK_DATA.students = _students;
      MOCK_DATA.teachers = _teachers;
      MOCK_DATA.courses = _courses;
      MOCK_DATA.tests = _tests;
      MOCK_DATA.submissions = _submissions;

      _initialized = true;
      _usingFirestore = false;
    }
  }

  // ─── Students ───────────────────────────────────────────────
  async function getStudents() {
    if (_students) return _students;
    try {
      const snap = await db.collection('students').get();
      _students = snapToArray(snap);
      return _students;
    } catch (err) {
      console.warn('FireData.getStudents fallback:', err.message);
      return MOCK_DATA.students;
    }
  }

  async function createStudent(data) {
    if (_usingFirestore) {
      try {
        await db.collection('students').doc(data.id).set(data);
        console.log('🔥 Student saved to Firestore:', data.id);
      } catch (err) {
        console.error('FireData.createStudent failed:', err);
        throw err;
      }
    }
    // Update local cache + mock on success
    const mockIdx = MOCK_DATA.students.findIndex(s => s.id === data.id);
    if (mockIdx >= 0) MOCK_DATA.students[mockIdx] = data;
    else MOCK_DATA.students.push(data);

    if (_students) {
      const idx = _students.findIndex(s => s.id === data.id);
      if (idx >= 0) _students[idx] = data;
      else _students.push(data);
    }

    localStorage.setItem('mock_students', JSON.stringify(_students || MOCK_DATA.students));
  }

  // ─── Teachers ───────────────────────────────────────────────
  async function getTeachers() {
    if (_teachers) return _teachers;
    try {
      const snap = await db.collection('teachers').get();
      _teachers = snapToArray(snap);
      return _teachers;
    } catch (err) {
      console.warn('FireData.getTeachers fallback:', err.message);
      return MOCK_DATA.teachers;
    }
  }

  async function createTeacher(data) {
    if (_usingFirestore) {
      try {
        await db.collection('teachers').doc(data.id).set(data);
        console.log('🔥 Teacher saved to Firestore:', data.id);
      } catch (err) {
        console.error('FireData.createTeacher failed:', err);
        throw err;
      }
    }
    const mockIdx = MOCK_DATA.teachers.findIndex(t => t.id === data.id);
    if (mockIdx >= 0) MOCK_DATA.teachers[mockIdx] = data;
    else MOCK_DATA.teachers.push(data);

    if (_teachers) {
      const idx = _teachers.findIndex(t => t.id === data.id);
      if (idx >= 0) _teachers[idx] = data;
      else _teachers.push(data);
    }

    localStorage.setItem('mock_teachers', JSON.stringify(_teachers || MOCK_DATA.teachers));
  }

  // ─── Courses ────────────────────────────────────────────────
  async function getCourses() {
    if (_courses) return _courses;
    try {
      const snap = await db.collection('courses').get();
      _courses = snapToArray(snap);
      return _courses;
    } catch (err) {
      console.warn('FireData.getCourses fallback:', err.message);
      return MOCK_DATA.courses;
    }
  }

  async function saveCourse(data) {
    if (_usingFirestore) {
      try {
        await db.collection('courses').doc(data.id).set(data);
        console.log('🔥 Course saved to Firestore:', data.id);
      } catch (err) {
        console.error('FireData.saveCourse failed:', err);
        throw err;
      }
    }
    // Update local cache
    if (_courses) {
      const idx = _courses.findIndex(c => c.id === data.id);
      if (idx >= 0) _courses[idx] = data;
      else _courses.push(data);
    }
    // Update mock
    const mockIdx = MOCK_DATA.courses.findIndex(c => c.id === data.id);
    if (mockIdx >= 0) MOCK_DATA.courses[mockIdx] = data;
    else MOCK_DATA.courses.push(data);

    localStorage.setItem('mock_courses', JSON.stringify(_courses || MOCK_DATA.courses));
  }

  async function updateCourseField(courseId, fieldData) {
    if (_usingFirestore) {
      try {
        await db.collection('courses').doc(courseId).update(fieldData);
        console.log('🔥 Course updated in Firestore:', courseId);
      } catch (err) {
        console.warn('FireData.updateCourseField fallback:', err.message);
      }
    }
    // Update local cache + mock + localStorage
    const course = (_courses || MOCK_DATA.courses).find(c => c.id === courseId);
    if (course) {
      Object.assign(course, fieldData);
      localStorage.setItem('mock_courses', JSON.stringify(_courses || MOCK_DATA.courses));
    }
  }

  // ─── Tests ──────────────────────────────────────────────────
  async function getTests() {
    if (_tests) return _tests;
    try {
      const snap = await db.collection('tests').get();
      _tests = snapToArray(snap);
      return _tests;
    } catch (err) {
      console.warn('FireData.getTests fallback:', err.message);
      return MOCK_DATA.tests;
    }
  }

  async function createTest(data) {
    if (_usingFirestore) {
      try {
        await db.collection('tests').doc(data.id).set(data);
        console.log('🔥 Test saved to Firestore:', data.id);
      } catch (err) {
        console.error('FireData.createTest failed:', err);
        throw err;
      }
    }
    MOCK_DATA.tests.push(data);
    if (_tests) _tests.push(data);

    localStorage.setItem('mock_tests', JSON.stringify(_tests || MOCK_DATA.tests));
  }

  // ─── Submissions ────────────────────────────────────────────
  async function getSubmissions() {
    if (_submissions) return _submissions;
    try {
      const snap = await db.collection('submissions').get();
      _submissions = snapToArray(snap);
      return _submissions;
    } catch (err) {
      console.warn('FireData.getSubmissions fallback:', err.message);
      return MOCK_DATA.submissions;
    }
  }

  async function saveSubmission(data) {
    if (_usingFirestore) {
      try {
        await db.collection('submissions').doc(data.id).set(data);
        console.log('🔥 Submission saved to Firestore:', data.id);
      } catch (err) {
        console.error('FireData.saveSubmission failed:', err);
        throw err;
      }
    }
    MOCK_DATA.submissions.push(data);
    if (_submissions) _submissions.push(data);

    localStorage.setItem('mock_submissions', JSON.stringify(_submissions || MOCK_DATA.submissions));
  }

  // ─── Attendance ─────────────────────────────────────────────
  async function getAttendance(studentId) {
    if (_attendance[studentId]) return _attendance[studentId];
    try {
      const doc = await db.collection('attendance').doc(studentId).get();
      if (doc.exists) {
        _attendance[studentId] = doc.data();
        return _attendance[studentId];
      }
    } catch (err) {
      console.warn('FireData.getAttendance fallback:', err.message);
    }
    const localAtt = JSON.parse(localStorage.getItem('mock_attendance')) || {};
    return localAtt[studentId] || MOCK_DATA.attendance[studentId] || {};
  }

  async function getAllAttendance() {
    try {
      const snap = await db.collection('attendance').get();
      const result = {};
      snap.forEach(doc => { result[doc.id] = doc.data(); });
      Object.assign(_attendance, result);
      return result;
    } catch (err) {
      console.warn('FireData.getAllAttendance fallback:', err.message);
      return JSON.parse(localStorage.getItem('mock_attendance')) || MOCK_DATA.attendance;
    }
  }

  async function saveAttendance(studentId, courseId, data) {
    if (_usingFirestore) {
      // data = { total, present, records }
      const payload = { [courseId]: data };
      try {
        await db.collection('attendance').doc(studentId).set(payload, { merge: true });
        console.log('🔥 Attendance saved for', studentId);
      } catch (err) {
        console.error('FireData.saveAttendance failed:', err);
        throw err;
      }
    }
    // Update local cache
    if (!_attendance[studentId]) _attendance[studentId] = {};
    _attendance[studentId][courseId] = data;
    // Update mock
    if (!MOCK_DATA.attendance[studentId]) MOCK_DATA.attendance[studentId] = {};
    MOCK_DATA.attendance[studentId][courseId] = data;

    localStorage.setItem('mock_attendance', JSON.stringify(_attendance || MOCK_DATA.attendance));
  }

  // ─── Video Progress ─────────────────────────────────────────
  async function getVideoProgress(studentId) {
    if (_videoProgress[studentId]) return _videoProgress[studentId];
    try {
      const doc = await db.collection('videoProgress').doc(studentId).get();
      if (doc.exists) {
        _videoProgress[studentId] = doc.data();
        return _videoProgress[studentId];
      }
    } catch (err) {
      console.warn('FireData.getVideoProgress fallback:', err.message);
    }
    // Fallback: merge localStorage + mock
    const mockVP = MOCK_DATA.videoProgress[studentId] || {};
    const localVP = JSON.parse(localStorage.getItem(`vp_${studentId}`) || '{}');
    const merged = { ...mockVP, ...localVP };
    _videoProgress[studentId] = merged;
    return merged;
  }

  async function getAllVideoProgress() {
    try {
      const snap = await db.collection('videoProgress').get();
      const result = {};
      snap.forEach(doc => { result[doc.id] = doc.data(); });
      Object.assign(_videoProgress, result);
      return result;
    } catch (err) {
      console.warn('FireData.getAllVideoProgress fallback:', err.message);
      return MOCK_DATA.videoProgress;
    }
  }

  async function saveVideoProgress(studentId, data) {
    // Update cache immediately
    _videoProgress[studentId] = data;
    // Persist to localStorage as backup
    localStorage.setItem(`vp_${studentId}`, JSON.stringify(data));
    if (_usingFirestore) {
      // Write to Firestore
      try {
        await db.collection('videoProgress').doc(studentId).set(data);
      } catch (err) {
        console.error('FireData.saveVideoProgress failed:', err);
        throw err;
      }
    }
  }

  // ─── Materials (stored inside course docs) ──────────────────
  async function saveMaterial(courseId, material) {
    if (_usingFirestore) {
      try {
        await db.collection('courses').doc(courseId).update({
          materials: firebase.firestore.FieldValue.arrayUnion(material)
        });
        console.log('🔥 Material added to course:', courseId);
      } catch (err) {
        console.error('FireData.saveMaterial failed:', err);
        throw err;
      }
    }
    // Update local cache
    const course = (_courses || MOCK_DATA.courses).find(c => c.id === courseId);
    if (course) {
      if (!course.materials) course.materials = [];
      // Avoid duplicate push if already in memory
      if (!course.materials.some(m => m.id === material.id)) {
        course.materials.push(material);
      }
      localStorage.setItem('mock_courses', JSON.stringify(_courses || MOCK_DATA.courses));
    }
  }

  async function deleteMaterial(courseId, materialIndex) {
    const course = (_courses || MOCK_DATA.courses).find(c => c.id === courseId);
    if (course && course.materials) {
      course.materials.splice(materialIndex, 1);
      if (_usingFirestore) {
        try {
          await db.collection('courses').doc(courseId).update({
            materials: course.materials
          });
          console.log('🔥 Material deleted from course:', courseId);
        } catch (err) {
          console.error('FireData.deleteMaterial failed:', err);
          throw err;
        }
      }
      localStorage.setItem('mock_courses', JSON.stringify(_courses || MOCK_DATA.courses));
    }
  }

  // ─── Video management (add video to unit inside course) ─────
  async function addVideoToUnit(courseId, unitId, videoData) {
    const course = (_courses || MOCK_DATA.courses).find(c => c.id === courseId);
    if (!course) return;
    const unit = course.units.find(u => u.id === unitId);
    if (!unit) return;
    unit.videos.push(videoData);
    if (_usingFirestore) {
      try {
        await db.collection('courses').doc(courseId).update({
          units: course.units
        });
        console.log('🔥 Video added to course:', courseId, 'unit:', unitId);
      } catch (err) {
        console.error('FireData.addVideoToUnit failed:', err);
        throw err;
      }
    }
    localStorage.setItem('mock_courses', JSON.stringify(_courses || MOCK_DATA.courses));
  }

  // ─── Delete video from unit inside course ───────────────────
  async function deleteVideoFromUnit(courseId, unitId, videoId) {
    const course = (_courses || MOCK_DATA.courses).find(c => c.id === courseId);
    if (!course) return;
    const unit = course.units.find(u => u.id === unitId);
    if (!unit) return;
    unit.videos = unit.videos.filter(v => v.id !== videoId);
    if (_usingFirestore) {
      try {
        await db.collection('courses').doc(courseId).update({
          units: course.units
        });
        console.log('🔥 Video deleted from course:', courseId, 'unit:', unitId);
      } catch (err) {
        console.error('FireData.deleteVideoFromUnit failed:', err);
        throw err;
      }
    }
    localStorage.setItem('mock_courses', JSON.stringify(_courses || MOCK_DATA.courses));
  }

  // ─── Invalidate cache ──────────────────────────────────────
  function invalidate(collection) {
    switch (collection) {
      case 'students':    _students    = null; break;
      case 'teachers':    _teachers    = null; break;
      case 'courses':     _courses     = null; break;
      case 'tests':       _tests       = null; break;
      case 'submissions': _submissions = null; break;
      case 'all':
        _students = _teachers = _courses = _tests = _submissions = null;
        _attendance = {}; _videoProgress = {};
        _initialized = false;
        break;
    }
  }

  // ─── Delete Actions ─────────────────────────────────────────
  async function deleteStudent(id) {
    if (_usingFirestore) {
      try {
        await db.collection('students').doc(id).delete();
        console.log('🔥 Student deleted from Firestore:', id);
      } catch (err) {
        console.error('FireData.deleteStudent failed:', err);
        throw err;
      }
    }
    const mockIdx = MOCK_DATA.students.findIndex(s => s.id === id);
    if (mockIdx >= 0) MOCK_DATA.students.splice(mockIdx, 1);

    if (_students) {
      const idx = _students.findIndex(s => s.id === id);
      if (idx >= 0) _students.splice(idx, 1);
    }
    localStorage.setItem('mock_students', JSON.stringify(_students || MOCK_DATA.students));
  }

  async function deleteTeacher(id) {
    if (_usingFirestore) {
      try {
        await db.collection('teachers').doc(id).delete();
        console.log('🔥 Teacher deleted from Firestore:', id);
      } catch (err) {
        console.error('FireData.deleteTeacher failed:', err);
        throw err;
      }
    }
    const mockIdx = MOCK_DATA.teachers.findIndex(t => t.id === id);
    if (mockIdx >= 0) MOCK_DATA.teachers.splice(mockIdx, 1);

    if (_teachers) {
      const idx = _teachers.findIndex(t => t.id === id);
      if (idx >= 0) _teachers.splice(idx, 1);
    }
    localStorage.setItem('mock_teachers', JSON.stringify(_teachers || MOCK_DATA.teachers));
  }

  async function deleteCourse(id) {
    if (_usingFirestore) {
      try {
        await db.collection('courses').doc(id).delete();
        console.log('🔥 Course deleted from Firestore:', id);
      } catch (err) {
        console.error('FireData.deleteCourse failed:', err);
        throw err;
      }
    }
    const mockIdx = MOCK_DATA.courses.findIndex(c => c.id === id);
    if (mockIdx >= 0) MOCK_DATA.courses.splice(mockIdx, 1);

    if (_courses) {
      const idx = _courses.findIndex(c => c.id === id);
      if (idx >= 0) _courses.splice(idx, 1);
    }
    localStorage.setItem('mock_courses', JSON.stringify(_courses || MOCK_DATA.courses));
  }

  async function deleteTest(id) {
    if (_usingFirestore) {
      try {
        await db.collection('tests').doc(id).delete();
        console.log('🔥 Test deleted from Firestore:', id);
      } catch (err) {
        console.error('FireData.deleteTest failed:', err);
        throw err;
      }
    }
    const mockIdx = MOCK_DATA.tests.findIndex(t => t.id === id);
    if (mockIdx >= 0) MOCK_DATA.tests.splice(mockIdx, 1);

    if (_tests) {
      const idx = _tests.findIndex(t => t.id === id);
      if (idx >= 0) _tests.splice(idx, 1);
    }
    localStorage.setItem('mock_tests', JSON.stringify(_tests || MOCK_DATA.tests));
  }

  // ─── Public API ─────────────────────────────────────────────
  return {
    init,
    // Getters
    getStudents,
    getTeachers,
    getCourses,
    getTests,
    getSubmissions,
    getAttendance,
    getAllAttendance,
    getVideoProgress,
    getAllVideoProgress,
    // Writers
    createStudent,
    createTeacher,
    saveCourse,
    updateCourseField,
    createTest,
    saveSubmission,
    saveAttendance,
    saveVideoProgress,
    saveMaterial,
    deleteMaterial,
    addVideoToUnit,
    deleteVideoFromUnit,
    // Deletes
    deleteStudent,
    deleteTeacher,
    deleteCourse,
    deleteTest,
    // Utility
    invalidate,
  };

})();
