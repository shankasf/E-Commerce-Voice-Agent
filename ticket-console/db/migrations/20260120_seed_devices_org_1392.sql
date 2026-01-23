-- Seed devices and assignments for organization with U E code 1392
DO $$
DECLARE
    org_id INTEGER;
    loc_id INTEGER;
    contact_id INTEGER;
    device_id_1 INTEGER;
    device_id_2 INTEGER;
    device_id_3 INTEGER;
BEGIN
    -- Look up organization
    SELECT organization_id INTO org_id
    FROM organizations
    WHERE u_e_code = 1392
    LIMIT 1;

    IF org_id IS NULL THEN
        RAISE EXCEPTION 'Organization with U E code 1392 not found';
    END IF;

    -- Ensure a default location for the organization
    SELECT location_id INTO loc_id
    FROM locations
    WHERE organization_id = org_id
    ORDER BY location_id ASC
    LIMIT 1;

    IF loc_id IS NULL THEN
        INSERT INTO locations (organization_id, name, location_type)
        VALUES (org_id, 'Default Location', 'Other')
        RETURNING location_id INTO loc_id;
    END IF;

    -- Ensure contact exists (email is required)
    SELECT contact_id INTO contact_id
    FROM contacts
    WHERE organization_id = org_id
      AND full_name = 'Haripriya Dhanasekaran'
    LIMIT 1;

    IF contact_id IS NULL THEN
        INSERT INTO contacts (organization_id, full_name, email, phone)
        VALUES (
            org_id,
            'Haripriya Dhanasekaran',
            'haripriya.dhanasekaran@example.com',
            NULL
        )
        RETURNING contact_id INTO contact_id;
    END IF;

    -- Create 3 devices for the organization
    INSERT INTO devices (organization_id, location_id, asset_name, status, host_name)
    VALUES (org_id, loc_id, 'ALerner-CPA1', 'ONLINE', 'alerner-cpa1')
    RETURNING device_id INTO device_id_1;

    INSERT INTO devices (organization_id, location_id, asset_name, status, host_name)
    VALUES (org_id, loc_id, 'HP-System-01', 'OFFLINE', 'hp-system-01')
    RETURNING device_id INTO device_id_2;

    INSERT INTO devices (organization_id, location_id, asset_name, status, host_name)
    VALUES (org_id, loc_id, 'Lenovo-ThinkCentre-02', 'ONLINE', 'lenovo-tc-02')
    RETURNING device_id INTO device_id_3;

    -- Assign two devices to the contact
    INSERT INTO contact_devices (contact_id, device_id)
    VALUES
        (contact_id, device_id_1),
        (contact_id, device_id_2);
END $$;

