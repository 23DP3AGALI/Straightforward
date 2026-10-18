CREATE TABLE lietotajs (
    id                  INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email               VARCHAR(100) NOT NULL UNIQUE,
    nick                VARCHAR(50) NOT NULL UNIQUE,
    kontakt_informacija VARCHAR(200),
    password_hash       VARCHAR(255) NOT NULL,
    ir_banots           BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admin (
    id    INT NOT NULL PRIMARY KEY,
    vards VARCHAR(50) NOT NULL,
    CONSTRAINT fk_admin_user FOREIGN KEY (id) REFERENCES lietotajs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lietotaja_bans (
    id           INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    pamatojums   TEXT NOT NULL,
    datums       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    beigu_datums DATETIME,
    ir_aktivs    ENUM('ir', 'nav') NOT NULL,
    lietotajs_id INT NOT NULL,
    admin_id     INT NOT NULL,
    CONSTRAINT fk_bans_user FOREIGN KEY (lietotajs_id) REFERENCES lietotajs(id),
    CONSTRAINT fk_bans_admin FOREIGN KEY (admin_id) REFERENCES admin(id),
    INDEX idx_bans_user_active (lietotajs_id, ir_aktivs)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE spele (
    id        INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nosaukums VARCHAR(100) NOT NULL UNIQUE,
    attels    VARCHAR(500),
    admin_id  INT NOT NULL,
    CONSTRAINT fk_game_admin FOREIGN KEY (admin_id) REFERENCES admin(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE anketa (
    id           INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    apraksts     VARCHAR(600) NOT NULL,
    ir_dzesta    BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lietotajs_id INT NOT NULL,
    spele_id     INT NOT NULL,
    UNIQUE KEY uq_profile_user_game (lietotajs_id, spele_id),
    CONSTRAINT fk_profile_user FOREIGN KEY (lietotajs_id) REFERENCES lietotajs(id),
    CONSTRAINT fk_profile_game FOREIGN KEY (spele_id) REFERENCES spele(id),
    INDEX idx_anketa_spele_active (spele_id, ir_dzesta)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE reakcija (
    id           INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    tips         ENUM('patik', 'nepatik') NOT NULL,
    datums       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    lietotajs_id INT NOT NULL,
    anketa_id    INT NOT NULL,
    UNIQUE KEY uq_reaction_user_profile (lietotajs_id, anketa_id),
    CONSTRAINT fk_reaction_user FOREIGN KEY (lietotajs_id) REFERENCES lietotajs(id),
    CONSTRAINT fk_reaction_profile FOREIGN KEY (anketa_id) REFERENCES anketa(id),
    INDEX idx_reakcija_user (lietotajs_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE zinojums (
    id           INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    pamatojums   VARCHAR(1000) NOT NULL,
    datums       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    anketa_id    INT NOT NULL,
    lietotajs_id INT NOT NULL,
    admin_id     INT,
    UNIQUE KEY uq_report_user_profile (lietotajs_id, anketa_id),
    CONSTRAINT fk_report_profile FOREIGN KEY (anketa_id) REFERENCES anketa(id),
    CONSTRAINT fk_report_user FOREIGN KEY (lietotajs_id) REFERENCES lietotajs(id),
    CONSTRAINT fk_report_admin FOREIGN KEY (admin_id) REFERENCES admin(id),
    INDEX idx_zinojums_pending (admin_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE speles_lauks (
    id          INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    spele_id    INT NOT NULL,
    nosaukums   VARCHAR(50) NOT NULL,
    lauka_tips  ENUM('teksts', 'skaitlis', 'izvele', 'atzimes_rukis') NOT NULL,
    ir_obligats BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE KEY uq_game_field_name (spele_id, nosaukums),
    CONSTRAINT fk_field_game FOREIGN KEY (spele_id) REFERENCES spele(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE speles_lauka_variants (
    id              INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    speles_lauks_id INT NOT NULL,
    vertiba         VARCHAR(100) NOT NULL,
    UNIQUE KEY uq_field_option (speles_lauks_id, vertiba),
    CONSTRAINT fk_option_field FOREIGN KEY (speles_lauks_id) REFERENCES speles_lauks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE anketas_lauka_vertiba (
    id              INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    anketa_id       INT NOT NULL,
    speles_lauks_id INT NOT NULL,
    vertiba         VARCHAR(200) NOT NULL,
    UNIQUE KEY uq_profile_field_value (anketa_id, speles_lauks_id),
    CONSTRAINT fk_value_profile FOREIGN KEY (anketa_id) REFERENCES anketa(id) ON DELETE CASCADE,
    CONSTRAINT fk_value_field FOREIGN KEY (speles_lauks_id) REFERENCES speles_lauks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
