import sys
import json
import unittest
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from core.file_importer import parse_tabular_dataframe, parse_json_file


class UnansweredImportTests(unittest.TestCase):
    def test_missing_measurement_does_not_become_one(self):
        data = pd.DataFrame({
            "Alternative": ["A", "B"],
            "Benefit": [10, None],
            "Cost": [5, 10],
        })
        project = parse_tabular_dataframe(data, "sample.csv")
        self.assertEqual(project["criteria_matrix"], [[1.0, None], [None, 1.0]])
        self.assertIsNone(project["data_matrix"][1][0])
        self.assertEqual(project["alt_matrices"]["Benefit"], [[1.0, None], [None, 1.0]])
        self.assertEqual(project["alt_matrices"]["Cost"], [[1.0, 2.0], [0.5, 1.0]])

    def test_missing_json_judgments_remain_unanswered(self):
        project = parse_json_file(b'{"criteria":["C1","C2"],"alternatives":["A","B"]}')
        self.assertIsNone(project["criteria_matrix"][0][1])
        self.assertIsNone(project["alt_matrices"]["C1"][0][1])

    def test_native_json_preserves_topsis_measurements(self):
        source = {
            "criteria": ["Cost", "Quality"],
            "alternatives": ["A", "B"],
            "criteria_matrix": [[1, 1], [1, 1]],
            "alt_matrices": {"Cost": [[1, 1], [1, 1]], "Quality": [[1, 1], [1, 1]]},
            "data_matrix": [[0, 42], [3, 7]],
            "criterion_types": ["cost", "benefit"],
        }
        project = parse_json_file(json.dumps(source).encode("utf-8"))
        self.assertEqual(project["data_matrix"], source["data_matrix"])
        self.assertEqual(project["criterion_types"], source["criterion_types"])


if __name__ == "__main__":
    unittest.main()
