// Quick script to set API key
const Store = require('electron-store');
const store = new Store();

store.set('apiKey', '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');
store.set('model', 'openai/gpt-oss-20b:free');

console.log('✅ API key and model configured!');
console.log('Model:', store.get('model'));
console.log('API key set:', store.get('apiKey') ? '✓' : '✗');
