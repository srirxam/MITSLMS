/* ============================================================
   MITS LMS — Mock Data (replaces Firebase for demo)
   ============================================================ */

const MOCK_DATA = {

  /* ── Students ────────────────────────────────────────────── */
  students: [
    { id: 'STU-2024-0042', password: 'Student@123', name: 'Divyasri K',   dept: 'tourism', email: 'divyasri@mits.edu',  phone: '9876543210', avatar: 'DK', avatarBg: '#2563EB', enrolledCourses: ['CRS-TOUR-001','CRS-LAW-001'] },
    { id: 'STU-2024-0043', password: 'Student@123', name: 'Arjun M',      dept: 'tourism', email: 'arjun@mits.edu',     phone: '9876543211', avatar: 'AM', avatarBg: '#7C3AED', enrolledCourses: ['CRS-TOUR-001'] },
    { id: 'STU-2024-0044', password: 'Student@123', name: 'Sneha R',      dept: 'law',     email: 'sneha@mits.edu',     phone: '9876543212', avatar: 'SR', avatarBg: '#16A34A', enrolledCourses: ['CRS-LAW-001','CRS-COM-001'] },
    { id: 'STU-2024-0045', password: 'Student@123', name: 'Karthik V',    dept: 'commerce',email: 'karthik@mits.edu',   phone: '9876543213', avatar: 'KV', avatarBg: '#D97706', enrolledCourses: ['CRS-COM-001'] },
    { id: 'STU-2024-0046', password: 'Student@123', name: 'Priya S',      dept: 'tourism', email: 'priya@mits.edu',     phone: '9876543214', avatar: 'PS', avatarBg: '#DC2626', enrolledCourses: ['CRS-TOUR-001','CRS-COM-001'] },
    { id: 'STU-2024-0047', password: 'Student@123', name: 'Rahul B',      dept: 'law',     email: 'rahul@mits.edu',     phone: '9876543215', avatar: 'RB', avatarBg: '#0891B2', enrolledCourses: ['CRS-LAW-001'] },
    { id: 'STU-2024-0048', password: 'Student@123', name: 'Meena L',      dept: 'commerce',email: 'meena@mits.edu',     phone: '9876543216', avatar: 'ML', avatarBg: '#9333EA', enrolledCourses: ['CRS-COM-001','CRS-TOUR-001'] },
  ],

  /* ── Teachers ────────────────────────────────────────────── */
  teachers: [
    { id: 'TCH-TOUR-0001', password: 'Teacher@123', name: 'Prof. Ramesh G',   dept: 'tourism', email: 'ramesh@mits.edu',  avatar: 'RG', avatarBg: '#2563EB', isAdmin: false, courses: ['CRS-TOUR-001'] },
    { id: 'TCH-LAW-0001',  password: 'Teacher@123', name: 'Prof. Kavitha N',  dept: 'law',     email: 'kavitha@mits.edu', avatar: 'KN', avatarBg: '#7C3AED', isAdmin: false, courses: ['CRS-LAW-001'] },
    { id: 'TCH-COM-0001',  password: 'Teacher@123', name: 'Prof. Sundar P',   dept: 'commerce',email: 'sundar@mits.edu',  avatar: 'SP', avatarBg: '#16A34A', isAdmin: false, courses: ['CRS-COM-001'] },
    { id: 'TCH-ADMIN-0001',password: 'Admin@123',   name: 'Dr. Admin Kumar',  dept: 'admin',   email: 'admin@mits.edu',   avatar: 'AK', avatarBg: '#DC2626', isAdmin: true,  courses: [] },
  ],

  /* ── Courses ─────────────────────────────────────────────── */
  courses: [
    {
      id: 'CRS-TOUR-001',
      title: 'Tourism Management',
      dept: 'tourism',
      teacherId: 'TCH-TOUR-0001',
      teacher: 'Prof. Ramesh G',
      description: 'A comprehensive study of tourism principles, hospitality management, eco-tourism, and global travel industry operations.',
      icon: '🏖️',
      color: '#2563EB',
      totalStudents: 48,
      units: [
        {
          id: 'U01', title: 'Introduction to Tourism', order: 1,
          videos: [
            { id: 'V001', title: 'What is Tourism?', youtubeId: 'dQw4w9WgXcQ', duration: '12:34', order: 1 },
            { id: 'V002', title: 'History of Travel', youtubeId: 'dQw4w9WgXcQ', duration: '08:22', order: 2 },
            { id: 'V003', title: 'Types of Tourism', youtubeId: 'dQw4w9WgXcQ', duration: '10:15', order: 3 },
          ]
        },
        {
          id: 'U02', title: 'Tourism Economics', order: 2,
          videos: [
            { id: 'V004', title: 'Economic Impact of Tourism', youtubeId: 'dQw4w9WgXcQ', duration: '15:10', order: 1 },
            { id: 'V005', title: 'Tourism & GDP', youtubeId: 'dQw4w9WgXcQ', duration: '11:45', order: 2 },
            { id: 'V006', title: 'Sustainable Tourism Economy', youtubeId: 'dQw4w9WgXcQ', duration: '13:30', order: 3 },
          ]
        },
        {
          id: 'U03', title: 'Hospitality Management', order: 3,
          videos: [
            { id: 'V007', title: 'Hotel Operations', youtubeId: 'dQw4w9WgXcQ', duration: '18:00', order: 1 },
            { id: 'V008', title: 'Food & Beverage Service', youtubeId: 'dQw4w9WgXcQ', duration: '14:22', order: 2 },
          ]
        },
      ],
      materials: [
        { id: 'MAT-001', title: 'Tourism Principles Notes', type: 'pdf', size: '2.4 MB', date: '2024-05-01' },
        { id: 'MAT-002', title: 'Eco-Tourism Guidelines', type: 'pdf', size: '1.8 MB', date: '2024-05-05' }
      ]
    },
    {
      id: 'CRS-LAW-001',
      title: 'Legal Studies & Law',
      dept: 'law',
      teacherId: 'TCH-LAW-0001',
      teacher: 'Prof. Kavitha N',
      description: 'An in-depth exploration of constitutional law, civil law, criminal justice, and the Indian legal system.',
      icon: '⚖️',
      color: '#7C3AED',
      totalStudents: 32,
      units: [
        {
          id: 'U04', title: 'Constitutional Law', order: 1,
          videos: [
            { id: 'V009', title: 'Constitution of India – Overview', youtubeId: 'dQw4w9WgXcQ', duration: '20:11', order: 1 },
            { id: 'V010', title: 'Fundamental Rights', youtubeId: 'dQw4w9WgXcQ', duration: '17:35', order: 2 },
            { id: 'V011', title: 'Directive Principles', youtubeId: 'dQw4w9WgXcQ', duration: '12:00', order: 3 },
          ]
        },
        {
          id: 'U05', title: 'Criminal Law', order: 2,
          videos: [
            { id: 'V012', title: 'IPC Basics', youtubeId: 'dQw4w9WgXcQ', duration: '22:44', order: 1 },
            { id: 'V013', title: 'Offences Against Property', youtubeId: 'dQw4w9WgXcQ', duration: '16:18', order: 2 },
          ]
        },
      ],
      materials: [
        { id: 'MAT-003', title: 'Constitution Summary', type: 'pdf', size: '3.1 MB', date: '2024-05-02' }
      ]
    },
    {
      id: 'CRS-COM-001',
      title: 'Business & Commerce',
      dept: 'commerce',
      teacherId: 'TCH-COM-0001',
      teacher: 'Prof. Sundar P',
      description: 'Covers business fundamentals, accounting principles, entrepreneurship, and Indian commercial law.',
      icon: '💼',
      color: '#16A34A',
      totalStudents: 60,
      units: [
        {
          id: 'U06', title: 'Accounting Fundamentals', order: 1,
          videos: [
            { id: 'V014', title: 'Basics of Bookkeeping', youtubeId: 'dQw4w9WgXcQ', duration: '14:10', order: 1 },
            { id: 'V015', title: 'Trial Balance & Ledger', youtubeId: 'dQw4w9WgXcQ', duration: '19:25', order: 2 },
          ]
        },
        {
          id: 'U07', title: 'Business Law', order: 2,
          videos: [
            { id: 'V016', title: 'Contract Law Essentials', youtubeId: 'dQw4w9WgXcQ', duration: '16:55', order: 1 },
            { id: 'V017', title: 'Partnership & Company Law', youtubeId: 'dQw4w9WgXcQ', duration: '21:10', order: 2 },
          ]
        },
      ],
      materials: [
        { id: 'MAT-004', title: 'Accounting Standards', type: 'pdf', size: '1.5 MB', date: '2024-05-03' }
      ]
    }
  ],

  /* ── Tests ────────────────────────────────────────────── */
  tests: [
    {
      id: 'TST-TOUR-001',
      courseId: 'CRS-TOUR-001',
      title: 'Mid-Term Test 1 – Tourism Basics',
      teacherId: 'TCH-TOUR-0001',
      duration: 30,
      totalMarks: 50,
      passingMarks: 25,
      status: 'active',
      questions: [
        { id:'Q1', text:'What does WTO stand for in tourism context?', type:'mcq', options:['World Tourism Organization','World Trade Organization','World Travel Office','World Tourism Office'], correct:'A', marks:2 },
        { id:'Q2', text:'Ecotourism focuses on:', type:'mcq', options:['Beach holidays','Nature conservation & education','Casino tourism','Business travel'], correct:'B', marks:2 },
        { id:'Q3', text:'The Ministry of Tourism in India was established in:', type:'mcq', options:['1947','1967','1958','1975'], correct:'C', marks:2 },
        { id:'Q4', text:'UNESCO stands for:', type:'mcq', options:['United Nations Educational Scientific Cultural Organization','United Nations Economic Social Cultural Organization','United Nations Environmental Social Cultural Organization','None of the above'], correct:'A', marks:2 },
        { id:'Q5', text:'Which agency regulates aviation in India?', type:'mcq', options:['AAI','DGCA','IATA','MoCA'], correct:'B', marks:2 },
        { id:'Q6', text:'Sustainable tourism aims to protect the environment.', type:'true_false', options:['True','False'], correct:'True', marks:1 },
        { id:'Q7', text:'India\'s "Incredible India" campaign was launched in which year?', type:'mcq', options:['2000','2002','2005','2010'], correct:'B', marks:2 },
        { id:'Q8', text:'The Golden Triangle tourist circuit covers:', type:'mcq', options:['Delhi-Agra-Jaipur','Delhi-Mumbai-Goa','Jaipur-Udaipur-Jodhpur','Delhi-Agra-Varanasi'], correct:'A', marks:2 },
        { id:'Q9', text:'Tourism that involves travelling to historical sites is called:', type:'mcq', options:['Medical Tourism','Heritage Tourism','Dark Tourism','Adventure Tourism'], correct:'B', marks:2 },
        { id:'Q10', text:'The term "MICE" in tourism refers to:', type:'mcq', options:['Meetings Incentives Conferences Exhibitions','Marine Island Culture Events','Medical International Care Events','None'], correct:'A', marks:2 },
      ]
    },
    {
      id: 'TST-LAW-001',
      courseId: 'CRS-LAW-001',
      title: 'Constitutional Law Quiz',
      teacherId: 'TCH-LAW-0001',
      duration: 20,
      totalMarks: 20,
      passingMarks: 10,
      status: 'upcoming',
      questions: [
        { id:'Q1', text:'India\'s Constitution came into effect on:', type:'mcq', options:['15 Aug 1947','26 Jan 1950','26 Nov 1949','1 Jan 1950'], correct:'B', marks:2 },
        { id:'Q2', text:'Right to Education is under Article:', type:'mcq', options:['Article 19','Article 21A','Article 32','Article 14'], correct:'B', marks:2 },
        { id:'Q3', text:'The Indian Constitution is the longest written constitution in the world.', type:'true_false', options:['True','False'], correct:'True', marks:2 },
        { id:'Q4', text:'Who is known as the Father of the Indian Constitution?', type:'mcq', options:['Jawaharlal Nehru','Sardar Patel','Dr. B.R. Ambedkar','Mahatma Gandhi'], correct:'C', marks:2 },
        { id:'Q5', text:'Freedom of speech is guaranteed under:', type:'mcq', options:['Article 14','Article 19','Article 21','Article 32'], correct:'B', marks:2 },
      ]
    },
    {
      id: 'TST-COM-001',
      courseId: 'CRS-COM-001',
      title: 'Accounting Basics Test',
      teacherId: 'TCH-COM-0001',
      duration: 25,
      totalMarks: 40,
      passingMarks: 20,
      status: 'completed',
      questions: []
    }
  ],

  /* ── Attendance ───────────────────────────────────────── */
  attendance: {
    'STU-2024-0042': {
      'CRS-TOUR-001': {
        total: 30, present: 26,
        records: {
          '2024-05-01':'present','2024-05-02':'present','2024-05-03':'absent',
          '2024-05-06':'present','2024-05-07':'present','2024-05-08':'present',
          '2024-05-09':'absent','2024-05-10':'present','2024-05-13':'present',
          '2024-05-14':'present','2024-05-15':'present','2024-05-16':'present',
          '2024-05-17':'absent','2024-05-20':'present','2024-05-21':'present',
          '2024-05-22':'present','2024-05-23':'present','2024-05-24':'present',
          '2024-05-27':'present','2024-05-28':'absent','2024-05-29':'present',
          '2024-05-30':'present',
        }
      },
      'CRS-LAW-001': { total: 20, present: 15, records: {} }
    }
  },

  /* ── Video Progress ────────────────────────────────────── */
  videoProgress: {
    'STU-2024-0042': {
      'V001': { watched: 754,  total: 754,  pct: 100, completed: true },
      'V002': { watched: 502,  total: 502,  pct: 100, completed: true },
      'V003': { watched: 615,  total: 615,  pct: 100, completed: true },
      'V004': { watched: 340,  total: 910,  pct: 37,  completed: false },
      'V005': { watched: 0,    total: 705,  pct: 0,   completed: false },
      'V006': { watched: 0,    total: 810,  pct: 0,   completed: false },
      'V007': { watched: 0,    total: 1080, pct: 0,   completed: false },
      'V008': { watched: 0,    total: 862,  pct: 0,   completed: false },
      'V009': { watched: 0,    total: 1211, pct: 0,   completed: false },
      'V010': { watched: 0,    total: 1055, pct: 0,   completed: false },
    },
    'STU-2024-0043': {
      'V001': { watched: 754, total: 754, pct: 100, completed: true },
      'V002': { watched: 502, total: 502, pct: 100, completed: true },
      'V003': { watched: 615, total: 615, pct: 100, completed: true },
      'V004': { watched: 910, total: 910, pct: 100, completed: true },
      'V005': { watched: 705, total: 705, pct: 100, completed: true },
      'V006': { watched: 650, total: 810, pct: 80,  completed: true },
    },
    'STU-2024-0044': {
      'V001': { watched: 450, total: 754, pct: 60, completed: false },
      'V002': { watched: 100, total: 502, pct: 20, completed: false },
    }
  },

  /* ── Test Submissions ──────────────────────────────────── */
  submissions: [
    { id: 'SUB-001', testId: 'TST-TOUR-001', studentId: 'STU-2024-0042', score: 38, total: 50, pct: 76, time: 24 },
    { id: 'SUB-002', testId: 'TST-COM-001',  studentId: 'STU-2024-0042', score: 32, total: 40, pct: 80, time: 21 },
    { id: 'SUB-003', testId: 'TST-TOUR-001', studentId: 'STU-2024-0043', score: 45, total: 50, pct: 90, time: 18 },
    { id: 'SUB-004', testId: 'TST-TOUR-001', studentId: 'STU-2024-0044', score: 22, total: 50, pct: 44, time: 30 },
  ]
};
