-- Auto-generated seed file from Client_URackIT.csv + Endpoints_URackIT.csv
-- Target schema: ticket_management_schema.sql
-- Safe to run multiple times (uses ON CONFLICT DO NOTHING / DO UPDATE where appropriate)

-- WARNING: Duplicate U-E codes detected in Client_URackIT.csv:
--   U-E Code 3450: 1iNSiGHT LLC, U Rack IT LLC
-- This seed keeps the first org encountered for each duplicated code and SKIPS the rest to avoid unique violations.

-- WARNING: Organizations referenced by Endpoints_URackIT.csv with missing U-E code in Client_URackIT.csv:
--   CD Metropoulos
--   Key Real Estate Services llc
--   Migliore, P.C.
--   Sam Tell Companies
--   The Prints-Ables Office
-- Devices belonging to these orgs are skipped because organizations.u_e_code is NOT NULL and UNIQUE.

-- WARNING: Organizations skipped due to conflicting duplicate U-E code:
--   U Rack IT LLC

BEGIN;

-- Dimension tables
INSERT INTO device_manufacturers (name) VALUES
  ('ASUS'),
  ('Acer'),
  ('Dell Inc.'),
  ('HP'),
  ('Hewlett-Packard'),
  ('LENOVO'),
  ('Micro-Star International Co., Ltd.'),
  ('Microsoft Corporation'),
  ('QEMU'),
  ('System manufacturer')
ON CONFLICT (name) DO NOTHING;

INSERT INTO device_models (manufacturer_id, name) VALUES
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='ASUS'), 'System Product Name'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Acer'), 'Aspire TC-875'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'Inspiron 16 7620 2-in-1'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'Inspiron 16 Plus 7640'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'Inspiron 7706 2n1'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'Latitude 3500'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'Latitude 3580'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'Latitude 7350'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'Latitude 7490'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'OptiPlex 3000'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'OptiPlex 7010'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'OptiPlex 7040'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'OptiPlex 7060'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'OptiPlex Micro 7020'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'), 'Precision 3460'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='HP'), 'HP ENVY x360 2-in-1 Laptop 15-ey1xxx'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='HP'), 'HP Laptop 17-by0xxx'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='HP'), 'HP OmniDesk Desktop M03-0xxx'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='HP'), 'HP Pavilion Desktop PC 570-p0xx'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Hewlett-Packard'), 'HP EliteDesk 800 G1 USDT'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='LENOVO'), 'LEGION T5 26IRB8 ( 90UT0019US )'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Micro-Star International Co., Ltd.'), 'MS-7C91'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Microsoft Corporation'), 'Microsoft Surface Pro, 11th Edition'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Microsoft Corporation'), 'Surface Pro 6'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Microsoft Corporation'), 'Surface Pro 7'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Microsoft Corporation'), 'Surface Pro 7+'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='Microsoft Corporation'), 'Surface Pro 8'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='QEMU'), 'Standard PC (Q35 + ICH9, 2009)'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='QEMU'), 'Standard PC (i440FX + PIIX, 1996)'),
  ((SELECT manufacturer_id FROM device_manufacturers WHERE name='System manufacturer'), 'System Product Name')
ON CONFLICT (manufacturer_id, name) DO NOTHING;

INSERT INTO operating_systems (name) VALUES
  ('Microsoft Windows 10 Home'),
  ('Microsoft Windows 10 Pro'),
  ('Microsoft Windows 11 Home'),
  ('Microsoft Windows 11 Pro'),
  ('Microsoft Windows Server 2019 Standard'),
  ('Microsoft Windows Server 2022 Standard')
ON CONFLICT (name) DO NOTHING;

INSERT INTO domains (name) VALUES
  ('Brucelectric.local'),
  ('WORKGROUP')
ON CONFLICT (name) DO NOTHING;

INSERT INTO device_types (name) VALUES
  ('SERVER'),
  ('WORKSTATION')
ON CONFLICT (name) DO NOTHING;

INSERT INTO update_statuses (name) VALUES
  ('Fully Patched'),
  ('Reboot Required')
ON CONFLICT (name) DO NOTHING;

