-- Healthcare Voice AI - Supabase Database Schema
-- Version: 1.0.0
-- Description: Complete schema for healthcare/dental practice management
-- Run this in Supabase SQL Editor

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

-- Appointment status
CREATE TYPE appointment_status AS ENUM (
    'scheduled',
    'confirmed',
    'checked_in',
    'in_progress',
    'completed',
    'cancelled',
    'no_show',
    'rescheduled'
);

-- Appointment type
CREATE TYPE appointment_type AS ENUM (
    'new_patient',
    'follow_up',
    'routine_checkup',
    'emergency',
    'consultation',
    'procedure',
    'telehealth'
);

-- Provider type
CREATE TYPE provider_type AS ENUM (
    'doctor',
    'dentist',
    'specialist',
    'nurse_practitioner',
    'physician_assistant',
    'hygienist',
    'therapist'
);

-- Insurance verification status
CREATE TYPE insurance_status AS ENUM (
    'pending',
    'verified',
    'failed',
    'expired',
    'not_covered'
);

-- Reminder type
CREATE TYPE reminder_type AS ENUM (
    'appointment',
    'follow_up',
    'prescription_refill',
    'annual_checkup',
    'payment_due'
);

-- Reminder status
CREATE TYPE reminder_status AS ENUM (
    'pending',
    'sent',
    'delivered',
    'acknowledged',
    'failed'
);

-- Call direction
CREATE TYPE call_direction AS ENUM (
    'inbound',
    'outbound'
);

-- Call status
CREATE TYPE call_status AS ENUM (
    'in_progress',
    'completed',
    'missed',
    'voicemail'
);

-- Gender
CREATE TYPE gender_type AS ENUM (
    'male',
    'female',
    'other',
    'prefer_not_to_say'
);

-- User role
CREATE TYPE user_role AS ENUM (
    'admin',
    'staff',
    'provider',
    'patient'
);

-- ============================================
-- CORE TABLES
-- ============================================

