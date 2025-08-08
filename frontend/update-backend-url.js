#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the backend URL from command line argument
const backendUrl = process.argv[2];

if (!backendUrl) {
  console.log('❌ Please provide your Render backend URL');
  console.log('Usage: node update-backend-url.js <your-backend-url>');
  console.log('Example: node update-backend-url.js my-app.onrender.com');
  process.exit(1);
}

// Remove protocol if provided
const cleanUrl = backendUrl.replace(/^https?:\/\//, '');

// Read the current config file
const configPath = path.join(__dirname, 'src', 'config.js');
const configContent = fs.readFileSync(configPath, 'utf8');

// Update the SERVER_IP
const updatedContent = configContent.replace(
  /SERVER_IP:\s*'[^']*'/,
  `SERVER_IP: '${cleanUrl}'`
);

// Write the updated content back
fs.writeFileSync(configPath, updatedContent);

console.log('✅ Backend URL updated successfully!');
console.log(`📍 New backend URL: ${cleanUrl}`);
console.log('🚀 Your frontend is now configured to use your Render backend'); 