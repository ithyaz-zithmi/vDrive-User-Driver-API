-- Up Migration
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS onboarding_status VARCHAR(50) DEFAULT 'PHONE_VERIFIED';
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS documents_submitted BOOLEAN DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS driver_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    document_url TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, VERIFIED, REJECTED
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_documents_driver_id ON driver_documents(driver_id);

-- Down Migration
-- DROP TABLE IF EXISTS driver_documents;
-- ALTER TABLE drivers DROP COLUMN IF EXISTS onboarding_status;
-- ALTER TABLE drivers DROP COLUMN IF EXISTS documents_submitted;
