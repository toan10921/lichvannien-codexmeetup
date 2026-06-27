const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(message, status, errors = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

async function parseResponse(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export async function apiRequest(path, options = {}) {
  const { body, token, headers: customHeaders, ...fetchOptions } = options;
  const headers = {
    Accept: 'application/json',
    ...customHeaders,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...fetchOptions,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(
      payload?.message || 'Yêu cầu không thành công',
      response.status,
      payload?.errors || []
    );
  }

  return payload;
}

export const authApi = {
  register(data) {
    return apiRequest('/api/auth/register', {
      method: 'POST',
      body: data,
    });
  },

  login(data) {
    return apiRequest('/api/auth/login', {
      method: 'POST',
      body: data,
    });
  },

  logout(token) {
    return apiRequest('/api/auth/logout', {
      method: 'POST',
      token,
    });
  },

  me(token) {
    return apiRequest('/api/auth/me', {
      method: 'GET',
      token,
    });
  },
};

export const advisorApi = {
  chat(token, data) {
    return apiRequest('/api/advisor/chat', {
      method: 'POST',
      token,
      body: data,
    });
  },

  listConversations(token) {
    return apiRequest('/api/advisor/conversations', {
      method: 'GET',
      token,
    });
  },

  getMessages(token, conversationId) {
    return apiRequest(`/api/advisor/conversations/${conversationId}/messages`, {
      method: 'GET',
      token,
    });
  },
};

export const planningApi = {
  listTimeline(token) {
    return apiRequest('/api/planning/timeline', {
      method: 'GET',
      token,
    });
  },

  createItem(token, data) {
    return apiRequest('/api/planning/items', {
      method: 'POST',
      token,
      body: data,
    });
  },

  suggestItem(token, planningItemId) {
    return apiRequest(`/api/planning/items/${planningItemId}/suggestions`, {
      method: 'POST',
      token,
    });
  },

  confirmItem(token, planningItemId, data) {
    return apiRequest(`/api/planning/items/${planningItemId}/confirm`, {
      method: 'POST',
      token,
      body: data,
    });
  },

  deleteItem(token, planningItemId) {
    return apiRequest(`/api/planning/items/${planningItemId}`, {
      method: 'DELETE',
      token,
    });
  },
};

export { API_URL };
