#!/usr/bin/env node

/**
 * Security Audit Script for StellarSwap
 * 
 * Performs automated security checks:
 * 1. Secret detection (private keys, API keys)
 * 2. Localhost detection (hardcoded localhost references)
 * 3. HTTPS verification (ensures all API URLs use HTTPS)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SCAN_DIRECTORIES = ['src', 'contracts'];
const EXCLUDE_PATTERNS = ['node_modules', 'dist', '.git', 'coverage'];
const FILE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.rs'];

// Security patterns
const PATTERNS = {
  secrets: {
    privateKey: /S[A-Z0-9]{55}/g,
    apiKey: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
    password: /password\s*[:=]\s*['"][^'"]+['"]/gi,
  },
  localhost: {
    localhost: /localhost/gi,
    ip127: /127\.0\.0\.1/g,
    ip0: /0\.0\.0\.0/g,
  },
  http: {
    httpUrl: /['"]http:\/\/[^'"]+['"]/gi,
  }
};

// Results storage
const results = {
  secrets: [],
  localhost: [],
  http: [],
  filesScanned: 0,
  passed: true
};

/**
 * Check if path should be excluded from scanning
 */
function shouldExclude(filePath) {
  return EXCLUDE_PATTERNS.some(pattern => filePath.includes(pattern));
}

/**
 * Check if file has valid extension
 */
function hasValidExtension(filePath) {
  return FILE_EXTENSIONS.some(ext => filePath.endsWith(ext));
}

/**
 * Recursively get all files in directory
 */
function getAllFiles(dirPath, fileList = []) {
  if (!fs.existsSync(dirPath)) {
    return fileList;
  }

  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    
    if (shouldExclude(filePath)) {
      return;
    }

    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (hasValidExtension(filePath)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Scan file content for security issues
 */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  // Check for secrets
  Object.entries(PATTERNS.secrets).forEach(([type, pattern]) => {
    lines.forEach((line, index) => {
      // Skip comments
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
        return;
      }

      const matches = line.match(pattern);
      if (matches) {
        results.secrets.push({
          file: filePath,
          line: index + 1,
          type,
          match: matches[0],
          content: line.trim()
        });
        results.passed = false;
      }
    });
  });

  // Check for localhost references
  Object.entries(PATTERNS.localhost).forEach(([type, pattern]) => {
    lines.forEach((line, index) => {
      // Skip comments and common false positives
      if (line.trim().startsWith('//') || 
          line.trim().startsWith('*') ||
          line.includes('localhost:5173') || // Dev server
          line.includes('vite dev')) {
        return;
      }

      const matches = line.match(pattern);
      if (matches) {
        results.localhost.push({
          file: filePath,
          line: index + 1,
          type,
          match: matches[0],
          content: line.trim()
        });
        results.passed = false;
      }
    });
  });

  // Check for HTTP URLs (should be HTTPS)
  lines.forEach((line, index) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      return;
    }

    const matches = line.match(PATTERNS.http.httpUrl);
    if (matches) {
      results.http.push({
        file: filePath,
        line: index + 1,
        match: matches[0],
        content: line.trim()
      });
      results.passed = false;
    }
  });

  results.filesScanned++;
}

/**
 * Print results in a formatted way
 */
function printResults() {
  console.log('\n=================================');
  console.log('  Security Audit Results');
  console.log('=================================\n');

  console.log(`Files scanned: ${results.filesScanned}\n`);

  // Secret detection results
  console.log('--- Secret Detection ---');
  if (results.secrets.length === 0) {
    console.log('✓ PASS: No secrets detected\n');
  } else {
    console.log(`✗ FAIL: Found ${results.secrets.length} potential secret(s)\n`);
    results.secrets.forEach(issue => {
      console.log(`  File: ${issue.file}:${issue.line}`);
      console.log(`  Type: ${issue.type}`);
      console.log(`  Match: ${issue.match}`);
      console.log(`  Line: ${issue.content}`);
      console.log('');
    });
  }

  // Localhost detection results
  console.log('--- Localhost Detection ---');
  if (results.localhost.length === 0) {
    console.log('✓ PASS: No localhost references detected\n');
  } else {
    console.log(`✗ FAIL: Found ${results.localhost.length} localhost reference(s)\n`);
    results.localhost.forEach(issue => {
      console.log(`  File: ${issue.file}:${issue.line}`);
      console.log(`  Type: ${issue.type}`);
      console.log(`  Match: ${issue.match}`);
      console.log(`  Line: ${issue.content}`);
      console.log('');
    });
  }

  // HTTPS verification results
  console.log('--- HTTPS Verification ---');
  if (results.http.length === 0) {
    console.log('✓ PASS: All URLs use HTTPS\n');
  } else {
    console.log(`✗ FAIL: Found ${results.http.length} HTTP URL(s)\n`);
    results.http.forEach(issue => {
      console.log(`  File: ${issue.file}:${issue.line}`);
      console.log(`  Match: ${issue.match}`);
      console.log(`  Line: ${issue.content}`);
      console.log('');
    });
  }

  // Overall result
  console.log('=================================');
  if (results.passed) {
    console.log('✓ OVERALL: PASSED');
    console.log('=================================\n');
    process.exit(0);
  } else {
    console.log('✗ OVERALL: FAILED');
    console.log('=================================\n');
    console.log('Please fix the issues above before deploying to production.\n');
    process.exit(1);
  }
}

/**
 * Main execution
 */
function main() {
  console.log('Starting security audit...\n');

  // Get all files to scan
  let allFiles = [];
  SCAN_DIRECTORIES.forEach(dir => {
    const files = getAllFiles(dir);
    allFiles = allFiles.concat(files);
  });

  if (allFiles.length === 0) {
    console.log('No files found to scan.');
    process.exit(0);
  }

  // Scan each file
  allFiles.forEach(file => {
    scanFile(file);
  });

  // Print results
  printResults();
}

// Run the audit
main();
