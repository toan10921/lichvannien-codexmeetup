import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL, advisorApi, apiRequest, planningApi } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import {
  addDaysToDate,
  buildCalendarGrid,
  clampDateToMonth,
  formatMonthYear,
  formatShortDate,
  formatTimeRange,
  getMonthHeading,
  getMonthKey,
  getMonthOptions,
  getTodayInVietnam,
  getWeekdays,
  getYearOptions,
  parseMonthKey,
  shiftMonth,
  toApiDateTimeValue,
  toDateInputValue,
  toDateTimeInputValue,
} from '../lib/calendar';

function createDefaultEventForm(selectedDate) {
  return {
    title: '',
    description: '',
    start_at: selectedDate,
    end_at: selectedDate,
    is_all_day: true,
  };
}

function createDefaultPlanningForm(selectedDate) {
  return {
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    duration_minutes: '60',
    earliest_date: selectedDate,
    latest_date: addDaysToDate(selectedDate, 14),
    preferred_time_of_day: 'any',
    avoid_weekends: false,
    prefer_good_day: true,
    is_all_day: false,
  };
}

function mapEventToForm(event) {
  return {
    title: event.title || '',
    description: event.description || '',
    start_at: event.is_all_day
      ? toDateInputValue(event.start_at)
      : toDateTimeInputValue(event.start_at),
    end_at: event.end_at
      ? (event.is_all_day
        ? toDateInputValue(event.end_at)
        : toDateTimeInputValue(event.end_at))
      : '',
    is_all_day: Boolean(event.is_all_day),
  };
}

function buildEventPayload(form) {
  const payload = {
    title: form.title.trim(),
    description: form.description.trim(),
    start_at: toApiDateTimeValue(form.start_at, form.is_all_day),
    is_all_day: form.is_all_day,
  };

  if (form.end_at) {
    payload.end_at = toApiDateTimeValue(form.end_at, form.is_all_day);
  }

  return payload;
}

function buildPlanningPayload(form) {
  return {
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category.trim(),
    priority: form.priority,
    duration_minutes: Number(form.duration_minutes || 60),
    earliest_date: form.earliest_date,
    latest_date: form.latest_date,
    preferred_time_of_day: form.preferred_time_of_day,
    avoid_weekends: Boolean(form.avoid_weekends),
    prefer_good_day: Boolean(form.prefer_good_day),
    is_all_day: Boolean(form.is_all_day),
  };
}

function getDayQualityClass(dayQuality) {
  if (!dayQuality?.key) {
    return 'calendar-status-badge';
  }

  return `calendar-status-badge calendar-status-badge--${dayQuality.key}`;
}

function getPlannerModeLabel(mode) {
  return mode === 'fixed' ? 'Lịch cố định' : 'Nhờ AI gợi ý';
}

function getPriorityLabel(priority) {
  switch (priority) {
    case 'high':
      return 'Ưu tiên cao';
    case 'low':
      return 'Ưu tiên thấp';
    default:
      return 'Ưu tiên vừa';
  }
}

function getTimeOfDayLabel(value) {
  switch (value) {
    case 'morning':
      return 'Buổi sáng';
    case 'afternoon':
      return 'Buổi chiều';
    case 'evening':
      return 'Buổi tối';
    default:
      return 'Khung giờ linh hoạt';
  }
}

function getTimelineStatusLabel(status) {
  switch (status) {
    case 'suggested':
      return 'Đã có gợi ý';
    case 'scheduled':
      return 'Đã chốt lịch';
    default:
      return 'Đang chờ gợi ý';
  }
}

function formatPlanningRange(item) {
  return `${formatShortDate(item.earliest_date)} - ${formatShortDate(item.latest_date)}`;
}

function buildPlannerActionKey(action, itemId) {
  return `${action}:${itemId}`;
}

function isPlannerActionRunning(plannerActionKey, action, itemId) {
  return plannerActionKey === buildPlannerActionKey(action, itemId);
}

