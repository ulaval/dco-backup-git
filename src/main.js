const backupGit = require('./backup-git');
const logger = require('./logger');

backupGit.main(process.argv).catch(e => {
    logger.error('Backup failed.', e);
});
