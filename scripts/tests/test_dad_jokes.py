import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
spec = importlib.util.spec_from_file_location('collector', Path(__file__).parents[1] / 'collect_dad_jokes.py')
c = importlib.util.module_from_spec(spec); spec.loader.exec_module(c)

class CollectorTests(unittest.TestCase):
    def test_dedupe_preserves_approval_and_wording(self):
        rows = {}; src = {'source': 'one', 'sourceId': '1'}
        c.merge(rows, 'Why? Because.', src, 'Why?', 'Because.')
        r = next(iter(rows.values())); r.update(approved=True, text='My locked wording', notes='Keep my delivery')
        c.merge(rows, 'WHY?  Because!', {'source': 'two', 'sourceId': '2'})
        self.assertEqual(len(rows), 1); self.assertEqual(r['text'], 'My locked wording')
        self.assertTrue(r['approved']); self.assertEqual(len(r['sources']), 2)
    def test_ambiguous_one_liner_is_not_invented(self):
        self.assertEqual(c.split_joke('A simple pun'), (None, None, 'unsplit', True))
        self.assertEqual(c.split_joke('Why this? Because that.')[0:2], ('Why this?', 'Because that.'))
    def test_outage_does_not_erase_library(self):
        with tempfile.TemporaryDirectory() as d:
            out = Path(d) / 'library.json'; out.write_text('{"schemaVersion":1,"jokes":[]}')
            original = out.read_bytes()
            with patch.object(c, 'get_json', side_effect=OSError('offline')):
                with self.assertRaises(RuntimeError): c.collect(out, Path(d)/'archive', ['official'])
            self.assertEqual(out.read_bytes(), original)
    def test_repeated_run_is_idempotent_and_exports_sqlite(self):
        data = [{'setup': 'Why?', 'punchline': 'Because.', 'type': 'general'}]
        with tempfile.TemporaryDirectory() as d:
            out = Path(d)/'library.json'; archive=Path(d)/'archive'
            with patch.object(c, 'get_json', return_value=(data, 'raw.json')):
                c.collect(out, archive, ['official']); first=out.read_bytes()
                report=c.collect(out, archive, ['official'])
            self.assertEqual(report['added'], 0); self.assertEqual(out.read_bytes(), first)
            self.assertTrue((archive/'jokelab.sqlite3').exists())

if __name__ == '__main__': unittest.main()
