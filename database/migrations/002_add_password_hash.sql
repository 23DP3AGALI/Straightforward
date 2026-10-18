SET @password_hash_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'lietotajs'
      AND COLUMN_NAME = 'password_hash'
);

SET @password_hash_migration = IF(
    @password_hash_exists = 0,
    'ALTER TABLE lietotajs ADD COLUMN password_hash VARCHAR(255) NULL',
    'SELECT 1'
);

PREPARE password_hash_statement FROM @password_hash_migration;
EXECUTE password_hash_statement;
DEALLOCATE PREPARE password_hash_statement;
