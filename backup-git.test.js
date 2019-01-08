const backupGit = require('./backup-git');

test('insertCredentialsInCloneUrl', () => {
    expect(backupGit.insertCredentialsInCloneUrl('https://ulaval@bitbucket.org/ulaval/pul-services-test.git', 'myuser', 'mypwd'))
        .toBe('https://myuser:mypwd@bitbucket.org/ulaval/pul-services-test.git');

    expect(backupGit.insertCredentialsInCloneUrl('https://ulaval:1234@bitbucket.org/ulaval/pul-services-test.git', 'myuser', 'mypwd'))
        .toBe('https://myuser:mypwd@bitbucket.org/ulaval/pul-services-test.git');

    expect(backupGit.insertCredentialsInCloneUrl('https://bitbucket.org/ulaval/pul-services-test.git', 'myuser', 'mypwd'))
        .toBe('https://myuser:mypwd@bitbucket.org/ulaval/pul-services-test.git');
});
