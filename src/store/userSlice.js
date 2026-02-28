import $api from "../http/api";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const PROFILE_CACHE_KEY = "user_profile_cache";
const readCachedProfile = () => {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY) || "null");
  } catch {
    return null;
  }
};
const readStoredRole = () =>
  String(
    localStorage.getItem("user_role") ||
      localStorage.getItem("role") ||
      localStorage.getItem("userRole") ||
      ""
  )
    .toLowerCase()
    .replace(/[_\s]/g, "");

const extractProfileFromResponse = (data) =>
  data?.myProfile || data?.profile || data?.user || data?.data || null;

export const fetchUserProfile = createAsyncThunk(
  "user/fetchProfile",
  async (_, thunkAPI) => {
    const endpoints = ["/users/profile/me"];

    try {
      for (const endpoint of endpoints) {
        try {
          const response = await $api.get(endpoint);
          const profile = extractProfileFromResponse(response.data);
          if (profile) return profile;
        } catch (innerError) {
          if (innerError?.response?.status && innerError.response.status < 500) {
            continue;
          }
        }
      }

      const cached = localStorage.getItem(PROFILE_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }

      return thunkAPI.rejectWithValue("Foydalanuvchi profili topilmadi");
    } catch (error) {
      const cached = localStorage.getItem(PROFILE_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
      return thunkAPI.rejectWithValue(error.response?.data || "Server error");
    }
  }
);

const userSlice = createSlice({
  name: "user",
  initialState: {
    user: readCachedProfile() || (readStoredRole() ? { role: readStoredRole() } : null),
    loading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      localStorage.removeItem("accessToken");
      localStorage.removeItem("access_token");
      localStorage.removeItem(PROFILE_CACHE_KEY);
      localStorage.removeItem("user_role");
      localStorage.removeItem("role");
      localStorage.removeItem("userRole");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.error = null;
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(action.payload));
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout } = userSlice.actions;

export default userSlice.reducer;
