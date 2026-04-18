export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

export type PostListItem = {
  id: string;
  title: string;
  platform: string;
  status: string;
  videoUrl: string | null;
  postedAt: string | null;
  scheduledAt: string | null;
  niche: {
    id: string;
    name: string;
  };
  analytics: {
    views: number;
    likes: number;
    comments: number;
    collectedAt: string;
  }[];
};

export type PostsOverview = {
  date: string;
  totalsForDay: {
    views: number;
    likes: number;
    comments: number;
  };
  totalsAllTime: {
    views: number;
    likes: number;
    comments: number;
  };
  totalPostedVideos: number;
  totalViewsAllVideos: number;
  postedToday: {
    id: string;
    title: string;
    videoUrl: string | null;
    platform: string;
    status: string;
    postedAt: string | null;
    scheduledAt: string | null;
    latestAnalytics: {
      views: number;
      likes: number;
      comments: number;
      collectedAt: string;
    } | null;
  }[];
};

export type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  updatedAt: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type YoutubeConnectionStatus = {
  connected: boolean;
  account: {
    id: string;
    platform: string;
    tokenExpiry: string | null;
  } | null;
};

export type NicheItem = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Falha em ${path}`);
  }

  return (await response.json()) as T;
}

export async function getPostsOverview(token: string, date?: string) {
  const query = date ? `?date=${encodeURIComponent(date)}` : "";
  return request<PostsOverview>(`/posts/overview${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getPosts(token: string) {
  return request<PostListItem[]>("/posts", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getNiches() {
  return request<NicheItem[]>('/niches');
}

export async function uploadVideoPost(
  token: string,
  payload: {
    video: File;
    title: string;
    description?: string;
    nicheId: string;
    scheduledAt: string;
  },
) {
  const formData = new FormData();
  formData.append('video', payload.video);
  formData.append('title', payload.title);
  formData.append('nicheId', payload.nicheId);
  formData.append('scheduledAt', payload.scheduledAt);

  if (payload.description?.trim()) {
    formData.append('description', payload.description.trim());
  }

  const response = await fetch(`${API_BASE_URL}/posts/upload-video`, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Falha ao enviar video');
  }

  return response.json();
}

export async function getUserById(userId: string, token: string) {
  return request<UserProfile>(`/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function updateUserById(
  userId: string,
  token: string,
  payload: {
    email?: string;
    name?: string;
    password?: string;
  },
) {
  return request<UserProfile>(`/users/${userId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export async function deleteUserById(userId: string, token: string) {
  return request<{ message: string }>(`/users/${userId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function getYoutubeConnectionStatus(userId: string, token: string) {
  return request<YoutubeConnectionStatus>(`/users/${userId}/youtube-connection`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function disconnectYoutubeConnection(userId: string, token: string) {
  return request<{ message: string }>(`/users/${userId}/youtube-connection`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function loginUser(payload: { email: string; password: string }) {
  return request<AuthTokens>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function registerUser(payload: {
  email: string;
  name?: string;
  password: string;
}) {
  return request<{ id: string; email: string; name?: string }>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
