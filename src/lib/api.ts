
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Optional: handle unauthorized access (e.g., redirect to login or clear token)
    localStorage.removeItem('token');
    // We could also trigger a custom event or a callback here
  }

  return response;
}

export const api = {
  get: (endpoint: string, options: RequestInit = {}) => 
    apiFetch(endpoint, { ...options, method: 'GET' }),
  post: (endpoint: string, body?: any, options: RequestInit = {}) => 
    apiFetch(endpoint, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: (endpoint: string, body?: any, options: RequestInit = {}) => 
    apiFetch(endpoint, { ...options, method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: (endpoint: string, body?: any, options: RequestInit = {}) => 
    apiFetch(endpoint, { ...options, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: (endpoint: string, options: RequestInit = {}) => 
    apiFetch(endpoint, { ...options, method: 'DELETE' }),
};
