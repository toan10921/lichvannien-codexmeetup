USE lunar_calendar_mvp;

CREATE TABLE IF NOT EXISTS planning_items (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NULL,
    category VARCHAR(80) NULL,
    priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
    duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 60,
    earliest_date DATE NOT NULL,
    latest_date DATE NOT NULL,
    preferred_time_of_day ENUM('any', 'morning', 'afternoon', 'evening') NOT NULL DEFAULT 'any',
    avoid_weekends BOOLEAN NOT NULL DEFAULT FALSE,
    prefer_good_day BOOLEAN NOT NULL DEFAULT TRUE,
    is_all_day BOOLEAN NOT NULL DEFAULT FALSE,
    status ENUM('draft', 'suggested', 'scheduled', 'cancelled') NOT NULL DEFAULT 'draft',
    last_suggestions JSON NULL,
    selected_start_at DATETIME NULL,
    selected_end_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_planning_items_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    INDEX idx_planning_items_user_status_date (user_id, status, earliest_date)
);
