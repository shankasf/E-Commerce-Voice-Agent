-- =============================================
-- SEED DATA FOR U RACK IT TICKET MANAGEMENT
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================

-- First, grant permissions to service_role (if not already done)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =============================================
-- 1. ACCOUNT MANAGERS (3 managers)
-- =============================================
INSERT INTO account_managers (manager_id, full_name, email, phone) VALUES
(1, 'Sarah Johnson', 'sarah.johnson@urackit.com', '+1-555-0101'),
(2, 'Michael Chen', 'michael.chen@urackit.com', '+1-555-0102'),
(3, 'Emily Rodriguez', 'emily.rodriguez@urackit.com', '+1-555-0103')
ON CONFLICT (manager_id) DO NOTHING;

-- =============================================
-- 2. ORGANIZATIONS (5 companies)
-- =============================================
INSERT INTO organizations (organization_id, name, u_e_code, manager_id) VALUES
(1, 'Acme Corporation', 1001, 1),
(2, 'TechStart Inc', 1002, 1),
(3, 'Global Finance LLC', 1003, 2),
(4, 'Healthcare Solutions', 1004, 2),
(5, 'Retail Masters', 1005, 3)
ON CONFLICT (organization_id) DO NOTHING;

-- =============================================
-- 3. LOCATIONS (10 locations across organizations)
-- =============================================
INSERT INTO locations (location_id, organization_id, name, location_type, requires_human_agent) VALUES
(1, 1, 'Acme HQ - New York', 'Headquarters', false),
(2, 1, 'Acme Data Center - Dallas', 'Data Center', true),
(3, 2, 'TechStart Main Office', 'Headquarters', false),
(4, 2, 'TechStart Remote Team', 'Remote', false),
(5, 3, 'Global Finance Tower', 'Headquarters', true),
(6, 3, 'GF Support Center', 'Support', false),
(7, 4, 'Hospital Campus IT', 'Headquarters', true),
(8, 4, 'Medical Research Lab', 'Data Center', true),
(9, 5, 'Retail HQ - Chicago', 'Headquarters', false),
(10, 5, 'Distribution Center', 'Other', false)
ON CONFLICT (location_id) DO NOTHING;

-- =============================================
-- 4. CONTACTS (12 requesters across organizations)
-- =============================================
INSERT INTO contacts (contact_id, organization_id, full_name, email, phone) VALUES
-- Acme Corporation contacts
(1, 1, 'John Smith', 'john.smith@acmecorp.com', '+1-555-1001'),
(2, 1, 'Lisa Wang', 'lisa.wang@acmecorp.com', '+1-555-1002'),
(3, 1, 'Robert Davis', 'robert.davis@acmecorp.com', '+1-555-1003'),
-- TechStart contacts
(4, 2, 'Amanda Foster', 'amanda.foster@techstart.io', '+1-555-2001'),
(5, 2, 'Kevin Park', 'kevin.park@techstart.io', '+1-555-2002'),
-- Global Finance contacts
(6, 3, 'Jessica Miller', 'jessica.miller@globalfinance.com', '+1-555-3001'),
(7, 3, 'David Thompson', 'david.thompson@globalfinance.com', '+1-555-3002'),
(8, 3, 'Rachel Green', 'rachel.green@globalfinance.com', '+1-555-3003'),
-- Healthcare Solutions contacts
(9, 4, 'Dr. James Wilson', 'james.wilson@healthsolutions.org', '+1-555-4001'),
(10, 4, 'Nurse Mary Johnson', 'mary.johnson@healthsolutions.org', '+1-555-4002'),
-- Retail Masters contacts
(11, 5, 'Tom Anderson', 'tom.anderson@retailmasters.com', '+1-555-5001'),
(12, 5, 'Sarah Brown', 'sarah.brown@retailmasters.com', '+1-555-5002')
ON CONFLICT (contact_id) DO NOTHING;