-- Practices/Clinics
CREATE TABLE practices (
    practice_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    practice_type VARCHAR(100), -- 'medical', 'dental', 'specialty'
    phone VARCHAR(20),
    fax VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    timezone VARCHAR(50) DEFAULT 'America/New_York',
    office_hours JSONB, -- {"monday": {"open": "09:00", "close": "17:00"}, ...}
    emergency_phone VARCHAR(20),
    npi_number VARCHAR(20), -- National Provider Identifier
    tax_id VARCHAR(20),
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Departments
CREATE TABLE departments (
    department_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practice_id UUID NOT NULL REFERENCES practices(practice_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    phone_extension VARCHAR(10),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Providers (Doctors, Dentists, Specialists)
CREATE TABLE providers (
    provider_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practice_id UUID NOT NULL REFERENCES practices(practice_id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(department_id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    title VARCHAR(50), -- Dr., MD, DDS, etc.
    provider_type provider_type NOT NULL,
    specialization VARCHAR(100),
    npi_number VARCHAR(20),
    license_number VARCHAR(50),
    license_state VARCHAR(10),
    email VARCHAR(255),
    phone VARCHAR(20),
    bio TEXT,
    photo_url TEXT,
    accepting_new_patients BOOLEAN DEFAULT true,
    telehealth_enabled BOOLEAN DEFAULT true,
    default_appointment_duration INTEGER DEFAULT 30, -- minutes
    schedule_buffer INTEGER DEFAULT 0, -- minutes between appointments
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Provider Schedule/Availability
CREATE TABLE provider_schedules (
    schedule_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(provider_id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    location VARCHAR(255), -- Room or location
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Provider Time Off
CREATE TABLE provider_time_off (
    time_off_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(provider_id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patients
CREATE TABLE patients (
    patient_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practice_id UUID NOT NULL REFERENCES practices(practice_id) ON DELETE CASCADE,
    mrn VARCHAR(50), -- Medical Record Number
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    preferred_name VARCHAR(100),
    date_of_birth DATE NOT NULL,
    gender gender_type,
    ssn_last_four VARCHAR(4),
    email VARCHAR(255),
    phone_primary VARCHAR(20),
    phone_secondary VARCHAR(20),
    phone_work VARCHAR(20),
    preferred_contact_method VARCHAR(20) DEFAULT 'phone', -- phone, email, sms
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    emergency_contact_name VARCHAR(200),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),
    preferred_language VARCHAR(50) DEFAULT 'English',
    preferred_provider_id UUID REFERENCES providers(provider_id),
    primary_care_provider VARCHAR(255),
    referring_provider VARCHAR(255),
    allergies TEXT[],
    medications TEXT[],
    medical_conditions TEXT[],
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    portal_access BOOLEAN DEFAULT false,
    sms_consent BOOLEAN DEFAULT true,
    email_consent BOOLEAN DEFAULT true,
    hipaa_consent_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for phone lookups
CREATE INDEX idx_patients_phone_primary ON patients(phone_primary);
CREATE INDEX idx_patients_phone_secondary ON patients(phone_secondary);
CREATE INDEX idx_patients_email ON patients(email);
CREATE INDEX idx_patients_dob ON patients(date_of_birth);
CREATE INDEX idx_patients_name ON patients(last_name, first_name);

-- Insurance Plans (Master list)
CREATE TABLE insurance_plans (
    plan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practice_id UUID REFERENCES practices(practice_id) ON DELETE CASCADE,
    payer_name VARCHAR(255) NOT NULL, -- Aetna, BlueCross, etc.
    payer_id VARCHAR(50), -- Electronic payer ID
    plan_name VARCHAR(255),
    plan_type VARCHAR(50), -- PPO, HMO, EPO, POS, Medicare, Medicaid
    phone VARCHAR(20),
    fax VARCHAR(20),
    website VARCHAR(255),
    claims_address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Patient Insurance (Links patients to their insurance)
CREATE TABLE patient_insurance (
    patient_insurance_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    plan_id UUID REFERENCES insurance_plans(plan_id),
    insurance_type VARCHAR(20) DEFAULT 'primary', -- primary, secondary, tertiary
    payer_name VARCHAR(255) NOT NULL,
    plan_name VARCHAR(255),
    member_id VARCHAR(100) NOT NULL,
    group_number VARCHAR(100),
    subscriber_name VARCHAR(200),
    subscriber_dob DATE,
    subscriber_relationship VARCHAR(50), -- self, spouse, child, other
    effective_date DATE,
    termination_date DATE,
    copay_amount DECIMAL(10,2),
    deductible_amount DECIMAL(10,2),
    deductible_met DECIMAL(10,2) DEFAULT 0,
    out_of_pocket_max DECIMAL(10,2),
    out_of_pocket_met DECIMAL(10,2) DEFAULT 0,
    coverage_percentage INTEGER DEFAULT 80,
    prior_auth_required BOOLEAN DEFAULT false,
    verification_status insurance_status DEFAULT 'pending',
    last_verified_at TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    card_front_url TEXT,
    card_back_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_patient_insurance_member ON patient_insurance(member_id);
CREATE INDEX idx_patient_insurance_patient ON patient_insurance(patient_id);

-- Service Categories
CREATE TABLE service_categories (
    category_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practice_id UUID NOT NULL REFERENCES practices(practice_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Services/Procedures
CREATE TABLE services (
    service_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practice_id UUID NOT NULL REFERENCES practices(practice_id) ON DELETE CASCADE,
    category_id UUID REFERENCES service_categories(category_id),
    code VARCHAR(20), -- CPT/CDT code
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration INTEGER DEFAULT 30, -- minutes
    price DECIMAL(10,2),
    insurance_billable BOOLEAN DEFAULT true,
    requires_prior_auth BOOLEAN DEFAULT false,
    preparation_instructions TEXT,
    aftercare_instructions TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_services_code ON services(code);

-- Provider Services (Which providers offer which services)
CREATE TABLE provider_services (
    provider_service_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES providers(provider_id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(service_id) ON DELETE CASCADE,
    custom_duration INTEGER, -- Override default duration
    custom_price DECIMAL(10,2), -- Override default price
    is_active BOOLEAN DEFAULT true,
    UNIQUE(provider_id, service_id)
);

-- Appointments
CREATE TABLE appointments (
    appointment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practice_id UUID NOT NULL REFERENCES practices(practice_id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES providers(provider_id) ON DELETE CASCADE,
    service_id UUID REFERENCES services(service_id),
    appointment_type appointment_type NOT NULL DEFAULT 'routine_checkup',
    status appointment_status NOT NULL DEFAULT 'scheduled',
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    end_time TIME,
    duration INTEGER NOT NULL DEFAULT 30, -- minutes
    room VARCHAR(50),
    chief_complaint TEXT,
    notes TEXT,
    internal_notes TEXT, -- Staff only notes
    is_recurring BOOLEAN DEFAULT false,
    recurring_pattern JSONB, -- {"frequency": "weekly", "interval": 1, "end_date": "2024-12-31"}
    parent_appointment_id UUID REFERENCES appointments(appointment_id),
    confirmation_sent BOOLEAN DEFAULT false,
    confirmation_sent_at TIMESTAMP WITH TIME ZONE,
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    checked_in_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    rescheduled_from_id UUID REFERENCES appointments(appointment_id),
    rescheduled_to_id UUID REFERENCES appointments(appointment_id),
    telehealth_link TEXT,
    created_by VARCHAR(100),
    created_via VARCHAR(50) DEFAULT 'phone', -- phone, web, portal, walk-in
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_provider ON appointments(provider_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_provider_date ON appointments(provider_id, scheduled_date);

-- Appointment Reminders
CREATE TABLE appointment_reminders (
    reminder_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID NOT NULL REFERENCES appointments(appointment_id) ON DELETE CASCADE,
    reminder_type reminder_type NOT NULL DEFAULT 'appointment',
    channel VARCHAR(20) NOT NULL, -- sms, email, phone
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    status reminder_status DEFAULT 'pending',
    message_content TEXT,
    response TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reminders_scheduled ON appointment_reminders(scheduled_for) WHERE status = 'pending';

-- Waitlist
CREATE TABLE waitlist (
    waitlist_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practice_id UUID NOT NULL REFERENCES practices(practice_id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    provider_id UUID REFERENCES providers(provider_id),
    service_id UUID REFERENCES services(service_id),
    preferred_dates JSONB, -- ["2024-01-15", "2024-01-16"]
    preferred_times JSONB, -- {"morning": true, "afternoon": true, "evening": false}
    flexibility VARCHAR(20) DEFAULT 'flexible', -- flexible, specific
    urgency VARCHAR(20) DEFAULT 'normal', -- urgent, normal, low
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active', -- active, contacted, scheduled, cancelled
    contacted_at TIMESTAMP WITH TIME ZONE,
    scheduled_appointment_id UUID REFERENCES appointments(appointment_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Medical Records (Basic - for AI context)
CREATE TABLE medical_records (
    record_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(appointment_id),
    provider_id UUID REFERENCES providers(provider_id),
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    record_type VARCHAR(50), -- visit_note, lab_result, imaging, referral
    chief_complaint TEXT,
    diagnosis_codes TEXT[], -- ICD-10 codes
    diagnosis_descriptions TEXT[],
    treatment_notes TEXT,
    prescriptions_given JSONB,
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_timeframe VARCHAR(50), -- '2 weeks', '1 month', '3 months'
    referrals JSONB,
    vitals JSONB, -- {"blood_pressure": "120/80", "weight": "150", "height": "5'10""}
    is_confidential BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_medical_records_patient ON medical_records(patient_id);

-- Prescriptions
CREATE TABLE prescriptions (
    prescription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES providers(provider_id),
    appointment_id UUID REFERENCES appointments(appointment_id),
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    quantity INTEGER,
    refills_allowed INTEGER DEFAULT 0,
    refills_remaining INTEGER DEFAULT 0,
    pharmacy_name VARCHAR(255),
    pharmacy_phone VARCHAR(20),
    pharmacy_address TEXT,
    prescribed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_date DATE,
    end_date DATE,
    instructions TEXT,
    is_controlled BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active', -- active, completed, discontinued, expired
    discontinued_reason TEXT,
    last_filled_date DATE,
    next_refill_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_refill ON prescriptions(next_refill_date) WHERE status = 'active';

-- Billing/Invoices (Basic for voice inquiries)
CREATE TABLE invoices (
    invoice_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practice_id UUID NOT NULL REFERENCES practices(practice_id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(appointment_id),
    invoice_number VARCHAR(50) UNIQUE,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    insurance_adjustment DECIMAL(10,2) DEFAULT 0,
    insurance_payment DECIMAL(10,2) DEFAULT 0,
    patient_responsibility DECIMAL(10,2) DEFAULT 0,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    balance_due DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending', -- pending, partial, paid, overdue, collections
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invoices_patient ON invoices(patient_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- Payments
CREATE TABLE payments (
    payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(invoice_id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patients(patient_id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50), -- cash, credit_card, check, insurance, payment_plan
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Call Logs
CREATE TABLE call_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practice_id UUID REFERENCES practices(practice_id) ON DELETE CASCADE,
    call_sid VARCHAR(100), -- Twilio Call SID
    session_id VARCHAR(100),
    phone_from VARCHAR(20),
    phone_to VARCHAR(20),
    direction call_direction NOT NULL,
    status call_status DEFAULT 'in_progress',
    patient_id UUID REFERENCES patients(patient_id),
    provider_id UUID REFERENCES providers(provider_id),
    agent_type VARCHAR(50), -- triage, appointment, insurance, reminder
    call_reason VARCHAR(100),
    appointment_id UUID REFERENCES appointments(appointment_id),
    duration_seconds INTEGER,
    transcript TEXT,
    call_summary TEXT,
    sentiment VARCHAR(20), -- positive, neutral, negative
    resolution_status VARCHAR(50), -- resolved, needs_follow_up, transferred, escalated
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_notes TEXT,
    recording_url TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_call_logs_phone ON call_logs(phone_from);
CREATE INDEX idx_call_logs_patient ON call_logs(patient_id);
CREATE INDEX idx_call_logs_session ON call_logs(session_id);

-- AI Agent Interactions (For tracking multi-agent handoffs)
CREATE TABLE agent_interactions (
    interaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    call_log_id UUID REFERENCES call_logs(log_id) ON DELETE CASCADE,
    session_id VARCHAR(100),
    agent_name VARCHAR(100) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    transferred_to VARCHAR(100),
    transfer_reason TEXT,
    tools_used TEXT[],
    actions_taken JSONB,
    outcome VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System Settings
CREATE TABLE system_settings (
    setting_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practice_id UUID REFERENCES practices(practice_id) ON DELETE CASCADE,
    setting_key VARCHAR(100) NOT NULL,
    setting_value JSONB,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(practice_id, setting_key)
);

-- Users (Admin/Staff Authentication)
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practice_id UUID NOT NULL REFERENCES practices(practice_id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'staff',
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_practice ON users(practice_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_practices_updated_at BEFORE UPDATE ON practices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patient_insurance_updated_at BEFORE UPDATE ON patient_insurance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_records_updated_at BEFORE UPDATE ON medical_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON prescriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_waitlist_updated_at BEFORE UPDATE ON waitlist
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate MRN for new patients
CREATE OR REPLACE FUNCTION generate_mrn()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.mrn IS NULL THEN
        NEW.mrn = 'MRN' || LPAD(nextval('mrn_seq')::text, 8, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE SEQUENCE IF NOT EXISTS mrn_seq START 10000001;

CREATE TRIGGER generate_patient_mrn BEFORE INSERT ON patients
    FOR EACH ROW EXECUTE FUNCTION generate_mrn();

-- Generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number = 'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(nextval('invoice_seq')::text, 6, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

CREATE TRIGGER generate_invoice_num BEFORE INSERT ON invoices
    FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- Calculate appointment end time
CREATE OR REPLACE FUNCTION calculate_appointment_end_time()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.end_time IS NULL THEN
        NEW.end_time = NEW.scheduled_time + (NEW.duration || ' minutes')::INTERVAL;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calc_appointment_end BEFORE INSERT OR UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION calculate_appointment_end_time();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_insurance ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SERVICE ROLE POLICIES (Backend API Access)
-- ============================================
-- These allow the backend service to bypass RLS when using service_role key

CREATE POLICY service_role_practices ON practices FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_departments ON departments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_providers ON providers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_provider_schedules ON provider_schedules FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_provider_time_off ON provider_time_off FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_patients ON patients FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_insurance_plans ON insurance_plans FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_patient_insurance ON patient_insurance FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_service_categories ON service_categories FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_services ON services FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_provider_services ON provider_services FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_appointments ON appointments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_appointment_reminders ON appointment_reminders FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_waitlist ON waitlist FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_medical_records ON medical_records FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_prescriptions ON prescriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_invoices ON invoices FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_payments ON payments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_call_logs ON call_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_agent_interactions ON agent_interactions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_system_settings ON system_settings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_role_users ON users FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- AUTHENTICATED USER POLICIES (Multi-Tenant Security)
-- ============================================
-- These policies ensure users can only access data within their practice
-- Uses JWT claims via public.get_practice_id(), public.get_user_role(), public.get_patient_id()

-- Helper function to get current user's practice_id from JWT
CREATE OR REPLACE FUNCTION public.get_practice_id() RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'practice_id')::uuid,
    (current_setting('request.jwt.claim.practice_id', true))::uuid
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function to get current user's role from JWT
CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'role',
    current_setting('request.jwt.claim.role', true)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper function to get current user's patient_id (for patient portal)
CREATE OR REPLACE FUNCTION public.get_patient_id() RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'patient_id')::uuid,
    (current_setting('request.jwt.claim.patient_id', true))::uuid
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- PRACTICES: Users can only see their own practice
CREATE POLICY auth_practices_select ON practices
  FOR SELECT TO authenticated
  USING (practice_id = public.get_practice_id());

CREATE POLICY auth_practices_update ON practices
  FOR UPDATE TO authenticated
  USING (practice_id = public.get_practice_id() AND public.get_user_role() IN ('admin'))
  WITH CHECK (practice_id = public.get_practice_id());

-- DEPARTMENTS: Practice-level isolation
CREATE POLICY auth_departments_select ON departments
  FOR SELECT TO authenticated
  USING (practice_id = public.get_practice_id());

CREATE POLICY auth_departments_all ON departments
  FOR ALL TO authenticated
  USING (practice_id = public.get_practice_id() AND public.get_user_role() IN ('admin', 'staff'))
  WITH CHECK (practice_id = public.get_practice_id());

-- PROVIDERS: Practice-level isolation (public info readable by all in practice)
CREATE POLICY auth_providers_select ON providers
  FOR SELECT TO authenticated
  USING (practice_id = public.get_practice_id());

CREATE POLICY auth_providers_modify ON providers
  FOR ALL TO authenticated
  USING (practice_id = public.get_practice_id() AND public.get_user_role() IN ('admin'))
  WITH CHECK (practice_id = public.get_practice_id());

-- PROVIDER_SCHEDULES: Linked to providers (practice isolation via join)
CREATE POLICY auth_provider_schedules_select ON provider_schedules
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM providers p
    WHERE p.provider_id = provider_schedules.provider_id
    AND p.practice_id = public.get_practice_id()
  ));

CREATE POLICY auth_provider_schedules_modify ON provider_schedules
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM providers p WHERE p.provider_id = provider_schedules.provider_id AND p.practice_id = public.get_practice_id())
    AND public.get_user_role() IN ('admin', 'staff')
  )
  WITH CHECK (EXISTS (SELECT 1 FROM providers p WHERE p.provider_id = provider_schedules.provider_id AND p.practice_id = public.get_practice_id()));

-- PROVIDER_TIME_OFF: Linked to providers
CREATE POLICY auth_provider_time_off_select ON provider_time_off
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM providers p
    WHERE p.provider_id = provider_time_off.provider_id
    AND p.practice_id = public.get_practice_id()
  ));

CREATE POLICY auth_provider_time_off_modify ON provider_time_off
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM providers p WHERE p.provider_id = provider_time_off.provider_id AND p.practice_id = public.get_practice_id())
    AND public.get_user_role() IN ('admin', 'staff', 'provider')
  )
  WITH CHECK (EXISTS (SELECT 1 FROM providers p WHERE p.provider_id = provider_time_off.provider_id AND p.practice_id = public.get_practice_id()));

-- PATIENTS: Practice isolation + patients can see own record
CREATE POLICY auth_patients_staff_select ON patients
  FOR SELECT TO authenticated
  USING (
    practice_id = public.get_practice_id()
    OR patient_id = public.get_patient_id()
  );

CREATE POLICY auth_patients_staff_modify ON patients
  FOR ALL TO authenticated
  USING (practice_id = public.get_practice_id() AND public.get_user_role() IN ('admin', 'staff', 'provider'))
  WITH CHECK (practice_id = public.get_practice_id());

-- Patients can update their own contact info
CREATE POLICY auth_patients_self_update ON patients
  FOR UPDATE TO authenticated
  USING (patient_id = public.get_patient_id())
  WITH CHECK (patient_id = public.get_patient_id());

-- INSURANCE_PLANS: Practice-level
CREATE POLICY auth_insurance_plans_select ON insurance_plans
  FOR SELECT TO authenticated
  USING (practice_id = public.get_practice_id() OR practice_id IS NULL);

CREATE POLICY auth_insurance_plans_modify ON insurance_plans
  FOR ALL TO authenticated
  USING (practice_id = public.get_practice_id() AND public.get_user_role() IN ('admin'))
  WITH CHECK (practice_id = public.get_practice_id());

-- PATIENT_INSURANCE: Linked to patients (practice isolation via join) + patient can see own
CREATE POLICY auth_patient_insurance_select ON patient_insurance
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM patients p WHERE p.patient_id = patient_insurance.patient_id AND p.practice_id = public.get_practice_id())
    OR patient_id = public.get_patient_id()
  );

CREATE POLICY auth_patient_insurance_modify ON patient_insurance
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM patients p WHERE p.patient_id = patient_insurance.patient_id AND p.practice_id = public.get_practice_id())
    AND public.get_user_role() IN ('admin', 'staff')
  )
  WITH CHECK (EXISTS (SELECT 1 FROM patients p WHERE p.patient_id = patient_insurance.patient_id AND p.practice_id = public.get_practice_id()));

-- SERVICE_CATEGORIES: Practice-level
CREATE POLICY auth_service_categories_select ON service_categories
  FOR SELECT TO authenticated
  USING (practice_id = public.get_practice_id());

CREATE POLICY auth_service_categories_modify ON service_categories
  FOR ALL TO authenticated
  USING (practice_id = public.get_practice_id() AND public.get_user_role() IN ('admin'))
  WITH CHECK (practice_id = public.get_practice_id());

-- SERVICES: Practice-level
CREATE POLICY auth_services_select ON services
  FOR SELECT TO authenticated
  USING (practice_id = public.get_practice_id());

CREATE POLICY auth_services_modify ON services
  FOR ALL TO authenticated
  USING (practice_id = public.get_practice_id() AND public.get_user_role() IN ('admin'))
  WITH CHECK (practice_id = public.get_practice_id());

-- PROVIDER_SERVICES: Linked to providers
CREATE POLICY auth_provider_services_select ON provider_services
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM providers p
    WHERE p.provider_id = provider_services.provider_id
    AND p.practice_id = public.get_practice_id()
  ));

CREATE POLICY auth_provider_services_modify ON provider_services
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM providers p WHERE p.provider_id = provider_services.provider_id AND p.practice_id = public.get_practice_id())
    AND public.get_user_role() IN ('admin')
  )
  WITH CHECK (EXISTS (SELECT 1 FROM providers p WHERE p.provider_id = provider_services.provider_id AND p.practice_id = public.get_practice_id()));

-- APPOINTMENTS: Practice isolation + patient can see own appointments
CREATE POLICY auth_appointments_select ON appointments
  FOR SELECT TO authenticated
  USING (
    practice_id = public.get_practice_id()
    OR patient_id = public.get_patient_id()
  );

CREATE POLICY auth_appointments_staff_modify ON appointments
  FOR ALL TO authenticated
  USING (practice_id = public.get_practice_id() AND public.get_user_role() IN ('admin', 'staff', 'provider'))
  WITH CHECK (practice_id = public.get_practice_id());

-- Patients can cancel their own appointments
CREATE POLICY auth_appointments_patient_cancel ON appointments
  FOR UPDATE TO authenticated
  USING (patient_id = public.get_patient_id() AND status NOT IN ('completed', 'cancelled'))
  WITH CHECK (patient_id = public.get_patient_id());

-- APPOINTMENT_REMINDERS: Linked to appointments
CREATE POLICY auth_appointment_reminders_select ON appointment_reminders
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM appointments a
    WHERE a.appointment_id = appointment_reminders.appointment_id
    AND (a.practice_id = public.get_practice_id() OR a.patient_id = public.get_patient_id())
  ));

CREATE POLICY auth_appointment_reminders_modify ON appointment_reminders
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM appointments a WHERE a.appointment_id = appointment_reminders.appointment_id AND a.practice_id = public.get_practice_id())
    AND public.get_user_role() IN ('admin', 'staff')
  )
  WITH CHECK (EXISTS (SELECT 1 FROM appointments a WHERE a.appointment_id = appointment_reminders.appointment_id AND a.practice_id = public.get_practice_id()));

-- WAITLIST: Practice isolation
CREATE POLICY auth_waitlist_select ON waitlist
  FOR SELECT TO authenticated
  USING (practice_id = public.get_practice_id() OR patient_id = public.get_patient_id());

CREATE POLICY auth_waitlist_modify ON waitlist
  FOR ALL TO authenticated
  USING (practice_id = public.get_practice_id() AND public.get_user_role() IN ('admin', 'staff'))
  WITH CHECK (practice_id = public.get_practice_id());

-- MEDICAL_RECORDS: Practice isolation + patient can see non-confidential records
CREATE POLICY auth_medical_records_staff_select ON medical_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM patients p WHERE p.patient_id = medical_records.patient_id AND p.practice_id = public.get_practice_id())
  );

CREATE POLICY auth_medical_records_patient_select ON medical_records
  FOR SELECT TO authenticated
  USING (
    patient_id = public.get_patient_id()
    AND is_confidential = false
  );

CREATE POLICY auth_medical_records_modify ON medical_records
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM patients p WHERE p.patient_id = medical_records.patient_id AND p.practice_id = public.get_practice_id())
    AND public.get_user_role() IN ('admin', 'provider')
  )
  WITH CHECK (EXISTS (SELECT 1 FROM patients p WHERE p.patient_id = medical_records.patient_id AND p.practice_id = public.get_practice_id()));

-- PRESCRIPTIONS: Practice isolation + patient can see own
CREATE POLICY auth_prescriptions_select ON prescriptions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM patients p WHERE p.patient_id = prescriptions.patient_id AND p.practice_id = public.get_practice_id())
    OR patient_id = public.get_patient_id()
  );

CREATE POLICY auth_prescriptions_modify ON prescriptions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM patients p WHERE p.patient_id = prescriptions.patient_id AND p.practice_id = public.get_practice_id())
    AND public.get_user_role() IN ('admin', 'provider')
  )
  WITH CHECK (EXISTS (SELECT 1 FROM patients p WHERE p.patient_id = prescriptions.patient_id AND p.practice_id = public.get_practice_id()));

-- INVOICES: Practice isolation + patient can see own
CREATE POLICY auth_invoices_select ON invoices
  FOR SELECT TO authenticated
  USING (
    practice_id = public.get_practice_id()
    OR patient_id = public.get_patient_id()
  );

CREATE POLICY auth_invoices_modify ON invoices
  FOR ALL TO authenticated
  USING (practice_id = public.get_practice_id() AND public.get_user_role() IN ('admin', 'staff'))
  WITH CHECK (practice_id = public.get_practice_id());

-- PAYMENTS: Practice isolation + patient can see own
CREATE POLICY auth_payments_select ON payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM patients p WHERE p.patient_id = payments.patient_id AND p.practice_id = public.get_practice_id())
    OR patient_id = public.get_patient_id()
  );

CREATE POLICY auth_payments_modify ON payments
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM patients p WHERE p.patient_id = payments.patient_id AND p.practice_id = public.get_practice_id())
    AND public.get_user_role() IN ('admin', 'staff')
  )
  WITH CHECK (EXISTS (SELECT 1 FROM patients p WHERE p.patient_id = payments.patient_id AND p.practice_id = public.get_practice_id()));

-- CALL_LOGS: Practice isolation (no patient access - internal only)
CREATE POLICY auth_call_logs_select ON call_logs
  FOR SELECT TO authenticated
  USING (practice_id = public.get_practice_id());

CREATE POLICY auth_call_logs_modify ON call_logs
  FOR ALL TO authenticated
  USING (practice_id = public.get_practice_id() AND public.get_user_role() IN ('admin', 'staff'))
  WITH CHECK (practice_id = public.get_practice_id());

-- AGENT_INTERACTIONS: Linked to call_logs
CREATE POLICY auth_agent_interactions_select ON agent_interactions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM call_logs c
    WHERE c.log_id = agent_interactions.call_log_id
    AND c.practice_id = public.get_practice_id()
  ));

