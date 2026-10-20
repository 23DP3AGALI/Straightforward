ALTER TABLE lietotajs
    ADD COLUMN age TINYINT UNSIGNED NULL AFTER nick;

ALTER TABLE email_registration_verification
    ADD COLUMN age TINYINT UNSIGNED NULL AFTER nick;
