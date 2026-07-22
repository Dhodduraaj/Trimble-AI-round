const API_BASE = process.env.E2E_API_URL || "http://localhost:8000";
const USERNAME = "user";
const PASSWORD = "password";

export function authHeader() {
  const token = Buffer.from(`${USERNAME}:${PASSWORD}`).toString("base64");
  return { Authorization: `Basic ${token}` };
}

export async function clearEntries(request) {
  await request.delete(`${API_BASE}/entries`, { headers: authHeader() });
}

export async function seedEntry(request, entry) {
  const response = await request.post(`${API_BASE}/entries`, {
    headers: {
      ...authHeader(),
      "Content-Type": "application/json",
    },
    data: entry,
  });
  if (!response.ok()) {
    throw new Error(`Failed to seed entry: ${await response.text()}`);
  }
  return response.json();
}

export async function seedSampleEntries(request) {
  await clearEntries(request);
  await seedEntry(request, {
    amount: 10,
    category: "food",
    description: "breakfast",
    spent_on: "2026-07-10",
  });
  await seedEntry(request, {
    amount: 25.5,
    category: "transport",
    description: "bus",
    spent_on: "2026-07-15",
  });
  await seedEntry(request, {
    amount: 40,
    category: "food",
    description: "dinner",
    spent_on: "2026-07-20",
  });
}
