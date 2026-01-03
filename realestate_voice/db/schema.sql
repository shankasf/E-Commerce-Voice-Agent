-- Real Estate Property Management Voice Agent Database Schema
-- Designed for Supabase/PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Property Management Companies
CREATE TABLE IF NOT EXISTS companies (
    company_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    office_hours VARCHAR(255) DEFAULT '9:00 AM - 5:00 PM, Monday - Friday',
    emergency_phone VARCHAR(50),
    website VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Properties (Buildings/Complexes)
CREATE TABLE IF NOT EXISTS properties (
    property_id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    property_type VARCHAR(50) DEFAULT 'apartment', -- apartment, condo, townhouse, single-family
    total_units INTEGER DEFAULT 1,
    year_built INTEGER,
    amenities TEXT[], -- Array of amenities
    description TEXT,
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, under_construction
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Units (Individual rental units within properties)
CREATE TABLE IF NOT EXISTS units (
    unit_id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(property_id) ON DELETE CASCADE,
    unit_number VARCHAR(50) NOT NULL,
    bedrooms INTEGER DEFAULT 1,
    bathrooms DECIMAL(3,1) DEFAULT 1.0,
    square_feet INTEGER,
    floor INTEGER,
    rent_amount DECIMAL(10,2),
    deposit_amount DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'available', -- available, occupied, maintenance, reserved
    features TEXT[], -- Array of unit-specific features
    available_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenants
CREATE TABLE IF NOT EXISTS tenants (
    tenant_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    alternate_phone VARCHAR(50),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    date_of_birth DATE,
    ssn_last_four VARCHAR(4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on phone for quick lookups
CREATE INDEX IF NOT EXISTS idx_tenants_phone ON tenants(phone);

-- Leases
CREATE TABLE IF NOT EXISTS leases (
    lease_id SERIAL PRIMARY KEY,
    unit_id INTEGER REFERENCES units(unit_id) ON DELETE CASCADE,
    tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    rent_amount DECIMAL(10,2) NOT NULL,
    deposit_amount DECIMAL(10,2),
    deposit_paid BOOLEAN DEFAULT FALSE,
    lease_type VARCHAR(50) DEFAULT 'annual', -- annual, month-to-month, short-term
    status VARCHAR(50) DEFAULT 'active', -- pending, active, expired, terminated
    auto_renew BOOLEAN DEFAULT FALSE,
    renewal_notice_days INTEGER DEFAULT 60,
    documents TEXT[], -- Array of document URLs
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- MAINTENANCE TABLES
-- =====================================================

-- Maintenance Categories
CREATE TABLE IF NOT EXISTS maintenance_categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    priority_level INTEGER DEFAULT 3, -- 1=emergency, 2=urgent, 3=normal, 4=low
    typical_response_hours INTEGER DEFAULT 48
);

-- Insert default maintenance categories
INSERT INTO maintenance_categories (name, description, priority_level, typical_response_hours) VALUES
('Plumbing', 'Water leaks, clogged drains, toilet issues', 2, 24),
('Electrical', 'Power outages, faulty outlets, lighting issues', 2, 24),
('HVAC', 'Heating, ventilation, air conditioning', 2, 24),
('Appliances', 'Refrigerator, stove, dishwasher, washer/dryer', 3, 48),
('Structural', 'Walls, floors, ceilings, windows, doors', 3, 72),
('Pest Control', 'Insects, rodents, wildlife', 3, 48),
('Locks & Security', 'Door locks, security systems, key issues', 2, 24),
('Emergency', 'Fire, flood, gas leak, no heat in winter', 1, 2),
('General', 'Other maintenance requests', 4, 72)
ON CONFLICT DO NOTHING;

-- Maintenance Requests (Work Orders)
CREATE TABLE IF NOT EXISTS maintenance_requests (
    request_id SERIAL PRIMARY KEY,
    unit_id INTEGER REFERENCES units(unit_id) ON DELETE CASCADE,
    tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE SET NULL,
    category_id INTEGER REFERENCES maintenance_categories(category_id),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal', -- emergency, urgent, normal, low
    status VARCHAR(50) DEFAULT 'open', -- open, assigned, in_progress, pending_parts, completed, cancelled
    reported_via VARCHAR(50) DEFAULT 'phone', -- phone, email, portal, in-person
    preferred_access_time VARCHAR(255), -- When tenant prefers maintenance to visit
    permission_to_enter BOOLEAN DEFAULT FALSE,
    assigned_to VARCHAR(255), -- Name of maintenance person/vendor
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    scheduled_date TIMESTAMP WITH TIME ZONE,
    completed_date TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    photos TEXT[], -- Array of photo URLs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Maintenance Request Comments/Updates
CREATE TABLE IF NOT EXISTS maintenance_comments (
    comment_id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES maintenance_requests(request_id) ON DELETE CASCADE,
    author_type VARCHAR(20) NOT NULL, -- tenant, staff, vendor
    author_name VARCHAR(255),
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PAYMENT TABLES
-- =====================================================

-- Payment Methods
CREATE TABLE IF NOT EXISTS payment_methods (
    method_id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    method_type VARCHAR(50) NOT NULL, -- bank_account, credit_card, debit_card
    last_four VARCHAR(4),
    bank_name VARCHAR(255),
    is_default BOOLEAN DEFAULT FALSE,
    nickname VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments/Transactions
CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    lease_id INTEGER REFERENCES leases(lease_id) ON DELETE SET NULL,
    tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_type VARCHAR(50) NOT NULL, -- rent, deposit, late_fee, utility, other
    payment_method VARCHAR(50), -- online, check, cash, money_order, ach
    payment_date DATE NOT NULL,
    due_date DATE,
    status VARCHAR(50) DEFAULT 'completed', -- pending, completed, failed, refunded
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rent Balance Ledger
CREATE TABLE IF NOT EXISTS rent_ledger (
    ledger_id SERIAL PRIMARY KEY,
    lease_id INTEGER REFERENCES leases(lease_id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- charge, payment, credit, late_fee, adjustment
    description VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL, -- Positive for charges, negative for payments
    balance DECIMAL(10,2) NOT NULL, -- Running balance after this transaction
    reference_id INTEGER, -- Link to payment_id or other reference
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- COMMUNICATION TABLES
-- =====================================================

-- Call Logs
CREATE TABLE IF NOT EXISTS call_logs (
    call_id SERIAL PRIMARY KEY,
    call_sid VARCHAR(100) UNIQUE,
    session_id VARCHAR(100),
    tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE SET NULL,
    phone_from VARCHAR(50),
    phone_to VARCHAR(50),
    direction VARCHAR(20) DEFAULT 'inbound', -- inbound, outbound
    status VARCHAR(50) DEFAULT 'completed', -- ringing, in-progress, completed, failed
    duration_seconds INTEGER,
    agent_type VARCHAR(100), -- Which AI agent handled the call
    call_summary TEXT,
    transcript TEXT,
    sentiment VARCHAR(20), -- positive, neutral, negative
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE
);

-- Notifications/Alerts
CREATE TABLE IF NOT EXISTS notifications (
    notification_id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- rent_reminder, maintenance_update, lease_renewal, emergency
    title VARCHAR(255),
    message TEXT NOT NULL,
    channel VARCHAR(50) DEFAULT 'sms', -- sms, email, push, call
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, failed
    scheduled_for TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- STAFF/USER TABLES
-- =====================================================

-- Staff Members
CREATE TABLE IF NOT EXISTS staff (
    staff_id SERIAL PRIMARY KEY,
    company_id INTEGER REFERENCES companies(company_id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    role VARCHAR(50) DEFAULT 'property_manager', -- admin, property_manager, maintenance, leasing
    properties INTEGER[], -- Array of property_ids they manage
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- VIEWS FOR COMMON QUERIES
-- =====================================================

-- Tenant Summary View
CREATE OR REPLACE VIEW tenant_summary AS
SELECT 
    t.tenant_id,
    t.first_name,
    t.last_name,
    t.phone,
    t.email,
    l.lease_id,
    l.start_date,
    l.end_date,
    l.rent_amount,
    l.status as lease_status,
    u.unit_number,
    p.name as property_name,
    p.address as property_address,
    COALESCE(
        (SELECT SUM(amount) FROM rent_ledger WHERE lease_id = l.lease_id),
        0
    ) as current_balance
FROM tenants t
LEFT JOIN leases l ON t.tenant_id = l.tenant_id AND l.status = 'active'
LEFT JOIN units u ON l.unit_id = u.unit_id
LEFT JOIN properties p ON u.property_id = p.property_id;

-- Open Maintenance Requests View
CREATE OR REPLACE VIEW open_maintenance AS
SELECT 
    mr.request_id,
    mr.title,
    mr.description,
    mr.priority,
    mr.status,
    mr.created_at,
    mc.name as category,
    t.first_name || ' ' || t.last_name as tenant_name,
    t.phone as tenant_phone,
    u.unit_number,
    p.name as property_name
FROM maintenance_requests mr
LEFT JOIN maintenance_categories mc ON mr.category_id = mc.category_id
LEFT JOIN tenants t ON mr.tenant_id = t.tenant_id
LEFT JOIN units u ON mr.unit_id = u.unit_id
LEFT JOIN properties p ON u.property_id = p.property_id
WHERE mr.status NOT IN ('completed', 'cancelled')
ORDER BY 
    CASE mr.priority 
        WHEN 'emergency' THEN 1 
        WHEN 'urgent' THEN 2 
        WHEN 'normal' THEN 3 
        ELSE 4 
    END,
    mr.created_at;

-- =====================================================
-- SAMPLE DATA FOR TESTING
-- =====================================================

-- Insert sample company
INSERT INTO companies (name, phone, email, address, emergency_phone) VALUES
('Sunrise Property Management', '555-123-4567', 'info@sunrisepm.com', '100 Main Street, Suite 200, Anytown, ST 12345', '555-911-0000')
ON CONFLICT DO NOTHING;

-- Insert sample properties
INSERT INTO properties (company_id, name, address, city, state, zip_code, property_type, total_units, amenities) VALUES
(1, 'Sunset Apartments', '500 Sunset Boulevard', 'Anytown', 'ST', '12345', 'apartment', 50, ARRAY['Pool', 'Gym', 'Laundry', 'Parking', 'Pet Friendly']),
(1, 'Riverside Condos', '200 River Road', 'Anytown', 'ST', '12346', 'condo', 30, ARRAY['Waterfront', 'Gym', 'Concierge', 'Parking Garage']),
(1, 'Garden View Townhomes', '300 Garden Lane', 'Anytown', 'ST', '12347', 'townhouse', 20, ARRAY['Private Yard', 'Garage', 'Community Pool'])
ON CONFLICT DO NOTHING;

-- Insert sample units
INSERT INTO units (property_id, unit_number, bedrooms, bathrooms, square_feet, floor, rent_amount, deposit_amount, status) VALUES
(1, '101', 1, 1.0, 750, 1, 1200.00, 1200.00, 'occupied'),
(1, '102', 2, 1.0, 950, 1, 1450.00, 1450.00, 'occupied'),
(1, '201', 2, 2.0, 1100, 2, 1650.00, 1650.00, 'available'),
(1, '301', 3, 2.0, 1400, 3, 2100.00, 2100.00, 'available'),
(2, 'A1', 2, 2.0, 1200, 1, 2200.00, 2200.00, 'occupied'),
(2, 'B3', 3, 2.5, 1600, 3, 2800.00, 2800.00, 'available')
ON CONFLICT DO NOTHING;

-- Insert sample tenants
INSERT INTO tenants (first_name, last_name, email, phone, emergency_contact_name, emergency_contact_phone) VALUES
('John', 'Smith', 'john.smith@email.com', '+15551234567', 'Jane Smith', '555-999-8888'),
('Sarah', 'Johnson', 'sarah.j@email.com', '+15559876543', 'Mike Johnson', '555-888-7777'),
('Michael', 'Williams', 'mwilliams@email.com', '+15555551234', 'Lisa Williams', '555-777-6666')
ON CONFLICT DO NOTHING;

-- Insert sample leases
INSERT INTO leases (unit_id, tenant_id, start_date, end_date, rent_amount, deposit_amount, deposit_paid, status) VALUES
(1, 1, '2024-01-01', '2025-01-01', 1200.00, 1200.00, TRUE, 'active'),
(2, 2, '2024-03-01', '2025-03-01', 1450.00, 1450.00, TRUE, 'active'),
(5, 3, '2024-06-01', '2025-06-01', 2200.00, 2200.00, TRUE, 'active')
ON CONFLICT DO NOTHING;

-- Insert sample rent ledger entries
INSERT INTO rent_ledger (lease_id, transaction_date, transaction_type, description, amount, balance) VALUES
(1, '2024-12-01', 'charge', 'December 2024 Rent', 1200.00, 1200.00),
(1, '2024-12-05', 'payment', 'Online Payment', -1200.00, 0.00),
(2, '2024-12-01', 'charge', 'December 2024 Rent', 1450.00, 1450.00),
(2, '2024-12-10', 'payment', 'Check Payment', -1450.00, 0.00),
(3, '2024-12-01', 'charge', 'December 2024 Rent', 2200.00, 2200.00)
ON CONFLICT DO NOTHING;

-- Insert sample maintenance request
INSERT INTO maintenance_requests (unit_id, tenant_id, category_id, title, description, priority, status, permission_to_enter) VALUES
(1, 1, 1, 'Leaky Kitchen Faucet', 'The kitchen faucet is dripping constantly. It has been getting worse over the past week.', 'normal', 'open', TRUE),
(2, 2, 3, 'AC Not Cooling', 'The air conditioner is running but not cooling the apartment. Temperature stays above 80 degrees.', 'urgent', 'assigned', TRUE)
ON CONFLICT DO NOTHING;

-- =====================================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- =====================================================

-- Function to calculate current balance for a lease
CREATE OR REPLACE FUNCTION get_lease_balance(p_lease_id INTEGER)
RETURNS DECIMAL(10,2) AS $$
BEGIN
    RETURN COALESCE(
        (SELECT SUM(amount) FROM rent_ledger WHERE lease_id = p_lease_id),
        0
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get next rent due date
CREATE OR REPLACE FUNCTION get_next_rent_due(p_lease_id INTEGER)
RETURNS DATE AS $$
DECLARE
    v_start_date DATE;
    v_next_due DATE;
BEGIN
    SELECT start_date INTO v_start_date FROM leases WHERE lease_id = p_lease_id;
    
    -- Calculate next due date (same day of month as lease start)
    v_next_due := DATE_TRUNC('month', CURRENT_DATE) + (EXTRACT(DAY FROM v_start_date) - 1) * INTERVAL '1 day';
    
    IF v_next_due <= CURRENT_DATE THEN
        v_next_due := v_next_due + INTERVAL '1 month';
    END IF;
    
    RETURN v_next_due;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to relevant tables
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_units_updated_at ON units;
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leases_updated_at ON leases;
CREATE TRIGGER update_leases_updated_at BEFORE UPDATE ON leases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_maintenance_requests_updated_at ON maintenance_requests;
CREATE TRIGGER update_maintenance_requests_updated_at BEFORE UPDATE ON maintenance_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_staff_updated_at ON staff;
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (for Supabase)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rent_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SERVICE ROLE POLICIES (Full access for service key)
-- These policies allow the service role (used by backend) full access
-- =====================================================

-- Companies
CREATE POLICY service_role_companies ON companies FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Properties
CREATE POLICY service_role_properties ON properties FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Units
CREATE POLICY service_role_units ON units FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Tenants
CREATE POLICY service_role_tenants ON tenants FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Leases
CREATE POLICY service_role_leases ON leases FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Maintenance Categories
CREATE POLICY service_role_maintenance_categories ON maintenance_categories FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Maintenance Requests
CREATE POLICY service_role_maintenance_requests ON maintenance_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Maintenance Comments
CREATE POLICY service_role_maintenance_comments ON maintenance_comments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Payment Methods
CREATE POLICY service_role_payment_methods ON payment_methods FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Payments
CREATE POLICY service_role_payments ON payments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Rent Ledger
CREATE POLICY service_role_rent_ledger ON rent_ledger FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Call Logs
CREATE POLICY service_role_call_logs ON call_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Notifications
CREATE POLICY service_role_notifications ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Staff
CREATE POLICY service_role_staff ON staff FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================
-- PUBLIC READ POLICIES (for anon/authenticated if needed later)
-- =====================================================

-- Public can read available properties and units
CREATE POLICY public_read_properties ON properties FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY public_read_units ON units FOR SELECT TO anon, authenticated USING (status = 'available');
CREATE POLICY public_read_maintenance_categories ON maintenance_categories FOR SELECT TO anon, authenticated USING (true);
