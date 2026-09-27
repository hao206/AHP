import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from core.api_security import allowed_origins, project_access_error, validate_project_token


class ProjectApiSecurityTests(unittest.TestCase):
    def test_cors_defaults_and_rejects_wildcards_or_paths(self):
        self.assertEqual(allowed_origins(), ['http://127.0.0.1:5175', 'http://localhost:5175'])
        self.assertEqual(allowed_origins('*'), ['*'])
        self.assertEqual(allowed_origins('https://app.example.com, https://admin.example.com'),
                         ['https://app.example.com', 'https://admin.example.com'])
        for value in ('http://localhost:bad',):
            with self.subTest(value=value), self.assertRaises(ValueError):
                allowed_origins(value)

    def test_token_required_outside_localhost_and_checked_in_constant_time(self):
        token = validate_project_token('s' * 32)
        self.assertIsNone(project_access_error(token, f'Bearer {token}', '0.0.0.0',
                                               '192.0.2.10', 'example.com'))
        self.assertEqual(project_access_error(token, 'Bearer wrong', '0.0.0.0',
                                              '192.0.2.10', 'example.com')[0], 401)
        with self.assertRaises(ValueError):
            validate_project_token('short')
        with self.assertRaises(ValueError):
            validate_project_token(' ' + 's' * 32)

    def test_local_access_rejects_remote_bind_clients_and_host_header(self):
        self.assertIsNone(project_access_error('', None, '127.0.0.1', '::1', 'localhost'))
        for hosts in [('0.0.0.0', '127.0.0.1', 'localhost'),
                      ('127.0.0.1', '192.0.2.10', 'localhost'),
                      ('127.0.0.1', '127.0.0.1', 'attacker.example')]:
            with self.subTest(hosts=hosts):
                self.assertEqual(project_access_error('', None, *hosts)[0], 503)

    def test_disallowed_origin_cannot_write_even_without_preflight(self):
        base = ('', None, '127.0.0.1', '127.0.0.1', 'localhost')
        options = {'origin': 'https://attacker.example', 'request_origin': 'http://localhost:8123',
                   'allowed': allowed_origins(), 'method': 'POST'}
        self.assertEqual(project_access_error(*base, **options)[0], 403)
        options['origin'] = 'http://localhost:5175'
        self.assertIsNone(project_access_error(*base, **options))
        options['origin'] = 'http://localhost:8123'
        self.assertIsNone(project_access_error(*base, **options))


if __name__ == '__main__':
    unittest.main()
