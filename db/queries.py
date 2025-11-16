
from datetime import datetime
from typing import Any, List, Optional

from agents import function_tool

from .connection import get_connection


def _close_cursor(cur) -> None:
    conn = cur.connection
    cur.close()
    conn.close()


def _normalize_choice(value: str, choices: List[str]) -> Optional[str]:
    lowered = value.strip().lower()
    for option in choices:
        if lowered == option.lower():
            return option
    return None


ORDER_STATUSES = [
    "Pending",
    "Paid",
    "Cancelled",
    "Refunded",
    "PartiallyRefunded",
    "Fulfilled",
]

PAYMENT_STATUSES = [
    "Pending",
    "Authorized",
    "Captured",
    "Failed",
    "Cancelled",
]

ITEM_TYPES = ["Product", "Ticket", "Party"]
PARTY_STATUSES = [
    "Pending",
    "Confirmed",
    "Cancelled",
    "Completed",
    "Refunded",
    "Rescheduled",
]


@function_tool
def create_customer_profile(
    full_name: str,
    email: str,
    phone: str,
    guardian_name: str,
    child_name: str,
    child_birthdate: str,
    notes: str = "",
) -> str:
    """
    Create a customer record with the provided details and return the new customer_id.
    All fields should be collected during checkout.
    """
    if not full_name.strip():
        return "full_name is required."

    try:
        birthdate_value = (
            datetime.strptime(child_birthdate, "%Y-%m-%d").date()
            if child_birthdate
            else None
        )
    except ValueError:
        return "child_birthdate must use YYYY-MM-DD format."

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            INSERT INTO customers (
                full_name,
                email,
                phone,
                guardian_name,
                child_name,
                child_birthdate,
                notes
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING customer_id
            """,
            (
                full_name.strip(),
                email.strip() or None,
                phone.strip() or None,
                guardian_name.strip() or None,
                child_name.strip() or None,
                birthdate_value,
                notes.strip() or None,
            ),
        )
        customer_id = cur.fetchone()[0]
        conn.commit()
        return f"Customer profile created. customer_id={customer_id}"
    finally:
        _close_cursor(cur)


@function_tool
def search_products(
    keyword: str = "",
    category: str = "",
    age_group: str = "",
    max_results: int = 5,
) -> str:
    """
    Look up active products that match optional filters.
    """
    max_results = max(1, min(max_results, 20))
    conn = get_connection()
    cur = conn.cursor()
    try:
        conditions: List[str] = ["p.is_active = TRUE"]
        params: List[Any] = []
        if keyword:
            like = f"%{keyword}%"
            conditions.append(
                "(p.product_name ILIKE %s OR p.brand ILIKE %s OR COALESCE(p.sku, '') ILIKE %s)"
            )
            params.extend([like, like, like])
        if category:
            conditions.append("p.category ILIKE %s")
            params.append(f"%{category}%")
        if age_group:
            conditions.append("p.age_group ILIKE %s")
            params.append(f"%{age_group}%")

        query = """
            SELECT p.product_id, p.product_name, p.category, p.age_group, p.price_usd, p.stock_qty
            FROM products p
        """
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += " ORDER BY p.stock_qty DESC, p.price_usd ASC LIMIT %s"
        params.append(max_results)

        cur.execute(query, params)
        rows = cur.fetchall()
        if not rows:
            return "No matching toys found."

        lines = ["Matching toys:"]
        for product_id, name, cat, age, price, stock in rows:
            age_text = f" for ages {age}" if age else ""
            lines.append(
                f"- #{product_id} {name} ({cat or 'Uncategorized'}{age_text}) - "
                f"${price:.2f}, stock {stock}"
            )
        return "\n".join(lines)
    finally:
        _close_cursor(cur)


@function_tool
def get_product_details(product_id: int) -> str:
    """
    Return enriched product information, including description and features.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT product_name, brand, category, age_group, material, color,
                   price_usd, stock_qty, rating, description, features, country
            FROM products
            WHERE product_id = %s AND is_active = TRUE
            """,
            (product_id,),
        )
        row = cur.fetchone()
        if not row:
            return "Toy not found or inactive."

        (
            name,
            brand,
            category,
            age_group,
            material,
            color,
            price,
            stock_qty,
            rating,
            description,
            features,
            country,
        ) = row

        details = [
            f"{name} details:",
            f"- Brand: {brand or 'N/A'}",
            f"- Category: {category or 'N/A'}",
            f"- Age group: {age_group or 'All ages'}",
            f"- Material: {material or 'Not specified'}",
            f"- Color: {color or 'Various'}",
            f"- Price: ${price:.2f}",
            f"- Stock: {stock_qty}",
        ]
        if rating is not None:
            details.append(f"- Rating: {rating:.2f}/5")
        if country:
            details.append(f"- Country of origin: {country}")
        if description:
            details.append(f"\nDescription:\n{description.strip()}")
        if features:
            details.append(f"\nFeatures:\n{features.strip()}")
        return "\n".join(details)
    finally:
        _close_cursor(cur)


@function_tool
def get_ticket_pricing(location_name: str = "") -> str:
    """
    Summarize active ticket pricing, optionally filtered by location name.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        params: List[Any] = []
        query = """
            SELECT
                t.name,
                t.base_price_usd,
                t.requires_waiver,
                t.requires_grip_socks,
                COALESCE(l.name, 'All Locations') AS location_name
            FROM ticket_types t
            LEFT JOIN locations l ON l.location_id = t.location_id
            WHERE t.is_active = TRUE
        """
        if location_name:
            query += " AND COALESCE(l.name, 'All Locations') ILIKE %s"
            params.append(f"%{location_name}%")
        query += " ORDER BY COALESCE(l.name, 'All Locations'), t.base_price_usd"

        cur.execute(query, params)
        rows = cur.fetchall()
        if not rows:
            return "No ticket options available for that location."

        lines = ["Admission ticket pricing:"]
        for name, price, waiver, socks, location in rows:
            tags: List[str] = []
            if waiver:
                tags.append("waiver required")
            if socks:
                tags.append("grip socks required")
            tag_text = f" ({', '.join(tags)})" if tags else ""
            lines.append(f"- {location}: {name} - ${price:.2f}{tag_text}")
        return "\n".join(lines)
    finally:
        _close_cursor(cur)


@function_tool
def list_party_packages(location_name: str = "") -> str:
    """
    List party packages with pricing and inclusions.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        params: List[Any] = []
        query = """
            SELECT
                COALESCE(l.name, 'All Locations') AS location_name,
                pp.name,
                pp.price_usd,
                pp.base_children,
                pp.base_room_hours,
                pp.includes_food,
                pp.includes_drinks,
                pp.includes_decor,
                STRING_AGG(
                    pi.item_name || ' x' || COALESCE(pi.quantity::TEXT, '1'),
                    ', ' ORDER BY pi.item_name
                ) AS inclusions
            FROM party_packages pp
            LEFT JOIN locations l ON l.location_id = pp.location_id
            LEFT JOIN package_inclusions pi ON pi.package_id = pp.package_id
            WHERE pp.is_active = TRUE
        """
        if location_name:
            query += " AND COALESCE(l.name, 'All Locations') ILIKE %s"
            params.append(f"%{location_name}%")
        query += """
            GROUP BY
                COALESCE(l.name, 'All Locations'),
                pp.package_id,
                pp.name,
                pp.price_usd,
                pp.base_children,
                pp.base_room_hours,
                pp.includes_food,
                pp.includes_drinks,
                pp.includes_decor
            ORDER BY COALESCE(l.name, 'All Locations'), pp.price_usd
        """

        cur.execute(query, params)
        rows = cur.fetchall()
        if not rows:
            return "No party packages found."

        lines = ["Party packages:"]
        for (
            location,
            name,
            price,
            base_children,
            base_hours,
            food,
            drinks,
            decor,
            inclusions,
        ) in rows:
            perks: List[str] = []
            if food:
                perks.append("food")
            if drinks:
                perks.append("drinks")
            if decor:
                perks.append("decor")
            perk_text = f" Includes {', '.join(perks)}." if perks else ""
            inclusion_text = f" Inclusions: {inclusions}." if inclusions else ""
            lines.append(
                f"- {location}: {name} - ${price:.2f} for {base_children} kids, "
                f"{base_hours:g} hours.{perk_text}{inclusion_text}"
            )
        return "\n".join(lines)
    finally:
        _close_cursor(cur)


@function_tool
def get_party_availability(
    start_datetime: str,
    end_datetime: str,
    location_name: str = "",
) -> str:
    """
    Show booked party room slots within a window to help gauge availability.
    """
    try:
        start = datetime.fromisoformat(start_datetime)
        end = datetime.fromisoformat(end_datetime)
    except ValueError:
        return "Invalid datetime. Use ISO format like 2025-01-15T14:00."
    if end <= start:
        return "end_datetime must be after start_datetime."

    conn = get_connection()
    cur = conn.cursor()
    try:
        params: List[Any] = [end, start]
        query = """
            SELECT
                r.name AS room_name,
                pb.scheduled_start,
                pb.scheduled_end,
                pb.status,
                l.name AS location_name
            FROM party_bookings pb
            JOIN resources r ON r.resource_id = pb.resource_id
            JOIN locations l ON l.location_id = r.location_id
            WHERE pb.status IN ('Pending', 'Confirmed')
              AND pb.scheduled_start < %s
              AND pb.scheduled_end > %s
        """
        if location_name:
            query += " AND l.name ILIKE %s"
            params.append(f"%{location_name}%")
        query += " ORDER BY COALESCE(l.name, ''), r.name, pb.scheduled_start"

        cur.execute(query, params)
        rows = cur.fetchall()
        if not rows:
            return "No existing bookings; all rooms appear open in that window."

        lines = ["Booked party slots in that window:"]
        for room_name, booked_start, booked_end, status, loc_name in rows:
            lines.append(
                f"- {loc_name} - {room_name} booked {booked_start:%Y-%m-%d %H:%M} "
                f"to {booked_end:%H:%M} ({status})"
            )
        return "\n".join(lines)
    finally:
        _close_cursor(cur)


@function_tool
def create_party_booking(
    customer_id: int,
    package_id: int,
    resource_id: int,
    scheduled_start: str,
    scheduled_end: str,
    additional_kids: int = 0,
    additional_guests: int = 0,
    special_requests: str = "",
    status: str = "Pending",
) -> str:
    """
    Create a new party booking record.
    """
    if additional_kids < 0 or additional_guests < 0:
        return "additional_kids and additional_guests must be zero or greater."

    normalized_status = _normalize_choice(status, PARTY_STATUSES)
    if not normalized_status:
        return "Status must be one of: " + ", ".join(PARTY_STATUSES)

    try:
        start_dt = datetime.fromisoformat(scheduled_start)
        end_dt = datetime.fromisoformat(scheduled_end)
    except ValueError:
        return "Invalid datetime format. Use ISO format, e.g., 2025-11-03T12:00."
    if end_dt <= start_dt:
        return "scheduled_end must be after scheduled_start."

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT 1 FROM customers WHERE customer_id = %s",
            (customer_id,),
        )
        if not cur.fetchone():
            conn.rollback()
            return "Customer not found. Please create a customer profile first."

        # Ensure the room is available
        cur.execute(
            """
            SELECT 1
            FROM party_bookings
            WHERE resource_id = %s
              AND status IN ('Pending', 'Confirmed')
              AND scheduled_start < %s
              AND scheduled_end > %s
            LIMIT 1
            """,
            (resource_id, end_dt, start_dt),
        )
        if cur.fetchone():
            conn.rollback()
            return "That room is already booked during the requested time."

        cur.execute(
            """
            INSERT INTO party_bookings (
                package_id,
                resource_id,
                customer_id,
                scheduled_start,
                scheduled_end,
                status,
                additional_kids,
                additional_guests,
                special_requests
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING booking_id
            """,
            (
                package_id,
                resource_id,
                customer_id,
                start_dt,
                end_dt,
                normalized_status,
                additional_kids,
                additional_guests,
                special_requests.strip() or None,
            ),
        )
        booking_id = cur.fetchone()[0]
        conn.commit()
        return (
            f"Created party booking #{booking_id} from {start_dt:%Y-%m-%d %H:%M} "
            f"to {end_dt:%Y-%m-%d %H:%M} with status {normalized_status}."
        )
    finally:
        _close_cursor(cur)


@function_tool
def update_party_booking(
    booking_id: int,
    status: str = "",
    scheduled_start: str = "",
    scheduled_end: str = "",
    additional_kids: Optional[int] = None,
    additional_guests: Optional[int] = None,
    special_requests: Optional[str] = None,
    reschedule_reason: str = "",
) -> str:
    """
    Update fields on an existing party booking. Provide at least one field to change.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT resource_id, scheduled_start, scheduled_end, status
            FROM party_bookings
            WHERE booking_id = %s
            FOR UPDATE
            """,
            (booking_id,),
        )
        row = cur.fetchone()
        if not row:
            conn.rollback()
            return "Booking not found."

        resource_id, current_start, current_end, current_status = row

        updates: List[str] = []
        params: List[Any] = []

        new_start_dt = None
        new_end_dt = None

        if status:
            normalized_status = _normalize_choice(status, PARTY_STATUSES)
            if not normalized_status:
                conn.rollback()
                return "Status must be one of: " + ", ".join(PARTY_STATUSES)
            updates.append("status = %s")
            params.append(normalized_status)
        else:
            normalized_status = current_status

        if scheduled_start:
            try:
                new_start_dt = datetime.fromisoformat(scheduled_start)
            except ValueError:
                conn.rollback()
                return "Invalid scheduled_start datetime format."

        if scheduled_end:
            try:
                new_end_dt = datetime.fromisoformat(scheduled_end)
            except ValueError:
                conn.rollback()
                return "Invalid scheduled_end datetime format."

        final_start = new_start_dt or current_start
        final_end = new_end_dt or current_end
        if final_end <= final_start:
            conn.rollback()
            return "scheduled_end must be after scheduled_start."

        schedule_changed = (new_start_dt is not None) or (new_end_dt is not None)
        if schedule_changed:
            updates.append("scheduled_start = %s")
            params.append(final_start)
            updates.append("scheduled_end = %s")
            params.append(final_end)

            cur.execute(
                """
                SELECT 1
                FROM party_bookings
                WHERE resource_id = %s
                  AND booking_id <> %s
                  AND status IN ('Pending', 'Confirmed')
                  AND scheduled_start < %s
                  AND scheduled_end > %s
                LIMIT 1
                """,
                (resource_id, booking_id, final_end, final_start),
            )
            if cur.fetchone():
                conn.rollback()
                return "That room is already booked during the requested time."

        if additional_kids is not None:
            if additional_kids < 0:
                conn.rollback()
                return "additional_kids must be zero or greater."
            updates.append("additional_kids = %s")
            params.append(additional_kids)

        if additional_guests is not None:
            if additional_guests < 0:
                conn.rollback()
                return "additional_guests must be zero or greater."
            updates.append("additional_guests = %s")
            params.append(additional_guests)

        if special_requests is not None:
            updates.append("special_requests = %s")
            params.append(special_requests.strip() or None)

        if not updates:
            conn.rollback()
            return "No updates were provided."

        params.append(booking_id)
        cur.execute(
            f"""
            UPDATE party_bookings
            SET {", ".join(updates)}
            WHERE booking_id = %s
            """,
            params,
        )

        if schedule_changed and (final_start != current_start or final_end != current_end):
            cur.execute(
                """
                INSERT INTO party_reschedules (
                    booking_id,
                    old_start,
                    old_end,
                    new_start,
                    new_end,
                    reason
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (
                    booking_id,
                    current_start,
                    current_end,
                    final_start,
                    final_end,
                    reschedule_reason.strip() or None,
                ),
            )

        conn.commit()
        response = (
            f"Updated party booking #{booking_id}. Current status: {normalized_status}."
        )
        if schedule_changed:
            response += (
                f" New schedule: {final_start:%Y-%m-%d %H:%M} to {final_end:%Y-%m-%d %H:%M}."
            )
        return response
    finally:
        _close_cursor(cur)


@function_tool
def get_store_policies(topic: str = "") -> str:
    """
    Retrieve active policy notes, optionally filtered by a keyword.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        params: List[Any] = []
        query = """
            SELECT key, value
            FROM policies
            WHERE is_active = TRUE
        """
        if topic:
            query += " AND (key ILIKE %s OR value ILIKE %s)"
            like = f"%{topic}%"
            params.extend([like, like])
        query += " ORDER BY key"

        cur.execute(query, params)
        rows = cur.fetchall()
        if not rows:
            return "No active policies found for that topic."

        return "\n".join(f"- {key}: {value}" for key, value in rows)
    finally:
        _close_cursor(cur)


@function_tool
def list_store_locations(only_active: bool = True) -> str:
    """
    List store locations and their contact details.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        query = """
            SELECT
                l.location_id,
                l.name,
                l.address_line,
                l.city,
                l.state,
                l.postal_code,
                l.country,
                l.phone,
                l.email,
                l.is_active
            FROM locations l
            ORDER BY l.name
        """
        if only_active:
            query = query.replace("ORDER BY", "WHERE l.is_active = TRUE ORDER BY")

        cur.execute(query)
        rows = cur.fetchall()
        if not rows:
            return "No locations found."

        lines = ["Store locations:"]
        for (
            location_id,
            name,
            address,
            city,
            state,
            postal_code,
            country,
            phone,
            email,
            is_active,
        ) in rows:
            status = "Active" if is_active else "Inactive"
            address_parts = [part for part in [address, city, state, postal_code] if part]
            address_str = ", ".join(address_parts)
            lines.append(
                f"- #{location_id} {name} ({status}) – {address_str or 'Address not set'}; "
                f"Phone: {phone or 'N/A'}; Email: {email or 'N/A'}; Country: {country or 'N/A'}"
            )
        return "\n".join(lines)
    finally:
        _close_cursor(cur)


@function_tool
def search_orders(status: str = "", customer_name: str = "", limit: int = 5) -> str:
    """
    Search orders by status or customer name.
    """
    limit = max(1, min(limit, 20))
    conn = get_connection()
    cur = conn.cursor()
    try:
        conditions: List[str] = []
        params: List[Any] = []
        if status:
            conditions.append("LOWER(o.status) = LOWER(%s)")
            params.append(status)
        if customer_name:
            conditions.append("c.full_name ILIKE %s")
            params.append(f"%{customer_name}%")

        query = """
            SELECT o.order_id, o.order_type, o.status, o.total_usd, o.created_at,
                   COALESCE(c.full_name, 'Guest') AS customer_name
            FROM orders o
            LEFT JOIN customers c ON c.customer_id = o.customer_id
        """
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += " ORDER BY o.created_at DESC LIMIT %s"
        params.append(limit)

        cur.execute(query, params)
        rows = cur.fetchall()
        if not rows:
            return "No orders matched those filters."

        lines = ["Matching orders:"]
        for order_id, order_type, status_val, total, created, customer in rows:
            lines.append(
                f"- #{order_id} {customer} - {order_type} {status_val} "
                f"(${total:.2f}) created {created:%Y-%m-%d}"
            )
        return "\n".join(lines)
    finally:
        _close_cursor(cur)


@function_tool
def list_customer_orders(customer_id: int, limit: int = 5) -> str:
    """
    List recent orders for a specific customer.
    """
    limit = max(1, min(limit, 20))
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT order_id, order_type, status, total_usd, created_at
            FROM orders
            WHERE customer_id = %s
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (customer_id, limit),
        )
        rows = cur.fetchall()
        if not rows:
            return "No orders found for that customer."

        lines = [f"Recent orders for customer #{customer_id}:"]
        for order_id, order_type, status, total, created in rows:
            lines.append(
                f"- #{order_id} {order_type} {status} - ${total:.2f} on "
                f"{created:%Y-%m-%d}"
            )
        return "\n".join(lines)
    finally:
        _close_cursor(cur)


@function_tool
def get_order_details(order_id: int) -> str:
    """
    Provide a detailed view of an order, including items, payments, and refunds.
    """
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT o.order_id, o.order_type, o.status, o.subtotal_usd,
                   o.discount_usd, o.tax_usd, o.total_usd, o.notes,
                   o.created_at, o.updated_at,
                   COALESCE(c.full_name, 'Guest') AS customer_name,
                   COALESCE(c.email, '') AS customer_email,
                   COALESCE(l.name, 'All Locations') AS location_name
            FROM orders o
            LEFT JOIN customers c ON c.customer_id = o.customer_id
            LEFT JOIN locations l ON l.location_id = o.location_id
            WHERE o.order_id = %s
            """,
            (order_id,),
        )
        order_row = cur.fetchone()
        if not order_row:
            return "Order not found."

        (
            _order_id,
            order_type,
            status,
            subtotal,
            discount,
            tax,
            total,
            notes,
            created_at,
            updated_at,
            customer_name,
            customer_email,
            location_name,
        ) = order_row

        customer_line = f"Customer: {customer_name}"
        if customer_email:
            customer_line += f" ({customer_email})"

        lines = [
            f"Order #{order_id} ({order_type}) - {status}",
            customer_line,
            f"Location: {location_name}",
            (
                "Totals: "
                f"subtotal ${subtotal:.2f}, discount ${discount:.2f}, "
                f"tax ${tax:.2f}, total ${total:.2f}"
            ),
            f"Created: {created_at:%Y-%m-%d %H:%M}",
            f"Updated: {updated_at:%Y-%m-%d %H:%M}",
        ]
        if notes:
            lines.append(f"Notes:\n{notes.strip()}")

        cur.execute(
            """
            SELECT item_type,
                   COALESCE(
                       name_override,
                       CASE
                           WHEN item_type = 'Product' THEN p.product_name
                           WHEN item_type = 'Ticket' THEN t.name
                           WHEN item_type = 'Party' THEN CONCAT('Party booking ', oi.booking_id::text)
                           ELSE 'Line item'
                       END
                   ) AS display_name,
                   quantity,
                   unit_price_usd,
                   line_total_usd
            FROM order_items oi
            LEFT JOIN products p ON p.product_id = oi.product_id
            LEFT JOIN ticket_types t ON t.ticket_type_id = oi.ticket_type_id
            WHERE oi.order_id = %s
            ORDER BY oi.order_item_id
            """,
            (order_id,),
        )
        items = cur.fetchall()
        if items:
            lines.append("\nItems:")
            for item_type, display_name, qty, unit_price, line_total in items:
                lines.append(
                    f"- {display_name} ({item_type}) x{qty} @ ${unit_price:.2f} "
                    f"= ${line_total:.2f}"
                )

        cur.execute(
            """
            SELECT payment_id, provider, status, amount_usd, created_at
            FROM payments
            WHERE order_id = %s
            ORDER BY created_at DESC
            """,
            (order_id,),
        )
        payments = cur.fetchall()
        if payments:
            lines.append("\nPayments:")
            for payment_id, provider, payment_status, amount, created in payments:
                lines.append(
                    f"- Payment #{payment_id} via {provider} {payment_status} "
                    f"for ${amount:.2f} on {created:%Y-%m-%d}"
                )

        cur.execute(
            """
            SELECT refund_id, status, amount_usd, created_at, COALESCE(reason, '')
            FROM refunds
            WHERE order_id = %s
            ORDER BY created_at DESC
            """,
            (order_id,),
        )
        refunds = cur.fetchall()
        if refunds:
            lines.append("\nRefunds:")
            for refund_id, refund_status, amount, created, reason in refunds:
                reason_text = f" ({reason})" if reason else ""
                lines.append(
                    f"- Refund #{refund_id} {refund_status} for ${amount:.2f} "
                    f"on {created:%Y-%m-%d}{reason_text}"
                )

        return "\n".join(lines)
    finally:
        _close_cursor(cur)


@function_tool
def update_order_status(order_id: int, new_status: str, note: str = "") -> str:
    """
    Update the status of an order, optionally appending a note.
    """
    normalized = _normalize_choice(new_status, ORDER_STATUSES)
    if not normalized:
        return "Status must be one of: " + ", ".join(ORDER_STATUSES)

    conn = get_connection()
    cur = conn.cursor()
    try:
        if note.strip():
            note_entry = f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M')}] {note.strip()}"
            cur.execute(
                """
                UPDATE orders
                SET status = %s,
                    updated_at = NOW(),
                    notes = COALESCE(notes, '') || %s
                WHERE order_id = %s
                """,
                (normalized, note_entry, order_id),
            )
        else:
            cur.execute(
                """
                UPDATE orders
                SET status = %s,
                    updated_at = NOW()
                WHERE order_id = %s
                """,
                (normalized, order_id),
            )
        if cur.rowcount == 0:
            conn.rollback()
            return "Order not found."
        conn.commit()
        return f"Updated order {order_id} to {normalized}."
    finally:
        _close_cursor(cur)


@function_tool
def add_order_item(
    order_id: int,
    item_type: str,
    reference_id: int,
    quantity: int,
    unit_price_usd: float,
    name_override: str = "",
) -> str:
    """
    Add a new line item to an existing order and refresh totals.
    """
    normalized_type = _normalize_choice(item_type, ITEM_TYPES)
    if not normalized_type:
        return "Item type must be one of: " + ", ".join(ITEM_TYPES)
    if quantity <= 0:
        return "Quantity must be greater than zero."
    if unit_price_usd < 0:
        return "Unit price must be zero or greater."

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """
            SELECT subtotal_usd, discount_usd, tax_usd
            FROM orders
            WHERE order_id = %s
            """,
            (order_id,),
        )
        order_row = cur.fetchone()
        if not order_row:
            conn.rollback()
            return "Order not found."

        subtotal, discount, tax = order_row
        line_total = round(quantity * unit_price_usd, 2)

        product_id = reference_id if normalized_type == "Product" else None
        ticket_type_id = reference_id if normalized_type == "Ticket" else None
        booking_id = reference_id if normalized_type == "Party" else None

        cur.execute(
            """
            INSERT INTO order_items (
                order_id, item_type, product_id, ticket_type_id, booking_id,
                name_override, quantity, unit_price_usd, line_total_usd
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                order_id,
                normalized_type,
                product_id,
                ticket_type_id,
                booking_id,
                name_override.strip() or None,
                quantity,
                unit_price_usd,
                line_total,
            ),
        )

        new_subtotal = float(subtotal or 0) + line_total
        new_total = new_subtotal - float(discount or 0) + float(tax or 0)

        cur.execute(
            """
            UPDATE orders
            SET subtotal_usd = %s,
                total_usd = %s,
                updated_at = NOW()
            WHERE order_id = %s
            """,
            (new_subtotal, new_total, order_id),
        )

        conn.commit()
        return (
            f"Added {quantity} x {normalized_type} item to order {order_id}; "
            f"new total ${new_total:.2f}."
        )
    finally:
        _close_cursor(cur)


