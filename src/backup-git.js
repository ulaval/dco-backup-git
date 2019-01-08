const path = require('path');
const axios = require('axios');
const logger = require('./logger');
const fsUtils = require('./fs-utils');
const gitUtils = require('./git-utils');


// See https://confluence.atlassian.com/bitbucket/oauth-on-bitbucket-cloud-238027431.html
const BITBUCKET_OAUTH_USER = 'x-token-auth';

main();

async function main() {

    const chrono = logger.startChrono();

    const config = await loadAndCheckConfig();

    config.bitbucketToken = await getBitbucketToken(config);
    const repositories = await fetchBitbucketRepositories(config);

    await backupBitbucketRepositories(config, repositories);

    logger.success(`Backup succeeded in ${logger.stopChrono(chrono)}.`);
}

async function loadAndCheckConfig() {
    logger.info('Loading configuration...');

    const config = JSON.parse(await fsUtils.readFile('config.json'));
    config.partial = process.argv.findIndex(value => value == 'partial') >= 0 ? true : config.partial;

    await checkBackupDir(config);

    return config;
}

async function checkBackupDir(config) {
    if (!config.backupDir) {
        throw new Error('The backupDir must be provided.');
    }

    if (!await fsUtils.dirExists(config.backupDir)) {
        throw new Error(`The directory "${config.backupDir}" doesn't exists.`);
    }
}

async function backupBitbucketRepositories(config, repositories) {
    logger.info(`Starting backup of ${repositories.length} repositories from BitBucket...`);

    for (const repository of repositories) {
        await backupBitbucketRepository(config, repository);
    };
}

async function backupBitbucketRepository(config, repository) {
    const repoBackupDir = path.join(config.backupDir, repository.name + '.git');

    if (await fsUtils.dirExists(repoBackupDir)) {
        await gitUtils.remoteUpdate(repository.cloneUrl, repoBackupDir, BITBUCKET_OAUTH_USER, config.bitbucketToken);
    } else {
        await gitUtils.cloneMirror(repository.cloneUrl, repoBackupDir, BITBUCKET_OAUTH_USER, config.bitbucketToken);
    }
}

async function fetchBitbucketRepositories(config, nextUrl = '') {
    if (!nextUrl) {
        logger.info(`Fetching bitbucket repositories for ${config.bitbucketOwner}...`);
    } else {
        logger.info(`Fetching ${nextUrl}...`);
    }

    const url = nextUrl || `https://api.bitbucket.org/2.0/repositories/${config.bitbucketOwner}/`;

    const response = await axios.get(url, {
        headers: {
            'Authorization': `Bearer ${config.bitbucketToken}`
        },
    });

    let repositories = response.data.values
        .map(repo => {
            return {
                owner: repo.owner.username,
                project: repo.project.key,
                name: repo.name,
                cloneUrl: cloneUrl(repo.links.clone)
            }
        });

    if (response.data.next && !config.partial) {
        repositories = repositories.concat(await fetchBitbucketRepositories(config, response.data.next));
    }

    return repositories;
}

/*
For example:
"clone": [
          {
            "href": "https://ulaval@bitbucket.org/ulaval/pul-services-test.git",
            "name": "https"
          },
          {
            "href": "git@bitbucket.org:ulaval/pul-services-test.git",
            "name": "ssh"
          }
        ],
*/
function cloneUrl(cloneLinks) {

    const res = cloneLinks.find(cloneLink => cloneLink.name == 'https');

    if (!res) {
        throw new Error(`Https clone not found: ${JSON.stringify(cloneLinks, null, 2)}`);
    }

    return res.href;
}

async function getBitbucketToken(config) {

    logger.info('Fetching OAuth 2 token for BitBucket...');

    const response = await axios.post('https://bitbucket.org/site/oauth2/access_token',
        'grant_type=client_credentials',
        {
            headers: {
                'content-type': 'application/x-www-form-urlencoded'
            },
            auth: {
                username: config.bitbucketClientId,
                password: config.bitbucketClientSecret
            },
        });

    return response.data.access_token;
}

module.exports = {
    checkBackupDir
};
