# JokeLab dad-joke collector

[Launch collector on GitHub](https://github.com/keythjyles/Vitals-Tracker-v1.0/actions/workflows/collect-dad-jokes.yml)

Tap **Run workflow**, leave **main** selected, then tap **Run workflow** again. No API key, AI model, or paid joke service is used. Only manual launches are enabled.

The collector reads the documented icanhazdadjoke search API (all pages, 30 jokes per page) and the Official Joke API public dataset. It does not scrape arbitrary websites, bypass login/paywalls, or endlessly request random jokes. It identifies itself, spaces requests, retries temporary failures, caps requests, and reports partial source failures.

## Outputs

- `tools-home/data/jokelab/library.json`: durable versioned application seed database, updated in GitHub on every successful run. This is a new bulk seed dataset, not a replacement for human-created JokeLab clusters. The current workbench's existing five-candidate paste box is NOT its bulk-import route; loading/browsing this seed dataset in the workbench is a separate integration.
- Run artifact: raw source snapshots, JSON library, SQLite database (`jokelab.sqlite3`), and collection report. GitHub artifacts expire after 30 days; they are a transfer copy, not the permanent archive.
- Optional automatic Drive backup: create repository secret `JOKELAB_DRIVE_OAUTH_JSON` containing your authorized OAuth `client_id`, `client_secret`, and `refresh_token`, and repository variable `JOKELAB_DRIVE_FOLDER_ID` identifying the existing archive folder. Keep credentials out of source code. The Google account must have write access to that folder. When configured, every run uploads a new harvest ZIP to Drive. The script does not create credentials or share/change folder permissions. The initial collection is also archived separately through our connected Drive.

## Data controls

Original wording and source IDs/URLs remain attached. Exact normalized duplicates share a stable fingerprint and retain all collected source references. Similar wording is not automatically merged. Existing human text, approvals, notes, chosen splits and other fields survive refreshes. Nothing is marked approved by collection. No humor ranking, age filtering, or rewriting: a simple, familiar joke is a valid performance seed.

Sources with separate fields retain the supplied setup/punchline. Other splits use a question, newline, or sentence boundary and are explicitly tentative. An ambiguous one-liner retains its complete original text with null setup/punchline; the collector does not manufacture missing dialogue. Source category is retained, so general/programming/knock-knock material can be explored without silently excluding it.

Public accessibility is not a blanket public-domain claim. Official Joke API's repository MIT notice is preserved in `scripts/licenses/official-joke-api-MIT.txt`; individual authorship is not independently established. No explicit content license has been established for icanhazdadjoke; its records carry `rightsStatus: unreviewed`. Collection does not grant publication approval or originality claims.

## Local use

Python 3.12; standard library only:

```bash
python -m unittest discover -s scripts/tests -p 'test_dad_jokes.py' -v
python scripts/collect_dad_jokes.py
```

Optional flags: `--output PATH`, `--archive PATH`, `--sources official icanhazdadjoke`, `--max-pages 100`, `--delay 1`. Output writes are atomic. If every source fails, the existing database is untouched. Every run reports additions, totals, split-review counts and source errors.

Documentation: https://icanhazdadjoke.com/api and https://github.com/15Dkatz/official_joke_api .
