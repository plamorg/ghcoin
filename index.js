const fetch = require('node-fetch');
const core = require('@actions/core');
const github = require('@actions/github');
const csv = require('csvtojson');

const totalAmount = core.getInput('total-amount');
const repoToken = core.getInput('repo-token');
const octokit = github.getOctokit(repoToken);

async function getLedger(branch) {
    console.log(`getting ledger on branch ${branch}`)
    try {
        const octokitRes = await octokit.rest.repos.getContent({
            owner: 'plamorg',
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
            if (ledgerJson[i.name]) core.setFailed(`Duplicate user: ${i.name} ${i.balance} ${ledgerJson[i.name]}`);
            if (!(/^\d+$/.test(i.balance))) core.setFailed(`Invalid balance: ${i.name} ${i.balance}`);
            ledgerJson[i.name] = parseInt(i.balance);
        }

        console.log(`branch ${branch}:`, ledgerJson);

        return ledgerJson;

    } catch (error) {
        core.setFailed(error.message);
    }
}

async function run() {
    try {
        console.log('Hello World');
        // Get the JSON webhook payload for the event that triggered the workflow
        const payload = github.context.payload;

        // get the old (current) ledger
        const oldLedger = getLedger('master');

        // get the new ledger
        const newLedger = getLedger(payload.pull_request.head.ref);

        console.log('aaa', oldLedger, newLedger);
        console.log('get user')
        // get the user who is making the transaction
        const user = github.context.actor;

        console.log('initialise')
        // total amounts circulating
        let oldSum = 0, newSum = 0;

        for (let name in newLedger) {
            console.log(name);
            // add current amount to the new sum
            newSum += newLedger[name];

            if (name === user) {
                // this is the transaction author
                // therefore the new amount should be less than or equal to the old amount
                // or it's a new user
                                
                // case 1: new user
                if (oldLedger[name] === undefined) continue;
                // case 2: check amounts
                if (oldLedger[name] < newLedger[name]) {
                    core.setFailed('Cannot add balance to self');
                    break; 
                }
            } else {
                // different users
                // so each user should have greater than or equal to the amount they had previously
                
                // case 1: new user
                if (oldLedger[name] === undefined) {
                    core.setFailed('Cannot add new users other than self');
                    break;
                }
                // case 2: check amounts
                if (oldLedger[name] > newLedger[name]) {
                    core.setFailed('Cannot subtract balance of others');
                    break;
                }
            }
        }

        console.log('checked new ledger');

        for (let name in oldLedger) {
            // add amount to old sum
            oldSum += oldLedger[name];
            
            // check if user has been deleted
            if (newLedger[name] === undefined) {
                core.setFailed('Cannot delete users');
                break;
            }
        }

        console.log('checked old ledger');

        if (oldSum !== newSum) {
            core.setFailed('Cannot modify total amount');
        }

        console.log('checked sum');
    } catch (error) {
        core.setFailed(error.message);
    }

}

run();