INSERT INTO processor_models (manufacturer, model) VALUES
  ('Amd', 'AMD Ryzen 5 5600X 6-Core Processor'),
  ('Amd', 'AMD Ryzen 7 7730U with Radeon Graphics'),
  ('Common', 'Common KVM processor'),
  ('Intel', '11th Gen Intel(R) Core(TM) i5-1135G7 @ 2.40GHz'),
  ('Intel', '11th Gen Intel(R) Core(TM) i7-1165G7 @ 2.80GHz'),
  ('Intel', '12th Gen Intel(R) Core(TM) i5-12500'),
  ('Intel', '12th Gen Intel(R) Core(TM) i5-12500T'),
  ('Intel', '12th Gen Intel(R) Core(TM) i7-1260P'),
  ('Intel', '12th Gen Intel(R) Core(TM) i7-12700'),
  ('Intel', '12th Gen Intel(R) Core(TM) i9-12900K'),
  ('Intel', 'Intel(R) Core(TM) Ultra 7 155H'),
  ('Intel', 'Intel(R) Core(TM) Ultra 7 165U'),
  ('Intel', 'Intel(R) Core(TM) Ultra 7 265'),
  ('Intel', 'Intel(R) Core(TM) i5-1035G4 CPU @ 1.10GHz'),
  ('Intel', 'Intel(R) Core(TM) i5-10400 CPU @ 2.90GHz'),
  ('Intel', 'Intel(R) Core(TM) i5-14400F'),
  ('Intel', 'Intel(R) Core(TM) i5-14500T'),
  ('Intel', 'Intel(R) Core(TM) i5-3470 CPU @ 3.20GHz'),
  ('Intel', 'Intel(R) Core(TM) i5-4590S CPU @ 3.00GHz'),
  ('Intel', 'Intel(R) Core(TM) i5-6500 CPU @ 3.20GHz'),
  ('Intel', 'Intel(R) Core(TM) i5-7200U CPU @ 2.50GHz'),
  ('Intel', 'Intel(R) Core(TM) i5-7400 CPU @ 3.00GHz'),
  ('Intel', 'Intel(R) Core(TM) i5-8250U CPU @ 1.60GHz'),
  ('Intel', 'Intel(R) Core(TM) i5-8265U CPU @ 1.60GHz'),
  ('Intel', 'Intel(R) Core(TM) i5-8350U CPU @ 1.70GHz'),
  ('Intel', 'Intel(R) Core(TM) i7-8700T CPU @ 2.40GHz'),
  ('Intel', 'Intel(R) Core(TM) i7-9700K CPU @ 3.60GHz'),
  ('Intel', 'Intel(R) Xeon(R) Gold 6140 CPU @ 2.30GHz'),
  ('Virtual', 'Virtual CPU @ 3.41GHz')
ON CONFLICT (manufacturer, model) DO NOTHING;

INSERT INTO processor_architectures (name) VALUES
  ('x86_64')
ON CONFLICT (name) DO NOTHING;

-- Account managers (from Client_URackIT.csv)
INSERT INTO account_managers (full_name, email) VALUES
  ('Adam Lerner', 'adam@alernercpa.com'),
  ('Alice Tseng', 'alice@askalicetoday.com'),
  ('Frances Pearson', 'clearabstractservices@gmail.com'),
  ('Howard Ainbinder', 'cpahaa@aol.com'),
  ('George Diaz', 'dentaldynamics@optonline.net'),
  ('George Kaylor', 'gkaylor@1insight.com'),
  ('Kyle Barton', 'krb@libizlaw.com'),
  ('Piotr Koszko', 'peterk@bluforce.net'),
  ('Rocco Prichinello', 'rocco@brucelectric.com'),
  ('Rocco Bove', 'rocco@summitfacilitysolutions.com'),
  ('Sonilyn Pineda', 'sonia@sp-accountingservices.com')
ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name;

-- Organizations
INSERT INTO organizations (name, u_e_code, manager_id) VALUES
  ('1iNSiGHT LLC', 3450, (SELECT manager_id FROM account_managers WHERE email='gkaylor@1insight.com')),
  ('ALerner CPA', 1392, (SELECT manager_id FROM account_managers WHERE email='adam@alernercpa.com')),
  ('Ainbinder & Cava', 7538, (SELECT manager_id FROM account_managers WHERE email='cpahaa@aol.com')),
  ('Ask Alice Today', 9262, (SELECT manager_id FROM account_managers WHERE email='alice@askalicetoday.com')),
  ('Barton & Bruechert Law, P.C.', 2600, (SELECT manager_id FROM account_managers WHERE email='krb@libizlaw.com')),
  ('BluForce Inc.', 5441, (SELECT manager_id FROM account_managers WHERE email='peterk@bluforce.net')),
  ('Bruce Electric Equipment Corp', 2424, (SELECT manager_id FROM account_managers WHERE email='rocco@brucelectric.com')),
  ('Clear Abstract Services', 1044, (SELECT manager_id FROM account_managers WHERE email='clearabstractservices@gmail.com')),
  ('Dental Dynamics', 7730, (SELECT manager_id FROM account_managers WHERE email='dentaldynamics@optonline.net')),
  ('SP Accounting Services', 1872, (SELECT manager_id FROM account_managers WHERE email='sonia@sp-accountingservices.com')),
  ('Summit Facility Solutions', 3629, (SELECT manager_id FROM account_managers WHERE email='rocco@summitfacilitysolutions.com'))
ON CONFLICT (u_e_code) DO NOTHING;

-- Locations (derived from Endpoints_URackIT.csv Site name)
INSERT INTO locations (organization_id, name, location_type, requires_human_agent)
SELECT (SELECT organization_id FROM organizations WHERE u_e_code=1392), 'ALerner CPA', 'Other', FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM locations
  WHERE organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=1392)
    AND name = 'ALerner CPA'
);

INSERT INTO locations (organization_id, name, location_type, requires_human_agent)
SELECT (SELECT organization_id FROM organizations WHERE u_e_code=1392), 'Data Center', 'Data Center', FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM locations
  WHERE organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=1392)
    AND name = 'Data Center'
);

INSERT INTO locations (organization_id, name, location_type, requires_human_agent)
SELECT (SELECT organization_id FROM organizations WHERE u_e_code=7538), 'Ainbinder & Cava Headquarters', 'Headquarters', FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM locations
  WHERE organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=7538)
    AND name = 'Ainbinder & Cava Headquarters'
);

INSERT INTO locations (organization_id, name, location_type, requires_human_agent)
SELECT (SELECT organization_id FROM organizations WHERE u_e_code=9262), 'Ask Alice Today', 'Other', FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM locations
  WHERE organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=9262)
    AND name = 'Ask Alice Today'
);

