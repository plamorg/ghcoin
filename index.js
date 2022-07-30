const fetch = require('node-fetch');
const core = require('@actions/core');
const github = require('@actions/github');
const csv = require('csvtojson');

const repoToken = core.getInput('repo-token');
const changedFiles = core.getInput('changed-files');
const octokit = github.getOctokit(repoToken);

async function setFailed(message) {
    // set failed status on github actions
    core.setFailed(message);

    // leave a message on the PR saying that it failed
    await octokit.rest.issues.createComment({
        ...github.context.repo,
        issue_number: github.context.payload.pull_request.number,
        body: `Sorry, the transaction cannot proceed because of the following reason: ${message}.`
    });

    // quit script
    process.exit();
}

async function getLedger(owner, branch) {
    console.log(`getting ledger on owner ${owner} branch ${branch}`)
    try {
        const octokitRes = await octokit.rest.repos.getContent({
            owner: owner,
            repo: 'ghcoin',
            path: 'ledger.csv',
            ref: branch,
        });
        
        // console.log('octokit: ', octokitRes);

        // get the raw csv from github
        const res = await fetch(octokitRes.data.download_url);
        const ledgerCsv = await res.text();

        // convert csv to json
        const ledgerJsonRaw = await csv().fromString(ledgerCsv);
        console.log(ledgerJsonRaw);

        // convert format into key-value (name: balance) and check that the csv is valid
        let ledgerJson = {};
        for (let i of ledgerJsonRaw) {
            console.log(i.name, i.balance);
            if (ledgerJson[i.name]) await setFailed(`Duplicate user: ${i.name} ${i.balance} ${ledgerJson[i.name]}`);
            if (!(/^[0-9]+$/.test(i.balance))) await setFailed(`Invalid balance: ${i.name} ${i.balance}`);
            ledgerJson[i.name] = parseInt(i.balance);
        }

        console.log(`branch ${branch}:`, ledgerJson);

        return ledgerJson;

    } catch (error) {
        await setFailed(error.message);
    }
}

async function run() {
    try {
        // make sure that ledger.csv is the only changed file
        if (changedFiles !== 'ledger.csv') await setFailed('Cannot modify any files other than ledger.csv');

        // get json payload
        const payload = github.context.payload;

        // get the old (current) ledger
        const oldLedger = await getLedger('plamorg', 'master');

        // get the new ledger
        const newLedger = await getLedger(payload.pull_request.head.repo.owner.login, payload.pull_request.head.ref);

        // get the user who is making the transaction
        const user = github.context.actor;

        console.log('initialise')
        // total amounts circulating
        let oldSum = 0, newSum = 0;

        for (let name in newLedger) {
            // add current amount to the new sum
            newSum += newLedger[name];

            if (name === user) {
                // this is the transaction author
                // therefore the new amount should be less than or equal to the old amount
                // or it's a new user
                                
                // case 1: new user
                if (oldLedger[name] === undefined) continue;
                // case 2: check amounts
                if (oldLedger[name] < newLedger[name]) await setFailed('Cannot add balance to self');
            } else {
                // different users
                // so each user should have greater than or equal to the amount they had previously
                
                // case 1: new user
                if (oldLedger[name] === undefined) await setFailed('Cannot add new users other than self');

                // case 2: check amounts
                else if (oldLedger[name] > newLedger[name]) await setFailed('Cannot subtract balance of others');
            }
        }

        console.log('checked new ledger');

        for (let name in oldLedger) {
            // add amount to old sum
            oldSum += oldLedger[name];
            
            // check if user has been deleted
            if (newLedger[name] === undefined) await setFailed('Cannot delete users');
        }

        console.log('checked old ledger');

        if (oldSum !== newSum) {
            await setFailed('Cannot modify total amount');
        }

        console.log('checked sum');
    } catch (error) {
        await setFailed(error.message);
    }

}

run();