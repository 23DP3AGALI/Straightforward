CREATE TABLE email_registration_verification (
    id            INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(100) NOT NULL,
    nick          VARCHAR(50) NOT NULL,
    contact       VARCHAR(200),
    password_hash VARCHAR(255) NOT NULL,
    code_hash     CHAR(64) NOT NULL,
    expires_at    DATETIME NOT NULL,
    last_sent_at  DATETIME NOT NULL,
    attempts      TINYINT UNSIGNED NOT NULL DEFAULT 0,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_email_verification_email (email),
    UNIQUE KEY uq_email_verification_nick (nick),
    INDEX idx_email_verification_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
