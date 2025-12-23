-- 1. Ensure new columns exist
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS username VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS current_balance NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS organization_type VARCHAR(100);

-- 2. Migrate legacy password if exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'password') THEN
        UPDATE organizations SET password_hash = password WHERE password_hash IS NULL;
    END IF;
END $$;

-- 3. Drop legacy password column
ALTER TABLE organizations DROP COLUMN IF EXISTS password;

-- 4. Constraint for username
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organizations_username_key') THEN
        ALTER TABLE organizations ADD CONSTRAINT organizations_username_key UNIQUE (username);
    END IF;
END $$;

-- 5. Insert USM-PSITS
INSERT INTO organizations (username, full_name, name, current_balance, password_hash)
VALUES ('USM-PSITS', 'Philippine Society of Information Technology Students', 'PSITS', 0.00, '$2a$10$YourDefaultHashHere')
ON CONFLICT (username) 
DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    name = EXCLUDED.name;

-- 6. DROP Funds if exists (Reset)
DROP TABLE IF EXISTS funds CASCADE;

-- 7. Create Funds Table
CREATE TABLE funds (
    id SERIAL PRIMARY KEY,
    org_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    source_name VARCHAR(255) NOT NULL,
    balance NUMERIC(15, 2) DEFAULT 0.00,
    semester VARCHAR(50) DEFAULT 'First Semester',
    school_year VARCHAR(50) DEFAULT 'S.Y. 2025 - 2026',
    UNIQUE(org_id, source_name, semester, school_year)
);

-- 8. Create/Ensure Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    org_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    type VARCHAR(50), 
    category VARCHAR(100),
    amount NUMERIC(15, 2),
    description TEXT,
    event_name VARCHAR(255),
    document_type VARCHAR(50),
    attachment_url TEXT,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Alter Transactions Table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS fund_id INT REFERENCES funds(id) ON DELETE SET NULL;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS type VARCHAR(50);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount NUMERIC(15, 2);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS event_name VARCHAR(255);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS document_type VARCHAR(50);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payee_merchant VARCHAR(255);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS evidence_number VARCHAR(100);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS semester VARCHAR(50);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS school_year VARCHAR(50);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS duration VARCHAR(100);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS activity_approval_date DATE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS resolution_number VARCHAR(100);

-- 10. Insert Default Funds
INSERT INTO funds (org_id, source_name, balance)
SELECT id, 'Allocation from University Admin', 0.00 FROM organizations;

INSERT INTO funds (org_id, source_name, balance)
SELECT id, 'Membership Fees', 0.00 FROM organizations;

INSERT INTO funds (org_id, source_name, balance)
SELECT id, 'Voluntary Contribution', 0.00 FROM organizations;

INSERT INTO funds (org_id, source_name, balance)
SELECT id, 'Donations', 0.00 FROM organizations;

INSERT INTO funds (org_id, source_name, balance)
SELECT id, 'Sponsorship', 0.00 FROM organizations;

INSERT INTO funds (org_id, source_name, balance)
SELECT id, 'IGP Proceeds', 0.00 FROM organizations;

-- 11. Cleanup
DROP TABLE IF EXISTS ppmp_items CASCADE;
DROP TABLE IF EXISTS ppmp CASCADE;
DROP TABLE IF EXISTS users CASCADE;
ALTER TABLE transactions DROP COLUMN IF EXISTS ppmp_item_id;

-- 12. Organization Officers Table
CREATE TABLE IF NOT EXISTS organization_officers (
    id SERIAL PRIMARY KEY,
    org_id INT REFERENCES organizations(id) ON DELETE CASCADE,
    treasurer_name VARCHAR(255),
    auditor_name VARCHAR(255),
    president_name VARCHAR(255),
    adviser_name VARCHAR(255),
    adviser2_name VARCHAR(255),
    semester VARCHAR(50) DEFAULT 'First Semester',
    school_year VARCHAR(50) DEFAULT 'S.Y. 2025 - 2026',
    UNIQUE(org_id, semester, school_year)
);

-- Drop old constraint if exists (Schema migration support)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_officers_org_id_key') THEN
        ALTER TABLE organization_officers DROP CONSTRAINT organization_officers_org_id_key;
    END IF;
    -- Add columns if they don't exist (for existing tables)
    BEGIN
        ALTER TABLE organization_officers ADD COLUMN semester VARCHAR(50) DEFAULT 'First Semester';
    EXCEPTION WHEN duplicate_column THEN END;
    
    BEGIN
        ALTER TABLE organization_officers ADD COLUMN school_year VARCHAR(50) DEFAULT 'S.Y. 2025 - 2026';
    EXCEPTION WHEN duplicate_column THEN END;

     -- Re-add constraint to include semester/year
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organization_officers_org_id_semester_school_year_key') THEN
        ALTER TABLE organization_officers ADD CONSTRAINT organization_officers_org_id_semester_school_year_key UNIQUE (org_id, semester, school_year);
    END IF;
END $$;

