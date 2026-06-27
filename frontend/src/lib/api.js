const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function buildHeaders(token, extraHeaders = {}) {
  const headers = {
    Accept: 'application/json',
    ...extraHeaders,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function buildErrorMessage(payload, fallbackMessage) {
  if (!payload) {
    return fallbackMessage;
  }

  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    return payload.errors.map((item) => item.message).join(', ');
  }

  return payload.message || fallbackMessage;
}

async function request(path, { method = 'GET', token, body } = {}) {
  const hasBody = body !== undefined;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: buildHeaders(
      token,
      hasBody ? { 'Content-Type': 'application/json' } : undefined,
    ),
    body: hasBody ? JSON.stringify(body) : undefined,
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(buildErrorMessage(payload, 'Yêu cầu thất bại.'));
  }

  return payload;
}

export function getApiUrl() {
  return API_URL;
}

export function getHealth() {
  return request('/api/health');
}

export function register(data) {
  return request('/api/auth/register', {
    method: 'POST',
    body: data,
  });
}

export function login(data) {
  return request('/api/auth/login', {
    method: 'POST',
    body: data,
  });
}

export function getMe(token) {
  return request('/api/auth/me', { token });
}

export function getMonth(token, { year, month }) {
  return request(`/api/calendar/month?year=${year}&month=${month}`, { token });
}

export function getDay(token, date) {
  return request(`/api/calendar/day?date=${date}`, { token });
}

export function listEvents(token, month) {
  return request(`/api/events?month=${month}`, { token });
}

export function createEvent(token, data) {
  return request('/api/events', {
    method: 'POST',
    token,
    body: data,
  });
}

export function updateEvent(token, eventId, data) {
  return request(`/api/events/${eventId}`, {
    method: 'PUT',
    token,
    body: data,
  });
}

export function deleteEvent(token, eventId) {
  return request(`/api/events/${eventId}`, {
    method: 'DELETE',
    token,
  });
}

export function askAdvisor(token, data) {
  return request('/api/advisor/chat', {
    method: 'POST',
    token,
    body: data,
  });
}
