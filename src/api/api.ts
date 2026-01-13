export const API_HOST = process.env.NEXT_PUBLIC_API_HOST;

async function request<T>(url: string, options: RequestInit = {}, responseType: 'json' | 'blob' = 'json'): Promise<T> {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    } as Record<string, string>;

    // Try to get token from localStorage if not provided
    if (!headers['Authorization']) {
        try {
            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        } catch {
            console.warn('localStorage not available');
        }
    }

    const response = await fetch(`${API_HOST}${url}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        if (response.status === 401) {
            // Optional: Redirect to login or clear token
        }
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
    }

    if (responseType === 'blob') {
        return response.blob() as unknown as T;
    }

    return response.json();
}

export const api = {
    get: <T>(url: string, options?: RequestInit) => request<T>(url, { ...options, method: 'GET' }),
    getBlob: <T>(url: string, options?: RequestInit) => request<T>(url, { ...options, method: 'GET' }, 'blob'),
    post: <T>(url: string, body: unknown, options?: RequestInit) => request<T>(url, { ...options, method: 'POST', body: JSON.stringify(body) }),
    put: <T>(url: string, body: unknown, options?: RequestInit) => request<T>(url, { ...options, method: 'PUT', body: JSON.stringify(body) }),
    patch: <T>(url: string, body: unknown, options?: RequestInit) => request<T>(url, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
    delete: <T>(url: string, options?: RequestInit) => request<T>(url, { ...options, method: 'DELETE' }),
};