INSERT INTO locations (organization_id, name, location_type, requires_human_agent)
SELECT (SELECT organization_id FROM organizations WHERE u_e_code=2600), 'Barton & Bruechert Law, P.C. Headquarters', 'Headquarters', FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM locations
  WHERE organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=2600)
    AND name = 'Barton & Bruechert Law, P.C. Headquarters'
);

INSERT INTO locations (organization_id, name, location_type, requires_human_agent)
SELECT (SELECT organization_id FROM organizations WHERE u_e_code=2424), 'Bruce Electric Equipment Corp Headquarters', 'Headquarters', FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM locations
  WHERE organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=2424)
    AND name = 'Bruce Electric Equipment Corp Headquarters'
);

INSERT INTO locations (organization_id, name, location_type, requires_human_agent)
SELECT (SELECT organization_id FROM organizations WHERE u_e_code=2424), 'Data Center', 'Data Center', FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM locations
  WHERE organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=2424)
    AND name = 'Data Center'
);

INSERT INTO locations (organization_id, name, location_type, requires_human_agent)
SELECT (SELECT organization_id FROM organizations WHERE u_e_code=1044), 'Clear Abstract Services Headquarters', 'Headquarters', FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM locations
  WHERE organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=1044)
    AND name = 'Clear Abstract Services Headquarters'
);

INSERT INTO locations (organization_id, name, location_type, requires_human_agent)
SELECT (SELECT organization_id FROM organizations WHERE u_e_code=7730), 'Main', 'Other', FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM locations
  WHERE organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=7730)
    AND name = 'Main'
);

INSERT INTO locations (organization_id, name, location_type, requires_human_agent)
SELECT (SELECT organization_id FROM organizations WHERE u_e_code=1872), 'Data Center', 'Data Center', FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM locations
  WHERE organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=1872)
    AND name = 'Data Center'
);

INSERT INTO locations (organization_id, name, location_type, requires_human_agent)
SELECT (SELECT organization_id FROM organizations WHERE u_e_code=1872), 'Headquarters', 'Headquarters', FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM locations
  WHERE organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=1872)
    AND name = 'Headquarters'
);

INSERT INTO locations (organization_id, name, location_type, requires_human_agent)
SELECT (SELECT organization_id FROM organizations WHERE u_e_code=3629), 'Headquarters', 'Headquarters', FALSE
WHERE NOT EXISTS (
  SELECT 1 FROM locations
  WHERE organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=3629)
    AND name = 'Headquarters'
);

