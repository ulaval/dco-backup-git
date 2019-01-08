const simpleGit = require('simple-git/promise');

// See https://github.com/steveukx/git-js

async function cloneMirror(cloneUrl, dir, user, pwd) {
    const remote = insertCredentialsInCloneUrl(cloneUrl, user, pwd);
    const fakeRemote = insertCredentialsInCloneUrl(cloneUrl, user, 'xxx');

    console.info(`Running: git clone --mirror ${fakeRemote} ${dir}`);

    await simpleGit()
        .silent(true)
        .raw([
            'clone',
            '--mirror',
            remote,
            dir
        ]);
}

function insertCredentialsInCloneUrl(originalCloneUrl, user, pwd) {
    const regex = /(\w+:\/\/)(?:[\w:]+@)?(.*)/g;

    const matches = regex.exec(originalCloneUrl);

    if (!matches) {
        throw new Error(`The clone url ${originalCloneUrl} is not recognized`);
    }

    return matches[1] + user + ':' + pwd + '@' + matches[2];
}

module.exports = {
    cloneMirror: cloneMirror,
    insertCredentialsInCloneUrl
}