CREATE POLICY auth_agent_interactions_modify ON agent_interactions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM call_logs c WHERE c.log_id = agent_interactions.call_log_id AND c.practice_id = public.get_practice_id())
    AND public.get_user_role() IN ('admin', 'staff')
  )
  WITH CHECK (EXISTS (SELECT 1 FROM call_logs c WHERE c.log_id = agent_interactions.call_log_id AND c.practice_id = public.get_practice_id()));

-- SYSTEM_SETTINGS: Practice isolation, admin only for modifications
CREATE POLICY auth_system_settings_select ON system_settings
  FOR SELECT TO authenticated
  USING (practice_id = public.get_practice_id() OR practice_id IS NULL);

CREATE POLICY auth_system_settings_modify ON system_settings
  FOR ALL TO authenticated
  USING (practice_id = public.get_practice_id() AND public.get_user_role() = 'admin')
  WITH CHECK (practice_id = public.get_practice_id());

-- USERS: Practice isolation, admin only for create/modify, users can see colleagues
CREATE POLICY auth_users_select ON users
  FOR SELECT TO authenticated
  USING (practice_id = public.get_practice_id());

CREATE POLICY auth_users_modify ON users
  FOR ALL TO authenticated
  USING (practice_id = public.get_practice_id() AND public.get_user_role() = 'admin')
  WITH CHECK (practice_id = public.get_practice_id());