function PlannerComposer({
  mode,
  onModeChange,
  eventForm,
  editingEventId,
  eventError,
  savingEvent,
  onEventChange,
  onToggleAllDay,
  onEventSubmit,
  onCancelEdit,
  planningForm,
  planningFormError,
  savingPlanning,
  onPlanningChange,
  onPlanningSubmit,
  onPlanningReset,
}) {
  const fixedLabel = editingEventId ? 'Cập nhật sự kiện cố định' : 'Tạo sự kiện cố định';

  return (
    <section className="calendar-side-card">
      <div className="calendar-section-header">
        <div>
          <p className="calendar-section-label">Planner</p>
          <h3>{getPlannerModeLabel(mode)}</h3>
        </div>
        <span className="calendar-chip">2 chế độ</span>
      </div>

      <div className="planner-mode-switch" role="tablist" aria-label="Chọn chế độ lập lịch">
        <button
          type="button"
          className={`planner-mode-switch__item${mode === 'flexible' ? ' is-active' : ''}`}
          onClick={() => onModeChange('flexible')}
        >
          Nhờ AI gợi ý
        </button>
        <button
          type="button"
          className={`planner-mode-switch__item${mode === 'fixed' ? ' is-active' : ''}`}
          onClick={() => onModeChange('fixed')}
        >
          Lịch cố định
        </button>
      </div>

      {mode === 'fixed' ? (
        <form className="calendar-event-form" onSubmit={onEventSubmit}>
          <p className="planner-helper-text">
            {fixedLabel}. Mục này tạo lịch thật ngay trên calendar của bạn.
          </p>

          <label>
            Tiêu đề
            <input
              name="title"
              value={eventForm.title}
              onChange={onEventChange}
              placeholder="Họp khách hàng"
            />
          </label>

          <label>
            Mô tả
            <textarea
              name="description"
              rows="3"
              value={eventForm.description}
              onChange={onEventChange}
              placeholder="Chuẩn bị demo, báo giá, checklist..."
            />
          </label>

          <label className="calendar-checkbox-field">
            <input
              type="checkbox"
              checked={eventForm.is_all_day}
              onChange={onToggleAllDay}
            />
            <span>Sự kiện cả ngày</span>
          </label>

          <div className="calendar-field-grid">
            <label>
              {eventForm.is_all_day ? 'Ngày bắt đầu' : 'Bắt đầu lúc'}
              <input
                name="start_at"
                type={eventForm.is_all_day ? 'date' : 'datetime-local'}
                value={eventForm.start_at}
                onChange={onEventChange}
              />
            </label>

            <label>
              {eventForm.is_all_day ? 'Ngày kết thúc' : 'Kết thúc lúc'}
              <input
                name="end_at"
                type={eventForm.is_all_day ? 'date' : 'datetime-local'}
                value={eventForm.end_at}
                onChange={onEventChange}
              />
            </label>
          </div>

          {eventError ? (
            <p className="form-error" role="alert">{eventError}</p>
          ) : null}

          <div className="calendar-form-actions">
            <button className="primary-button" type="submit" disabled={savingEvent}>
              {savingEvent ? 'Đang lưu...' : editingEventId ? 'Lưu thay đổi' : 'Tạo lịch cố định'}
            </button>

            {editingEventId ? (
              <button type="button" className="secondary-button" onClick={onCancelEdit}>
                Hủy sửa
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <form className="calendar-event-form" onSubmit={onPlanningSubmit}>
          <p className="planner-helper-text">
            Tạo việc chưa có lịch cố định. AI sẽ đọc tiêu đề + ghi chú của bạn, rồi xếp hạng tối đa 5 slot phù hợp để bạn chốt.
          </p>

          <label>
            Tên việc cần lên lịch
            <input
              name="title"
              value={planningForm.title}
              onChange={onPlanningChange}
              placeholder="Họp kickoff dự án"
            />
          </label>

          <label>
            Mô tả / ghi chú cho AI
            <textarea
              name="description"
              rows="3"
              value={planningForm.description}
              onChange={onPlanningChange}
              placeholder="Ví dụ: Đây là lịch ký hợp đồng, cần ưu tiên ngày đẹp, tránh cuối tuần và không trùng lịch sales..."
            />
          </label>

          <div className="calendar-field-grid">
            <label>
              Nhóm việc
              <input
                name="category"
                value={planningForm.category}
                onChange={onPlanningChange}
                placeholder="Công việc / cá nhân / gặp gỡ"
              />
            </label>

            <label>
              Mức ưu tiên
              <select
                name="priority"
                value={planningForm.priority}
                onChange={onPlanningChange}
              >
                <option value="low">Ưu tiên thấp</option>
                <option value="medium">Ưu tiên vừa</option>
                <option value="high">Ưu tiên cao</option>
              </select>
            </label>
          </div>

          <div className="calendar-field-grid">
            <label>
              Tìm trong khoảng từ ngày
              <input
                name="earliest_date"
                type="date"
                value={planningForm.earliest_date}
                onChange={onPlanningChange}
              />
            </label>

            <label>
              Đến ngày
              <input
                name="latest_date"
                type="date"
                value={planningForm.latest_date}
                onChange={onPlanningChange}
              />
            </label>
          </div>

          <div className="calendar-field-grid">
            <label>
              Khung giờ ưu tiên
              <select
                name="preferred_time_of_day"
                value={planningForm.preferred_time_of_day}
                onChange={onPlanningChange}
              >
                <option value="any">Linh hoạt</option>
                <option value="morning">Buổi sáng</option>
                <option value="afternoon">Buổi chiều</option>
                <option value="evening">Buổi tối</option>
              </select>
            </label>

            <label>
              Thời lượng dự kiến (phút)
              <input
                name="duration_minutes"
                type="number"
                min="30"
                max="720"
                step="30"
                disabled={planningForm.is_all_day}
                value={planningForm.duration_minutes}
                onChange={onPlanningChange}
              />
            </label>
          </div>

          <div className="planner-checkbox-group">
            <label className="calendar-checkbox-field">
              <input
                type="checkbox"
                name="prefer_good_day"
                checked={planningForm.prefer_good_day}
                onChange={onPlanningChange}
              />
              <span>Ưu tiên ngày tốt / hoàng đạo</span>
            </label>

            <label className="calendar-checkbox-field">
              <input
                type="checkbox"
                name="avoid_weekends"
                checked={planningForm.avoid_weekends}
                onChange={onPlanningChange}
              />
              <span>Tránh cuối tuần</span>
            </label>

            <label className="calendar-checkbox-field">
              <input
                type="checkbox"
                name="is_all_day"
                checked={planningForm.is_all_day}
                onChange={onPlanningChange}
              />
              <span>Việc cả ngày, không cần khung giờ cụ thể</span>
            </label>
          </div>

          {planningFormError ? (
            <p className="form-error" role="alert">{planningFormError}</p>
          ) : null}

          <div className="calendar-form-actions">
            <button className="primary-button" type="submit" disabled={savingPlanning}>
              {savingPlanning ? 'Đang tạo gợi ý...' : 'Tạo việc và gợi ý lịch'}
            </button>
            <button type="button" className="secondary-button" onClick={onPlanningReset}>
              Xóa form
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function PlannerTimeline({
  timeline,
  loading,
  timelineError,
  plannerActionKey,
  onOpenFixedEvent,
  onSuggestItem,
  onConfirmSuggestion,
  onDeleteItem,
}) {
  return (
    <section className="calendar-side-card">
      <div className="calendar-section-header">
        <div>
          <p className="calendar-section-label">Planner timeline</p>
          <h3>Lịch sắp tới & việc chờ chốt</h3>
        </div>
        <span className="calendar-chip">{timeline.length} mục</span>
      </div>

      {timelineError ? <p className="form-error">{timelineError}</p> : null}

      {loading ? (
        <div className="calendar-loading-state">Đang tải planner...</div>
      ) : timeline.length > 0 ? (
        <div className="planner-timeline-list">
          {timeline.map((item) => {
            if (item.kind === 'fixed') {
              return (
                <article key={`fixed-${item.id}`} className="planner-timeline-item planner-timeline-item--fixed">
                  <div className="planner-timeline-item__top">
                    <span className="planner-pill planner-pill--fixed">Lịch thật</span>
                    <span className="planner-status">{getTimelineStatusLabel(item.status)}</span>
                  </div>

                  <h4>{item.title}</h4>
                  <p>{item.description || 'Sự kiện đã được chốt trên calendar cá nhân.'}</p>

                  <div className="planner-meta-row">
                    <span>{formatTimeRange(item.start_at, item.end_at, item.is_all_day)}</span>
                    <span>{formatShortDate(item.start_at.slice(0, 10))}</span>
                  </div>

                  <div className="planner-card-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => onOpenFixedEvent(item.start_at.slice(0, 10))}
                    >
                      Mở ngày này
                    </button>
                  </div>
                </article>
              );
            }

            return (
              <article key={`flexible-${item.id}`} className="planner-timeline-item">
                <div className="planner-timeline-item__top">
                  <span className="planner-pill planner-pill--flexible">Chờ chốt lịch</span>
                  <span className={`planner-status planner-status--${item.status}`}>
                    {getTimelineStatusLabel(item.status)}
                  </span>
                </div>

                <h4>{item.title}</h4>
                <p>{item.description || 'Chưa có mô tả thêm cho việc này.'}</p>

                <div className="planner-meta-row">
                  <span>{formatPlanningRange(item)}</span>
                  <span>{getPriorityLabel(item.priority)}</span>
                </div>

                <div className="planner-meta-row">
                  <span>{item.is_all_day ? 'Cả ngày' : `${item.duration_minutes} phút`}</span>
                  <span>{getTimeOfDayLabel(item.preferred_time_of_day)}</span>
                </div>

                {item.category ? (
                  <div className="planner-meta-row">
                    <span>Nhóm: {item.category}</span>
                  </div>
                ) : null}

                {item.suggestions?.[0]?.planner_summary ? (
                  <p className="planner-ai-summary">
                    <strong>AI nhận định:</strong> {item.suggestions[0].planner_summary}
                  </p>
                ) : null}

                {item.suggestions?.length > 0 ? (
                  <div className="planner-suggestion-list">
                    {item.suggestions.map((suggestion) => {
                      const isConfirming = isPlannerActionRunning(
                        plannerActionKey,
                        'confirm',
                        `${item.id}-${suggestion.rank}`,
                      );

                      return (
                        <div
                          key={`${item.id}-${suggestion.rank}-${suggestion.start_at}`}
                          className="planner-suggestion-item"
                        >
                          <div className="planner-suggestion-item__content">
                            <strong>
                              Gợi ý #{suggestion.rank}: {formatShortDate(suggestion.date)}
                            </strong>
                            <span>{formatTimeRange(suggestion.start_at, suggestion.end_at, suggestion.is_all_day)}</span>
                            <em>
                              {suggestion.day_quality_label || suggestion.day_rating}
                              {suggestion.display_label ? ` · ${suggestion.display_label}` : ''}
                            </em>
                            {suggestion.reason_source === 'ai' ? (
                              <small className="planner-ai-badge">AI đã xếp hạng lại slot này theo mục tiêu sự kiện</small>
                            ) : null}
                            <p>{suggestion.reason}</p>
                          </div>

                          <button
                            type="button"
                            className="secondary-button"
                            disabled={isConfirming || Boolean(plannerActionKey)}
                            onClick={() => onConfirmSuggestion(item.id, suggestion)}
                          >
                            {isConfirming ? 'Đang chốt...' : 'Chốt lịch'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="calendar-empty-state planner-inline-empty">
                    Chưa có gợi ý nào cho việc này.
                  </div>
                )}

                <div className="planner-card-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={isPlannerActionRunning(plannerActionKey, 'suggest', item.id) || Boolean(plannerActionKey)}
                    onClick={() => onSuggestItem(item.id)}
                  >
                    {isPlannerActionRunning(plannerActionKey, 'suggest', item.id) ? 'Đang gợi ý...' : 'Gợi ý lại'}
                  </button>

                  <button
                    type="button"
                    className="secondary-button"
                    disabled={isPlannerActionRunning(plannerActionKey, 'delete', item.id) || Boolean(plannerActionKey)}
                    onClick={() => onDeleteItem(item.id)}
                  >
                    {isPlannerActionRunning(plannerActionKey, 'delete', item.id) ? 'Đang xóa...' : 'Xóa việc'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="calendar-empty-state">
          Chưa có việc nào trong planner. Hãy tạo một việc linh hoạt để nhận gợi ý lịch.
        </div>
      )}
    </section>
  );
}

function AdvisorReplyContent({ reply }) {
  const answer = reply.answer || '';
  const answerWithoutIntro = reply.date_intro && answer.startsWith(reply.date_intro)
    ? answer.slice(reply.date_intro.length).replace(/^\.\s*/, '').trim()
    : answer;
  const shouldShowReferencedDates = !reply.date_intro
    && (!reply.suggested_dates || reply.suggested_dates.length === 0)
    && reply.referenced_dates?.length > 0
    && reply.referenced_dates.length <= 3;

  return (
    <div className="advisor-reply">
      <div className="advisor-reply__header">
        <strong>{reply.rating || 'neutral'}</strong>
        <span>{reply.disclaimer}</span>
      </div>

      {reply.date_intro ? (
        <p className="advisor-reply__intro">{reply.date_intro}</p>
      ) : null}

      {shouldShowReferencedDates ? (
        <div className="advisor-reply__dates" aria-label="Ngày dương và ngày âm được dùng để tư vấn">
          {reply.referenced_dates.map((item) => (
            <div className="advisor-reply__date" key={item.date}>
              <span>Dương lịch {item.display_date || formatShortDate(item.date)}</span>
              <strong>Âm lịch {item.lunar_display || item.lunar_date || 'chưa có dữ liệu'}</strong>
            </div>
          ))}
        </div>
      ) : null}

      {answerWithoutIntro ? (
        <p>{answerWithoutIntro}</p>
      ) : null}

      {reply.suggested_dates?.length > 0 ? (
        <div className="advisor-suggested-dates">
          <h4>Ngày phù hợp</h4>
          {reply.suggested_dates.map((item) => (
            <article className="advisor-suggested-date" key={item.date}>
              <div className="advisor-suggested-date__header">
                <strong>{item.date}</strong>
                <span>{item.lunar_display || item.lunar_date || 'Chưa có ngày âm'}</span>
                <em>{item.rating || 'neutral'}</em>
              </div>
              <p>{item.reason || 'Chưa có lý do chi tiết cho ngày này.'}</p>
            </article>
          ))}
        </div>
      ) : null}

      {reply.recommended_actions?.length > 0 ? (
        <div className="advisor-reply__section">
          <h4>Nên ưu tiên</h4>
          <ul>
            {reply.recommended_actions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {reply.cautions?.length > 0 ? (
        <div className="advisor-reply__section">
          <h4>Cần lưu ý</h4>
          <ul>
            {reply.cautions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function AdvisorMessage({ message }) {
  const isUser = message.role === 'user';

  return (
    <article className={`advisor-message advisor-message--${message.role}`}>
      <div className="advisor-message__meta">
        <span>{isUser ? 'Bạn' : 'AI advisor'}</span>
        <time dateTime={message.date}>{formatShortDate(message.date)}</time>
      </div>

      <div className="advisor-message__bubble">
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <AdvisorReplyContent reply={message.reply} />
        )}
      </div>
    </article>
  );
}

function AdvisorTypingMessage({ advisorDate }) {
  return (
    <article className="advisor-message advisor-message--assistant">
      <div className="advisor-message__meta">
        <span>AI advisor</span>
        <time dateTime={advisorDate}>{formatShortDate(advisorDate)}</time>
      </div>

      <div className="advisor-message__bubble advisor-message__bubble--typing">
        <span className="advisor-typing-dot" />
        <span className="advisor-typing-dot" />
        <span className="advisor-typing-dot" />
      </div>
    </article>
  );
}

function AdvisorPanel({
  advisorDate,
  advisorForm,
  advisorMessages,
  advisorError,
  advisorLoading,
  isOpen,
  onOpen,
  onClose,
  onDateChange,
  onChange,
  onSubmit,
}) {
  const chatLogRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !chatLogRef.current) {
      return;
    }

    chatLogRef.current.scrollTo({
      top: chatLogRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [advisorLoading, advisorMessages, isOpen]);

  return (
    <>
      <button
        className={`advisor-floating-button${isOpen ? ' is-open' : ''}`}
        type="button"
        onClick={isOpen ? onClose : onOpen}
        aria-controls="advisor-chatbot-popup"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={isOpen ? 'Đóng chatbot AI' : 'Mở chatbot AI'}
      >
        <span className="advisor-floating-button__mark" aria-hidden="true">AI</span>
        <span>Tư vấn AI</span>
      </button>

      {isOpen ? (
        <section
          className="advisor-popup"
          id="advisor-chatbot-popup"
          role="dialog"
          aria-label="Chatbot tư vấn AI"
        >
          <div className="advisor-popup__header">
            <div>
              <p className="calendar-section-label">AI advisor</p>
              <h3>Hỏi nhanh theo ngày</h3>
            </div>

            <button
              className="advisor-popup__close"
              type="button"
              onClick={onClose}
              aria-label="Đóng chatbot AI"
            >
              ×
            </button>
          </div>

          <div className="advisor-popup__body">
            <div className="advisor-popup__context">
              <label className="advisor-date-field">
                <span>Ngày tư vấn</span>
                <div className="advisor-date-field__row">
                  <input
                    type="date"
                    value={advisorDate}
                    disabled={advisorLoading}
                    onChange={(event) => onDateChange(event.target.value)}
                  />
                  <strong>{formatShortDate(advisorDate)}</strong>
                </div>
              </label>
            </div>

            <div
              className="advisor-chat-log"
              ref={chatLogRef}
              role="log"
              aria-label="Cuộc trò chuyện với AI advisor"
              aria-live="polite"
            >
              {advisorMessages.length > 0 ? (
                advisorMessages.map((message) => (
                  <AdvisorMessage key={message.id} message={message} />
                ))
              ) : (
                <div className="advisor-chat-empty">Chưa có tin nhắn.</div>
              )}

              {advisorLoading ? (
                <AdvisorTypingMessage advisorDate={advisorDate} />
              ) : null}
            </div>

            <form className="calendar-advisor-form advisor-popup__form" onSubmit={onSubmit}>
              <textarea
                rows="3"
                value={advisorForm}
                onChange={onChange}
                placeholder="Ví dụ: Ngày này tôi nên ưu tiên việc gì? Có phù hợp để ký hợp đồng không?"
              />

              {advisorError ? (
                <p className="form-error" role="alert">{advisorError}</p>
              ) : null}

              <button className="primary-button" type="submit" disabled={advisorLoading}>
                {advisorLoading ? 'Đang hỏi AI...' : 'Gửi câu hỏi'}
              </button>
            </form>
          </div>
        </section>
      ) : null}
    </>
  );
}

function CalendarGrid({ cells, selectedDate, onSelectDate }) {
  return (
    <div className="calendar-grid">
      {cells.map((day, index) => {
        if (!day) {
          return <div key={`empty-${index}`} className="calendar-cell calendar-cell--empty" />;
        }

        const isSelected = selectedDate === day.solar_date;
        const classNames = [
          'calendar-cell',
          isSelected ? 'is-selected' : '',
          day.is_today ? 'is-today' : '',
          day.is_weekend ? 'is-weekend' : '',
          day.holiday_name ? 'has-holiday' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <button
            type="button"
            key={day.solar_date}
            className={classNames}
            onClick={() => onSelectDate(day.solar_date)}
          >
            <div className="calendar-cell__top">
              <span className="solar-day">{day.day}</span>
              {day.has_event ? (
                <span className="event-dot" title={`${day.event_count} sự kiện`} />
              ) : null}
            </div>
            <span className="lunar-day">{day.lunar_day}</span>
            {day.holiday_name ? (
              <span className="holiday-tag">{day.holiday_name}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function HomePage() {
  const { token, user, logout } = useAuth();
  const navigate = useNavigate();
  const today = useMemo(() => getTodayInVietnam(), []);

  const [apiStatus, setApiStatus] = useState('Đang kiểm tra...');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [selectedDate, setSelectedDate] = useState(today);
  const [monthKey, setMonthKey] = useState(getMonthKey(today));
  const [monthData, setMonthData] = useState(null);
  const [dayDetail, setDayDetail] = useState(null);

  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);
  const [appError, setAppError] = useState('');

  const [plannerMode, setPlannerMode] = useState('flexible');
  const [eventForm, setEventForm] = useState(createDefaultEventForm(today));
  const [editingEventId, setEditingEventId] = useState(null);
  const [eventError, setEventError] = useState('');
  const [savingEvent, setSavingEvent] = useState(false);

  const [planningForm, setPlanningForm] = useState(createDefaultPlanningForm(today));
  const [planningTimeline, setPlanningTimeline] = useState([]);
  const [planningFormError, setPlanningFormError] = useState('');
  const [planningTimelineError, setPlanningTimelineError] = useState('');
  const [savingPlanning, setSavingPlanning] = useState(false);
  const [loadingPlanning, setLoadingPlanning] = useState(false);
  const [plannerActionKey, setPlannerActionKey] = useState('');

  const [advisorForm, setAdvisorForm] = useState('');
  const [advisorDate, setAdvisorDate] = useState(today);
  const [advisorMessages, setAdvisorMessages] = useState([]);
  const [advisorConversationId, setAdvisorConversationId] = useState(null);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorError, setAdvisorError] = useState('');
  const [isAdvisorOpen, setIsAdvisorOpen] = useState(false);

  const { year: displayedYear, month: displayedMonth } = useMemo(
    () => parseMonthKey(monthKey),
    [monthKey],
  );

  const monthCells = useMemo(() => {
    if (!monthData?.days) {
      return [];
    }

    return buildCalendarGrid(monthData.days, monthData.year, monthData.month);
  }, [monthData]);

  const yearOptions = useMemo(() => getYearOptions(displayedYear), [displayedYear]);
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const selectedDayEvents = dayDetail?.events || [];

  const loadHealthStatus = useCallback(async () => {
    try {
      const response = await apiRequest('/api/health');
      setApiStatus(response.message || 'API is running');
    } catch {
      setApiStatus('Không kết nối được backend');
    }
  }, []);

  const loadMonthData = useCallback(async (requestedMonthKey = monthKey) => {
    const { year, month } = parseMonthKey(requestedMonthKey);

    setLoadingMonth(true);
    setAppError('');

    try {
      const monthResponse = await apiRequest(`/api/calendar/month?year=${year}&month=${month}`, { token });
      setMonthData(monthResponse.data);
    } catch (error) {
      setAppError(error.message || 'Không tải được dữ liệu tháng.');
    } finally {
      setLoadingMonth(false);
    }
  }, [monthKey, token]);

  const loadDayDetail = useCallback(async (requestedDate = selectedDate) => {
    setLoadingDay(true);
    setAppError('');

    try {
      const response = await apiRequest(`/api/calendar/day?date=${requestedDate}`, { token });
      setDayDetail(response.data);
    } catch (error) {
      setAppError(error.message || 'Không tải được chi tiết ngày.');
    } finally {
      setLoadingDay(false);
    }
  }, [selectedDate, token]);

  const loadPlanningTimeline = useCallback(async () => {
    setLoadingPlanning(true);
    setPlanningTimelineError('');

    try {
      const response = await planningApi.listTimeline(token);
      setPlanningTimeline(response.data || []);
    } catch (error) {
      setPlanningTimelineError(error.message || 'Không tải được planner timeline.');
    } finally {
      setLoadingPlanning(false);
    }
  }, [token]);

  useEffect(() => {
    loadHealthStatus();
  }, [loadHealthStatus]);

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData, monthKey]);

  useEffect(() => {
    loadDayDetail();
  }, [loadDayDetail, selectedDate]);

  useEffect(() => {
    loadPlanningTimeline();
  }, [loadPlanningTimeline]);

  useEffect(() => {
    if (editingEventId) {
      return;
    }

    setEventForm(createDefaultEventForm(selectedDate));
    setEventError('');
  }, [editingEventId, selectedDate]);

  useEffect(() => {
    setPlanningForm((current) => {
      if (current.title || current.description || current.category) {
        return current;
      }

      return createDefaultPlanningForm(selectedDate);
    });
  }, [selectedDate]);

  useEffect(() => {
    if (editingEventId) {
      setPlannerMode('fixed');
    }
  }, [editingEventId]);

  useEffect(() => {
    setAdvisorDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (!isAdvisorOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsAdvisorOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAdvisorOpen]);

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }

  function handleSelectDate(dateStr) {
    setSelectedDate(dateStr);
    setMonthKey(getMonthKey(dateStr));
    setEditingEventId(null);
    setAdvisorError('');
  }

  function handleChangeMonth(offset) {
    const nextMonthKey = shiftMonth(monthKey, offset);
    setMonthKey(nextMonthKey);
    setSelectedDate((current) => clampDateToMonth(current, nextMonthKey));
    setEditingEventId(null);
  }

  function handleMonthSelect(event) {
    const nextMonthKey = `${displayedYear}-${String(event.target.value).padStart(2, '0')}`;
    setMonthKey(nextMonthKey);
    setSelectedDate((current) => clampDateToMonth(current, nextMonthKey));
  }

  function handleYearSelect(event) {
    const nextMonthKey = `${event.target.value}-${String(displayedMonth).padStart(2, '0')}`;
    setMonthKey(nextMonthKey);
    setSelectedDate((current) => clampDateToMonth(current, nextMonthKey));
  }

  function handleJumpToday() {
    setSelectedDate(today);
    setMonthKey(getMonthKey(today));
    setEditingEventId(null);
  }

  function handlePreviousDay() {
    handleSelectDate(addDaysToDate(selectedDate, -1));
  }

  function handleNextDay() {
    handleSelectDate(addDaysToDate(selectedDate, 1));
  }

  function handleEventFormChange(event) {
    const { name, value } = event.target;

    setEventForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handlePlanningFormChange(event) {
    const { name, type, value, checked } = event.target;

    setPlanningForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function handleToggleAllDay() {
    setEventForm((current) => {
      const nextIsAllDay = !current.is_all_day;
      const startDate = current.start_at ? current.start_at.slice(0, 10) : selectedDate;
      const endDate = current.end_at ? current.end_at.slice(0, 10) : startDate;

      return {
        ...current,
        is_all_day: nextIsAllDay,
        start_at: nextIsAllDay ? startDate : `${startDate}T09:00`,
        end_at: nextIsAllDay ? endDate : `${endDate}T10:00`,
      };
    });
  }

  function resetEventForm() {
    setEditingEventId(null);
    setEventForm(createDefaultEventForm(selectedDate));
    setEventError('');
  }

  function resetPlanningForm() {
    setPlanningForm(createDefaultPlanningForm(selectedDate));
    setPlanningFormError('');
  }

  function handlePlannerModeChange(nextMode) {
    setPlannerMode(nextMode);
    setEventError('');
    setPlanningFormError('');

    if (nextMode !== 'fixed' && editingEventId) {
      resetEventForm();
    }
  }

  function handleEditEvent(event) {
    setEditingEventId(event.id);
    setEventForm(mapEventToForm(event));
    setEventError('');
    setPlannerMode('fixed');
  }

  async function refreshCurrentViews(targetDate = selectedDate, targetMonthKey = monthKey) {
    await Promise.all([
      loadDayDetail(targetDate),
      loadMonthData(targetMonthKey),
      loadPlanningTimeline(),
    ]);
  }

  async function handleEventSubmit(submitEvent) {
    submitEvent.preventDefault();
    setSavingEvent(true);
    setEventError('');

    try {
      const payload = buildEventPayload(eventForm);

      if (editingEventId) {
        await apiRequest(`/api/events/${editingEventId}`, {
          method: 'PUT',
          token,
          body: payload,
        });
      } else {
        await apiRequest('/api/events', {
          method: 'POST',
          token,
          body: payload,
        });
      }

      await refreshCurrentViews();
      resetEventForm();
    } catch (error) {
      setEventError(error.message || 'Không lưu được sự kiện.');
    } finally {
      setSavingEvent(false);
    }
  }

  async function handleDeleteEvent(eventId) {
    setSavingEvent(true);
    setEventError('');

    try {
      await apiRequest(`/api/events/${eventId}`, {
        method: 'DELETE',
        token,
      });

      await refreshCurrentViews();

      if (editingEventId === eventId) {
        resetEventForm();
      }
    } catch (error) {
      setEventError(error.message || 'Không xóa được sự kiện.');
    } finally {
      setSavingEvent(false);
    }
  }

  async function handlePlanningSubmit(event) {
    event.preventDefault();
    setSavingPlanning(true);
    setPlanningFormError('');

    try {
      const payload = buildPlanningPayload(planningForm);
      const createResponse = await planningApi.createItem(token, payload);
      const createdItem = createResponse.data?.item;

      if (createdItem?.id) {
        await planningApi.suggestItem(token, createdItem.id);
      }

      await loadPlanningTimeline();
      resetPlanningForm();
    } catch (error) {
      setPlanningFormError(error.message || 'Không tạo được việc cần planner.');
    } finally {
      setSavingPlanning(false);
    }
  }

  async function handleSuggestPlanningItem(planningItemId) {
    const nextActionKey = buildPlannerActionKey('suggest', planningItemId);
    setPlannerActionKey(nextActionKey);
    setPlanningTimelineError('');

    try {
      await planningApi.suggestItem(token, planningItemId);
      await loadPlanningTimeline();
    } catch (error) {
      setPlanningTimelineError(error.message || 'Không tạo lại được gợi ý.');
    } finally {
      setPlannerActionKey('');
    }
  }

  async function handleConfirmSuggestion(planningItemId, suggestion) {
    const targetDate = suggestion.start_at.slice(0, 10);
    const targetMonthKey = getMonthKey(targetDate);
    const nextActionKey = buildPlannerActionKey('confirm', `${planningItemId}-${suggestion.rank}`);

    setPlannerActionKey(nextActionKey);
    setPlanningTimelineError('');

    try {
      await planningApi.confirmItem(token, planningItemId, {
        start_at: suggestion.start_at,
        end_at: suggestion.end_at,
        is_all_day: suggestion.is_all_day,
      });

      setSelectedDate(targetDate);
      setMonthKey(targetMonthKey);
      await refreshCurrentViews(targetDate, targetMonthKey);
    } catch (error) {
      setPlanningTimelineError(error.message || 'Không chốt được gợi ý này.');
    } finally {
      setPlannerActionKey('');
    }
  }

  async function handleDeletePlanningItem(planningItemId) {
    const nextActionKey = buildPlannerActionKey('delete', planningItemId);
    setPlannerActionKey(nextActionKey);
    setPlanningTimelineError('');

    try {
      await planningApi.deleteItem(token, planningItemId);
      await loadPlanningTimeline();
    } catch (error) {
      setPlanningTimelineError(error.message || 'Không xóa được việc này.');
    } finally {
      setPlannerActionKey('');
    }
  }

  async function handleAdvisorSubmit(event) {
    event.preventDefault();
    const message = advisorForm.trim();
    const requestDate = advisorDate;

    if (!message) {
      setAdvisorError('Vui lòng nhập câu hỏi trước khi gửi.');
      return;
    }

    setAdvisorLoading(true);
    setAdvisorError('');
    setAdvisorMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        date: requestDate,
      },
    ]);

    try {
      const response = await advisorApi.chat(token, {
        conversation_id: advisorConversationId,
        message,
        selected_date: requestDate,
      });

      setAdvisorConversationId(response.data.conversation_id);
      setAdvisorMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          reply: response.data,
          date: requestDate,
        },
      ]);
      setAdvisorForm('');
    } catch (error) {
      setAdvisorError(error.message || 'Không gửi được câu hỏi AI.');
    } finally {
      setAdvisorLoading(false);
    }
  }

  return (
    <div className="app-shell calendar-app-shell">
      <header className="topbar calendar-topbar">
        <div className="brand-lockup compact">
          <span className="brand-mark" aria-hidden="true">LV</span>
          <span className="brand-name">Lịch Vạn Niên AI</span>
        </div>

        <div className="session-actions">
          <span className="session-name">{user?.name}</span>
          <span className="calendar-api-url">{API_URL}</span>
          <span className="calendar-api-url">{apiStatus}</span>
          <button className="secondary-button" type="button" onClick={handleJumpToday}>
            Hôm nay
          </button>
          <button className="secondary-button" type="button" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? 'Đang thoát...' : 'Đăng xuất'}
          </button>
        </div>
      </header>

      <main className="calendar-workspace">
        {appError ? <p className="form-error">{appError}</p> : null}

        <section className="calendar-hero-card">
          <div className="calendar-hero-card__header">
            <h1>Chi tiết ngày đang chọn</h1>

            <label className="calendar-jump-date">
              <span>Xem nhanh theo ngày</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => handleSelectDate(event.target.value)}
              />
            </label>
          </div>

          <div className="calendar-day-summary">
            <button type="button" className="calendar-nav-circle" onClick={handlePreviousDay}>‹</button>

            <div className="calendar-day-summary__columns">
              <div className="calendar-summary-block">
                <span className="calendar-summary-title">Dương lịch</span>
                <strong>{selectedDate.slice(8, 10)}</strong>
                <p>{formatMonthYear(selectedDate)}</p>
              </div>

              <div className="calendar-summary-divider" />

              <div className="calendar-summary-block">
                <span className="calendar-summary-title">Âm lịch</span>
                <strong>{dayDetail?.lunar?.day ?? '--'}</strong>
                <p>
                  {dayDetail
                    ? `Tháng ${dayDetail.lunar.month} năm ${dayDetail.lunar.year}`
                    : 'Đang tải...'}
                </p>
                {dayDetail?.day_quality ? (
                  <div className="calendar-summary-badge-row">
                    <span className={getDayQualityClass(dayDetail.day_quality)}>
                      {dayDetail.day_quality.label}
                    </span>
                  </div>
                ) : null}
                <p className="calendar-summary-secondary">
                  {dayDetail
                    ? `${dayDetail.can_chi_day} - ${dayDetail.can_chi_month} - ${dayDetail.can_chi_year}`
                    : ''}
                </p>
              </div>
            </div>

            <button type="button" className="calendar-nav-circle" onClick={handleNextDay}>›</button>
          </div>

          <div className="calendar-detail-meta">
            <p><strong>{dayDetail?.weekday || 'Đang tải...'}</strong></p>
            <p><strong>Ngày âm:</strong> {dayDetail?.lunar_date || '--'}</p>
            <p>
              <strong>Can chi:</strong>{' '}
              {dayDetail
                ? `${dayDetail.can_chi_day} · ${dayDetail.can_chi_month} · ${dayDetail.can_chi_year}`
                : '--'}
            </p>
            <p>
              <strong>Phân loại ngày:</strong>{' '}
              {dayDetail?.day_quality ? (
                <>
                  <span className={getDayQualityClass(dayDetail.day_quality)}>
                    {dayDetail.day_quality.label}
                  </span>
                  {' · '}
                  {dayDetail.day_quality.tian_shen}
                </>
              ) : '--'}
            </p>
            <p>
              <strong>Mệnh ngày:</strong>{' '}
              {dayDetail?.day_element?.label || '--'}
            </p>
            <p>
              <strong>Tuổi xung:</strong>{' '}
              {dayDetail?.conflict_age?.label || '--'}
            </p>
            <p>
              <strong>Ngày lễ:</strong>{' '}
              {dayDetail?.holidays?.length
                ? dayDetail.holidays.map((holiday) => holiday.name).join(', ')
                : 'Không có'}
            </p>
            <p>
              <strong>Đánh giá ngày:</strong>{' '}
              {dayDetail?.day_advice?.summary || 'Đang tải dữ liệu...'}
            </p>
          </div>

          <div className="calendar-detail-hours">
            <strong>Giờ hoàng đạo</strong>
            <div className="calendar-hour-list">
              {dayDetail?.good_hours?.length
                ? dayDetail.good_hours.map((hour) => (
                  <span key={hour.key} className="calendar-hour-chip">
                    {hour.display_text}
                  </span>
                ))
                : <span className="calendar-hour-chip">Đang cập nhật</span>}
            </div>
          </div>
        </section>

        <section className="calendar-content-grid">
          <div className="calendar-main-column">
            <PlannerComposer
              mode={plannerMode}
              onModeChange={handlePlannerModeChange}
              eventForm={eventForm}
              editingEventId={editingEventId}
              eventError={eventError}
              savingEvent={savingEvent}
              onEventChange={handleEventFormChange}
              onToggleAllDay={handleToggleAllDay}
              onEventSubmit={handleEventSubmit}
              onCancelEdit={resetEventForm}
              planningForm={planningForm}
              planningFormError={planningFormError}
              savingPlanning={savingPlanning}
              onPlanningChange={handlePlanningFormChange}
              onPlanningSubmit={handlePlanningSubmit}
              onPlanningReset={resetPlanningForm}
            />

            <PlannerTimeline
              timeline={planningTimeline}
              loading={loadingPlanning}
              timelineError={planningTimelineError}
              plannerActionKey={plannerActionKey}
              onOpenFixedEvent={handleSelectDate}
              onSuggestItem={handleSuggestPlanningItem}
              onConfirmSuggestion={handleConfirmSuggestion}
              onDeleteItem={handleDeletePlanningItem}
            />
          </div>

          <aside className="calendar-side-column">
            <section className="calendar-card">
              <div className="calendar-card__header">
                <div className="calendar-nav">
                  <button type="button" className="calendar-nav-circle is-small" onClick={() => handleChangeMonth(-1)}>‹</button>
                  <h2>{getMonthHeading(monthKey)}</h2>
                  <button type="button" className="calendar-nav-circle is-small" onClick={() => handleChangeMonth(1)}>›</button>
                </div>

                <div className="calendar-selectors">
                  <select value={displayedMonth} onChange={handleMonthSelect}>
                    {monthOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>

                  <select value={displayedYear} onChange={handleYearSelect}>
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="calendar-weekdays">
                {getWeekdays().map((weekday) => (
                  <span key={weekday}>{weekday}</span>
                ))}
              </div>

              {loadingMonth ? (
                <div className="calendar-loading-state">Đang tải lịch tháng...</div>
              ) : (
                <CalendarGrid
                  cells={monthCells}
                  selectedDate={selectedDate}
                  onSelectDate={handleSelectDate}
                />
              )}
            </section>

            <section className="calendar-side-card">
              <div className="calendar-section-header">
                <div>
                  <p className="calendar-section-label">Sự kiện trong ngày</p>
                  <h3>{formatShortDate(selectedDate)}</h3>
                </div>
                <span className="calendar-chip">{selectedDayEvents.length} mục</span>
              </div>

              {loadingDay ? (
                <div className="calendar-loading-state">Đang tải chi tiết ngày...</div>
              ) : selectedDayEvents.length > 0 ? (
                <div className="calendar-event-list">
                  {selectedDayEvents.map((event) => (
                    <article key={event.id} className="calendar-event-item">
                      <div>
                        <h4>{event.title}</h4>
                        <p>{event.description || 'Không có mô tả'}</p>
                        <span>{formatTimeRange(event.start_at, event.end_at, event.is_all_day)}</span>
                      </div>

                      <div className="calendar-event-item__actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => handleEditEvent(event)}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="secondary-button"
                          disabled={savingEvent}
                          onClick={() => handleDeleteEvent(event.id)}
                        >
                          Xóa
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="calendar-empty-state">Ngày này chưa có sự kiện cá nhân.</div>
              )}
            </section>

            <AdvisorPanel
              advisorDate={advisorDate}
              advisorForm={advisorForm}
              advisorMessages={advisorMessages}
              advisorError={advisorError}
              advisorLoading={advisorLoading}
              isOpen={isAdvisorOpen}
              onOpen={() => setIsAdvisorOpen(true)}
              onClose={() => setIsAdvisorOpen(false)}
              onDateChange={setAdvisorDate}
              onChange={(event) => setAdvisorForm(event.target.value)}
              onSubmit={handleAdvisorSubmit}
            />
          </aside>
        </section>
      </main>
    </div>
  );
}

export default HomePage;
