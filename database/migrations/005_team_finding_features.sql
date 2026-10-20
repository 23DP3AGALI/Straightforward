ALTER TABLE anketa
    ADD COLUMN seeking_status ENUM('available', 'evening', 'not_looking') NOT NULL DEFAULT 'available',
    ADD COLUMN player_rank VARCHAR(80),
    ADD COLUMN preferred_roles VARCHAR(300),
    ADD COLUMN languages VARCHAR(300),
    ADD COLUMN platform VARCHAR(100),
    ADD COLUMN play_schedule VARCHAR(120),
    ADD COLUMN voice_chat BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN play_style VARCHAR(200),
    ADD COLUMN region VARCHAR(100);

CREATE TABLE profile_favorite (
    user_id    INT NOT NULL,
    profile_id INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, profile_id),
    CONSTRAINT fk_favorite_user FOREIGN KEY (user_id) REFERENCES lietotajs(id) ON DELETE CASCADE,
    CONSTRAINT fk_favorite_profile FOREIGN KEY (profile_id) REFERENCES anketa(id) ON DELETE CASCADE,
    INDEX idx_favorite_profile (profile_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE profile_history (
    user_id    INT NOT NULL,
    profile_id INT NOT NULL,
    action     ENUM('like', 'dislike', 'report') NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, profile_id),
    CONSTRAINT fk_history_user FOREIGN KEY (user_id) REFERENCES lietotajs(id) ON DELETE CASCADE,
    CONSTRAINT fk_history_profile FOREIGN KEY (profile_id) REFERENCES anketa(id) ON DELETE CASCADE,
    INDEX idx_history_user_date (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE team_lobby (
    id          BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    game_id     INT NOT NULL,
    owner_id    INT NOT NULL,
    title       VARCHAR(100) NOT NULL,
    description VARCHAR(300) NOT NULL DEFAULT '',
    player_rank VARCHAR(80),
    languages   VARCHAR(200),
    platform    VARCHAR(100),
    starts_at   DATETIME,
    max_players TINYINT UNSIGNED NOT NULL DEFAULT 5,
    status      ENUM('open', 'closed') NOT NULL DEFAULT 'open',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lobby_game FOREIGN KEY (game_id) REFERENCES spele(id) ON DELETE CASCADE,
    CONSTRAINT fk_lobby_owner FOREIGN KEY (owner_id) REFERENCES lietotajs(id) ON DELETE CASCADE,
    INDEX idx_lobby_game_status (game_id, status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE team_lobby_member (
    lobby_id  BIGINT NOT NULL,
    user_id   INT NOT NULL,
    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (lobby_id, user_id),
    CONSTRAINT fk_lobby_member_lobby FOREIGN KEY (lobby_id) REFERENCES team_lobby(id) ON DELETE CASCADE,
    CONSTRAINT fk_lobby_member_user FOREIGN KEY (user_id) REFERENCES lietotajs(id) ON DELETE CASCADE,
    INDEX idx_lobby_member_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
