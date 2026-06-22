const fs = require('fs');
const path = require('path');

const filesToCopy = [
  'index.html',
  'seed.html',
  'student-login.html',
  'student.html',
  'teacher-login.html',
  'teacher.html',
  'manifest.json',
  'sw.js'
];

const dirsToCopy = [
  'css',
  'js',
  'icons'
];

function copyFileSync(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`Copied: ${src} -> ${dest}`);
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${srcPath} -> ${destPath}`);
    }
  }
}

// Copy files
filesToCopy.forEach(file => {
  if (fs.existsSync(file)) {
    copyFileSync(file, path.join('www', file));
  }
});

// Copy directories
dirsToCopy.forEach(dir => {
  if (fs.existsSync(dir)) {
    copyDirSync(dir, path.join('www', dir));
  }
});

console.log('✅ All web assets copied to www/ successfully!');