-- =============================================
-- 5. SUPPORT AGENTS (5 agents)
-- =============================================
INSERT INTO support_agents (support_agent_id, full_name, email, phone, agent_type, specialization, is_available) VALUES
(1, 'AI Support Bot', 'bot@urackit.com', NULL, 'Bot', 'General Support', true),
(2, 'Alex Martinez', 'alex@urackit.com', '+1-555-9001', 'Human', 'Network & Infrastructure', true),
(3, 'Chris Taylor', 'chris@urackit.com', '+1-555-9002', 'Human', 'Hardware & Devices', true),
(4, 'Dana White', 'dana@urackit.com', '+1-555-9003', 'Human', 'Software & Email', true),
(5, 'Sam Johnson', 'sam@urackit.com', '+1-555-9004', 'Human', 'Security & Compliance', false)
ON CONFLICT (support_agent_id) DO NOTHING;

-- =============================================
-- 6. TICKET STATUSES (if not exist)
-- =============================================
INSERT INTO ticket_statuses (status_id, name, description) VALUES
(1, 'Open', 'Ticket created, awaiting assignment'),
(2, 'In Progress', 'Agent is working on the ticket'),
(3, 'Awaiting Customer', 'Waiting for customer response'),
(4, 'Escalated', 'Ticket escalated to higher tier'),
(5, 'Resolved', 'Issue has been resolved'),
(6, 'Closed', 'Ticket closed')
ON CONFLICT (status_id) DO NOTHING;

-- =============================================
-- 7. TICKET PRIORITIES (if not exist)
-- =============================================
INSERT INTO ticket_priorities (priority_id, name, description) VALUES
(1, 'Low', 'Non-urgent issues'),
(2, 'Medium', 'Standard priority'),
(3, 'High', 'Important issues requiring quick resolution'),
(4, 'Critical', 'System down or urgent business impact')
ON CONFLICT (priority_id) DO NOTHING;

-- =============================================
-- 8. DEVICE TYPES
-- =============================================
INSERT INTO device_types (device_type_id, name) VALUES
(1, 'Desktop'),
(2, 'Laptop'),
(3, 'Server'),
(4, 'Network Switch'),
(5, 'Router'),
(6, 'Printer'),
(7, 'Phone'),
(8, 'Tablet')
ON CONFLICT (device_type_id) DO NOTHING;

-- =============================================
-- 9. DEVICE MANUFACTURERS
-- =============================================
INSERT INTO device_manufacturers (manufacturer_id, name) VALUES
(1, 'Dell'),
(2, 'HP'),
(3, 'Lenovo'),
(4, 'Apple'),
(5, 'Cisco'),
(6, 'Microsoft'),
(7, 'Samsung'),
(8, 'Asus')
ON CONFLICT (manufacturer_id) DO NOTHING;

-- =============================================
-- 10. DEVICE MODELS
-- =============================================
INSERT INTO device_models (model_id, manufacturer_id, name) VALUES
(1, 1, 'OptiPlex 7090'),
(2, 1, 'Latitude 5520'),
(3, 2, 'EliteDesk 800'),
(4, 2, 'ProBook 450'),
(5, 3, 'ThinkPad T14'),
(6, 3, 'ThinkCentre M920'),
(7, 4, 'MacBook Pro 14'),
(8, 4, 'iMac 24'),
(9, 5, 'Catalyst 2960'),
(10, 6, 'Surface Pro 9')
ON CONFLICT (model_id) DO NOTHING;

-- =============================================
-- 11. OPERATING SYSTEMS
-- =============================================
INSERT INTO operating_systems (os_id, name) VALUES
(1, 'Windows 11 Pro'),
(2, 'Windows 10 Pro'),
(3, 'Windows Server 2022'),
(4, 'macOS Sonoma'),
(5, 'macOS Ventura'),
(6, 'Ubuntu 22.04 LTS'),
(7, 'Red Hat Enterprise Linux 9')
ON CONFLICT (os_id) DO NOTHING;

-- =============================================
-- 12. PROCESSOR ARCHITECTURES
-- =============================================
INSERT INTO processor_architectures (architecture_id, name) VALUES
(1, 'x64'),
(2, 'ARM64'),
(3, 'x86')
ON CONFLICT (architecture_id) DO NOTHING;

-- =============================================
-- 13. PROCESSOR MODELS
-- =============================================
INSERT INTO processor_models (processor_id, manufacturer, model) VALUES
(1, 'Intel', 'Core i7-12700'),
(2, 'Intel', 'Core i5-12500'),
(3, 'Intel', 'Xeon E-2386G'),
(4, 'AMD', 'Ryzen 7 5800X'),
(5, 'AMD', 'Ryzen 5 5600X'),
(6, 'Apple', 'M2 Pro'),
(7, 'Apple', 'M3')
ON CONFLICT (processor_id) DO NOTHING;

