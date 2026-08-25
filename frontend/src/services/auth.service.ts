import { apiClient } from "./api";
import { AuthResponse, LoginPayload, RegisterPayload, UpdateProfilePayload, User } from "../types/user";
import { mockCurrentUserProfile, mockUsers } from "../data/mockUsers";

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<{ success: boolean; data: AuthResponse }>("/auth/login", payload);
      if (response.data?.data) {
        return response.data.data;
      }
    } catch {
      console.warn("Backend unavailable, using local mock auth fallback.");
    }

    // Demo/Mock fallback
    const matchedUser =
      payload.email === "admin@eavto.uz" ? mockUsers[1] : mockUsers[0];

    return {
      user: { ...matchedUser, email: payload.email },
      token: "demo-jwt-token-" + Date.now(),
    };
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<{ success: boolean; data: AuthResponse }>("/auth/register", payload);
      if (response.data?.data) {
        return response.data.data;
      }
    } catch {
      console.warn("Backend unavailable, using local mock register fallback.");
    }

    const newUser: User = {
      id: "user-" + Date.now(),
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      role: "USER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      user: newUser,
      token: "demo-jwt-token-" + Date.now(),
    };
  },

  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<{ success: boolean; data: User }>("/auth/me");
      if (response.data?.data) {
        return response.data.data;
      }
    } catch {
      // fallback
    }
    return mockCurrentUserProfile;
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<User> {
    try {
      const response = await apiClient.put<{ success: boolean; data: User }>("/profile", payload);
      if (response.data?.data) {
        return response.data.data;
      }
    } catch {
      // fallback
    }
    return { ...mockCurrentUserProfile, ...payload };
  },
};
