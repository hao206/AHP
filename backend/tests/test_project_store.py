import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from core.project_store import load_projects, save_projects


class ProjectStoreTests(unittest.TestCase):
    def test_new_store_is_initialized_once(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'projects.json'
            self.assertEqual(load_projects(str(path), lambda: {'default': {'id': 'default'}}), {'default': {'id': 'default'}})
            self.assertEqual(load_projects(str(path), lambda: {'other': {}}), {'default': {'id': 'default'}})

    def test_round_trip_preserves_unanswered_and_topsis_edits(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'projects.json'
            project = {
                'id': 'active-1', 'criteria_matrix': [[1, None], [None, 1]],
                'data_matrix': [[0, 12], [8, 3]], 'criterion_types': ['cost', 'benefit'],
            }
            save_projects(str(path), {'active-1': project})
            self.assertEqual(load_projects(str(path), dict)['active-1'], project)

    def test_corrupt_store_is_reported_without_replacing_user_data(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'projects.json'
            path.write_text('{broken', encoding='utf-8')
            with self.assertRaises(json.JSONDecodeError):
                load_projects(str(path), lambda: {'default': {}})
            self.assertEqual(path.read_text(encoding='utf-8'), '{broken')

    def test_failed_replace_keeps_previous_project_file(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'projects.json'
            save_projects(str(path), {'old': {'id': 'old'}})
            with patch('core.project_store.os.replace', side_effect=OSError('disk error')):
                with self.assertRaises(OSError):
                    save_projects(str(path), {'new': {'id': 'new'}})
            self.assertEqual(load_projects(str(path), dict), {'old': {'id': 'old'}})
            self.assertEqual(list(Path(directory).glob('*.tmp')), [])


if __name__ == '__main__':
    unittest.main()
