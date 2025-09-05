#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const workerSrc = path.join(__dirname, '../../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const workerDest = path.join(__dirname, '../public/pdf.worker.min.js');

try {
  // Create public directory if it doesn't exist
  const publicDir = path.dirname(workerDest);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Copy the worker file
  fs.copyFileSync(workerSrc, workerDest);
  console.log('✅ PDF.js worker copied successfully');
  console.log(`   From: ${workerSrc}`);
  console.log(`   To: ${workerDest}`);
} catch (error) {
  console.error('❌ Failed to copy PDF.js worker:', error.message);
  process.exit(1);
}
