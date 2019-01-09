let backupGit = null;

beforeAll(() => {
    jest.mock('./fs-utils', () => {
        return {
            dirExists: (path) => {
                return Promise.resolve(path === 'good' || path === 'backup');
            },
            readFile: (path) => {
                return Promise.resolve(`{
                    "backupDir": "backup"
                }`);
            }
        };
    });
    backupGit = require('./backup-git');
});

test('checkBackupDir', async () => {
    await expect(backupGit.checkBackupDir({})).rejects.toThrow();

    await expect(backupGit.checkBackupDir({ backupDir: 'bad' })).rejects.toThrow(new Error(`The directory "bad" doesn't exists.`));
});

test('loadAndCheckConfig', async () => {
    await expect(backupGit.loadAndCheckConfig([])).rejects.toThrow();
    await expect((await backupGit.loadAndCheckConfig(['-backupDir=good'])).backupDir).toBe('good');
    await expect((await backupGit.loadAndCheckConfig(['-conf=config.json'])).backupDir).toBe('backup');
});
