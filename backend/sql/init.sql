CREATE DATABASE IF NOT EXISTS lunar_calendar_mvp
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE lunar_calendar_mvp;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS calendar_events (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT NULL,
    event_date DATE NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_calendar_events_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    INDEX idx_calendar_events_user_date (user_id, event_date)
);

CREATE TABLE IF NOT EXISTS holidays (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    day TINYINT UNSIGNED NOT NULL,
    month TINYINT UNSIGNED NOT NULL,
    calendar_type ENUM('solar', 'lunar') NOT NULL DEFAULT 'solar',
    is_official BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_holiday_name_date (
        name,
        day,
        month,
        calendar_type
    )
);

CREATE TABLE IF NOT EXISTS day_advice_cache (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    solar_date DATE NOT NULL,
    lunar_date VARCHAR(50) NULL,
    can_chi_day VARCHAR(100) NULL,

    day_rating ENUM('favorable', 'neutral', 'caution')
        NOT NULL DEFAULT 'neutral',

    good_for JSON NULL,
    avoid_for JSON NULL,
    summary TEXT NULL,

    rule_version VARCHAR(30) NOT NULL DEFAULT 'v1',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_day_advice_date_version (
        solar_date,
        rule_version
    )
);

CREATE TABLE IF NOT EXISTS chat_conversations (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_chat_conversations_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    INDEX idx_chat_conversations_user (user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    conversation_id BIGINT UNSIGNED NOT NULL,
    role ENUM('user', 'assistant', 'system') NOT NULL,
    content TEXT NOT NULL,
    metadata JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_chat_messages_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES chat_conversations(id)
        ON DELETE CASCADE,

    INDEX idx_chat_messages_conversation_time (
        conversation_id,
        created_at
    )
);

INSERT INTO holidays (
    name,
    description,
    day,
    month,
    calendar_type,
    is_official
) VALUES
(
    'Tết Dương lịch',
    'Ngày đầu năm dương lịch',
    1,
    1,
    'solar',
    TRUE
),
(
    'Ngày Giải phóng miền Nam',
    'Ngày 30 tháng 4',
    30,
    4,
    'solar',
    TRUE
),
(
    'Ngày Quốc tế Lao động',
    'Ngày 1 tháng 5',
    1,
    5,
    'solar',
    TRUE
),
(
    'Ngày Quốc khánh Việt Nam',
    'Ngày 2 tháng 9',
    2,
    9,
    'solar',
    TRUE
),
(
    'Tết Nguyên Đán',
    'Mùng 1 tháng Giêng âm lịch',
    1,
    1,
    'lunar',
    TRUE
),
(
    'Giỗ Tổ Hùng Vương',
    'Mùng 10 tháng 3 âm lịch',
    10,
    3,
    'lunar',
    TRUE
),
(
    'Tết Trung Thu',
    'Rằm tháng 8 âm lịch',
    15,
    8,
    'lunar',
    FALSE
);
