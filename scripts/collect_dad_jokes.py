#!/usr/bin/env python3
"""Collect documented public joke feeds; preserve wording, sources and human fields."""
import argparse
import hashlib
import html
import json
import os
from pathlib import Path
import re
import sqlite3
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
USER_AGENT = 'JokeLabCollector/1.0 (https://github.com/keythjyles/Vitals-Tracker-v1.0)'
OFFICIAL = 'https://raw.githubusercontent.com/15Dkatz/official_joke_api/master/jokes/index.json'
API = 'https://icanhazdadjoke.com/search'

def clean(text):
    return html.unescape(unicodedata.normalize('NFKC', str(text))).strip()

def fingerprint(text):
    # Conservative dedupe: ignore case, typography, punctuation and whitespace;
    # preserve word order/numbers. No semantic merges or rewriting of wordplay.
    text = clean(text).casefold().replace('’', "'")
    return hashlib.sha256(' '.join(re.findall(r"\w+", text)).encode()).hexdigest()

def split_joke(text):
    """Return a tentative split; never invent a punchline for a one-liner."""
    for pattern, method in [(r'^(.+?\?)\s+(.+)$', 'question_boundary'),
                            (r'^(.+?)\n+(.+)$', 'line_boundary'),
                            (r'^(.+?[.!])\s+(.+)$', 'sentence_boundary')]:
        match = re.match(pattern, text, flags=re.S)
        if match:
            return match[1].strip(), match[2].strip(), method, True
    return None, None, 'unsplit', True

def merge(rows, text, source, setup=None, punchline=None, category='dad'):
    text = clean(text)
    if not text:
        return False
    key = fingerprint(text)
    if key not in rows:
        structured = bool(setup and punchline)
        s, p, method, review = (clean(setup), clean(punchline), 'source_fields', False) if structured else split_joke(text)
        rows[key] = {'id': 'dad-' + key[:24], 'fingerprint': key,
                     'text': text, 'originalText': text, 'setup': s, 'punchline': p,
                     'splitMethod': method, 'splitNeedsReview': review,
                     'category': category, 'status': 'collected', 'approved': False,
                     'sources': [], 'createdAt': datetime.now(timezone.utc).isoformat(),
                     'performanceNotes': 'The spoken payoff leads into the performance reaction. No automatic post-punchline dialogue.'}
    row = rows[key]
    # Human text, approvals, notes, tags and chosen split are never overwritten.
    if not any(s['source'] == source['source'] and s['sourceId'] == source['sourceId'] for s in row['sources']):
        row['sources'].append(source)
    return True

def get_json(url, raw_dir, delay):
    for attempt in range(4):
        try:
            req = urllib.request.Request(url, headers={'Accept': 'application/json', 'User-Agent': USER_AGENT})
            with urllib.request.urlopen(req, timeout=25) as response:
                data = response.read(10_000_001)
                if len(data) > 10_000_000:
                    raise ValueError('Source exceeded the 10 MB response limit')
            result = json.loads(data)
            name = hashlib.sha256(url.encode()).hexdigest()[:20] + '.json'
            (raw_dir / name).write_bytes(data)
            time.sleep(delay)
            return result, name
        except (urllib.error.URLError, TimeoutError) as exc:
            if isinstance(exc, urllib.error.HTTPError) and exc.code not in (429, 500, 502, 503, 504):
                raise
            if attempt == 3:
                raise
            time.sleep(min(2 ** (attempt + 1), 10))

