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
            branch,
        });
        
        console.log('octokit: ', octokitRes);

        const res = await fetch(octokitRes.download_url);
        const ledgerCsv = await res.text();
        const ledgerJsonRaw = await csv().fromString(ledgerCsv);

        let ledgerJson = {};
        for (let i of ledgerJsonRaw) {
            if (ledgerJson[i.name]) throw `Duplicate user: ${i.name} ${i.balance} ${ledgerJson[i.name]}`;
            if (/^\d+$/.test(i.balance)) throw `Invalid balance: ${i.name} ${i.balance}`
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
        // Get the JSON webhook payload for the event that triggered the workflow
        const payload = github.context.payload;

        // get the original ledger
        const originalLedger = getLedger('master');

        // get the new ledger
        const newLedger = getLedger(payload.pull_request.head.ref);
    } catch (error) {
        core.setFailed(error.message);
    }

}

run();