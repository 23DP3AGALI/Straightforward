CREATE TABLE IF NOT EXISTS chat_message (
    id           BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    game_id      INT NOT NULL,
    sender_id    INT NOT NULL,
    recipient_id INT NOT NULL,
    message_text VARCHAR(500) NOT NULL,
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chat_game FOREIGN KEY (game_id) REFERENCES spele(id),
    CONSTRAINT fk_chat_sender FOREIGN KEY (sender_id) REFERENCES lietotajs(id),
    CONSTRAINT fk_chat_recipient FOREIGN KEY (recipient_id) REFERENCES lietotajs(id),
    INDEX idx_chat_conversation (game_id, sender_id, recipient_id, id),
    INDEX idx_chat_recipient_unread (recipient_id, sender_id, game_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification (
    id               BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    recipient_id     INT NOT NULL,
    actor_id         INT NOT NULL,
    game_id          INT NOT NULL,
    profile_id       INT,
    message_id       BIGINT,
    notification_type ENUM('like', 'match', 'message') NOT NULL,
    is_read          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_recipient FOREIGN KEY (recipient_id) REFERENCES lietotajs(id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_actor FOREIGN KEY (actor_id) REFERENCES lietotajs(id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_game FOREIGN KEY (game_id) REFERENCES spele(id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_profile FOREIGN KEY (profile_id) REFERENCES anketa(id) ON DELETE CASCADE,
    CONSTRAINT fk_notification_message FOREIGN KEY (message_id) REFERENCES chat_message(id) ON DELETE CASCADE,
    INDEX idx_notification_recipient_unread (recipient_id, is_read, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
