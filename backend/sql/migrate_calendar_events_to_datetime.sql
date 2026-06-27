USE lunar_calendar_mvp;

ALTER TABLE calendar_events
    ADD COLUMN start_at DATETIME NULL AFTER description,
    ADD COLUMN end_at DATETIME NULL AFTER start_at,
    ADD COLUMN is_all_day BOOLEAN NOT NULL DEFAULT TRUE AFTER end_at;

UPDATE calendar_events
SET start_at = CAST(event_date AS DATETIME),
    is_all_day = TRUE
WHERE start_at IS NULL;

ALTER TABLE calendar_events
    DROP INDEX idx_calendar_events_user_date,
    DROP COLUMN event_date,
    MODIFY COLUMN start_at DATETIME NOT NULL,
    ADD INDEX idx_calendar_events_user_start (user_id, start_at);
