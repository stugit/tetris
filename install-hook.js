const fs = require('fs');
const path = require('path');

// Try to find .git starting from current directory up to root
let currentPath = __dirname;
while (currentPath !== path.parse(currentPath).root && !fs.existsSync(path.join(currentPath, '.git'))) {
    currentPath = path.dirname(currentPath);
}
const gitDir = path.join(currentPath, '.git');
const hookPath = path.join(gitDir, 'hooks', 'pre-commit');

if (!fs.existsSync(gitDir)) {
    console.error('Error: .git directory not found. Make sure you are in the project root.');
    process.exit(1);
}

const hookScript = `#!/bin/sh
# Pre-commit hook to run linting
echo "Running pre-commit lint check..."
npm run lint
`;

try {
    fs.writeFileSync(hookPath, hookScript, { mode: 0o755 });
    console.log('Successfully installed pre-commit lint hook.');
} catch (err) {
    console.error('Failed to install hook:', err.message);
    process.exit(1);
}