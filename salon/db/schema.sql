-- =====================================================
-- GLAMBOOK AI - Salon Booking Voice Agent Database Schema
-- For Supabase (PostgreSQL with Row Level Security)
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- DROP EXISTING OBJECTS (for clean re-run)
-- =====================================================

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS hourly_metrics CASCADE;
DROP TABLE IF EXISTS daily_metrics CASCADE;
DROP TABLE IF EXISTS elevenlabs_usage_logs CASCADE;
DROP TABLE IF EXISTS agent_interactions CASCADE;
DROP TABLE IF EXISTS call_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS appointment_addons CASCADE;
DROP TABLE IF EXISTS appointment_services CASCADE;
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS customer_favorites CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS stylist_services CASCADE;
DROP TABLE IF EXISTS stylist_time_off CASCADE;
DROP TABLE IF EXISTS stylist_schedules CASCADE;
DROP TABLE IF EXISTS stylists CASCADE;
DROP TABLE IF EXISTS service_addons CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS service_categories CASCADE;
DROP TABLE IF EXISTS salon_closures CASCADE;
DROP TABLE IF EXISTS business_hours CASCADE;
DROP TABLE IF EXISTS salon_settings CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop types
DROP TYPE IF EXISTS "CallDirection" CASCADE;
DROP TYPE IF EXISTS "CallStatus" CASCADE;
DROP TYPE IF EXISTS "DayOfWeek" CASCADE;
DROP TYPE IF EXISTS "PaymentMethod" CASCADE;
DROP TYPE IF EXISTS "PaymentStatus" CASCADE;
DROP TYPE IF EXISTS "AppointmentStatus" CASCADE;
DROP TYPE IF EXISTS "UserRole" CASCADE;
-- Also drop old snake_case types if they exist
DROP TYPE IF EXISTS call_direction CASCADE;
DROP TYPE IF EXISTS call_status CASCADE;
DROP TYPE IF EXISTS day_of_week CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS appointment_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- =====================================================
-- ENUMS
-- =====================================================

CREATE TYPE "UserRole" AS ENUM ('admin', 'customer');
CREATE TYPE "AppointmentStatus" AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'partial', 'refunded', 'failed');
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'card', 'online', 'wallet');
CREATE TYPE "DayOfWeek" AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');
CREATE TYPE "CallStatus" AS ENUM ('in_progress', 'completed', 'failed', 'abandoned');
CREATE TYPE "CallDirection" AS ENUM ('inbound', 'outbound');

-- =====================================================
-- 1. USERS & AUTHENTICATION
-- =====================================================

-- Users table (linked to Supabase Auth)
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID UNIQUE, -- Links to Supabase auth.users
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    role "UserRole" NOT NULL DEFAULT 'customer',
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);

-- =====================================================
-- 2. SALON CONFIGURATION
-- =====================================================

