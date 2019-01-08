const utils = require('./utils');
const fs = require('fs');
const axios = require('axios');

// See https://confluence.atlassian.com/bitbucket/oauth-on-bitbucket-cloud-238027431.html
const BITBUCKET_OAUTH_USER = 'x-token-auth';

main();

async function main() {

    const config = JSON.parse(await utils.readFile('config.json'));

    config.bitbucketToken = await getBitbucketToken(config);
    const repositories = await fetchBitbucketRepositories(config);

    await backupBitbucketRepositories(config, repositories);

    console.info('Backup succeeded.');
}

async function backupBitbucketRepositories(config, repositories) {
    for (const repository of repositories) {
        await backupBitbucketRepository(config, repository);
    };
}

async function backupBitbucketRepository(config, repository) {
    console.info(`Backing ${repository.owner} / ${repository.project} / ${repository.name} / ${repository.cloneUrl}...`);

    const cloneUrl = insertCredentialsInCloneUrl(repository.cloneUrl, BITBUCKET_OAUTH_USER, config.bitbucketToken);
}

async function fetchBitbucketRepositories(config, nextUrl = '') {
    if (!nextUrl) {
        console.info(`Fetching bitbucket repositories for ${config.bitbucketOwner}...`);
    } else {
        console.info(`Fetching ${nextUrl}...`);
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

    if (response.data.next && !config.fast) {
        repositories = repositories.concat(await fetchBitbucketRepositories(bitbucketOwner, bitbucketToken, response.data.next));
    }

    return repositories;
}

function insertCredentialsInCloneUrl(originalCloneUrl, user, pwd) {
    const regex = /(\w+:\/\/)(?:[\w:]+@)?(.*)/g;

    const matches = regex.exec(originalCloneUrl);

    if (!matches) {
        throw new Error(`The clone url ${originalCloneUrl} is not recognized`);
    }

    return matches[1] + user + ':' + pwd + '@' + matches[2];
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
    insertCredentialsInCloneUrl
};
