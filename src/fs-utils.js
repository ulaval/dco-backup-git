const fs = require('fs');

async function fileExists(path) {
    return new Promise((resolve, reject) => {
        try {
            fs.stat(path, (error, stats) => {
                if (error) {
                    if (error.code == 'ENOENT') {
                        resolve(false);
                    } else {
                        reject(error);
                    }
                } else {
                    resolve(stats.isFile());
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};

async function dirExists(path) {
    return new Promise((resolve, reject) => {
        try {
            fs.stat(path, (error, stats) => {
                if (error) {
                    if (error.code == 'ENOENT') {
                        resolve(false);
                    } else {
                        reject(error);
                    }
                } else {
                    resolve(stats.isDirectory());
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};

async function readFile(path, opts = 'utf8') {
    return new Promise((res, rej) => {
        fs.readFile(path, opts, (err, data) => {
            if (err) {
                rej(err);
            } else {
                res(data);
            }
        })
    })
}

async function writeFile(path, data, opts = 'utf8') {
    return new Promise((res, rej) => {
        fs.writeFile(path, data, opts, (err) => {
            if (err) {
                rej(err);
            } else {
                res();
            }
        });
    });
}

async function readDir(path) {
    return new Promise((res, rej) => {
        fs.readdir(path, (err, items) => {
            if (err) {
                rej(err);
            } else {
                res(items);
            }
        });
    });
}

async function mkDir(path, options) {
    return new Promise((res, rej) => {
        fs.mkdir(path, options, err => {
            if (err) {
                if (err.code == 'EEXIST') {
                    res(false);
                } else {
                    rej(err);
                }
            } else {
                res(true);
            }
        })
    })
}

module.exports = {
    fileExists,
    readFile,
    writeFile,
    readDir,
    dirExists,
    mkDir
};
