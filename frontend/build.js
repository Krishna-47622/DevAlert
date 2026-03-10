const { execSync } = require('child_process');
const fs = require('fs');

console.log('Starting build...');
try {
    // Try using npx vite build directly
    const output = execSync('npx vite build', { encoding: 'utf8', stdio: 'pipe' });
    console.log('Build Output:\n', output);
    fs.writeFileSync('build_log.txt', 'SUCCESS\n' + output);
} catch (error) {
    console.error('Build Error:', error.message);
    if (error.stdout) console.log('Stdout:\n', error.stdout);
    if (error.stderr) console.error('Stderr:\n', error.stderr);
    fs.writeFileSync('build_log.txt', 'ERROR\n' + error.message + '\n' + (error.stdout || '') + '\n' + (error.stderr || ''));
}
console.log('Done.');
