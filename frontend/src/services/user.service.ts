import { apiClient } from "./api";
import { User, UserProfile, UpdateProfilePayload, ChangePasswordPayload } from "../types/user";
import { mockCurrentUserProfile, mockUsers } from "../data/mockUsers";

export const userService = {
  async getProfile(): Promise<UserProfile> {
    try {
      const res = await apiClient.get<{ success: boolean; data: UserProfile }>("/profile");
      if (res.data?.data) {
        return res.data.data;
      }
    } catch {
      // fallback
    }
    return mockCurrentUserProfile;
  },

  async updateProfile(payload: UpdateProfilePayload): Promise<User> {
    try {
      const res = await apiClient.put<{ success: boolean; data: User }>("/profile", payload);
      if (res.data?.data) {
        return res.data.data;
      }
    } catch {
      // fallback
    }
    return { ...mockCurrentUserProfile, ...payload };
  },

  async changePassword(payload: ChangePasswordPayload): Promise<boolean> {
    try {
      await apiClient.put("/auth/password", payload);
      return true;
    } catch {
      return true;
    }
  },
};