-- =============================================
-- 14. UPDATE STATUSES
-- =============================================
INSERT INTO update_statuses (update_status_id, name) VALUES
(1, 'Up to Date'),
(2, 'Updates Available'),
(3, 'Updates Pending Restart'),
(4, 'Update Failed'),
(5, 'Unknown')
ON CONFLICT (update_status_id) DO NOTHING;

-- =============================================
-- 15. DOMAINS
-- =============================================
INSERT INTO domains (domain_id, name) VALUES
(1, 'acmecorp.local'),
(2, 'techstart.local'),
(3, 'globalfinance.local'),
(4, 'healthsolutions.local'),
(5, 'retailmasters.local')
ON CONFLICT (domain_id) DO NOTHING;

-- =============================================
-- 16. DEVICES (15 devices across organizations)
-- =============================================
INSERT INTO devices (device_id, organization_id, location_id, asset_name, status, manufacturer_id, model_id, host_name, public_ip, gateway, os_id, domain_id, os_version, device_type_id, update_status_id, processor_id, architecture_id, total_memory) VALUES
-- Acme devices
(1, 1, 1, 'ACME-WS-001', 'ONLINE', 1, 1, 'acme-ws-001', '203.0.113.10', '192.168.1.1', 1, 1, '23H2', 1, 1, 1, 1, 16384),
(2, 1, 1, 'ACME-LT-001', 'ONLINE', 1, 2, 'acme-lt-001', '203.0.113.11', '192.168.1.1', 1, 1, '23H2', 2, 2, 2, 1, 16384),
(3, 1, 2, 'ACME-SRV-001', 'ONLINE', 1, 1, 'acme-srv-001', '203.0.113.20', '192.168.2.1', 3, 1, '21H2', 3, 1, 3, 1, 65536),
-- TechStart devices
(4, 2, 3, 'TS-MAC-001', 'ONLINE', 4, 7, 'ts-mac-001', '198.51.100.10', '192.168.3.1', 4, 2, '14.0', 2, 1, 6, 2, 16384),
(5, 2, 4, 'TS-LT-001', 'ONLINE', 3, 5, 'ts-lt-001', '198.51.100.11', '192.168.3.1', 2, 2, '22H2', 2, 2, 5, 1, 32768),
-- Global Finance devices
(6, 3, 5, 'GF-WS-001', 'ONLINE', 2, 3, 'gf-ws-001', '192.0.2.10', '192.168.5.1', 1, 3, '23H2', 1, 1, 1, 1, 32768),
(7, 3, 5, 'GF-WS-002', 'ONLINE', 2, 3, 'gf-ws-002', '192.0.2.11', '192.168.5.1', 1, 3, '23H2', 1, 1, 1, 1, 32768),
(8, 3, 6, 'GF-SRV-001', 'ONLINE', 1, 1, 'gf-srv-001', '192.0.2.50', '192.168.5.1', 3, 3, '21H2', 3, 1, 3, 1, 131072),
-- Healthcare devices
(9, 4, 7, 'HS-WS-001', 'ONLINE', 1, 1, 'hs-ws-001', '203.0.113.100', '192.168.7.1', 1, 4, '23H2', 1, 1, 2, 1, 16384),
(10, 4, 7, 'HS-WS-002', 'ONLINE', 2, 4, 'hs-ws-002', '203.0.113.101', '192.168.7.1', 2, 4, '22H2', 2, 3, 2, 1, 8192),
(11, 4, 8, 'HS-SRV-001', 'ONLINE', 1, 1, 'hs-srv-001', '203.0.113.150', '192.168.8.1', 7, 4, '9.2', 3, 1, 4, 1, 262144),
-- Retail devices
(12, 5, 9, 'RM-WS-001', 'ONLINE', 3, 6, 'rm-ws-001', '198.51.100.100', '192.168.9.1', 1, 5, '23H2', 1, 2, 1, 1, 16384),
(13, 5, 9, 'RM-LT-001', 'OFFLINE', 3, 5, 'rm-lt-001', NULL, NULL, 2, 5, '22H2', 2, 4, 5, 1, 16384),
(14, 5, 10, 'RM-NET-001', 'ONLINE', 5, 9, 'rm-net-001', '198.51.100.200', '192.168.10.1', NULL, NULL, NULL, 4, 1, NULL, NULL, NULL),
(15, 5, 10, 'RM-SRV-001', 'ONLINE', 1, 1, 'rm-srv-001', '198.51.100.201', '192.168.10.1', 6, 5, '22.04', 3, 1, 4, 1, 65536)
ON CONFLICT (device_id) DO NOTHING;

