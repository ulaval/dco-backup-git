var path = require('path');

module.exports = {
    mode: 'production',
    entry: './src/main.js',
    target: 'node',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'dco-backup-git.js'
    }
};
