const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const USERNAME = import.meta.env.VITE_API_USER || "user";
const PASSWORD = import.meta.env.VITE_API_PASSWORD || "password";

function getAuthHeader() {
  const token = btoa(`${USERNAME}:${PASSWORD}`);
  return { Authorization: `Basic ${token}` };
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function createEntry(entry) {
  return request("/entries", {
    method: "POST",
    body: JSON.stringify(entry),
  });
}

export function getEntriesByDate(date) {
  return request(`/entries/date/${date}`);
}

export function getEntriesInRange(fromDate, toDate) {
  const params = new URLSearchParams({
    from_date: fromDate,
    to_date: toDate,
  });
  return request(`/entries/range?${params.toString()}`);
}

export function clearEntries() {
  return request("/entries", { method: "DELETE" });
}
