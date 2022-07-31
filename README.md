# ghcoin

A currency built on top of GitHub. Built for MLH [Hacking Birthday
Bash](https://organize.mlh.io/participants/events/8331-hacking-birthday-bash).
Also view the [ghcoin CLI](https://github.com/plamorg/ghcoin-cli) we also made
for this hackathon.

## Inspiration

Git is a widely-used version control system implementing persistent hash trees
as its primary data structure, providing an immutable cryptographic chain of
records. We can observe a similarity to cryptocurrencies, so what if we decided
to build one on top of Git commits? And how can we best use GitHub Actions to
achieve this?

In celebration of the hacker spirit, we decided to learn new and exciting
technologies (GitHub Actions) and explore its cool unintended uses.

## Implementation

Cryptocurrencies share a ledger that tracks transactions. In ghcoin, we track
transactions with commits and store a ledger of GitHub users and their
corresponding account balances. To create a new transaction, the ledger is
edited to transfer currency units from one user to another. The change is
committed, then a pull request to the centralized ledger is submitted. A CI
GitHub Action then is run against the pull request to verify the transaction,
namely:

- Only the transaction author is losing currency units
- The transaction author is not gaining currency units
- The sum of all currency units is the same

If the above are satisfied, the pull request is automatically merged, updating
the centralized ledger and transaction history.

Creating transactions would be tedious by itself: you would have to manually
edit the ledger and modify balances without disrupting the total sum of currency
units. To resolve this, we created a command line interface (CLI) to rapidly and
intuitively handle transactions for you. Completing transactions is as simple as
running `ghcoin send priime0 100`; the CLI will automatically write the
transaction and merge it into the centralized ledger.

## Getting Started

### Prerequisites

Our GitHub Action relies on:
- JavaScript
- GitHub Action JavaScript modules

Our CLI utility/tool relies on:
- Python 3.10+
- Git
- GitHub CLI tool
- Curl

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
