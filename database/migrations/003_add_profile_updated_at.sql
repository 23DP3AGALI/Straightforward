SET @profile_updated_at_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'anketa'
      AND COLUMN_NAME = 'updated_at'
);

SET @profile_updated_at_migration = IF(
    @profile_updated_at_exists = 0,
    'ALTER TABLE anketa ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP',
    'SELECT 1'
);

PREPARE profile_updated_at_statement FROM @profile_updated_at_migration;
EXECUTE profile_updated_at_statement;
DEALLOCATE PREPARE profile_updated_at_statement;