-- =============================================
-- 17. CONTACT DEVICES (assign devices to contacts)
-- =============================================
INSERT INTO contact_devices (contact_id, device_id, assigned_at) VALUES
(1, 1, NOW() - INTERVAL '90 days'),
(1, 2, NOW() - INTERVAL '30 days'),
(2, 2, NOW() - INTERVAL '60 days'),
(3, 3, NOW() - INTERVAL '120 days'),
(4, 4, NOW() - INTERVAL '45 days'),
(5, 5, NOW() - INTERVAL '30 days'),
(6, 6, NOW() - INTERVAL '180 days'),
(7, 7, NOW() - INTERVAL '90 days'),
(9, 9, NOW() - INTERVAL '60 days'),
(10, 10, NOW() - INTERVAL '30 days'),
(11, 12, NOW() - INTERVAL '90 days'),
(12, 13, NOW() - INTERVAL '45 days')
ON CONFLICT DO NOTHING;

-- =============================================
-- 18. SUPPORT TICKETS (10 tickets with various statuses)
-- =============================================
INSERT INTO support_tickets (ticket_id, organization_id, contact_id, device_id, location_id, subject, description, status_id, priority_id, requires_human_agent, created_at) VALUES
-- Open tickets
(1, 1, 1, 1, 1, 'Cannot connect to VPN', 'Getting timeout error when trying to connect to corporate VPN from home office.', 1, 3, false, NOW() - INTERVAL '2 hours'),
(2, 2, 4, 4, 3, 'MacBook running slow', 'My MacBook Pro has been extremely slow for the past week. Applications take forever to open.', 2, 2, false, NOW() - INTERVAL '1 day'),
-- In Progress
(3, 3, 6, 6, 5, 'Email not syncing', 'Outlook is not syncing emails. Last sync was 3 days ago.', 2, 3, false, NOW() - INTERVAL '6 hours'),
(4, 1, 2, 2, 1, 'Printer not working', 'Network printer on 3rd floor is not responding. Multiple users affected.', 2, 2, true, NOW() - INTERVAL '4 hours'),
-- Awaiting Customer
(5, 4, 9, 9, 7, 'Software installation request', 'Need to install specialized medical imaging software for radiology department.', 3, 2, true, NOW() - INTERVAL '2 days'),
-- Escalated
(6, 3, 7, 7, 5, 'Security alert on workstation', 'Received security alert about potential unauthorized access attempt on my workstation.', 4, 4, true, NOW() - INTERVAL '30 minutes'),
-- Resolved
(7, 5, 11, 12, 9, 'Password reset request', 'Forgot my password after vacation, need reset.', 5, 1, false, NOW() - INTERVAL '3 days'),
(8, 2, 5, 5, 4, 'New monitor setup', 'Need help setting up dual monitors for remote work.', 5, 1, false, NOW() - INTERVAL '5 days'),
-- Closed
(9, 1, 3, 3, 2, 'Server maintenance window', 'Scheduled maintenance for file server completed successfully.', 6, 2, true, NOW() - INTERVAL '1 week'),
(10, 4, 10, 10, 7, 'Laptop battery replacement', 'Laptop battery was replaced and tested.', 6, 1, false, NOW() - INTERVAL '10 days')
ON CONFLICT (ticket_id) DO NOTHING;

-- =============================================
-- 19. TICKET ASSIGNMENTS
-- =============================================
INSERT INTO ticket_assignments (ticket_id, support_agent_id, assignment_start, is_primary) VALUES
(1, 1, NOW() - INTERVAL '2 hours', true),
(2, 2, NOW() - INTERVAL '20 hours', true),
(3, 4, NOW() - INTERVAL '5 hours', true),
(4, 3, NOW() - INTERVAL '3 hours', true),
(5, 1, NOW() - INTERVAL '2 days', true),
(6, 5, NOW() - INTERVAL '25 minutes', true),
(7, 4, NOW() - INTERVAL '3 days', true),
(8, 2, NOW() - INTERVAL '5 days', true),
(9, 3, NOW() - INTERVAL '1 week', true),
(10, 3, NOW() - INTERVAL '10 days', true)
ON CONFLICT DO NOTHING;