-- Users can update their own profile (except role)
CREATE POLICY auth_users_self_update ON users
  FOR UPDATE TO authenticated
  USING (user_id = (current_setting('request.jwt.claims', true)::json->>'user_id')::uuid)
  WITH CHECK (user_id = (current_setting('request.jwt.claims', true)::json->>'user_id')::uuid);

-- ============================================
-- ANON (PUBLIC) POLICIES
-- ============================================
-- Very limited access for unauthenticated users (e.g., patient portal login)

-- Allow anon to see practice basic info for login page
CREATE POLICY anon_practices_select ON practices
  FOR SELECT TO anon
  USING (true);

-- Allow anon to see active providers for booking widget
CREATE POLICY anon_providers_select ON providers
  FOR SELECT TO anon
  USING (is_active = true);

-- Allow anon to see services for booking widget
CREATE POLICY anon_services_select ON services
  FOR SELECT TO anon
  USING (is_active = true);

-- ============================================
-- SAMPLE DATA FOR TESTING
-- ============================================

-- Insert sample practice
INSERT INTO practices (practice_id, name, practice_type, phone, email, address_line1, city, state, zip_code, timezone, emergency_phone, office_hours)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Sunrise Family Healthcare',
    'medical',
    '(555) 123-4567',
    'info@sunrisehealthcare.com',
    '123 Medical Center Drive',
    'Springfield',
    'IL',
    '62701',
    'America/Chicago',
    '(555) 123-9999',
    '{"monday": {"open": "08:00", "close": "17:00"}, "tuesday": {"open": "08:00", "close": "17:00"}, "wednesday": {"open": "08:00", "close": "17:00"}, "thursday": {"open": "08:00", "close": "17:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": "09:00", "close": "12:00"}, "sunday": null}'
);

