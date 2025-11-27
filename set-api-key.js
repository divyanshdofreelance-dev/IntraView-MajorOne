// Quick script to set API key
// Usage: node set-api-key.js YOUR_API_KEY
const Store = require('electron-store');
const path = require('path');
const os = require('os');

const apiKey = process.argv[2];

if (!apiKey) {
  console.log('Usage: node set-api-key.js YOUR_OPENROUTER_API_KEY');
  console.log('');
  console.log('Get your API key from: https://openrouter.ai/keys');
  process.exit(1);
}

// The packaged app uses "intraview" as the name (from package.json)
// Settings are stored in: %APPDATA%/intraview/config.json
const store = new Store({
  name: 'config',
  cwd: path.join(os.homedir(), 'AppData', 'Roaming', 'intraview')
});

store.set('apiKey', apiKey);
store.set('model', 'openai/gpt-4o-mini');

console.log('');
console.log('✅ API key configured for IntraView!');
console.log('');
console.log('Model:', store.get('model'));
console.log('API key set:', store.get('apiKey') ? 'Yes ✓' : 'No ✗');
console.log('');
console.log('You can now run IntraView!');