-- =============================================
-- 20. TICKET MESSAGES (conversation history)
-- =============================================
INSERT INTO ticket_messages (ticket_id, sender_contact_id, sender_agent_id, content, message_type, message_time) VALUES
-- Ticket 1 messages
(1, 1, NULL, 'Cannot connect to VPN', 'text', NOW() - INTERVAL '2 hours'),
(1, NULL, 1, 'Hello John! I''m the AI Support Bot. I understand you''re having VPN connection issues. Can you tell me what error message you''re seeing?', 'text', NOW() - INTERVAL '1 hour 55 minutes'),
(1, 1, NULL, 'It says "Connection timeout - Server not responding"', 'text', NOW() - INTERVAL '1 hour 50 minutes'),
(1, NULL, 1, 'Thank you. Let me check a few things. First, are you able to access the internet normally?', 'text', NOW() - INTERVAL '1 hour 45 minutes'),

-- Ticket 2 messages
(2, 4, NULL, 'My MacBook Pro has been extremely slow lately', 'text', NOW() - INTERVAL '1 day'),
(2, NULL, 1, 'Hi Amanda! I can help troubleshoot your Mac performance issues. When did you first notice the slowdown?', 'text', NOW() - INTERVAL '23 hours'),
(2, 4, NULL, 'About a week ago. It started after the last system update.', 'text', NOW() - INTERVAL '22 hours'),
(2, NULL, 2, 'Hi Amanda, Alex here. I''ve taken over your ticket. I''ve seen this issue after the recent macOS update. Let''s start by resetting the SMC and NVRAM.', 'text', NOW() - INTERVAL '20 hours'),

-- Ticket 3 messages
(3, 6, NULL, 'Outlook is not syncing my emails properly', 'text', NOW() - INTERVAL '6 hours'),
(3, NULL, 1, 'Hi Jessica! I understand your Outlook isn''t syncing. Let me gather some information. Is this affecting just your account or are colleagues experiencing this too?', 'text', NOW() - INTERVAL '5 hours 55 minutes'),
(3, 6, NULL, 'Just my account as far as I know', 'text', NOW() - INTERVAL '5 hours 45 minutes'),
(3, NULL, 4, 'Hi Jessica, this is Dana from IT. I''ve checked your mailbox and see some sync issues with the server. I''m going to reset your Outlook profile.', 'text', NOW() - INTERVAL '5 hours'),

-- Ticket 4 messages
(4, 2, NULL, 'The network printer on the 3rd floor is not working', 'text', NOW() - INTERVAL '4 hours'),
(4, NULL, 1, 'Hi Lisa! I see you''re having printer issues. Is this the HP LaserJet in the east wing?', 'text', NOW() - INTERVAL '3 hours 55 minutes'),
(4, 2, NULL, 'Yes, that''s the one. The display shows an error but I can''t read it from here.', 'text', NOW() - INTERVAL '3 hours 50 minutes'),
(4, NULL, 3, 'Hi Lisa, Chris from hardware support here. I''m heading to the 3rd floor now to check the printer physically.', 'text', NOW() - INTERVAL '3 hours'),

-- Ticket 5 messages
(5, 9, NULL, 'We need specialized medical imaging software installed', 'text', NOW() - INTERVAL '2 days'),
(5, NULL, 1, 'Hello Dr. Wilson! I understand you need medical imaging software installed. Could you provide the name of the software and any licensing information?', 'text', NOW() - INTERVAL '2 days' + INTERVAL '5 minutes'),
(5, 9, NULL, 'It''s called RadView Pro. IT should have the license - it was purchased last month.', 'text', NOW() - INTERVAL '2 days' + INTERVAL '30 minutes'),
(5, NULL, 1, 'Thank you. I''ve found the license. This software requires elevated privileges and healthcare compliance verification. I''m escalating this to a human agent.', 'text', NOW() - INTERVAL '2 days' + INTERVAL '35 minutes'),

