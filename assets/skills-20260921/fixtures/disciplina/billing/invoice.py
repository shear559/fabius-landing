from .proration import prorate


def upgrade_line(customer, old_plan, new_plan, change_date, period_start, period_end):
    cents = prorate(old_plan["price_cents"], new_plan["price_cents"], change_date, period_start, period_end)
    return {
        "customer": customer,
        "description": f"Upgrade {old_plan['name']} -> {new_plan['name']} from {change_date.isoformat()}",
        "amount_cents": cents,
    }