-- Devices (from Endpoints_URackIT.csv; only for orgs with valid U-E codes)
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=7538),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=7538) AND name='Ainbinder & Cava Headquarters' LIMIT 1),
  'CPASERVER',
  'ONLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='QEMU'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='QEMU') AND name='Standard PC (Q35 + ICH9, 2009)' LIMIT 1),
  'CPASERVER',
  '69.74.26.223'::inet,
  '192.168.11.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows Server 2022 Standard'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.20348.4405 Build 20348.4405 (21H2)',
  '15 days 19 hours'::interval,
  'CPASERVER\Administrator',
  (SELECT device_type_id FROM device_types WHERE name='SERVER'),
  to_timestamp('12/17/2025 8:31', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='Intel(R) Xeon(R) Gold 6140 CPU @ 2.30GHz' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  8493297827
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=7538) AND d.asset_name = 'CPASERVER'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=1872),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=1872) AND name='Headquarters' LIMIT 1),
  'Accounting1',
  'OFFLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.') AND name='OptiPlex Micro 7020' LIMIT 1),
  'Accounting1',
  '173.77.199.28'::inet,
  '192.168.1.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Pro'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26200.7309 Build 26200.7309 (25H2)',
  '4 days 21 hours 10 minutes'::interval,
  'Accounting1\Accounting 1',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/8/2025 11:03', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='12th Gen Intel(R) Core(TM) i5-12500T' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  17179869184
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=1872) AND d.asset_name = 'Accounting1'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=1872),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=1872) AND name='Data Center' LIMIT 1),
  'Windows-SP1',
  'ONLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='QEMU'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='QEMU') AND name='Standard PC (Q35 + ICH9, 2009)' LIMIT 1),
  'Windows-SP1',
  '69.74.26.223'::inet,
  '192.168.12.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Pro'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26200.7462 Build 26200.7462 (25H2)',
  '3 days 5 hours'::interval,
  'WINDOWS-SP1\Accounting-SP1',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 8:33', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='Intel(R) Xeon(R) Gold 6140 CPU @ 2.30GHz' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  8589934592
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=1872) AND d.asset_name = 'Windows-SP1'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=1872),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=1872) AND name='Data Center' LIMIT 1),
  'Windows-SP2',
  'OFFLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='QEMU'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='QEMU') AND name='Standard PC (Q35 + ICH9, 2009)' LIMIT 1),
  'Windows-SP2',
  '69.74.26.223'::inet,
  '192.168.12.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Pro'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26200.7309 Build 26200.7309 (25H2)',
  '22 hours'::interval,
  'Windows-SP2\Accounting-SP2',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/2/2025 20:18', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='Intel(R) Xeon(R) Gold 6140 CPU @ 2.30GHz' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  8589934592
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=1872) AND d.asset_name = 'Windows-SP2'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=1872),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=1872) AND name='Headquarters' LIMIT 1),
  'Accounting2',
  'OFFLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.') AND name='OptiPlex Micro 7020' LIMIT 1),
  'Accounting2',
  '173.77.199.28'::inet,
  '192.168.1.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Pro'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26200.7462 Build 26200.7462 (25H2)',
  '7 days 12 hours 13 minutes'::interval,
  'Accounting2\Accounting 2',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 0:26', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='12th Gen Intel(R) Core(TM) i5-12500T' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  17179869184
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=1872) AND d.asset_name = 'Accounting2'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=2424),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=2424) AND name='Bruce Electric Equipment Corp Headquarters' LIMIT 1),
  'BEE-Rocco',
  'ONLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.') AND name='OptiPlex 3000' LIMIT 1),
  'BEE-Rocco',
  '108.6.106.197'::inet,
  '10.0.0.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Pro'),
  (SELECT domain_id FROM domains WHERE name='Brucelectric.local'),
  '10.0.26200.7462 Build 26200.7462 (25H2)',
  '1 day 3 hours 30 minutes'::interval,
  'BRUCELECTRIC\rocco',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 8:31', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='12th Gen Intel(R) Core(TM) i5-12500' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  17179869184
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=2424) AND d.asset_name = 'BEE-Rocco'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=2424),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=2424) AND name='Bruce Electric Equipment Corp Headquarters' LIMIT 1),
  'BEE-WAREHOUSE',
  'ONLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.') AND name='OptiPlex 7040' LIMIT 1),
  'BEE-WAREHOUSE',
  '108.6.106.197'::inet,
  '10.0.0.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Pro'),
  (SELECT domain_id FROM domains WHERE name='Brucelectric.local'),
  '10.0.26100.7462 Build 26100.7462 (24H2)',
  '2 days 12 hours 40 minutes'::interval,
  'BRUCELECTRIC\Warehouse',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 8:35', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='Intel(R) Core(TM) i5-6500 CPU @ 3.20GHz' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  17179869184
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=2424) AND d.asset_name = 'BEE-WAREHOUSE'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=2424),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=2424) AND name='Bruce Electric Equipment Corp Headquarters' LIMIT 1),
  'BEE-WS-13',
  'ONLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.') AND name='OptiPlex 7010' LIMIT 1),
  'BEE-WS-131',
  '108.6.106.197'::inet,
  '10.0.0.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Pro'),
  (SELECT domain_id FROM domains WHERE name='Brucelectric.local'),
  '10.0.26100.7462 Build 26100.7462 (24H2)',
  '1 day 14 hours 20 minutes'::interval,
  'BRUCELECTRIC\Linda',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 8:35', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='Intel(R) Core(TM) i5-3470 CPU @ 3.20GHz' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  17179869184
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=2424) AND d.asset_name = 'BEE-WS-13'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=2424),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=2424) AND name='Bruce Electric Equipment Corp Headquarters' LIMIT 1),
  'BEE-LAPTOP-ROCCO',
  'OFFLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.') AND name='Latitude 7490' LIMIT 1),
  'BEE-LAPTOP-ROCCO',
  '24.191.118.113'::inet,
  '192.168.4.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Pro'),
  (SELECT domain_id FROM domains WHERE name='Brucelectric.local'),
  '10.0.26100.7462 Build 26100.7462 (24H2)',
  '2 hours 15 minutes'::interval,
  'BRUCELECTRIC\rocco',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/16/2025 19:59', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='Intel(R) Core(TM) i5-8350U CPU @ 1.70GHz' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  17179869184
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=2424) AND d.asset_name = 'BEE-LAPTOP-ROCCO'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=2424),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=2424) AND name='Bruce Electric Equipment Corp Headquarters' LIMIT 1),
  'BEE-WS-Auto',
  'ONLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.') AND name='OptiPlex 7010' LIMIT 1),
  'BEE-WS-Auto',
  '108.6.106.197'::inet,
  '10.0.0.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Pro'),
  (SELECT domain_id FROM domains WHERE name='Brucelectric.local'),
  '10.0.26200.7462 Build 26200.7462 (25H2)',
  '2 days 7 hours 40 minutes'::interval,
  'BRUCELECTRIC\rocco',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 8:31', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='Intel(R) Core(TM) i5-3470 CPU @ 3.20GHz' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  17179869184
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=2424) AND d.asset_name = 'BEE-WS-Auto'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=3629),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=3629) AND name='Headquarters' LIMIT 1),
  'Kristen-SummitFacilitySolutions',
  'OFFLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Microsoft Corporation'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Microsoft Corporation') AND name='Surface Pro 7' LIMIT 1),
  'Kristen-SummitFacilitySolutions',
  '173.77.204.18'::inet,
  '192.168.1.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Home'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.22631.6199 Build 22631.6199 (23H2)',
  '22 hours 26 minutes'::interval,
  'KRISTEN-SUMMITF\16314',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 7:54', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='Intel(R) Core(TM) i5-1035G4 CPU @ 1.10GHz' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  8589934592
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=3629) AND d.asset_name = 'Kristen-SummitFacilitySolutions'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=3629),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=3629) AND name='Headquarters' LIMIT 1),
  'Rocco - Home Computer',
  'OFFLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='HP'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='HP') AND name='HP Pavilion Desktop PC 570-p0xx' LIMIT 1),
  'DESKTOP-IS35VSN',
  '68.132.56.43'::inet,
  '10.0.0.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Home'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26200.7462 Build 26200.7462 (25H2)',
  '5 days 23 hours 42 minutes'::interval,
  'DESKTOP-IS35VSN\User',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/16/2025 10:33', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='Intel(R) Core(TM) i5-7400 CPU @ 3.00GHz' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  12884901888
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=3629) AND d.asset_name = 'Rocco - Home Computer'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=2424),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=2424) AND name='Data Center' LIMIT 1),
  'BEEC-NYDC2',
  'ONLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='QEMU'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='QEMU') AND name='Standard PC (i440FX + PIIX, 1996)' LIMIT 1),
  'BEEC-NYDC2',
  '69.74.26.223'::inet,
  '192.168.12.9'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows Server 2019 Standard'),
  (SELECT domain_id FROM domains WHERE name='Brucelectric.local'),
  '10.0.17763.7919 Build 17763.7919 (1809)',
  '34 days 14 hours 55 minutes'::interval,
  'BRUCELECTRIC\AdminURackIT',
  (SELECT device_type_id FROM device_types WHERE name='SERVER'),
  to_timestamp('12/17/2025 8:35', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Reboot Required'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Common' AND model='Common KVM processor' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  8493297827
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=2424) AND d.asset_name = 'BEEC-NYDC2'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=3629),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=3629) AND name='Headquarters' LIMIT 1),
  'Stefi-Tablet',
  'OFFLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Microsoft Corporation'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Microsoft Corporation') AND name='Surface Pro 7+' LIMIT 1),
  'Stefi-Tablet',
  '71.190.47.91'::inet,
  '192.168.1.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Home'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26200.7462 Build 26200.7462 (25H2)',
  '1 day 7 hours 16 minutes'::interval,
  'STEFI-TABLET\Stefanie Hochhauser',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/16/2025 17:33', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='11th Gen Intel(R) Core(TM) i5-1135G7 @ 2.40GHz' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  8589934592
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=3629) AND d.asset_name = 'Stefi-Tablet'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=3629),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=3629) AND name='Headquarters' LIMIT 1),
  'Conference room',
  'OFFLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Microsoft Corporation'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Microsoft Corporation') AND name='Surface Pro 8' LIMIT 1),
  'SFS-Rocco-2',
  '71.190.47.91'::inet,
  '192.168.1.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Home'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26100.7462 Build 26100.7462 (24H2)',
  '5 days 19 hours 10 minutes'::interval,
  'SFS-Rocco-2\Eric',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/15/2025 15:27', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='11th Gen Intel(R) Core(TM) i5-1135G7 @ 2.40GHz' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  8589934592
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=3629) AND d.asset_name = 'Conference room'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=3629),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=3629) AND name='Headquarters' LIMIT 1),
  'DESKTOP-TPG26AC - Rocco Laptop',
  'OFFLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Microsoft Corporation'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Microsoft Corporation') AND name='Surface Pro 6' LIMIT 1),
  'DESKTOP-TPG26AC',
  '71.190.47.91'::inet,
  '192.168.1.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 10 Home'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.19044.2965 Build 19044.2965 (21H2)',
  '9 days 16 hours 17 minutes'::interval,
  'DESKTOP-TPG26AC\rockb',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('10/2/2025 1:12', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Reboot Required'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='Intel(R) Core(TM) i5-8250U CPU @ 1.60GHz' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  8589934592
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=3629) AND d.asset_name = 'DESKTOP-TPG26AC - Rocco Laptop'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=3629),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=3629) AND name='Headquarters' LIMIT 1),
  'Eric - Office Computer',
  'ONLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='ASUS'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='ASUS') AND name='System Product Name' LIMIT 1),
  'DESKTOP-IADECGJ',
  '71.190.47.91'::inet,
  '192.168.1.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Pro'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26200.7462 Build 26200.7462 (25H2)',
  '3 days 5 hours 50 minutes'::interval,
  'DESKTOP-IADECGJ\Owner',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 8:34', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='12th Gen Intel(R) Core(TM) i9-12900K' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  34359738368
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=3629) AND d.asset_name = 'Eric - Office Computer'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=3629),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=3629) AND name='Headquarters' LIMIT 1),
  'Rocco Office -DESKTOP-2UNSPQQ',
  'OFFLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Hewlett-Packard'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Hewlett-Packard') AND name='HP EliteDesk 800 G1 USDT' LIMIT 1),
  'DESKTOP-2UNSPQQ',
  '74.101.105.129'::inet,
  '192.168.0.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 10 Pro'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.19045.6466 Build 19045.6466 (22H2)',
  '4 days 16 hours 10 minutes'::interval,
  'DESKTOP-2UNSPQQ\User',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('11/16/2025 10:31', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='Intel(R) Core(TM) i5-4590S CPU @ 3.00GHz' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  8589934592
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=3629) AND d.asset_name = 'Rocco Office -DESKTOP-2UNSPQQ'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=7538),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=7538) AND name='Ainbinder & Cava Headquarters' LIMIT 1),
  'ACCOUNTING1-PC',
  'ONLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.') AND name='OptiPlex 7060' LIMIT 1),
  'ACCOUNTING1-PC',
  '98.116.132.224'::inet,
  '192.168.1.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Pro'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26200.7462 Build 26200.7462 (25H2)',
  NULL,
  'ACCOUNTING1-PC\accounting1',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 8:34', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='Intel(R) Core(TM) i7-8700T CPU @ 2.40GHz' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  17179869184
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=7538) AND d.asset_name = 'ACCOUNTING1-PC'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=7538),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=7538) AND name='Ainbinder & Cava Headquarters' LIMIT 1),
  'Accounting4',
  'ONLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.') AND name='Precision 3460' LIMIT 1),
  'Accounting4',
  '98.116.132.224'::inet,
  '192.168.1.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Pro'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26200.7462 Build 26200.7462 (25H2)',
  '7 days 13 hours 45 minutes'::interval,
  'ACCOUNTING4\Accounting4',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 8:32', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='12th Gen Intel(R) Core(TM) i7-12700' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  34359738368
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=7538) AND d.asset_name = 'Accounting4'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=7538),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=7538) AND name='Ainbinder & Cava Headquarters' LIMIT 1),
  'Accounting2',
  'OFFLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.') AND name='Precision 3460' LIMIT 1),
  'Accounting2',
  '98.116.132.224'::inet,
  '192.168.1.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Pro'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26200.7309 Build 26200.7309 (25H2)',
  '15 hours 52 minutes'::interval,
  'ACCOUNTING2\Accounting2',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 6:32', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='12th Gen Intel(R) Core(TM) i7-12700' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  34359738368
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=7538) AND d.asset_name = 'Accounting2'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=7538),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=7538) AND name='Ainbinder & Cava Headquarters' LIMIT 1),
  'Accounting3',
  'ONLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.') AND name='Latitude 3500' LIMIT 1),
  'Accounting3',
  '98.116.132.224'::inet,
  '192.168.1.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Pro'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26200.7462 Build 26200.7462 (25H2)',
  '19 hours 10 minutes'::interval,
  'ACCOUNTING3\Accounting5',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 8:32', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='Intel(R) Core(TM) i5-8265U CPU @ 1.60GHz' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  8589934592
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=7538) AND d.asset_name = 'Accounting3'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=2424),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=2424) AND name='Bruce Electric Equipment Corp Headquarters' LIMIT 1),
  'Erik-Desktop',
  'ONLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.') AND name='OptiPlex Micro 7020' LIMIT 1),
  'Erik-Desktop',
  '108.6.106.197'::inet,
  '10.0.0.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Pro'),
  (SELECT domain_id FROM domains WHERE name='Brucelectric.local'),
  '10.0.26200.7462 Build 26200.7462 (25H2)',
  '7 days 10 hours'::interval,
  'BRUCELECTRIC\erik',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 8:32', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='12th Gen Intel(R) Core(TM) i5-12500T' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  34359738368
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=2424) AND d.asset_name = 'Erik-Desktop'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=2424),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=2424) AND name='Bruce Electric Equipment Corp Headquarters' LIMIT 1),
  'Joann-Desktop',
  'ONLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.') AND name='OptiPlex Micro 7020' LIMIT 1),
  'Joann-Desktop',
  '108.6.106.197'::inet,
  '10.0.0.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Pro'),
  (SELECT domain_id FROM domains WHERE name='Brucelectric.local'),
  '10.0.26200.7462 Build 26200.7462 (25H2)',
  '1 day 20 hours 35 minutes'::interval,
  'BRUCELECTRIC\Joann',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 8:35', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='12th Gen Intel(R) Core(TM) i5-12500T' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  34359738368
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=2424) AND d.asset_name = 'Joann-Desktop'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=2424),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=2424) AND name='Bruce Electric Equipment Corp Headquarters' LIMIT 1),
  'Demetrius-Desktop',
  'ONLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.') AND name='OptiPlex Micro 7020' LIMIT 1),
  'Demetrius-Desktop',
  '108.6.106.197'::inet,
  '10.0.0.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Pro'),
  (SELECT domain_id FROM domains WHERE name='Brucelectric.local'),
  '10.0.26200.7462 Build 26200.7462 (25H2)',
  '5 days 18 hours 14 minutes'::interval,
  'BRUCELECTRIC\Demetrius',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 8:32', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='12th Gen Intel(R) Core(TM) i5-12500T' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  34359738368
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=2424) AND d.asset_name = 'Demetrius-Desktop'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=9262),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=9262) AND name='Ask Alice Today' LIMIT 1),
  'Mama-Tseng',
  'OFFLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='HP'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='HP') AND name='HP ENVY x360 2-in-1 Laptop 15-ey1xxx' LIMIT 1),
  'Mama-Tseng',
  '24.193.209.166'::inet,
  '192.168.1.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Home'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26100.7171 Build 26100.7171 (24H2)',
  '14 days 23 hours 45 minutes'::interval,
  'Mama-Tseng\alt92',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 7:32', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Reboot Required'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Amd' AND model='AMD Ryzen 7 7730U with Radeon Graphics' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  17179869184
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=9262) AND d.asset_name = 'Mama-Tseng'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=1872),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=1872) AND name='Headquarters' LIMIT 1),
  'laptop - DESKTOP-NQ7PQCL',
  'ONLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.') AND name='Inspiron 7706 2n1' LIMIT 1),
  'DESKTOP-NQ7PQCL',
  '69.122.16.156'::inet,
  '192.168.1.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Home'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26200.7462 Build 26200.7462 (25H2)',
  '3 hours 1 minute'::interval,
  'DESKTOP-NQ7PQCL\sonil',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 8:31', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='11th Gen Intel(R) Core(TM) i7-1165G7 @ 2.80GHz' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  17179869184
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=1872) AND d.asset_name = 'laptop - DESKTOP-NQ7PQCL'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=1044),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=1044) AND name='Clear Abstract Services Headquarters' LIMIT 1),
  'FP1-PM-02 - Fran',
  'OFFLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.') AND name='Latitude 3580' LIMIT 1),
  'FP1-PM-02',
  '24.190.10.254'::inet,
  '192.168.4.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Pro'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26200.7462 Build 26200.7462 (25H2)',
  '6 hours 59 minutes'::interval,
  'FP1-PM-02\Fran',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/16/2025 20:13', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='Intel(R) Core(TM) i5-7200U CPU @ 2.50GHz' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  4294967296
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=1044) AND d.asset_name = 'FP1-PM-02 - Fran'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=1044),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=1044) AND name='Clear Abstract Services Headquarters' LIMIT 1),
  'CAS-Pete',
  'OFFLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.') AND name='Inspiron 16 Plus 7640' LIMIT 1),
  'CAS-Pete',
  '24.190.10.254'::inet,
  '192.168.4.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Pro'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26200.7462 Build 26200.7462 (25H2)',
  '4 days 7 hours 30 minutes'::interval,
  'CAS-Pete\pdevl',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/16/2025 16:59', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Reboot Required'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='Intel(R) Core(TM) Ultra 7 155H' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  17179869184
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=1044) AND d.asset_name = 'CAS-Pete'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=1044),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=1044) AND name='Clear Abstract Services Headquarters' LIMIT 1),
  'CAS-Fran',
  'OFFLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.') AND name='OptiPlex Micro 7020' LIMIT 1),
  'CAS-Fran',
  '24.190.10.254'::inet,
  '192.168.4.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Pro'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26100.4946 Build 26100.4946 (24H2)',
  '3 days 19 hours 50 minutes'::interval,
  'CAS-Fran\franc',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('8/18/2025 20:05', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='Intel(R) Core(TM) i5-14500T' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  34359738368
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=1044) AND d.asset_name = 'CAS-Fran'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=3629),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=3629) AND name='Headquarters' LIMIT 1),
  'MikeHomePCNew',
  'OFFLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='LENOVO'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='LENOVO') AND name='LEGION T5 26IRB8 ( 90UT0019US )' LIMIT 1),
  'MikeHomePCNew',
  '70.111.111.31'::inet,
  '192.168.4.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Home'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26200.7462 Build 26200.7462 (25H2)',
  '1 day 6 hours 50 minutes'::interval,
  'MikeHomePCNew\micha',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/16/2025 21:46', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='Intel(R) Core(TM) i5-14400F' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  17179869184
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=3629) AND d.asset_name = 'MikeHomePCNew'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=3629),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=3629) AND name='Headquarters' LIMIT 1),
  'Eric',
  'ONLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='System manufacturer'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='System manufacturer') AND name='System Product Name' LIMIT 1),
  'Eric',
  '108.30.170.175'::inet,
  '192.168.1.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Home'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26200.7462 Build 26200.7462 (25H2)',
  '15 hours 56 minutes'::interval,
  'ERIC\ericm',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 8:31', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='Intel(R) Core(TM) i7-9700K CPU @ 3.60GHz' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  17179869184
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=3629) AND d.asset_name = 'Eric'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=3629),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=3629) AND name='Headquarters' LIMIT 1),
  'DESKTOP-Office-Rocco',
  'ONLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.') AND name='OptiPlex Micro 7020' LIMIT 1),
  'DesktopOfficeRocco',
  '71.190.47.91'::inet,
  '192.168.1.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Pro'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26200.7462 Build 26200.7462 (25H2)',
  '7 days 7 hours 45 minutes'::interval,
  'DESKTOPOFFICERO\Rocco',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 8:31', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='Intel(R) Core(TM) i5-14500T' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  34359738368
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=3629) AND d.asset_name = 'DESKTOP-Office-Rocco'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=7730),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=7730) AND name='Main' LIMIT 1),
  'Server',
  'ONLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='HP'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='HP') AND name='HP OmniDesk Desktop M03-0xxx' LIMIT 1),
  'Server',
  '24.146.237.72'::inet,
  '192.168.1.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Home'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26100.7462 Build 26100.7462 (24H2)',
  '5 days 17 hours 5 minutes'::interval,
  'SERVER\Owner',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 8:31', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='Intel(R) Core(TM) Ultra 7 265' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  17179869184
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=7730) AND d.asset_name = 'Server'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=2600),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=2600) AND name='Barton & Bruechert Law, P.C. Headquarters' LIMIT 1),
  'Kyle-Pc - Office',
  'ONLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Acer'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Acer') AND name='Aspire TC-875' LIMIT 1),
  'Kyle-Pc',
  '108.41.96.77'::inet,
  '192.168.1.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Home'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26100.7462 Build 26100.7462 (24H2)',
  '4 days 7 hours 40 minutes'::interval,
  'KYLE-PC\Kyle',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 8:32', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='Intel(R) Core(TM) i5-10400 CPU @ 2.90GHz' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  8589934592
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=2600) AND d.asset_name = 'Kyle-Pc - Office'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=7730),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=7730) AND name='Main' LIMIT 1),
  'PinkRoom',
  'ONLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.') AND name='Inspiron 16 7620 2-in-1' LIMIT 1),
  'PinkRoom',
  '24.146.237.72'::inet,
  '192.168.1.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Home'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26200.7462 Build 26200.7462 (25H2)',
  '1 day 21 hours 40 minutes'::interval,
  'PinkRoom\denta',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 8:34', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='12th Gen Intel(R) Core(TM) i7-1260P' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  17179869184
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=7730) AND d.asset_name = 'PinkRoom'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=3629),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=3629) AND name='Headquarters' LIMIT 1),
  'KarinaDesktop',
  'ONLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='LENOVO'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='LENOVO') AND name='LEGION T5 26IRB8 ( 90UT0019US )' LIMIT 1),
  'KarinaDesktop',
  '73.112.48.238'::inet,
  '10.1.10.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Home'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26100.7462 Build 26100.7462 (24H2)',
  '5 days 23 hours 38 minutes'::interval,
  'KarinaDesktop\summi',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 8:35', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='Intel(R) Core(TM) i5-14400F' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  17179869184
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=3629) AND d.asset_name = 'KarinaDesktop'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=2600),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=2600) AND name='Barton & Bruechert Law, P.C. Headquarters' LIMIT 1),
  'Home - Kyle',
  'OFFLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Micro-Star International Co., Ltd.'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Micro-Star International Co., Ltd.') AND name='MS-7C91' LIMIT 1),
  'DESKTOP-2VIVDNC',
  '108.29.101.232'::inet,
  '192.168.1.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 10 Home'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.19045.6466 Build 19045.6466 (22H2)',
  '7 days 21 hours 50 minutes'::interval,
  'DESKTOP-2VIVDNC\conke',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/16/2025 14:19', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Amd' AND model='AMD Ryzen 5 5600X 6-Core Processor' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  34359738368
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=2600) AND d.asset_name = 'Home - Kyle'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=1392),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=1392) AND name='ALerner CPA' LIMIT 1),
  'Adam-Laptop',
  'OFFLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Dell Inc.') AND name='Latitude 7350' LIMIT 1),
  'Adam-Laptop',
  '75.57.97.221'::inet,
  '192.168.1.254'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Pro'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26200.7462 Build 26200.7462 (25H2)',
  '2 days 21 hours 26 minutes'::interval,
  'Adam-Laptop\alern',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/16/2025 18:51', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='Intel(R) Core(TM) Ultra 7 165U' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  34359738368
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=1392) AND d.asset_name = 'Adam-Laptop'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=3629),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=3629) AND name='Headquarters' LIMIT 1),
  'SummitFacility',
  'ONLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='Microsoft Corporation'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='Microsoft Corporation') AND name='Microsoft Surface Pro, 11th Edition' LIMIT 1),
  'SummitFacility',
  '71.190.47.91'::inet,
  '192.168.1.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Home'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26200.7462 Build 26200.7462 (25H2)',
  '1 hour'::interval,
  'SummitFacility\Christina Murdock',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 8:31', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Virtual' AND model='Virtual CPU @ 3.41GHz' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  17179869184
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=3629) AND d.asset_name = 'SummitFacility'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=1392),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=1392) AND name='Data Center' LIMIT 1),
  'ALerner-CPA1',
  'ONLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='QEMU'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='QEMU') AND name='Standard PC (Q35 + ICH9, 2009)' LIMIT 1),
  'ALerner-CPA1',
  '69.74.26.223'::inet,
  '192.168.15.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 11 Pro'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.26200.7462 Build 26200.7462 (25H2)',
  '4 days 23 hours 45 minutes'::interval,
  'ALERNER-CPA1\ALerner-CPA1',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 8:31', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='Intel(R) Xeon(R) Gold 6140 CPU @ 2.30GHz' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  17179869184
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=1392) AND d.asset_name = 'ALerner-CPA1'
);
INSERT INTO devices (
  organization_id, location_id, asset_name, status,
  manufacturer_id, model_id,
  host_name, public_ip, gateway,
  os_id, domain_id, os_version,
  system_uptime, last_logged_in_by,
  device_type_id, last_reported_time,
  update_status_id,
  processor_id, architecture_id,
  total_memory
)
SELECT
  (SELECT organization_id FROM organizations WHERE u_e_code=7730),
  (SELECT location_id FROM locations WHERE organization_id=(SELECT organization_id FROM organizations WHERE u_e_code=7730) AND name='Main' LIMIT 1),
  'YELLOWROOM-PC',
  'ONLINE',
  (SELECT manufacturer_id FROM device_manufacturers WHERE name='HP'),
  (SELECT model_id FROM device_models WHERE manufacturer_id=(SELECT manufacturer_id FROM device_manufacturers WHERE name='HP') AND name='HP Laptop 17-by0xxx' LIMIT 1),
  'YELLOWROOM-PC',
  '24.146.237.72'::inet,
  '192.168.1.1'::inet,
  (SELECT os_id FROM operating_systems WHERE name='Microsoft Windows 10 Home'),
  (SELECT domain_id FROM domains WHERE name='WORKGROUP'),
  '10.0.19045.6466 Build 19045.6466 (22H2)',
  '19 hours 53 minutes'::interval,
  'YELLOWROOM-PC\YELLOWROOM-PC',
  (SELECT device_type_id FROM device_types WHERE name='WORKSTATION'),
  to_timestamp('12/17/2025 8:32', 'MM/DD/YYYY HH24:MI'),
  (SELECT update_status_id FROM update_statuses WHERE name='Fully Patched'),
  (SELECT processor_id FROM processor_models WHERE manufacturer ='Intel' AND model='Intel(R) Core(TM) i5-7200U CPU @ 2.50GHz' LIMIT 1),
  (SELECT architecture_id FROM processor_architectures WHERE name='x86_64'),
  8589934592
WHERE NOT EXISTS (
  SELECT 1 FROM devices d
  WHERE d.organization_id = (SELECT organization_id FROM organizations WHERE u_e_code=7730) AND d.asset_name = 'YELLOWROOM-PC'
);

COMMIT;

