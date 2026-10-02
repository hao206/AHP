import unittest
from ai_engine.orchestrator import run_ai_deliberation, suggest_personas_for_goal
from ai_engine.schemas import DeliberationRequest
from ai_engine.guardrails import AHPGuardrails


class TestAIEngine(unittest.TestCase):
    def test_suggest_personas(self):
        personas = suggest_personas_for_goal("Mua sắm xe doanh nghiệp", ["Giá", "An toàn"])
        self.assertGreaterEqual(len(personas), 2)
        self.assertTrue(any("xe" in p.name.lower() or "mua" in p.name.lower() or "an toàn" in p.name.lower() for p in personas))

    def test_guardrails_validation(self):
        passed, warnings = AHPGuardrails.validate_input("Lựa chọn ERP", ["Chi phí", "Tính năng"])
        self.assertTrue(passed)
        self.assertEqual(len(warnings), 0)

        # Invalid short goal
        passed_bad, warnings_bad = AHPGuardrails.validate_input("a", ["Chi phí"])
        self.assertFalse(passed_bad)
        self.assertGreater(len(warnings_bad), 0)

    def test_saaty_scale_enforcement(self):
        self.assertEqual(AHPGuardrails.enforce_saaty_scale(2.9), 3.0)
        self.assertEqual(AHPGuardrails.enforce_saaty_scale(0.33), 1/3)
        self.assertEqual(AHPGuardrails.enforce_saaty_scale(-5), 1.0)

    def test_full_ai_deliberation_flow(self):
        req = DeliberationRequest(
            goal="Đánh giá Hệ thống Đám mây",
            elements=["Chi phí TCO", "Bảo mật", "Độ trễ"],
            num_rounds=1
        )
        res = run_ai_deliberation(req)
        self.assertEqual(len(res.elements), 3)
        self.assertGreaterEqual(len(res.personas), 2)
        self.assertEqual(len(res.consensus_matrix), 3)
        self.assertIn("consistency_ratio", res.evaluation)
        self.assertTrue(res.guardrails_passed)


if __name__ == "__main__":
    unittest.main()
