import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL, apiRequest } from '../api/client';
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

function EventForm({
  form,
  editingEventId,
  eventError,
  savingEvent,
  onChange,
  onToggleAllDay,
  onSubmit,
  onCancelEdit,
}) {
  return (
    <section className="calendar-side-card">
      <div className="calendar-section-header">
        <div>
          <p className="calendar-section-label">Sự kiện</p>
          <h3>{editingEventId ? 'Cập nhật sự kiện' : 'Thêm sự kiện mới'}</h3>
        </div>
      </div>

      <form className="calendar-event-form" onSubmit={onSubmit}>
        <label>
          Tiêu đề
          <input
            name="title"
            value={form.title}
            onChange={onChange}
            placeholder="Họp khách hàng"
          />
        </label>

        <label>
          Mô tả
          <textarea
            name="description"
            rows="3"
            value={form.description}
            onChange={onChange}
            placeholder="Chuẩn bị demo, báo giá, checklist..."
          />
        </label>

        <label className="calendar-checkbox-field">
          <input
            type="checkbox"
            checked={form.is_all_day}
            onChange={onToggleAllDay}
          />
          <span>Sự kiện cả ngày</span>
        </label>

        <div className="calendar-field-grid">
          <label>
            {form.is_all_day ? 'Ngày bắt đầu' : 'Bắt đầu lúc'}
            <input
              name="start_at"
              type={form.is_all_day ? 'date' : 'datetime-local'}
              value={form.start_at}
              onChange={onChange}
            />
          </label>

          <label>
            {form.is_all_day ? 'Ngày kết thúc' : 'Kết thúc lúc'}
            <input
              name="end_at"
              type={form.is_all_day ? 'date' : 'datetime-local'}
              value={form.end_at}
              onChange={onChange}
            />
          </label>
        </div>

        {eventError ? (
          <p className="form-error" role="alert">{eventError}</p>
        ) : null}

        <div className="calendar-form-actions">
          <button className="primary-button" type="submit" disabled={savingEvent}>
            {savingEvent ? 'Đang lưu...' : editingEventId ? 'Lưu thay đổi' : 'Thêm sự kiện'}
          </button>

          {editingEventId ? (
            <button type="button" className="secondary-button" onClick={onCancelEdit}>
              Hủy sửa
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}

function AdvisorPanel({
  selectedDate,
  advisorForm,
  advisorReply,
  advisorError,
  advisorLoading,
  onChange,
  onSubmit,
}) {
  return (
    <section className="calendar-side-card">
      <div className="calendar-section-header">
        <div>
          <p className="calendar-section-label">AI advisor</p>
          <h3>Hỏi nhanh theo ngày</h3>
        </div>
        <span className="calendar-chip">{formatShortDate(selectedDate)}</span>
      </div>

      <form className="calendar-advisor-form" onSubmit={onSubmit}>
        <textarea
          rows="4"
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

      {advisorReply ? (
        <div className="calendar-advisor-answer">
          <div className="calendar-advisor-answer__header">
            <strong>{advisorReply.rating || 'neutral'}</strong>
            <span>{advisorReply.disclaimer}</span>
          </div>

          <p>{advisorReply.answer}</p>

          {advisorReply.recommended_actions?.length > 0 ? (
            <div>
              <h4>Nên ưu tiên</h4>
              <ul>
                {advisorReply.recommended_actions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {advisorReply.cautions?.length > 0 ? (
            <div>
              <h4>Cần lưu ý</h4>
              <ul>
                {advisorReply.cautions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
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
  const [monthEvents, setMonthEvents] = useState([]);
  const [dayDetail, setDayDetail] = useState(null);

  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);
  const [appError, setAppError] = useState('');

  const [eventForm, setEventForm] = useState(createDefaultEventForm(today));
  const [editingEventId, setEditingEventId] = useState(null);
  const [eventError, setEventError] = useState('');
  const [savingEvent, setSavingEvent] = useState(false);

  const [advisorForm, setAdvisorForm] = useState('');
  const [advisorReply, setAdvisorReply] = useState(null);
  const [advisorConversationId, setAdvisorConversationId] = useState(null);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorError, setAdvisorError] = useState('');

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
      const [monthResponse, eventsResponse] = await Promise.all([
        apiRequest(`/api/calendar/month?year=${year}&month=${month}`, { token }),
        apiRequest(`/api/events?month=${requestedMonthKey}`, { token }),
      ]);

      setMonthData(monthResponse.data);
      setMonthEvents(eventsResponse.data.events || []);
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
    if (editingEventId) {
      return;
    }

    setEventForm(createDefaultEventForm(selectedDate));
    setEventError('');
  }, [editingEventId, selectedDate]);

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
    setAdvisorReply(null);
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

  function handleEditEvent(event) {
    setEditingEventId(event.id);
    setEventForm(mapEventToForm(event));
    setEventError('');
  }

  async function refreshCurrentViews(targetDate = selectedDate, targetMonthKey = monthKey) {
    await Promise.all([
      loadDayDetail(targetDate),
      loadMonthData(targetMonthKey),
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

  async function handleAdvisorSubmit(event) {
    event.preventDefault();
    setAdvisorLoading(true);
    setAdvisorError('');

    try {
      const response = await apiRequest('/api/advisor/chat', {
        method: 'POST',
        token,
        body: {
          conversation_id: advisorConversationId,
          message: advisorForm,
          selected_date: selectedDate,
        },
      });

      setAdvisorConversationId(response.data.conversation_id);
      setAdvisorReply(response.data);
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
        </section>

        <section className="calendar-content-grid">
          <div className="calendar-main-column">
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
          </div>

          <aside className="calendar-side-column">
            <EventForm
              form={eventForm}
              editingEventId={editingEventId}
              eventError={eventError}
              savingEvent={savingEvent}
              onChange={handleEventFormChange}
              onToggleAllDay={handleToggleAllDay}
              onSubmit={handleEventSubmit}
              onCancelEdit={resetEventForm}
            />

            <section className="calendar-side-card">
              <div className="calendar-section-header">
                <div>
                  <p className="calendar-section-label">Agenda tháng</p>
                  <h3>{getMonthHeading(monthKey)}</h3>
                </div>
                <span className="calendar-chip">{monthEvents.length} sự kiện</span>
              </div>

              {monthEvents.length > 0 ? (
                <div className="calendar-month-event-list">
                  {monthEvents.map((event) => (
                    <button
                      type="button"
                      key={event.id}
                      className={`calendar-month-event-item ${
                        event.start_at?.startsWith(selectedDate) ? 'active' : ''
                      }`}
                      onClick={() => handleSelectDate(event.start_at.slice(0, 10))}
                    >
                      <strong>{event.title}</strong>
                      <span>{formatTimeRange(event.start_at, event.end_at, event.is_all_day)}</span>
                      <em>{formatShortDate(event.start_at.slice(0, 10))}</em>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="calendar-empty-state">Tháng này chưa có sự kiện nào.</div>
              )}
            </section>

            <AdvisorPanel
              selectedDate={selectedDate}
              advisorForm={advisorForm}
              advisorReply={advisorReply}
              advisorError={advisorError}
              advisorLoading={advisorLoading}
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
