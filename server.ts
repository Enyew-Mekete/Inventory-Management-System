import { spawn, execSync } from 'child_process';
import path from 'path';

const PORT = 3000;

console.log("En-Tech S.C Setup - Supervisor starting up...");

// Step 1: Install Python dependencies
try {
  console.log("Installing python packages from requirements.txt...");
  // Use synchronous execution to wait for pip to complete so that Flask is 100% ready before starting server
  execSync('pip3 install -r requirements.txt', { stdio: 'inherit' });
  console.log("Python requirements installed successfully!");
} catch (err) {
  console.error("Warning: pip3 install completed with non-zero exit code or failed:", err);
}

// Step 2: Spawn Python Flask process binding to Port 3000
console.log(`Starting Python Flask application directly on port ${PORT}...`);
const pythonProcess = spawn('python3', ['app.py'], {
  env: { ...process.env, PORT: PORT.toString() },
  shell: true,
  stdio: 'inherit' // Automatically forwards stdout and stderr to the console logger
});

pythonProcess.on('close', (code) => {
  console.log(`Python Flask server closed with code ${code}`);
  process.exit(code || 0);
});

pythonProcess.on('error', (err) => {
  console.error("Critical: Failed to spawn python app.py process:", err);
  process.exit(1);
});