@function_tool
def create_order_with_item(
    customer_id: int,
    item_type: str,
    reference_id: int,
    quantity: int,
    unit_price_usd: float,
    location_id: Optional[int] = None,
    note: str = "",
    name_override: str = "",
) -> str:
    """
    Create a new order for a single line item (toy, ticket, or party booking).
    """
    normalized_type = _normalize_choice(item_type, ITEM_TYPES)
    if not normalized_type:
        return "Item type must be one of: " + ", ".join(ITEM_TYPES)
    if quantity <= 0:
        return "Quantity must be greater than zero."
    if unit_price_usd < 0:
        return "Unit price must be zero or greater."

    order_type_map = {
        "Product": "Retail",
        "Ticket": "Admission",
        "Party": "Party",
    }
    order_type = order_type_map[normalized_type]

    line_total = round(quantity * unit_price_usd, 2)
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT 1 FROM customers WHERE customer_id = %s",
            (customer_id,),
        )
        if not cur.fetchone():
            conn.rollback()
            return "Customer not found. Please create a customer profile before creating an order."

        cur.execute(
            """
            INSERT INTO orders (
                customer_id, location_id, order_type, status,
                subtotal_usd, discount_usd, tax_usd, total_usd, notes
            )
            VALUES (%s, %s, %s, 'Pending', %s, 0, 0, %s, %s)
            RETURNING order_id
            """,
            (
                customer_id,
                location_id,
                order_type,
                line_total,
                line_total,
                note.strip() or None,
            ),
        )
        order_id = cur.fetchone()[0]

        product_id = reference_id if normalized_type == "Product" else None
        ticket_type_id = reference_id if normalized_type == "Ticket" else None
        booking_id = reference_id if normalized_type == "Party" else None

        cur.execute(
            """
            INSERT INTO order_items (
                order_id, item_type, product_id, ticket_type_id, booking_id,
                name_override, quantity, unit_price_usd, line_total_usd
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                order_id,
                normalized_type,
                product_id,
                ticket_type_id,
                booking_id,
                name_override.strip() or None,
                quantity,
                unit_price_usd,
                line_total,
            ),
        )

        conn.commit()
        return f"Created order {order_id} ({order_type}) totaling ${line_total:.2f}."
    finally:
        _close_cursor(cur)


@function_tool
def record_payment(
    order_id: int,
    provider: str,
    amount_usd: float,
    provider_payment_id: str = "",
    payment_status: str = "Captured",
) -> str:
    """
    Record a payment attempt for an order.
    """
    if amount_usd <= 0:
        return "Amount must be greater than zero."
    normalized_status = _normalize_choice(payment_status, PAYMENT_STATUSES)
    if not normalized_status:
        return "Payment status must be one of: " + ", ".join(PAYMENT_STATUSES)

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT 1 FROM orders WHERE order_id = %s", (order_id,))
        if not cur.fetchone():
            conn.rollback()
            return "Order not found."

        cur.execute(
            """
            INSERT INTO payments (order_id, provider, provider_payment_id, status, amount_usd)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING payment_id
            """,
            (
                order_id,
                provider.strip() or "Manual",
                provider_payment_id.strip() or None,
                normalized_status,
                amount_usd,
            ),
        )
        payment_id = cur.fetchone()[0]
        conn.commit()
        return (
            f"Recorded payment {payment_id} ({normalized_status}) for order {order_id} "
            f"in the amount of ${amount_usd:.2f}."
        )
    finally:
        _close_cursor(cur)


@function_tool
def create_refund(
    order_id: int,
    amount_usd: float,
    reason: str = "",
    payment_id: Optional[int] = None,
) -> str:
    """
    Create a refund record linked to an order (and optional payment).
    """
    if amount_usd <= 0:
        return "Refund amount must be greater than zero."

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT 1 FROM orders WHERE order_id = %s", (order_id,))
        if not cur.fetchone():
            conn.rollback()
            return "Order not found."

        if payment_id is not None:
            cur.execute(
                "SELECT 1 FROM payments WHERE payment_id = %s AND order_id = %s",
                (payment_id, order_id),
            )
            if not cur.fetchone():
                conn.rollback()
                return "Payment not found for this order."

        cur.execute(
            """
            INSERT INTO refunds (payment_id, order_id, status, reason, amount_usd)
            VALUES (%s, %s, 'Pending', %s, %s)
            RETURNING refund_id
            """,
            (
                payment_id,
                order_id,
                reason.strip() or None,
                amount_usd,
            ),
        )
        refund_id = cur.fetchone()[0]
        conn.commit()
        return (
            f"Created refund {refund_id} for order {order_id} in the amount of "
            f"${amount_usd:.2f}."
        )
    finally:
        _close_cursor(cur)
