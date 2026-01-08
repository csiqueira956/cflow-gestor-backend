-- Migration: Add company_id field to usuarios table for multi-tenancy support
-- Date: 2025-11-18

-- Add company_id column to usuarios table
-- Default value is 1 for existing users (assuming single company setup)
ALTER TABLE usuarios ADD COLUMN company_id INTEGER DEFAULT 1;

-- Create index on company_id for better query performance
CREATE INDEX idx_usuarios_company_id ON usuarios(company_id);

-- Update all existing users to have company_id = 1
UPDATE usuarios SET company_id = 1 WHERE company_id IS NULL;