-- Ticket 6 messages (security - escalated)
(6, 7, NULL, 'I got an alert about unauthorized access on my computer!', 'text', NOW() - INTERVAL '30 minutes'),
(6, NULL, 1, 'Hello David! This is concerning. I''m immediately escalating this to our security team. Please do NOT shut down your computer - we may need forensic data.', 'text', NOW() - INTERVAL '29 minutes'),
(6, NULL, 5, 'David, this is Sam from Security. I''m reviewing the alerts from your workstation now. Can you tell me exactly what message you saw?', 'text', NOW() - INTERVAL '25 minutes'),

-- Ticket 7 messages (resolved)
(7, 11, NULL, 'I forgot my password after vacation. Can you reset it?', 'text', NOW() - INTERVAL '3 days'),
(7, NULL, 1, 'Hi Tom! No problem, I can help with that. For security, I''ll send a password reset link to your registered mobile phone. Is 555-5001 still your number?', 'text', NOW() - INTERVAL '3 days' + INTERVAL '2 minutes'),
(7, 11, NULL, 'Yes that''s correct', 'text', NOW() - INTERVAL '3 days' + INTERVAL '5 minutes'),
(7, NULL, 4, 'Hi Tom, Dana here. I''ve sent the reset link. Please check your phone and let me know once you''ve successfully logged in.', 'text', NOW() - INTERVAL '3 days' + INTERVAL '10 minutes'),
(7, 11, NULL, 'Got it, I''m back in. Thank you!', 'text', NOW() - INTERVAL '3 days' + INTERVAL '20 minutes'),
(7, NULL, 4, 'Great! Glad I could help. I''m marking this ticket as resolved. Have a great day!', 'text', NOW() - INTERVAL '3 days' + INTERVAL '22 minutes')
ON CONFLICT DO NOTHING;

-- =============================================
-- 21. TICKET ESCALATIONS
-- =============================================
INSERT INTO ticket_escalations (ticket_id, from_agent_id, to_agent_id, escalation_time, reason) VALUES
(6, 1, 5, NOW() - INTERVAL '28 minutes', 'Security alert requires immediate attention from security specialist'),
(5, 1, 3, NOW() - INTERVAL '2 days' + INTERVAL '40 minutes', 'Medical software installation requires healthcare compliance verification')
ON CONFLICT DO NOTHING;

-- =============================================
-- Update sequences to continue from max ID
-- =============================================
SELECT setval('account_managers_manager_id_seq', COALESCE((SELECT MAX(manager_id) FROM account_managers), 1));
SELECT setval('organizations_organization_id_seq', COALESCE((SELECT MAX(organization_id) FROM organizations), 1));
SELECT setval('locations_location_id_seq', COALESCE((SELECT MAX(location_id) FROM locations), 1));
SELECT setval('contacts_contact_id_seq', COALESCE((SELECT MAX(contact_id) FROM contacts), 1));
SELECT setval('support_agents_support_agent_id_seq', COALESCE((SELECT MAX(support_agent_id) FROM support_agents), 1));
SELECT setval('devices_device_id_seq', COALESCE((SELECT MAX(device_id) FROM devices), 1));
SELECT setval('support_tickets_ticket_id_seq', COALESCE((SELECT MAX(ticket_id) FROM support_tickets), 1));
SELECT setval('ticket_messages_message_id_seq', COALESCE((SELECT MAX(message_id) FROM ticket_messages), 1));
SELECT setval('ticket_escalations_escalation_id_seq', COALESCE((SELECT MAX(escalation_id) FROM ticket_escalations), 1));

-- =============================================
-- Summary of seeded data
-- =============================================
SELECT 'Seed completed!' as status;
SELECT 'Account Managers: ' || COUNT(*) FROM account_managers;
SELECT 'Organizations: ' || COUNT(*) FROM organizations;
SELECT 'Locations: ' || COUNT(*) FROM locations;
SELECT 'Contacts (Requesters): ' || COUNT(*) FROM contacts;
SELECT 'Support Agents: ' || COUNT(*) FROM support_agents;
SELECT 'Devices: ' || COUNT(*) FROM devices;
SELECT 'Tickets: ' || COUNT(*) FROM support_tickets;
SELECT 'Messages: ' || COUNT(*) FROM ticket_messages;