-- Insert sample departments
INSERT INTO departments (department_id, practice_id, name, description) VALUES
    ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0000-000000000001', 'Primary Care', 'General health checkups and preventive care'),
    ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0000-000000000001', 'Dental', 'Dental care and oral health'),
    ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0000-000000000001', 'Pediatrics', 'Healthcare for children');

-- Insert sample providers
INSERT INTO providers (provider_id, practice_id, department_id, first_name, last_name, title, provider_type, specialization, email, default_appointment_duration)
VALUES
    ('00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001', 'Sarah', 'Johnson', 'MD', 'doctor', 'Family Medicine', 'dr.johnson@sunrisehealthcare.com', 30),
    ('00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000001', 'Michael', 'Chen', 'MD', 'doctor', 'Internal Medicine', 'dr.chen@sunrisehealthcare.com', 30),
    ('00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000002', 'Emily', 'Davis', 'DDS', 'dentist', 'General Dentistry', 'dr.davis@sunrisehealthcare.com', 45),
    ('00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0001-000000000003', 'James', 'Wilson', 'MD', 'doctor', 'Pediatrics', 'dr.wilson@sunrisehealthcare.com', 20);

-- Insert sample provider schedules
INSERT INTO provider_schedules (provider_id, day_of_week, start_time, end_time) VALUES
    ('00000000-0000-0000-0002-000000000001', 1, '08:00', '17:00'),
    ('00000000-0000-0000-0002-000000000001', 2, '08:00', '17:00'),
    ('00000000-0000-0000-0002-000000000001', 3, '08:00', '17:00'),
    ('00000000-0000-0000-0002-000000000001', 4, '08:00', '17:00'),
    ('00000000-0000-0000-0002-000000000001', 5, '08:00', '16:00'),
    ('00000000-0000-0000-0002-000000000002', 1, '09:00', '18:00'),
    ('00000000-0000-0000-0002-000000000002', 2, '09:00', '18:00'),
    ('00000000-0000-0000-0002-000000000002', 4, '09:00', '18:00'),
    ('00000000-0000-0000-0002-000000000002', 5, '09:00', '17:00'),
    ('00000000-0000-0000-0002-000000000003', 1, '08:00', '16:00'),
    ('00000000-0000-0000-0002-000000000003', 2, '08:00', '16:00'),
    ('00000000-0000-0000-0002-000000000003', 3, '08:00', '16:00'),
    ('00000000-0000-0000-0002-000000000003', 4, '08:00', '16:00'),
    ('00000000-0000-0000-0002-000000000004', 1, '08:00', '17:00'),
    ('00000000-0000-0000-0002-000000000004', 3, '08:00', '17:00'),
    ('00000000-0000-0000-0002-000000000004', 5, '08:00', '15:00');

