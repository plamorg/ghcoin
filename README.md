<p align="center">
  <a href="" rel="noopener">
 <img src="./docs/logo.png" alt="ghcoin logo"></a>
</p>

<h3 align="center">ghcoin</h3>
<h4 align="center">A totally practical currency built on top of GitHub Actions</h3>

Built for MLH [Hacking Birthday Bash](https://organize.mlh.io/participants/events/8331-hacking-birthday-bash).
Also view the [ghcoin CLI](https://github.com/plamorg/ghcoin-cli) and [ghcoin visualizer](https://github.com/plamorg/ghcoin-vis) companion repositories.

- [Inspiration](https://github.com/plamorg/ghcoin#inspiration)
- [Implementation](https://github.com/plamorg/ghcoin#implementation)
- [User Experience](https://github.com/plamorg/ghcoin#ux)
- [Use Cases](https://github.com/plamorg/ghcoin#okay-but-really-are-there-any-actual-use-cases-for-this)
- [Getting Started](https://github.com/plamorg/ghcoin#getting-started)

## Inspiration

A cryptocurrency at its heart is implemented as a distributed Merkle tree.
Git is a version control system implemented with a distributed Merkle tree.
In the true spirit of hacking, we decided to figure out what happens when we put the two together...

## Implementation

To make a cryptocurrency on top of Git, we need four things: some way to model
transactions inside Git's distributed Merkle tree, some way to send modifications to the tree, an identification system,
and some way to distribute the tree (i.e. spin up new nodes).

### Modeling Transactions

For the first one, we can (ab)use the fact that Git mainly uses its Merkle tree for file modifications. 
Cryptocurrencies act as a distributed ledger that tracks transactions, so we make that explicit; we track
transactions with commits to a single file, `ledger.csv`, which keeps a ledger of all transactions. 
To create a new transaction, a new commit is created in which the ledger is edited to transfer currency units from one user to another. 
Of course, not all modifications to the ledger file are valid transactions, so we have to enforce the following requirements
for a commit to be valid:

- The transaction author's balance is lower than their previous balance,
- The other accounts in the ledger only have their balance increase or stay the same,
- The total sum of the coins in the ledger comes up to the previous amount.

Of course, how do we actually get people to send in modifications to the tree without granting global push
access to our Git repository? This is where GitHub comes in.

### Sending Modifications and Identification

GitHub has a nice way of sending in commits that doesn't need to be preapproved ahead of time: pull requests. All one needs to do
is send in a PR. This also provides an automatic identity system, as each GitHub account can now correspond to an account on the ledger.
But how does the 'node' know whether or not to accept the transaction? For that we use GitHub Actions.
An Actions workflow automatically reviews the PR, and if it passes the requirements listed above, it gets automatically merged.

### Distributed Nodes

So, of course, a cryptocurrency can only be distributed if you can spin up new nodes than just our repository. That's perfectly possible. GitHub provides
an innate feature to split a repo: forks. And this works here too! If you click the fork button in the top right,
you would immediately spin up a new node that can also accept transactions all by itself.
Hard forks are built in to the currency!

## UX

Of course, creating transactions manually is fairly tedious: you have to manually
edit the ledger and modify balances without disrupting the total sum of currency
units. So we created a fancy command line interface to rapidly and
intuitively handle transactions for you! Completing transactions is as simple as
running `ghcoin send smjleo 100`; the CLI will automatically write the
transaction and submit a PR to the ledger. Check it out at https://github.com/plamorg/ghcoin-cli.

We also made a chain transaction viewer to enable a visualization of the chain. It shows all the transactions in the master branch along with all the PRs they come from. See a version hosted on GitHub Pages [here](https://plamorg.github.io/ghcoin-vis/).

## Okay, but really, are there any actual use-cases for this?

Surprisingly, there actually are. Since the GitHub Action can be trivially modified to execute custom handlers 
when a pull request passes validation, it's possible to use the currency to actually do real world things.

One example could be a friend group that wants to share a small savings fund, but also doesn't want any
singular person to spend more money than they're allocated. The GitHub Action could be modified to invoke a payment
API every PR, and automatically make the payment of real-world money from the author to the recipients, while simultaneously
ensuring that nobody abuses the system by spending more than they have.

Another example could be a gaming group who wants to establish a shared account of resources in an online video game.
If the video game provides currency transfer APIs (for example, Eve Online), it's possible to modify the GitHub Action 
such that when a PR is merged in-game currency automatically flows from the author to the recipients, and nobody can spend
more than their share.

## Getting Started

### Prerequisites

Our CLI utility/tool relies on:
- Python 3.10+
- Git
- The `gh` GitHub CLI tool
- Curl

Our GitHub Action relies on:
- Absolutely nothing! It's all included in this repository.

### Usage (CLI)

```
Control your transactions from the command line.

USAGE:
    ghcoin <command> <subcommand>

CORE COMMANDS:
    send <recipient> <amount>  Send the specified recipient the given amount
    balance [user ...]         Retrieve the balance of self or the specified user(s)
    list                       List valid recipients
    register                   Register a user onto the ledger
    help, -h, --help           List this help message
```

Make sure that you are logged in to the GitHub CLI tool. Run `gh auth status` to
confirm. If you are not logged in, run `gh auth login`.

If you are not yet on the ledger, run `ghcoin register`.

Transactions are performed with `ghcoin send <recipient> <amount>`. For example:
`ghcoin send priime0 10`. The recipient must be on the ledger to receive it. The
amount must be a non-negative integer, and must be less than or equal to your
balance.

### Usage (Manual GitHub)

Alternatively, you can create a pull request manually on the repository to make
a transaction. 

Simply fork the repository, modify `ledger.csv` in the root directory to reflect
the transaction that you are making (for instance, changing your balance from
`100` to `50` and your friend's balance from `70` to `120`), and make a GitHub
pull request to the master branch. The GitHub Actions workflow will
automatically trigger once you create a PR, and merge if it is valid.
