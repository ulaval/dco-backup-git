const path = require('path');

let backupGit = null;

beforeEach(() => {
    jest.clearAllMocks();

    jest.mock('./fs-utils', () => {
        return {
            dirExists: (path) => {
                return Promise.resolve(path === 'good' || path === 'backup');
            },
            readFile: () => {
                return Promise.resolve(`{
                    "backupDir": "backup"
                }`);
            },
            mkDir: (path) => {
                return Promise.resolve(true);
            }
        };
    });

    jest.mock('axios', () => {
        const bbCloneUrl = (name) => {
            return [
                {
                    href: `https://ulaval@bitbucket.org/ulaval/${name}.git`,
                    name: 'https'
                },
                {
                    href: `git@bitbucket.org:ulaval/${name}.git`,
                    name: 'ssh'
                }
            ]
        };

        const bitbucketResponse1 = {
            data: {
                values: [{
                    owner: {
                        username: 'ulaval'
                    },
                    name: 'test',
                    links: {
                        clone: bbCloneUrl('test')
                    }
                }],
                next: 'https://bitbucket.com/?page2'
            }
        };

        const bitbucketResponse2 = {
            data: {
                values: [{
                    owner: {
                        username: 'ulaval'
                    },
                    name: 'test2',
                    links: {
                        clone: bbCloneUrl('test2')
                    }
                }]
            }
        };

        const githubResponse = {
            data: [{
                name: 'modul-components',
                clone_url: 'https://github.com/ulaval/modul-components.git'
            }]
        };

        return {
            post: () => {
                return {
                    data: {
                        access_token: '123'
                    }
                };
            },
            get: (url) => {
                return url.indexOf('bitbucket') > 0 ? url.indexOf('page2') > 0 ? bitbucketResponse2 : bitbucketResponse1 : githubResponse;
            }
        }
    });

    jest.mock('./git-utils', () => {
        return {
            cloneMirror: jest.fn(() => Promise.resolve())
        }
    });

    backupGit = require('./backup-git');
});

test('loadAndCheckConfig', async () => {
    await expect(backupGit.loadAndCheckConfig([])).rejects.toThrow(new Error('The backupDir must be provided.'));
    await expect(backupGit.loadAndCheckConfig(['-backupDir=bad'])).rejects.toThrow(new Error(`The directory "bad" doesn't exists.`));
    await expect((await backupGit.loadAndCheckConfig(['-backupDir=good'])).backupDir).toBe('good');
    await expect((await backupGit.loadAndCheckConfig(['-conf=config.json'])).backupDir).toBe('backup');
    await expect(backupGit.loadAndCheckConfig(['-backupDir=good', '-bitbucket'])).rejects.toThrow(new Error('The bitbucketOwner, bitbucketClientId, bitbucketClientSecret parameters are mandatory to backup BitBucket.'));
    await expect(await backupGit.loadAndCheckConfig(['-backupDir=good', '-bitbucket', '-bitbucketOwner=a', '-bitbucketClientId=b', '-bitbucketClientSecret=c'])).toBeTruthy();
    await expect(backupGit.loadAndCheckConfig(['-backupDir=good', '-github'])).rejects.toThrow(new Error('The parameter githubOrg is mandatory to backup github.'));
    await expect(await backupGit.loadAndCheckConfig(['-backupDir=good', '-github', '-githubOrg=a'])).toBeTruthy();
});

test('main', async () => {

    await expect(backupGit.main([])).rejects.toThrow(new Error('The backupDir must be provided.'));
    await expect(backupGit.main(['-backupDir=backup']));
});

test('main -bitbucket', async () => {
    await backupGit.main(['-backupDir=backup', '-bitbucket', '-bitbucketOwner=a', '-bitbucketClientId=b', '-bitbucketClientSecret=c']);

    const gitUtils = require('./git-utils');

    expect(gitUtils.cloneMirror.mock.calls.length).toBe(2);
    expect(gitUtils.cloneMirror.mock.calls[0][0]).toBe('https://ulaval@bitbucket.org/ulaval/test.git');
    expect(gitUtils.cloneMirror.mock.calls[1][0]).toBe('https://ulaval@bitbucket.org/ulaval/test2.git');
    expect(path.normalize(gitUtils.cloneMirror.mock.calls[0][1])).toBe(path.normalize('backup/bitbucket/test.git'));
    expect(path.normalize(gitUtils.cloneMirror.mock.calls[1][1])).toBe(path.normalize('backup/bitbucket/test2.git'));
    expect(gitUtils.cloneMirror.mock.calls[0][2]).toBe('x-token-auth');
    expect(gitUtils.cloneMirror.mock.calls[0][3]).toBe('123');
});

test('main -github', async () => {
    await backupGit.main(['-backupDir=backup', '-github', '-githubOrg=ulaval']);

    const gitUtils = require('./git-utils');

    expect(gitUtils.cloneMirror.mock.calls.length).toBe(1);
    expect(gitUtils.cloneMirror.mock.calls[0][0]).toBe('https://github.com/ulaval/modul-components.git');
    expect(path.normalize(gitUtils.cloneMirror.mock.calls[0][1])).toBe(path.normalize('backup/github/modul-components.git'));
    expect(gitUtils.cloneMirror.mock.calls[0][2]).toBeUndefined();
    expect(gitUtils.cloneMirror.mock.calls[0][3]).toBeUndefined();
});
