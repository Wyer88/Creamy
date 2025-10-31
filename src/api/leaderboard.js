const getApiBaseUrl = () => {
  const base = import.meta.env.VITE_LEADERBOARD_API_BASE_URL;
  if (!base) return null;
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
    return new URL(base, origin);
  } catch {
    return null;
  }
};

const toJson = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return null;
  return response.json();
};

export const isLeaderboardApiConfigured = () => Boolean(getApiBaseUrl());

export const fetchLeaderboard = async () => {
  const base = getApiBaseUrl();
  if (!base) throw new Error('Leaderboard API base URL is not configured.');
  const response = await fetch(new URL('/leaderboard', base), {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });
  if (!response.ok) {
    const payload = await toJson(response);
    const message = payload?.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }
  const payload = await toJson(response);
  return Array.isArray(payload?.leaders) ? payload.leaders : [];
};

export const submitLeaderboardScore = async (entry) => {
  const base = getApiBaseUrl();
  if (!base) throw new Error('Leaderboard API base URL is not configured.');
  const response = await fetch(new URL('/leaderboard', base), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(entry),
  });
  if (!response.ok) {
    const payload = await toJson(response);
    const message = payload?.message || `Submission failed with status ${response.status}`;
    throw new Error(message);
  }
  const payload = await toJson(response);
  return {
    leaders: Array.isArray(payload?.leaders) ? payload.leaders : [],
    entry: payload?.entry ?? null,
  };
};
