import json
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from core.file_importer import parse_json_file
from core.matrix_validation import validate_pairwise_matrix

# The packaged test runtime has NumPy but not SciPy; optimization is not used here.
if 'scipy' not in sys.modules:
    scipy = types.ModuleType('scipy')
    optimize = types.ModuleType('scipy.optimize')
    optimize.minimize = lambda *args, **kwargs: None
    scipy.optimize = optimize
    sys.modules['scipy'] = scipy
    sys.modules['scipy.optimize'] = optimize
from core.ahp_engine import AHPMatrix, AHPHierarchy


class MatrixValidationTests(unittest.TestCase):
    def test_nonreciprocal_and_invalid_values_are_rejected(self):
        bad = [
            [[1, 9], [9, 1]],
            [[1, 10], [0.1, 1]],
            [[1, 0], [0, 1]],
            [[1, float('nan')], [1, 1]],
            [[2, 3], [1 / 3, 1]],
            [[1, None], [1, 1]],
        ]
        for matrix in bad:
            with self.subTest(matrix=matrix), self.assertRaises(ValueError):
                AHPMatrix(['A', 'B'], matrix)

    def test_direct_mutation_is_checked_before_calculation(self):
        matrix = AHPMatrix(['A', 'B'])
        matrix.matrix[0, 1] = 9
        matrix.matrix[1, 0] = 9
        with self.assertRaisesRegex(ValueError, 'not reciprocal'):
            matrix.evaluate()

    def test_hierarchy_requires_every_valid_alternative_matrix(self):
        hierarchy = AHPHierarchy('Goal', ['C1', 'C2'], ['A', 'B'])
        with self.assertRaisesRegex(ValueError, 'Missing alternative matrices'):
            hierarchy.load_matrices([[1, 1], [1, 1]], {'C1': [[1, 1], [1, 1]]})
        with self.assertRaisesRegex(ValueError, 'not reciprocal'):
            hierarchy.load_matrices([[1, 1], [1, 1]], {
                'C1': [[1, 9], [9, 1]], 'C2': [[1, 1], [1, 1]],
            })

    def test_incomplete_pair_is_preserved_only_for_import(self):
        clean = validate_pairwise_matrix(['A', 'B'], [[1, None], [None, 1]], allow_missing=True)
        self.assertIsNone(clean[0][1])
        with self.assertRaisesRegex(ValueError, 'missing'):
            AHPMatrix(['A', 'B'], clean)

    def test_completion_detects_null_pair_before_any_default_is_applied(self):
        matrix = AHPMatrix(['A', 'B'], [[1, None], [None, 1]], allow_missing=True)
        with patch('core.ahp_engine.minimize', return_value=types.SimpleNamespace(x=np.log([3.0]))):
            result = matrix.complete_missing_comparisons()
        self.assertEqual(result[0, 1], 3)
        self.assertAlmostEqual(result[1, 0], 1 / 3)


class AhposImportTests(unittest.TestCase):
    def make_source(self):
        return {
            'pj': [{'project_name': 'Choice', 'project_hText': 'Choice: C1=0.5, C2=0.5;'}],
            'alt': [{'alt': 'A'}, {'alt': 'B'}, {'alt': 'C'}],
            'pwc': [
                {'pwc_node': 'Choice', 'pwc_ab': '0', 'pwc_intense': '3'},
                {'pwc_node': 'C1', 'pwc_ab': '010', 'pwc_intense': '362'},
                {'pwc_node': 'C2', 'pwc_ab': '111', 'pwc_intense': '494'},
            ],
        }

    def test_ahpos_compact_judgments_are_used(self):
        source = self.make_source()
        project = parse_json_file(json.dumps(source).encode())
        self.assertEqual(project['criteria'], ['C1', 'C2'])
        self.assertEqual(project['alternatives'], ['A', 'B', 'C'])
        self.assertEqual(project['criteria_matrix'], [[1, 3], [1 / 3, 1]])
        self.assertEqual(project['alt_matrices']['C1'], [
            [1, 3, 1 / 6], [1 / 3, 1, 2], [6, 1 / 2, 1],
        ])
        self.assertEqual(project['alt_matrices']['C2'][0][1], 1 / 4)
        hierarchy = AHPHierarchy(project['goal'], project['criteria'], project['alternatives'])
        hierarchy.load_matrices(project['criteria_matrix'], project['alt_matrices'])
        self.assertNotEqual(hierarchy.synthesize()['alternatives_evaluation']['C1']['weights_list'], [1 / 3] * 3)

    def test_ahpos_multiple_participants_use_geometric_mean(self):
        source = self.make_source()
        source['pwc'].append({'pwc_node': 'Choice', 'pwc_ab': '1', 'pwc_intense': '3'})
        project = parse_json_file(json.dumps(source).encode())
        self.assertAlmostEqual(project['criteria_matrix'][0][1], 1)

    def test_ahpos_unanswered_code_stays_null(self):
        source = self.make_source()
        source['pwc'][0]['pwc_intense'] = '0'
        project = parse_json_file(json.dumps(source).encode())
        self.assertIsNone(project['criteria_matrix'][0][1])

    def test_ahpos_nested_hierarchy_and_malformed_codes_are_rejected(self):
        source = self.make_source()
        source['pj'][0]['project_hText'] += ' C1: X, Y;'
        with self.assertRaisesRegex(ValueError, 'flat criteria branch'):
            parse_json_file(json.dumps(source).encode())
        source = self.make_source()
        source['pwc'][0]['pwc_intense'] = '0x'
        with self.assertRaisesRegex(ValueError, 'malformed comparison'):
            parse_json_file(json.dumps(source).encode())

    def test_native_import_rejects_invalid_matrix_instead_of_erasing_it(self):
        source = {
            'criteria': ['C1', 'C2'], 'alternatives': ['A', 'B'],
            'criteria_matrix': [[1, 9], [9, 1]],
        }
        with self.assertRaisesRegex(ValueError, 'not reciprocal'):
            parse_json_file(json.dumps(source).encode())


if __name__ == '__main__':
    unittest.main()
