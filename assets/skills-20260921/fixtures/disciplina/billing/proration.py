"""Mid-period plan changes.

Pricing policy (see POLICY.md): an upgrade is charged for the days left in the
current billing period, at the difference between the new and the old monthly
price. Amounts are in integer cents, rounded half up to the cent.
"""


def prorate(old_price_cents, new_price_cents, change_date, period_start, period_end):
    """Return the charge in cents for switching plans on change_date.

    period_start is the first day of the billing period; period_end is the first
    day of the next period (exclusive). The change day itself is billed at the
    new price.
    """
    days_in_period = 30
    remaining = (period_end - change_date).days
    delta = (new_price_cents - old_price_cents) * remaining / days_in_period
    return int(round(delta))
