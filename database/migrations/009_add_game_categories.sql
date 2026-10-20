ALTER TABLE spele
    ADD COLUMN category VARCHAR(50) NOT NULL DEFAULT 'Other' AFTER nosaukums;