def collect(output, archive, sources, max_pages=100, delay=1):
    output, archive = Path(output), Path(archive)
    archive.mkdir(parents=True, exist_ok=True)
    raw = archive / 'raw'; raw.mkdir(exist_ok=True)
    previous = json.loads(output.read_text()) if output.exists() else {'schemaVersion': 1, 'jokes': []}
    rows = {r.get('fingerprint') or fingerprint(r.get('originalText', r['text'])): r for r in previous['jokes']}
    before = len(rows)
    report = {'startedAt': datetime.now(timezone.utc).isoformat(), 'before': before, 'sources': [], 'errors': []}
    successful = 0
    for source in sources:
        count = 0
        try:
            if source == 'official':
                data, snapshot = get_json(OFFICIAL, raw, delay)
                if not isinstance(data, list) or not data:
                    raise ValueError('Official source returned no joke list')
                for item in data:
                    if not isinstance(item.get('setup'), str) or not isinstance(item.get('punchline'), str):
                        continue
                    s, p = item['setup'], item['punchline']
                    sid = str(item.get('id') or fingerprint(s + ' ' + p))
                    count += merge(rows, s + ' ' + p,
                        {'source': 'official-joke-api', 'sourceId': sid, 'url': OFFICIAL,
                         'rawSnapshot': snapshot, 'license': 'MIT repository license',
                         'licenseUrl': 'https://github.com/15Dkatz/official_joke_api/blob/master/LICENCE',
                         'rightsStatus': 'source_license_recorded_not_individual_authorship_verified'}, s, p, item.get('type', 'dad'))
            elif source == 'icanhazdadjoke':
                for page in range(1, max_pages + 1):
                    url = API + '?' + urllib.parse.urlencode({'page': page, 'limit': 30})
                    data, snapshot = get_json(url, raw, delay)
                    if data.get('status') != 200 or not isinstance(data.get('results'), list):
                        raise ValueError('Dad-joke API returned an invalid page')
                    for item in data['results']:
                        if not isinstance(item.get('joke'), str) or not item.get('id'):
                            continue
                        count += merge(rows, item['joke'],
                            {'source': source, 'sourceId': str(item['id']),
                             'url': 'https://icanhazdadjoke.com/j/' + urllib.parse.quote(str(item['id'])),
                             'rawSnapshot': snapshot, 'license': 'No explicit content license established',
                             'licenseUrl': 'https://icanhazdadjoke.com/api', 'rightsStatus': 'unreviewed'})
                    if not data['results'] or page >= int(data.get('total_pages', page)):
                        break
                else:
                    report['errors'].append({'source': source, 'error': 'Page cap reached; collection is partial'})
            else:
                raise ValueError('Unknown source: ' + source)
            successful += 1
            report['sources'].append({'source': source, 'recordsRead': count})
        except (ValueError, KeyError, TypeError, OSError) as exc:
            report['errors'].append({'source': source, 'error': str(exc)})
    if not successful:
        (archive / 'report.json').write_text(json.dumps(report, indent=2))
        raise RuntimeError('No sources completed; existing library was not changed')
    jokes = sorted(rows.values(), key=lambda r: r['id'])
    result = {**previous, 'schemaVersion': 1, 'jokes': jokes}
    output.parent.mkdir(parents=True, exist_ok=True)
    tmp = output.with_suffix('.tmp'); tmp.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n'); os.replace(tmp, output)
    (archive / 'library.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    db = sqlite3.connect(archive / 'jokelab.sqlite3')
    db.execute('CREATE TABLE IF NOT EXISTS jokes (id TEXT PRIMARY KEY, text TEXT, setup TEXT, punchline TEXT, record_json TEXT NOT NULL)')
    db.executemany('INSERT OR REPLACE INTO jokes VALUES (?,?,?,?,?)', [(r['id'], r['text'], r['setup'], r['punchline'], json.dumps(r, ensure_ascii=False)) for r in jokes]); db.commit(); db.close()
    report.update({'after': len(jokes), 'added': len(jokes) - before, 'splitNeedsReview': sum(r['splitNeedsReview'] for r in jokes), 'complete': not report['errors']})
    (archive / 'report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))
    return report

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--output', default=str(ROOT / 'tools-home/data/jokelab/library.json'))
    ap.add_argument('--archive', default=str(ROOT / 'jokelab-harvest'))
    ap.add_argument('--sources', nargs='+', choices=['official', 'icanhazdadjoke'], default=['official', 'icanhazdadjoke'])
    ap.add_argument('--max-pages', type=int, default=100)
    ap.add_argument('--delay', type=float, default=1)
    a = ap.parse_args()
    if not 1 <= a.max_pages <= 100 or not .1 <= a.delay <= 10:
        ap.error('Use 1–100 pages and a delay of 0.1–10 seconds')
    collect(a.output, a.archive, a.sources, a.max_pages, a.delay)
