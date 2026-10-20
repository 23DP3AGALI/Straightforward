CREATE TABLE team_lobby_message (
    id         BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    lobby_id   BIGINT NOT NULL,
    sender_id  INT NOT NULL,
    message_text VARCHAR(500) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_lobby_message_lobby FOREIGN KEY (lobby_id) REFERENCES team_lobby(id) ON DELETE CASCADE,
    CONSTRAINT fk_lobby_message_sender FOREIGN KEY (sender_id) REFERENCES lietotajs(id) ON DELETE CASCADE,
    INDEX idx_lobby_message_history (lobby_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
