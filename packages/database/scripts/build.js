#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const execute = (command) => {
  console.log(`> ${command}`);
  execSync(command, { stdio: 'inherit' });
};

const copyDir = (src, dest) => {
  console.log(`Copying ${src} → ${dest}`);
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
};

const copyFile = (src, dest) => {
  console.log(`Copying ${src} → ${dest}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
};

const setExecutable = (file) => {
  console.log(`Setting executable: ${file}`);
  fs.chmodSync(file, '755');
};

const main = () => {
  console.log('📦 Building database package...\n');

  console.log('1️⃣ Compiling TypeScript...');
  execute('tsc');

  console.log('\n2️⃣ Copying Prisma generated client...');
  copyDir('generated', 'dist/generated');

  console.log('\n3️⃣ Copying seed files...');
  copyDir('prisma/seeds', 'dist/prisma/seeds');

  console.log('\n4️⃣ Copying seed script...');
  copyFile('prisma/seed-db.sh', 'dist/prisma/seed-db.sh');

  console.log('\n5️⃣ Setting permissions...');
  setExecutable('dist/prisma/seed-db.sh');

  console.log('\n✅ Build completed successfully!\n');
};

try {
  main();
} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}
