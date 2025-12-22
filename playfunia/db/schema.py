"""Utilities for provisioning the Postgres schema used by the agents."""

from __future__ import annotations

import argparse
from typing import Iterable

from .connection import get_connection


ORDER_STATUSES = (
    "Pending",
    "Paid",
    "Cancelled",
    "Refunded",
    "PartiallyRefunded",
    "Fulfilled",
)

PAYMENT_STATUSES = (
    "Pending",
    "Authorized",
    "Captured",
    "Failed",
    "Cancelled",
)

PARTY_STATUSES = (
    "Pending",
    "Confirmed",
    "Cancelled",
    "Completed",
    "Refunded",
    "Rescheduled",
)

ORDER_TYPES = ("Retail", "Admission", "Party")

def _array_literal(values: Iterable[str]) -> str:
    return "ARRAY[" + ", ".join(f"'{value}'" for value in values) + "]"


PARTY_STATUS_ARRAY = _array_literal(PARTY_STATUSES)
ORDER_STATUS_ARRAY = _array_literal(ORDER_STATUSES)
ORDER_TYPE_ARRAY = _array_literal(ORDER_TYPES)
PAYMENT_STATUS_ARRAY = _array_literal(PAYMENT_STATUSES)

SCHEMA_STATEMENTS: Iterable[str] = (
    # Core lookup tables
    """
    CREATE TABLE IF NOT EXISTS locations (
        location_id      BIGSERIAL PRIMARY KEY,
        name             TEXT NOT NULL,
        address_line     TEXT,
        city             TEXT,
        state            TEXT,
        postal_code      TEXT,
        country          TEXT,
        phone            TEXT,
        email            TEXT,
        is_active        BOOLEAN NOT NULL DEFAULT TRUE,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS customers (
        customer_id      BIGSERIAL PRIMARY KEY,
        full_name        TEXT NOT NULL,
        email            TEXT,
        phone            TEXT,
        guardian_name    TEXT,
        child_name       TEXT,
        child_birthdate  DATE,
        notes            TEXT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS products (
        product_id   BIGSERIAL PRIMARY KEY,
        product_name TEXT NOT NULL,
        brand        TEXT,
        category     TEXT,
        age_group    TEXT,
        material     TEXT,
        color        TEXT,
        sku          TEXT,
        price_usd    NUMERIC(10,2) NOT NULL DEFAULT 0,
        stock_qty    INTEGER NOT NULL DEFAULT 0,
        rating       NUMERIC(3,2),
        description  TEXT,
        features     TEXT,
        country      TEXT,
        is_active    BOOLEAN NOT NULL DEFAULT TRUE,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS ticket_types (
        ticket_type_id     BIGSERIAL PRIMARY KEY,
        location_id        BIGINT REFERENCES locations(location_id) ON DELETE SET NULL,
        name               TEXT NOT NULL,
        base_price_usd     NUMERIC(10,2) NOT NULL,
        requires_waiver    BOOLEAN NOT NULL DEFAULT FALSE,
        requires_grip_socks BOOLEAN NOT NULL DEFAULT FALSE,
        is_active          BOOLEAN NOT NULL DEFAULT TRUE,
        created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS resources (
        resource_id   BIGSERIAL PRIMARY KEY,
        location_id   BIGINT REFERENCES locations(location_id) ON DELETE SET NULL,
        name          TEXT NOT NULL,
        resource_type TEXT NOT NULL DEFAULT 'PartyRoom',
        capacity      INTEGER NOT NULL DEFAULT 0,
        is_active     BOOLEAN NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS party_packages (
        package_id       BIGSERIAL PRIMARY KEY,
        location_id      BIGINT REFERENCES locations(location_id) ON DELETE SET NULL,
        name             TEXT NOT NULL,
        price_usd        NUMERIC(10,2) NOT NULL,
        base_children    INTEGER NOT NULL DEFAULT 10,
        base_room_hours  NUMERIC(4,2) NOT NULL DEFAULT 2.0,
        includes_food    BOOLEAN NOT NULL DEFAULT FALSE,
        includes_drinks  BOOLEAN NOT NULL DEFAULT FALSE,
        includes_decor   BOOLEAN NOT NULL DEFAULT FALSE,
        is_active        BOOLEAN NOT NULL DEFAULT TRUE,
        description      TEXT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS package_inclusions (
        inclusion_id BIGSERIAL PRIMARY KEY,
        package_id   BIGINT NOT NULL REFERENCES party_packages(package_id) ON DELETE CASCADE,
        item_name    TEXT NOT NULL,
        quantity     INTEGER
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS policies (
        policy_id BIGSERIAL PRIMARY KEY,
        key       TEXT NOT NULL UNIQUE,
        value     TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    f"""
    CREATE TABLE IF NOT EXISTS party_bookings (
        booking_id        BIGSERIAL PRIMARY KEY,
        package_id        BIGINT REFERENCES party_packages(package_id) ON DELETE SET NULL,
        resource_id       BIGINT REFERENCES resources(resource_id) ON DELETE SET NULL,
        customer_id       BIGINT REFERENCES customers(customer_id) ON DELETE SET NULL,
        scheduled_start   TIMESTAMPTZ NOT NULL,
        scheduled_end     TIMESTAMPTZ NOT NULL,
        status            TEXT NOT NULL DEFAULT 'Pending' CHECK (status = ANY ({PARTY_STATUS_ARRAY})),
        additional_kids   INTEGER NOT NULL DEFAULT 0,
        additional_guests INTEGER NOT NULL DEFAULT 0,
        special_requests  TEXT,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS party_reschedules (
        reschedule_id BIGSERIAL PRIMARY KEY,
        booking_id    BIGINT NOT NULL REFERENCES party_bookings(booking_id) ON DELETE CASCADE,
        old_start     TIMESTAMPTZ NOT NULL,
        old_end       TIMESTAMPTZ NOT NULL,
        new_start     TIMESTAMPTZ NOT NULL,
        new_end       TIMESTAMPTZ NOT NULL,
        reason        TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    f"""
    CREATE TABLE IF NOT EXISTS orders (
        order_id      BIGSERIAL PRIMARY KEY,
        customer_id   BIGINT REFERENCES customers(customer_id) ON DELETE SET NULL,
        location_id   BIGINT REFERENCES locations(location_id) ON DELETE SET NULL,
        order_type    TEXT NOT NULL CHECK (order_type = ANY ({ORDER_TYPE_ARRAY})),
        status        TEXT NOT NULL DEFAULT 'Pending' CHECK (status = ANY ({ORDER_STATUS_ARRAY})),
        subtotal_usd  NUMERIC(10,2) NOT NULL DEFAULT 0,
        discount_usd  NUMERIC(10,2) NOT NULL DEFAULT 0,
        tax_usd       NUMERIC(10,2) NOT NULL DEFAULT 0,
        total_usd     NUMERIC(10,2) NOT NULL DEFAULT 0,
        notes         TEXT,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS order_items (
        order_item_id    BIGSERIAL PRIMARY KEY,
        order_id         BIGINT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
        item_type        TEXT NOT NULL CHECK (item_type IN ('Product', 'Ticket', 'Party')),
        product_id       BIGINT REFERENCES products(product_id) ON DELETE SET NULL,
        ticket_type_id   BIGINT REFERENCES ticket_types(ticket_type_id) ON DELETE SET NULL,
        booking_id       BIGINT REFERENCES party_bookings(booking_id) ON DELETE SET NULL,
        name_override    TEXT,
        quantity         INTEGER NOT NULL DEFAULT 1,
        unit_price_usd   NUMERIC(10,2) NOT NULL DEFAULT 0,
        line_total_usd   NUMERIC(10,2) NOT NULL DEFAULT 0,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    f"""
    CREATE TABLE IF NOT EXISTS payments (
        payment_id         BIGSERIAL PRIMARY KEY,
        order_id           BIGINT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
        provider           TEXT NOT NULL DEFAULT 'Manual',
        provider_payment_id TEXT,
        status             TEXT NOT NULL DEFAULT 'Pending' CHECK (status = ANY ({PAYMENT_STATUS_ARRAY})),
        amount_usd         NUMERIC(10,2) NOT NULL,
        created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS refunds (
        refund_id   BIGSERIAL PRIMARY KEY,
        payment_id  BIGINT REFERENCES payments(payment_id) ON DELETE SET NULL,
        order_id    BIGINT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
        status      TEXT NOT NULL DEFAULT 'Pending',
        reason      TEXT,
        amount_usd  NUMERIC(10,2) NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    # Helpful indexes
    "CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active)",
    "CREATE INDEX IF NOT EXISTS idx_ticket_types_active ON ticket_types(is_active)",
    "CREATE INDEX IF NOT EXISTS idx_party_bookings_resource ON party_bookings(resource_id, scheduled_start, scheduled_end)",
    "CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id)",
    "CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)",
)


def initialize_schema(verbose: bool = True) -> None:
    """Create all tables if they do not yet exist."""

    conn = get_connection()
    conn.autocommit = True
    cur = conn.cursor()
    try:
        for statement in SCHEMA_STATEMENTS:
            cur.execute(statement)
        if verbose:
            print(f"Applied {len(SCHEMA_STATEMENTS)} schema statements.")
    finally:
        cur.close()
        conn.close()


def _cli() -> None:
    parser = argparse.ArgumentParser(description="Create the Supabase schema if needed.")
    parser.add_argument("--quiet", action="store_true", help="Suppress success logging.")
    args = parser.parse_args()
    initialize_schema(verbose=not args.quiet)


if __name__ == "__main__":
    _cli()