-- Insert sample service categories
INSERT INTO service_categories (category_id, practice_id, name, display_order) VALUES
    ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0000-000000000001', 'Preventive Care', 1),
    ('00000000-0000-0000-0003-000000000002', '00000000-0000-0000-0000-000000000001', 'Dental Services', 2),
    ('00000000-0000-0000-0003-000000000003', '00000000-0000-0000-0000-000000000001', 'Sick Visits', 3),
    ('00000000-0000-0000-0003-000000000004', '00000000-0000-0000-0000-000000000001', 'Procedures', 4);

-- Insert sample services
INSERT INTO services (service_id, practice_id, category_id, code, name, description, duration, price) VALUES
    ('00000000-0000-0000-0004-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0003-000000000001', '99395', 'Annual Physical (Adult)', 'Comprehensive annual wellness exam for adults', 45, 250.00),
    ('00000000-0000-0000-0004-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0003-000000000001', '99392', 'Well Child Visit', 'Routine checkup for children', 30, 175.00),
    ('00000000-0000-0000-0004-000000000003', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0003-000000000002', 'D0120', 'Dental Exam', 'Periodic oral evaluation', 30, 75.00),
    ('00000000-0000-0000-0004-000000000004', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0003-000000000002', 'D1110', 'Dental Cleaning', 'Adult prophylaxis cleaning', 45, 125.00),
    ('00000000-0000-0000-0004-000000000005', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0003-000000000003', '99213', 'Office Visit - Established', 'Standard office visit for established patients', 20, 150.00),
    ('00000000-0000-0000-0004-000000000006', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0003-000000000003', '99201', 'Office Visit - New Patient', 'Initial visit for new patients', 30, 200.00),
    ('00000000-0000-0000-0004-000000000007', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0003-000000000004', '90471', 'Vaccination', 'Immunization administration', 15, 35.00),
    ('00000000-0000-0000-0004-000000000008', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0003-000000000002', 'D2391', 'Dental Filling', 'Composite filling - one surface', 30, 175.00);

-- Insert sample insurance plans
INSERT INTO insurance_plans (plan_id, practice_id, payer_name, payer_id, plan_name, plan_type, phone) VALUES
    ('00000000-0000-0000-0005-000000000001', '00000000-0000-0000-0000-000000000001', 'Blue Cross Blue Shield', 'BCBS001', 'PPO Choice', 'PPO', '(800) 123-4567'),
    ('00000000-0000-0000-0005-000000000002', '00000000-0000-0000-0000-000000000001', 'Aetna', 'AETNA01', 'Open Access', 'HMO', '(800) 234-5678'),
    ('00000000-0000-0000-0005-000000000003', '00000000-0000-0000-0000-000000000001', 'UnitedHealthcare', 'UHC0001', 'Choice Plus', 'PPO', '(800) 345-6789'),
    ('00000000-0000-0000-0005-000000000004', '00000000-0000-0000-0000-000000000001', 'Delta Dental', 'DELTA01', 'Premier', 'PPO', '(800) 456-7890'),
    ('00000000-0000-0000-0005-000000000005', '00000000-0000-0000-0000-000000000001', 'Medicare', 'MCARE01', 'Medicare Part B', 'Medicare', '(800) 567-8901');

-- Insert sample patients
INSERT INTO patients (patient_id, practice_id, first_name, last_name, date_of_birth, gender, phone_primary, email, address_line1, city, state, zip_code, preferred_provider_id, allergies, medications, medical_conditions)
VALUES
    ('00000000-0000-0000-0006-000000000001', '00000000-0000-0000-0000-000000000001', 'John', 'Smith', '1985-03-15', 'male', '(555) 111-2222', 'john.smith@email.com', '456 Oak Street', 'Springfield', 'IL', '62702', '00000000-0000-0000-0002-000000000001', ARRAY['Penicillin'], ARRAY['Lisinopril 10mg'], ARRAY['Hypertension']),
    ('00000000-0000-0000-0006-000000000002', '00000000-0000-0000-0000-000000000001', 'Mary', 'Johnson', '1972-07-22', 'female', '(555) 222-3333', 'mary.j@email.com', '789 Maple Ave', 'Springfield', 'IL', '62703', '00000000-0000-0000-0002-000000000001', ARRAY[]::TEXT[], ARRAY['Metformin 500mg'], ARRAY['Type 2 Diabetes']),
    ('00000000-0000-0000-0006-000000000003', '00000000-0000-0000-0000-000000000001', 'Robert', 'Williams', '1990-11-08', 'male', '(555) 333-4444', 'rwilliams@email.com', '321 Pine Road', 'Springfield', 'IL', '62704', '00000000-0000-0000-0002-000000000002', ARRAY['Sulfa drugs', 'Latex'], ARRAY[]::TEXT[], ARRAY[]::TEXT[]),
    ('00000000-0000-0000-0006-000000000004', '00000000-0000-0000-0000-000000000001', 'Emma', 'Davis', '2018-05-20', 'female', '(555) 444-5555', 'emma.parent@email.com', '654 Elm Street', 'Springfield', 'IL', '62705', '00000000-0000-0000-0002-000000000004', ARRAY[]::TEXT[], ARRAY[]::TEXT[], ARRAY[]::TEXT[]);

-- Insert sample patient insurance
INSERT INTO patient_insurance (patient_insurance_id, patient_id, plan_id, payer_name, plan_name, member_id, group_number, subscriber_name, subscriber_relationship, effective_date, copay_amount, deductible_amount, verification_status)
VALUES
    ('00000000-0000-0000-0007-000000000001', '00000000-0000-0000-0006-000000000001', '00000000-0000-0000-0005-000000000001', 'Blue Cross Blue Shield', 'PPO Choice', 'XYZ123456789', 'GRP001', 'John Smith', 'self', '2024-01-01', 25.00, 1500.00, 'verified'),
    ('00000000-0000-0000-0007-000000000002', '00000000-0000-0000-0006-000000000002', '00000000-0000-0000-0005-000000000002', 'Aetna', 'Open Access', 'AET987654321', 'GRP002', 'Mary Johnson', 'self', '2024-01-01', 30.00, 2000.00, 'verified'),
    ('00000000-0000-0000-0007-000000000003', '00000000-0000-0000-0006-000000000003', '00000000-0000-0000-0005-000000000003', 'UnitedHealthcare', 'Choice Plus', 'UHC456789123', 'GRP003', 'Robert Williams', 'self', '2024-01-01', 20.00, 1000.00, 'pending'),
    ('00000000-0000-0000-0007-000000000004', '00000000-0000-0000-0006-000000000004', '00000000-0000-0000-0005-000000000001', 'Blue Cross Blue Shield', 'PPO Choice', 'XYZ123456790', 'GRP001', 'Michael Davis', 'child', '2024-01-01', 25.00, 1500.00, 'verified');

-- Insert sample appointments (future dates - adjust as needed)
INSERT INTO appointments (appointment_id, practice_id, patient_id, provider_id, service_id, appointment_type, status, scheduled_date, scheduled_time, duration, chief_complaint, created_via)
VALUES
    ('00000000-0000-0000-0008-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0006-000000000001', '00000000-0000-0000-0002-000000000001', '00000000-0000-0000-0004-000000000001', 'routine_checkup', 'confirmed', CURRENT_DATE + INTERVAL '7 days', '09:00', 45, 'Annual physical exam', 'phone'),
    ('00000000-0000-0000-0008-000000000002', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0006-000000000002', '00000000-0000-0000-0002-000000000003', '00000000-0000-0000-0004-000000000004', 'routine_checkup', 'scheduled', CURRENT_DATE + INTERVAL '3 days', '10:30', 45, 'Routine dental cleaning', 'web'),
    ('00000000-0000-0000-0008-000000000003', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0006-000000000003', '00000000-0000-0000-0002-000000000002', '00000000-0000-0000-0004-000000000005', 'follow_up', 'scheduled', CURRENT_DATE + INTERVAL '1 day', '14:00', 20, 'Follow-up for cold symptoms', 'phone'),
    ('00000000-0000-0000-0008-000000000004', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0006-000000000004', '00000000-0000-0000-0002-000000000004', '00000000-0000-0000-0004-000000000002', 'routine_checkup', 'confirmed', CURRENT_DATE + INTERVAL '14 days', '11:00', 30, 'Well child visit - 6 year checkup', 'portal');

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View: Today's appointments
CREATE OR REPLACE VIEW v_todays_appointments AS
SELECT
    a.appointment_id,
    a.scheduled_time,
    a.duration,
    a.status,
    a.appointment_type,
    p.patient_id,
    p.first_name || ' ' || p.last_name AS patient_name,
    p.phone_primary AS patient_phone,
    pr.provider_id,
    pr.title || ' ' || pr.first_name || ' ' || pr.last_name AS provider_name,
    s.name AS service_name,
    a.chief_complaint
FROM appointments a
JOIN patients p ON a.patient_id = p.patient_id
JOIN providers pr ON a.provider_id = pr.provider_id
LEFT JOIN services s ON a.service_id = s.service_id
WHERE a.scheduled_date = CURRENT_DATE
ORDER BY a.scheduled_time;

-- View: Patient upcoming appointments
CREATE OR REPLACE VIEW v_patient_appointments AS
SELECT
    a.appointment_id,
    a.patient_id,
    a.scheduled_date,
    a.scheduled_time,
    a.status,
    a.appointment_type,
    pr.title || ' ' || pr.first_name || ' ' || pr.last_name AS provider_name,
    pr.specialization,
    s.name AS service_name,
    a.chief_complaint,
    a.telehealth_link
FROM appointments a
JOIN providers pr ON a.provider_id = pr.provider_id
LEFT JOIN services s ON a.service_id = s.service_id
WHERE a.scheduled_date >= CURRENT_DATE
AND a.status NOT IN ('cancelled', 'completed', 'no_show')
ORDER BY a.scheduled_date, a.scheduled_time;

-- View: Provider availability
CREATE OR REPLACE VIEW v_provider_availability AS
SELECT
    p.provider_id,
    p.title || ' ' || p.first_name || ' ' || p.last_name AS provider_name,
    p.specialization,
    ps.day_of_week,
    CASE ps.day_of_week
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
    END AS day_name,
    ps.start_time,
    ps.end_time,
    ps.is_available
FROM providers p
JOIN provider_schedules ps ON p.provider_id = ps.provider_id
WHERE p.is_active = true
ORDER BY p.last_name, ps.day_of_week;

-- View: Pending insurance verifications
CREATE OR REPLACE VIEW v_pending_verifications AS
SELECT
    pi.patient_insurance_id,
    p.first_name || ' ' || p.last_name AS patient_name,
    p.phone_primary,
    pi.payer_name,
    pi.member_id,
    pi.verification_status,
    a.scheduled_date AS next_appointment,
    a.scheduled_time
FROM patient_insurance pi
JOIN patients p ON pi.patient_id = p.patient_id
LEFT JOIN appointments a ON p.patient_id = a.patient_id
    AND a.scheduled_date >= CURRENT_DATE
    AND a.status NOT IN ('cancelled', 'completed', 'no_show')
WHERE pi.verification_status IN ('pending', 'failed')
AND pi.is_active = true
ORDER BY a.scheduled_date NULLS LAST;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE practices IS 'Healthcare practices/clinics - supports multi-tenant';
COMMENT ON TABLE providers IS 'Doctors, dentists, and other healthcare providers';
COMMENT ON TABLE patients IS 'Patient demographic and contact information';
COMMENT ON TABLE appointments IS 'Scheduled patient appointments';
COMMENT ON TABLE patient_insurance IS 'Patient insurance coverage details';
COMMENT ON TABLE call_logs IS 'AI voice agent call tracking and transcripts';
COMMENT ON TABLE agent_interactions IS 'Multi-agent handoff tracking within calls';
COMMENT ON TABLE users IS 'Admin and staff user accounts for dashboard access';
