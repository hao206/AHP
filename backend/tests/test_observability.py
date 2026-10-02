import unittest
from fastapi.testclient import TestClient
from main import app


class TestObservabilityMiddleware(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_request_id_generated_and_returned(self):
        # Health check without sending X-Request-ID
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        self.assertIn("X-Request-ID", res.headers)
        self.assertTrue(res.headers["X-Request-ID"].startswith("req-"))

    def test_custom_request_id_propagated(self):
        # Sending explicit X-Request-ID
        custom_id = "req-client-test-9999"
        res = self.client.get("/api/health", headers={"X-Request-ID": custom_id})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get("X-Request-ID"), custom_id)

    def test_http_exception_carries_request_id(self):
        # Calling non-existent endpoint or unauthorized endpoint
        custom_id = "req-client-err-1234"
        res = self.client.get("/api/projects/unknown-proj-xyz", headers={"X-Request-ID": custom_id})
        self.assertEqual(res.headers.get("X-Request-ID"), custom_id)
        data = res.json()
        self.assertEqual(data.get("request_id"), custom_id)


if __name__ == "__main__":
    unittest.main()