-- Salon profile/settings
CREATE TABLE salon_settings (
    setting_id SERIAL PRIMARY KEY,
    salon_name VARCHAR(255) NOT NULL DEFAULT 'GlamBook Salon',
    phone VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    currency VARCHAR(3) DEFAULT 'USD',
    logo_url TEXT,
    website VARCHAR(255),
    description TEXT,
    booking_notice_hours INT DEFAULT 24, -- Minimum hours before appointment
    cancellation_hours INT DEFAULT 24,   -- Hours before to allow free cancellation
    max_advance_booking_days INT DEFAULT 60, -- How far in advance can book
    slot_duration_minutes INT DEFAULT 30, -- Default slot duration
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business hours
CREATE TABLE business_hours (
    hours_id SERIAL PRIMARY KEY,
    day_of_week "DayOfWeek" NOT NULL,
    is_open BOOLEAN DEFAULT TRUE,
    open_time TIME NOT NULL DEFAULT '09:00',
    close_time TIME NOT NULL DEFAULT '18:00',
    break_start TIME, -- Optional lunch break
    break_end TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(day_of_week)
);

-- Special closures/holidays
CREATE TABLE salon_closures (
    closure_id SERIAL PRIMARY KEY,
    closure_date DATE NOT NULL,
    reason VARCHAR(255),
    is_full_day BOOLEAN DEFAULT TRUE,
    close_from TIME,
    close_until TIME,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 3. SERVICE CATEGORIES & SERVICES
-- =====================================================

-- Service categories (Hair, Nails, Spa, etc.)
CREATE TABLE service_categories (
    category_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    icon VARCHAR(50), -- Icon identifier
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services offered
CREATE TABLE services (
    service_id SERIAL PRIMARY KEY,
    category_id INT REFERENCES service_categories(category_id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL DEFAULT 30,
    price DECIMAL(10,2) NOT NULL,
    deposit_required BOOLEAN DEFAULT FALSE,
    deposit_amount DECIMAL(10,2),
    max_per_slot INT DEFAULT 1, -- How many can be booked in parallel
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_services_category ON services(category_id);
CREATE INDEX idx_services_active ON services(is_active);

-- Service add-ons (extra options like deep conditioning)
CREATE TABLE service_addons (
    addon_id SERIAL PRIMARY KEY,
    service_id INT REFERENCES services(service_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    duration_minutes INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 4. STYLISTS/STAFF
-- =====================================================

-- Staff members
CREATE TABLE stylists (
    stylist_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    bio TEXT,
    specialties TEXT[], -- Array of specialties
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    hire_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stylist working hours (overrides salon hours)
CREATE TABLE stylist_schedules (
    schedule_id SERIAL PRIMARY KEY,
    stylist_id INT REFERENCES stylists(stylist_id) ON DELETE CASCADE,
    day_of_week "DayOfWeek" NOT NULL,
    is_working BOOLEAN DEFAULT TRUE,
    start_time TIME NOT NULL DEFAULT '09:00',
    end_time TIME NOT NULL DEFAULT '18:00',
    break_start TIME,
    break_end TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stylist_id, day_of_week)
);

-- Stylist time off / blocked times
CREATE TABLE stylist_time_off (
    time_off_id SERIAL PRIMARY KEY,
    stylist_id INT REFERENCES stylists(stylist_id) ON DELETE CASCADE,
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    reason VARCHAR(255),
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Which services each stylist can perform
CREATE TABLE stylist_services (
    stylist_id INT REFERENCES stylists(stylist_id) ON DELETE CASCADE,
    service_id INT REFERENCES services(service_id) ON DELETE CASCADE,
    custom_price DECIMAL(10,2), -- Override service price for this stylist
    custom_duration INT, -- Override duration
    PRIMARY KEY (stylist_id, service_id)
);

-- =====================================================
-- 5. CUSTOMERS
-- =====================================================

-- Customer profiles (extends users)
CREATE TABLE customers (
    customer_id SERIAL PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    preferred_stylist_id INT REFERENCES stylists(stylist_id) ON DELETE SET NULL,
    notes TEXT, -- Admin notes about customer
    allergies TEXT, -- Product allergies
    preferences TEXT, -- Customer preferences
    birthday DATE,
    referral_source VARCHAR(100),
    total_visits INT DEFAULT 0,
    total_spent DECIMAL(12,2) DEFAULT 0,
    last_visit_at TIMESTAMPTZ,
    loyalty_points INT DEFAULT 0,
    is_vip BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customers_user ON customers(user_id);
-- Note: Phone lookup uses idx_users_phone on users table via JOIN

-- Customer favorite services
CREATE TABLE customer_favorites (
    customer_id INT REFERENCES customers(customer_id) ON DELETE CASCADE,
    service_id INT REFERENCES services(service_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (customer_id, service_id)
);

-- =====================================================
-- 6. APPOINTMENTS
-- =====================================================

-- Main appointments table
CREATE TABLE appointments (
    appointment_id SERIAL PRIMARY KEY,
    booking_reference VARCHAR(20) UNIQUE, -- Human-readable ref like "GB-20251228-001" (auto-generated by trigger)
    customer_id INT REFERENCES customers(customer_id) ON DELETE SET NULL,
    stylist_id INT REFERENCES stylists(stylist_id) ON DELETE SET NULL,
    
    -- Timing
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INT NOT NULL,
    
    -- Status & tracking
    status "AppointmentStatus" DEFAULT 'pending',
    confirmed_at TIMESTAMPTZ,
    checked_in_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    cancelled_by UUID, -- User who cancelled
    
    -- Pricing
    subtotal DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    discount_code VARCHAR(50),
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    deposit_paid DECIMAL(10,2) DEFAULT 0,
    
    -- Payment
    payment_status "PaymentStatus" DEFAULT 'pending',
    payment_method "PaymentMethod",
    paid_at TIMESTAMPTZ,
    
    -- Notes
    customer_notes TEXT, -- Notes from customer when booking
    staff_notes TEXT, -- Internal notes
    
    -- Source tracking
    booked_via VARCHAR(50) DEFAULT 'website', -- 'website', 'phone', 'walk_in', 'voice_agent'
    call_id VARCHAR(100), -- If booked via voice agent
    
    -- Reminders
    reminder_sent BOOLEAN DEFAULT FALSE,
    reminder_sent_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointments_customer ON appointments(customer_id);
CREATE INDEX idx_appointments_stylist ON appointments(stylist_id);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_booking_ref ON appointments(booking_reference);
CREATE INDEX idx_appointments_datetime ON appointments(appointment_date, start_time);

-- Services included in each appointment
CREATE TABLE appointment_services (
    appointment_service_id SERIAL PRIMARY KEY,
    appointment_id INT REFERENCES appointments(appointment_id) ON DELETE CASCADE,
    service_id INT REFERENCES services(service_id) ON DELETE SET NULL,
    service_name VARCHAR(255) NOT NULL, -- Snapshot at booking time
    price DECIMAL(10,2) NOT NULL,
    duration_minutes INT NOT NULL,
    sequence_order INT DEFAULT 1, -- Order of services
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointment_services_appt ON appointment_services(appointment_id);

-- Add-ons for appointment services
CREATE TABLE appointment_addons (
    appointment_addon_id SERIAL PRIMARY KEY,
    appointment_service_id INT REFERENCES appointment_services(appointment_service_id) ON DELETE CASCADE,
    addon_id INT REFERENCES service_addons(addon_id) ON DELETE SET NULL,
    addon_name VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 7. PAYMENTS & TRANSACTIONS
-- =====================================================

CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    appointment_id INT REFERENCES appointments(appointment_id) ON DELETE SET NULL,
    customer_id INT REFERENCES customers(customer_id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method "PaymentMethod" NOT NULL,
    payment_status "PaymentStatus" NOT NULL DEFAULT 'pending',
    transaction_id VARCHAR(255), -- External payment gateway ref
    payment_gateway VARCHAR(50), -- 'stripe', 'square', etc.
    paid_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ,
    refund_amount DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_appointment ON payments(appointment_id);
CREATE INDEX idx_payments_customer ON payments(customer_id);

-- =====================================================
-- 8. REVIEWS & RATINGS
-- =====================================================

CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    appointment_id INT UNIQUE REFERENCES appointments(appointment_id) ON DELETE CASCADE,
    customer_id INT REFERENCES customers(customer_id) ON DELETE SET NULL,
    stylist_id INT REFERENCES stylists(stylist_id) ON DELETE SET NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    admin_response TEXT,
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reviews_stylist ON reviews(stylist_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);

-- =====================================================
-- 9. PROMOTIONS & DISCOUNTS
-- =====================================================

CREATE TABLE promotions (
    promotion_id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed'
    discount_value DECIMAL(10,2) NOT NULL,
    min_purchase DECIMAL(10,2) DEFAULT 0,
    max_discount DECIMAL(10,2), -- Cap for percentage discounts
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ,
    usage_limit INT, -- Total uses allowed
    usage_count INT DEFAULT 0,
    per_customer_limit INT DEFAULT 1,
    applicable_services INT[], -- Array of service_ids, null = all
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_promotions_code ON promotions(code);
CREATE INDEX idx_promotions_active ON promotions(is_active);

-- =====================================================
-- 10. NOTIFICATIONS
-- =====================================================

CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'appointment_reminder', 'booking_confirmed', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB, -- Additional data (appointment_id, etc.)
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    sent_via VARCHAR(20), -- 'email', 'sms', 'push'
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE NOT is_read;

-- =====================================================
-- 11. VOICE AGENT - CALL LOGS & ANALYTICS
-- =====================================================

-- Call logs from voice agent
CREATE TABLE call_logs (
    call_id VARCHAR(100) PRIMARY KEY,
    session_id VARCHAR(100),
    
    -- Caller info
    caller_phone VARCHAR(50),
    from_number VARCHAR(50),
    to_number VARCHAR(50),
    customer_id INT REFERENCES customers(customer_id) ON DELETE SET NULL,
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    answered_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INT DEFAULT 0,
    
    -- Call details
    status "CallStatus" DEFAULT 'in_progress',
    direction "CallDirection" DEFAULT 'inbound',
    
    -- Resolution
    ai_resolved BOOLEAN DEFAULT TRUE,
    was_escalated BOOLEAN DEFAULT FALSE,
    escalation_reason TEXT,
    
    -- Outcome
    action_taken VARCHAR(100), -- 'booking_created', 'booking_modified', 'inquiry', etc.
    appointment_id INT REFERENCES appointments(appointment_id) ON DELETE SET NULL,
    
    -- AI Analysis
    intent_detected VARCHAR(100),
    sentiment VARCHAR(20), -- 'positive', 'neutral', 'negative'
    transcript TEXT,
    call_summary TEXT,
    customer_satisfaction INT, -- 1-5 if asked
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_logs_customer ON call_logs(customer_id);
CREATE INDEX idx_call_logs_status ON call_logs(status);
CREATE INDEX idx_call_logs_started ON call_logs(started_at);
CREATE INDEX idx_call_logs_phone ON call_logs(caller_phone);

-- Agent interactions during call
CREATE TABLE agent_interactions (
    interaction_id SERIAL PRIMARY KEY,
    call_id VARCHAR(100) REFERENCES call_logs(call_id) ON DELETE CASCADE,
    session_id VARCHAR(100) NOT NULL,
    
    -- Agent info
    agent_type VARCHAR(50) NOT NULL, -- 'triage', 'booking', 'inquiry'
    agent_name VARCHAR(100),
    
    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_ms INT DEFAULT 0,
    
    -- Conversation
    turn_count INT DEFAULT 0,
    user_message TEXT,
    agent_response TEXT,
    
    -- Tools/Actions
    tools_called JSONB DEFAULT '[]',
    tool_call_count INT DEFAULT 0,
    
    -- Handoff
    was_handoff BOOLEAN DEFAULT FALSE,
    handoff_to VARCHAR(100),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_interactions_call ON agent_interactions(call_id);
CREATE INDEX idx_agent_interactions_agent ON agent_interactions(agent_type);

-- Eleven Labs API usage tracking
CREATE TABLE elevenlabs_usage_logs (
    usage_id SERIAL PRIMARY KEY,
    call_id VARCHAR(100) REFERENCES call_logs(call_id) ON DELETE CASCADE,
    session_id VARCHAR(100),
    
    -- Voice settings
    voice_id VARCHAR(100),
    voice_name VARCHAR(100),
    model_id VARCHAR(100),
    
    -- Usage metrics
    characters_used INT DEFAULT 0,
    audio_duration_seconds DECIMAL(10,2) DEFAULT 0,
    
    -- Costs (in cents)
    cost_cents DECIMAL(10,4) DEFAULT 0,
    
    -- Type
    usage_type VARCHAR(20), -- 'tts' (text-to-speech), 'stt' (speech-to-text)
    
    -- Latency
    latency_ms INT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_elevenlabs_usage_call ON elevenlabs_usage_logs(call_id);
CREATE INDEX idx_elevenlabs_usage_created ON elevenlabs_usage_logs(created_at);

-- =====================================================
-- 12. DASHBOARD ANALYTICS
-- =====================================================

-- Daily aggregated metrics
CREATE TABLE daily_metrics (
    metric_id SERIAL PRIMARY KEY,
    metric_date DATE UNIQUE NOT NULL,
    
    -- Appointments
    total_appointments INT DEFAULT 0,
    completed_appointments INT DEFAULT 0,
    cancelled_appointments INT DEFAULT 0,
    no_shows INT DEFAULT 0,
    
    -- Revenue
    total_revenue DECIMAL(12,2) DEFAULT 0,
    average_ticket DECIMAL(10,2) DEFAULT 0,
    
    -- Customers
    new_customers INT DEFAULT 0,
    returning_customers INT DEFAULT 0,
    
    -- Voice Agent
    total_calls INT DEFAULT 0,
    calls_resolved_by_ai INT DEFAULT 0,
    calls_escalated INT DEFAULT 0,
    bookings_via_voice INT DEFAULT 0,
    average_call_duration_seconds INT DEFAULT 0,
    
    -- Services
    most_booked_service_id INT,
    most_booked_service_name VARCHAR(255),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_daily_metrics_date ON daily_metrics(metric_date);

-- Hourly metrics for charts
CREATE TABLE hourly_metrics (
    metric_id SERIAL PRIMARY KEY,
    metric_hour TIMESTAMPTZ NOT NULL,
    
    appointments_count INT DEFAULT 0,
    calls_count INT DEFAULT 0,
    revenue DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hourly_metrics_hour ON hourly_metrics(metric_hour);

-- =====================================================
-- 13. AUDIT LOGS
-- =====================================================

CREATE TABLE audit_logs (
    log_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'appointment', 'customer', 'service', etc.
    entity_id VARCHAR(100),
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- =====================================================
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE elevenlabs_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE stylists ENABLE ROW LEVEL SECURITY;
ALTER TABLE stylist_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE stylist_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE stylist_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SERVICE ROLE POLICIES (Full access for service key)
-- These policies allow the service role (used by backend) full access
-- =====================================================

-- Users
CREATE POLICY service_role_users ON users FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Customers
CREATE POLICY service_role_customers ON customers FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Appointments
CREATE POLICY service_role_appointments ON appointments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Appointment Services
CREATE POLICY service_role_appointment_services ON appointment_services FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Appointment Addons
CREATE POLICY service_role_appointment_addons ON appointment_addons FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Notifications
CREATE POLICY service_role_notifications ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Reviews
CREATE POLICY service_role_reviews ON reviews FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Payments
CREATE POLICY service_role_payments ON payments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Call Logs
CREATE POLICY service_role_call_logs ON call_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Agent Interactions
CREATE POLICY service_role_agent_interactions ON agent_interactions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Eleven Labs Usage Logs
CREATE POLICY service_role_elevenlabs_usage ON elevenlabs_usage_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Service Categories
CREATE POLICY service_role_service_categories ON service_categories FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Services
CREATE POLICY service_role_services ON services FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Service Addons
CREATE POLICY service_role_service_addons ON service_addons FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Stylists
CREATE POLICY service_role_stylists ON stylists FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Stylist Schedules
CREATE POLICY service_role_stylist_schedules ON stylist_schedules FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Stylist Time Off
CREATE POLICY service_role_stylist_time_off ON stylist_time_off FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Stylist Services
CREATE POLICY service_role_stylist_services ON stylist_services FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Customer Favorites
CREATE POLICY service_role_customer_favorites ON customer_favorites FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Business Hours
CREATE POLICY service_role_business_hours ON business_hours FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Salon Settings
CREATE POLICY service_role_salon_settings ON salon_settings FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Salon Closures
CREATE POLICY service_role_salon_closures ON salon_closures FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Promotions
CREATE POLICY service_role_promotions ON promotions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Daily Metrics
CREATE POLICY service_role_daily_metrics ON daily_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Hourly Metrics
CREATE POLICY service_role_hourly_metrics ON hourly_metrics FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Audit Logs
CREATE POLICY service_role_audit_logs ON audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================
-- PUBLIC READ POLICIES (for anon/authenticated if needed later)
-- =====================================================

-- Public can read services, categories, stylists, hours, settings
CREATE POLICY public_read_services ON services FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY public_read_categories ON service_categories FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY public_read_stylists ON stylists FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY public_read_hours ON business_hours FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY public_read_settings ON salon_settings FOR SELECT TO anon, authenticated USING (true);

-- =====================================================
-- 15. FUNCTIONS & TRIGGERS
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_users_timestamp BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_customers_timestamp BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_appointments_timestamp BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_services_timestamp BEFORE UPDATE ON services FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_stylists_timestamp BEFORE UPDATE ON stylists FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_salon_settings_timestamp BEFORE UPDATE ON salon_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Generate booking reference
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TRIGGER AS $$
DECLARE
    date_part VARCHAR(8);
    seq_num INT;
BEGIN
    date_part := TO_CHAR(NEW.appointment_date, 'YYYYMMDD');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(booking_reference FROM 13) AS INT)), 0) + 1
    INTO seq_num
    FROM appointments
    WHERE booking_reference LIKE 'GB-' || date_part || '-%';
    
    NEW.booking_reference := 'GB-' || date_part || '-' || LPAD(seq_num::TEXT, 3, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_booking_reference 
    BEFORE INSERT ON appointments 
    FOR EACH ROW 
    WHEN (NEW.booking_reference IS NULL)
    EXECUTE FUNCTION generate_booking_reference();

-- Update customer stats after appointment
CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        UPDATE customers SET
            total_visits = total_visits + 1,
            total_spent = total_spent + NEW.total_amount,
            last_visit_at = NOW()
        WHERE customer_id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_stats_trigger
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_stats();

-- =====================================================
-- 16. SEED DATA
-- =====================================================

-- Insert default salon settings
INSERT INTO salon_settings (salon_name, phone, email, address, city, state, zip_code)
VALUES ('GlamBook Salon', '+1-555-123-4567', 'contact@glambook.com', '123 Beauty Lane', 'New York', 'NY', '10001');

-- Insert business hours
INSERT INTO business_hours (day_of_week, is_open, open_time, close_time) VALUES
('monday', TRUE, '09:00', '19:00'),
('tuesday', TRUE, '09:00', '19:00'),
('wednesday', TRUE, '09:00', '19:00'),
('thursday', TRUE, '09:00', '20:00'),
('friday', TRUE, '09:00', '20:00'),
('saturday', TRUE, '10:00', '18:00'),
('sunday', FALSE, '10:00', '16:00');

-- Insert service categories
INSERT INTO service_categories (name, description, display_order, icon) VALUES
('Haircuts & Styling', 'Professional haircuts, blowouts, and styling services', 1, 'scissors'),
('Hair Coloring', 'Full color, highlights, balayage, and color correction', 2, 'palette'),
('Hair Treatments', 'Deep conditioning, keratin, and repair treatments', 3, 'sparkles'),
('Nails', 'Manicures, pedicures, and nail art', 4, 'hand'),
('Spa & Skincare', 'Facials, masks, and relaxation treatments', 5, 'leaf'),
('Makeup', 'Professional makeup for any occasion', 6, 'brush'),
('Waxing & Threading', 'Hair removal services', 7, 'zap');

-- Insert sample services
INSERT INTO services (category_id, name, description, duration_minutes, price, display_order) VALUES
(1, 'Women''s Haircut', 'Includes consultation, shampoo, cut, and style', 45, 65.00, 1),
(1, 'Men''s Haircut', 'Classic men''s cut with styling', 30, 35.00, 2),
(1, 'Kids Haircut', 'For children under 12', 30, 25.00, 3),
(1, 'Blowout', 'Shampoo and blowdry styling', 30, 45.00, 4),
(1, 'Special Occasion Updo', 'Elegant updo for weddings and events', 60, 95.00, 5),

(2, 'Single Process Color', 'Full head single color application', 90, 95.00, 1),
(2, 'Partial Highlights', 'Highlights on top and sides', 90, 125.00, 2),
(2, 'Full Highlights', 'Full head of highlights', 120, 175.00, 3),
(2, 'Balayage', 'Hand-painted natural-looking highlights', 150, 225.00, 4),
(2, 'Color Correction', 'Fix previous color treatments', 180, 250.00, 5),

(3, 'Deep Conditioning Treatment', 'Intensive moisture treatment', 30, 45.00, 1),
(3, 'Keratin Treatment', 'Smoothing and frizz reduction', 150, 350.00, 2),
(3, 'Olaplex Treatment', 'Bond repair treatment', 45, 65.00, 3),

(4, 'Classic Manicure', 'Nail shaping, cuticle care, and polish', 30, 25.00, 1),
(4, 'Gel Manicure', 'Long-lasting gel polish manicure', 45, 45.00, 2),
(4, 'Classic Pedicure', 'Full pedicure with massage', 45, 40.00, 3),
(4, 'Spa Pedicure', 'Deluxe pedicure with extended massage', 60, 60.00, 4),

(5, 'Express Facial', 'Quick refresh facial', 30, 55.00, 1),
(5, 'Signature Facial', 'Full facial treatment', 60, 95.00, 2),
(5, 'Anti-Aging Facial', 'Targeted anti-aging treatment', 75, 125.00, 3),

(6, 'Makeup Application', 'Full face makeup for any occasion', 45, 75.00, 1),
(6, 'Bridal Makeup', 'Wedding day makeup with trial', 90, 200.00, 2),

(7, 'Eyebrow Wax', 'Eyebrow shaping with wax', 15, 18.00, 1),
(7, 'Lip Wax', 'Upper lip waxing', 10, 12.00, 2),
(7, 'Full Face Wax', 'Complete facial waxing', 30, 45.00, 3),
(7, 'Eyebrow Threading', 'Precise eyebrow shaping with thread', 15, 20.00, 4);

-- Insert sample stylists
INSERT INTO stylists (full_name, email, phone, bio, specialties) VALUES
('Sarah Johnson', 'sarah@glambook.com', '+1-555-001-0001', 'Master stylist with 15 years experience in cutting and coloring', ARRAY['Balayage', 'Color Correction', 'Precision Cuts']),
('Michael Chen', 'michael@glambook.com', '+1-555-001-0002', 'Color specialist trained at Vidal Sassoon', ARRAY['Vivid Colors', 'Highlights', 'Men''s Cuts']),
('Emma Rodriguez', 'emma@glambook.com', '+1-555-001-0003', 'Nail artist and skincare expert', ARRAY['Nail Art', 'Gel Extensions', 'Facials']),
('James Wilson', 'james@glambook.com', '+1-555-001-0004', 'Bridal specialist and makeup artist', ARRAY['Bridal', 'Special Occasion', 'Makeup']);

-- Insert stylist schedules
INSERT INTO stylist_schedules (stylist_id, day_of_week, is_working, start_time, end_time)
SELECT s.stylist_id, d.day::"DayOfWeek", TRUE, '09:00', '18:00'
FROM stylists s
CROSS JOIN (VALUES ('monday'), ('tuesday'), ('wednesday'), ('thursday'), ('friday'), ('saturday')) AS d(day);

-- Insert sample admin user
-- Password: password123
INSERT INTO users (email, phone, full_name, role, is_active, email_verified, password_hash)
VALUES ('admin@glambook.com', '+1-555-ADMIN', 'Salon Admin', 'admin', TRUE, TRUE, '$2b$12$ckfSyDCE8JWoTD95DTCefOZl4J9Z0uU3kWg9VIg/pPLzl7YOZzO8u');
