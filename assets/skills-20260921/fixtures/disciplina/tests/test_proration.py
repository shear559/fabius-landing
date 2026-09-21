import unittest
from datetime import date

from billing.proration import prorate
from billing.invoice import upgrade_line

BASIC = {"name": "Basic", "price_cents": 1200}
PRO = {"name": "Pro", "price_cents": 4500}


class ProrationTest(unittest.TestCase):
    def test_upgrade_mid_april(self):
        # April has 30 days; switching on the 16th leaves 15 days.
        self.assertEqual(prorate(1200, 4500, date(2026, 4, 16), date(2026, 4, 1), date(2026, 5, 1)), 1650)

    def test_no_change_costs_nothing(self):
        self.assertEqual(prorate(4500, 4500, date(2026, 4, 10), date(2026, 4, 1), date(2026, 5, 1)), 0)

    def test_invoice_line(self):
        line = upgrade_line("c_1", BASIC, PRO, date(2026, 4, 16), date(2026, 4, 1), date(2026, 5, 1))
        self.assertEqual(line["amount_cents"], 1650)
        self.assertIn("Basic -> Pro", line["description"])


if __name__ == "__main__":
    unittest.main()
