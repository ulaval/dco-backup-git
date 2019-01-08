const fs = require('fs');
const axios = require('axios');

main();

async function main() {

    const config = JSON.parse(readFile('config.json'));

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

    const cloneUrl = insertCredentialsInCloneUrl(repository.cloneUrl, 'x-token-auth', config.bitbucketToken);
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

    writeFile('test.json', JSON.stringify(response.data, null, 2));

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

// See https://confluence.atlassian.com/bitbucket/oauth-on-bitbucket-cloud-238027431.html
function insertCredentialsInCloneUrl(originalCloneUrl, user, pwd) {
    /\w+:\/\/(\w+)@(.*)/g
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

async function fileExists(path) {
    return new Promise((resolve, reject) => {
        try {
            fs.stat(path, (error, stats) => {
                if (error) {
                    if (error.code == 'ENOENT') {
                        resolve(false);
                    } else {
                        reject(error);
                    }
                } else {
                    resolve (stats.isFile());
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};

async function readFile(path, opts = 'utf8') {
    return new Promise((res, rej) => {
        fs.readFile(path, opts, (err, data) => {
            if (err) {
                rej(err);
            } else {
                res(data);
            }
        })
    })
}

async function writeFile(path, data, opts = 'utf8') {
    return new Promise((res, rej) => {
        fs.writeFile(path, data, opts, (err) => {
            if (err) {
                rej(err);
            } else {
                res();
            }
        });
    });
}

async function readDir(path) {
    return new Promise((res, rej) => {
        fs.readdir(path, (err, items) => {
            if (err) {
                rej(err);
            } else {
                res(items);
            }
        });
    });
}
