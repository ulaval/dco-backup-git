const path = require('path');
const axios = require('axios');
const logger = require('./logger');
const fsUtils = require('./fs-utils');
const gitUtils = require('./git-utils');


// See https://confluence.atlassian.com/bitbucket/oauth-on-bitbucket-cloud-238027431.html
const BITBUCKET_OAUTH_USER = 'x-token-auth';


async function main(argv) {

    const chrono = logger.startChrono();

    const config = await loadAndCheckConfig(argv);

    if (config.bitbucket) {
        config.bitbucketToken = await getBitbucketToken(config);
        const repositories = await fetchBitbucketRepositories(config);

        await backupRepositories(config, repositories, 'bitbucket', BITBUCKET_OAUTH_USER, config.bitbucketToken);
    }

    if (config.github) {
        const repositories = await fetchGithubRepositories(config);

        await backupRepositories(config, repositories, 'github');
    }

    logger.success(`Backup succeeded in ${logger.stopChrono(chrono)}.`);
}

async function loadAndCheckConfig(args) {
    logger.info('Loading configuration...');

    const config = {};

    setConfigParameter(config, args, 'conf', 'array', []);

    for (const conf of config.conf) {
        Object.assign(config, JSON.parse(await fsUtils.readFile(conf)));
    }

    setConfigParameter(config, args, 'backupDir', 'str');

    setConfigParameter(config, args, 'partial', 'bool', false);

    setConfigParameter(config, args, 'github', 'bool', false);
    setConfigParameter(config, args, 'githubOrg', 'str');

    setConfigParameter(config, args, 'bitbucket', 'bool', false);
    setConfigParameter(config, args, 'bitbucketOwner', 'str');
    setConfigParameter(config, args, 'bitbucketClientId', 'str');
    setConfigParameter(config, args, 'bitbucketClientSecret', 'str');

    await checkBackupDir(config);

    if (config.github && !config.githubOrg) {
        throw new Error('The parameter githubOrg is mandatory to backup github.');
    }

    if (config.bitbucket && (!config.bitbucketOwner || !config.bitbucketClientId || !config.bitbucketClientSecret)) {
        throw new Error('The bitbucketOwner, bitbucketClientId, bitbucketClientSecret parameters are mandatory to backup BitBucket.');
    }

    logger.info(`Effective config:
    - backupDir: ${config.backupDir}
    - partial: ${config.partial}
    - github: ${config.github}
    - githubOrg: ${config.githubOrg}
    - bitbucket: ${config.bitbucket}
    - bitbucketClientId: ${config.bitbucketClientId}
    - bitbucketClientSecret: xxx`)

    return config;
}

function setConfigParameter(config, argv, paramName, type, defaultVal) {
    argv.filter(value => value.startsWith(`-${paramName}${type == 'bool' ? '' : '='}`))
        .forEach(arg => {
            if (type === 'bool') {
                config[paramName] = true;
            } else if (type === 'str') {
                config[paramName] = arg.substring(paramName.length + 2);
            } else if (type === 'array') {
                config[paramName] = config[paramName] || [];
                config[paramName].push(arg.substring(paramName.length + 2));
            }
        })

    if (!config[paramName]) {
        config[paramName] = defaultVal;
    }
}

async function checkBackupDir(config) {
    if (!config.backupDir) {
        throw new Error('The backupDir must be provided.');
    }

    if (!await fsUtils.dirExists(config.backupDir)) {
        throw new Error(`The directory "${config.backupDir}" doesn't exists.`);
    }
}

async function backupRepositories(config, repositories, source, user, pwd) {
    logger.info(`Starting backup of ${repositories.length} repositories from ${source}${config.partial ? ' in partial mode' : ''}...`);

    if (config.partial) {
        repositories = repositories.slice(0, 5);
    }

    for (const repository of repositories) {
        await backupRepository(config, repository, source, user, pwd);
    };
}

async function backupRepository(config, repository, source, user, pwd) {
    const sourceDir = path.join(config.backupDir, source)

    await fsUtils.mkDir(sourceDir);

    const repoBackupDir = path.join(config.backupDir, source, repository.name + '.git');

    if (await fsUtils.dirExists(repoBackupDir)) {
        await gitUtils.remoteUpdate(repository.cloneUrl, repoBackupDir, user, pwd);
    } else {
        await gitUtils.cloneMirror(repository.cloneUrl, repoBackupDir, user, pwd);
    }
}

async function fetchGithubRepositories(config) {
    logger.info(`Fetching Github repositories for ${config.githubOrg}...`);

    const url = `https://api.github.com/orgs/${config.githubOrg}/repos`;

    const response = await axios.get(url);

    return response.data.map(repo => {
        const info = {
            owner: config.githubOrg,
            name: repo.name,
            cloneUrl: repo.clone_url
        };

        validateRepoInfo(info);

        return info;
    });
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
            const info = {
                owner: repo.owner.username,
                name: repo.name,
                cloneUrl: cloneUrl(repo.links.clone)
            };

            validateRepoInfo(info);

            return info;
        });

    if (response.data.next) {
        repositories = repositories.concat(await fetchBitbucketRepositories(config, response.data.next));
    }

    return repositories;
}

function validateRepoInfo(info) {
    if (!info.owner) {
        throw new Error(`The api response did not provide any owner info for ${JSON.stringify(info, null, 2)}`);
    }

    if (!info.name) {
        throw new Error(`The api response did not provide any name for ${JSON.stringify(info, null, 2)}`);
    }

    if (!info.cloneUrl) {
        throw new Error(`The api response did not provide any cloneUrl info for ${JSON.stringify(info, null, 2)}`);
    }
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
    loadAndCheckConfig,
    main
};
