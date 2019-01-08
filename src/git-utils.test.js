const gitUtils = require('./git-utils');

test('insertCredentialsInCloneUrl', () => {
    expect(gitUtils.insertCredentialsInCloneUrl('https://ulaval@bitbucket.org/ulaval/pul-services-test.git', 'myuser', 'mypwd'))
        .toBe('https://myuser:mypwd@bitbucket.org/ulaval/pul-services-test.git');

    expect(gitUtils.insertCredentialsInCloneUrl('https://ulaval:1234@bitbucket.org/ulaval/pul-services-test.git', 'myuser', 'mypwd'))
        .toBe('https://myuser:mypwd@bitbucket.org/ulaval/pul-services-test.git');

    expect(gitUtils.insertCredentialsInCloneUrl('https://bitbucket.org/ulaval/pul-services-test.git', 'myuser', 'mypwd'))
        .toBe('https://myuser:mypwd@bitbucket.org/ulaval/pul-services-test.git');
});
