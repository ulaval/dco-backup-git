const backupGit = require('./backup-git');

test('checkBackupDir', async () => {
    await expect(backupGit.checkBackupDir({})).rejects.toThrow();

    await expect(backupGit.checkBackupDir({ backupDir: '1234' })).rejects.toThrow(new Error(`The directory "1234" doesn't exists.`));
});
