import axios, { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { store } from "../redux/store";
import { clearToken } from "./features/AuthSlice";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { setCookie, getCookie, removeCookie } from "@/utils/cookie";

const http = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_API_BASE_URL}`,
});

http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const state = store.getState();
    const token = state.auth.token;
    console.log("token", token);
    if (token) {
      if (config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    if (config.headers && config.data instanceof FormData) {
      config.headers["Content-Type"] = "multipart/form-data";
    }
    return config;
  },
  (error) => Promise.reject(error)
);

http.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log(error);
    if (error.response && error.response.status === 422) {
      return error.response;
    }
    return Promise.reject(error);
  }
);

const ensureToken = async () => {
  const res = await getCookie("userInfo");
  const response = res
    ? (JSON.parse(res) as {
        status: number;
        data: { userData: { token: string } };
      })
    : null;
  if (response?.status === 200) {
    const userInfo = response.data.userData;
    const token = userInfo.token;

    if (!token) {
      throw new Error("Token not available");
    }
    return token;
  } else {
    throw new Error("Token not available");
  }
};

export const login = async (uri: string, data: FormData) => {
  try {
    const response: AxiosResponse<{
      response: { status: string; message: string };
      data: {
        token_type: string;
        accessToken: string;
        user: {
          id: number;
          name: string | null;
          username: string | null;
          email: string | null;
          agent_code: string | null;
          phone_number: string;
          is_verified: boolean;
          updated_at: string;
          created_at: string;
          last_logined: string;
        };
      };
    }> = await http.post(uri, data);
    if (response.status === 422) {
      return response;
    }
    const apiFormData = new FormData();
    const user = response.data.data.user;
    apiFormData.append("token", response.data.data.accessToken);
    apiFormData.append("id", String(user.id));
    apiFormData.append("name", user.name || "");
    apiFormData.append("email", user.email || "");
    apiFormData.append("phone_number", user.phone_number || "");
    apiFormData.append("agent_code", user.agent_code || "");
    apiFormData.append("status", user.is_verified ? "verified" : "unverified");
    await setCookie("userInfo", apiFormData);
    return response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 422) {
      return error.response;
    }
    throw error;
  }
};
export const register = async (
  uri: string,
  data: {
    phone_number: string;
    name: string;
    username: string;
    email: string;
    password: string;
    password_confirmation: string;
    agent_code?: string;
    fcm_token?: string;
  }
) => {
  try {
    const response: AxiosResponse<{
      response: { status: string; message: string };
      data: {
        token_type: string;
        access_token: string;
        user: {
          id: number;
          name: string | null;
          username: string | null;
          email: string | null;
          agent_code: string | null;
          phone_number: string;
          is_verified: boolean;
          updated_at: string;
          created_at: string;
          last_logined: string;
        };
      };
      errors?: Record<string, string[]>;
    }> = await http.post(uri, data);
    if (response.status === 422) {
      return response;
    }
    const apiFormData = new FormData();
    const user = response.data.data.user;
    apiFormData.append("token", response.data.data.access_token);
    apiFormData.append("id", String(user.id));
    apiFormData.append("name", user.name || "");
    apiFormData.append("email", user.email || "");
    apiFormData.append("phone_number", user.phone_number || "");
    apiFormData.append("status", user.is_verified ? "verified" : "unverified");
    await setCookie("userInfo", apiFormData);
    return response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 422) {
      return error.response;
    }
    throw error;
  }
};
export const verifyPhone = async (
  uri: string,
  data: { phone_number: string }
) => {
  try {
    const response: AxiosResponse<{
      response: { status: string; message: string };
      data: [];
      errors?: { phone_number?: string[] };
    }> = await http.post(uri, data);
    if (response.status === 422) {
      return response;
    }
    return response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 422) {
      return error.response;
    }
    throw error;
  }
};
export const verifycode = async (uri: string, data: FormData) => {
  try {
    const response: AxiosResponse<{
      user: {
        id: number;
        name: string;
        email: string;
        status: string;
        profile_status: string | null;
      };
      token: string;
    }> = await http.post(uri, data);
    if (response.status === 422) {
      return response;
    }
    const apiFormData = new FormData();
    const user = response.data.user;
    apiFormData.append("token", response.data.token);
    apiFormData.append("id", user.id.toString());
    apiFormData.append("name", user.name);
    apiFormData.append("email", user.email);
    apiFormData.append("status", user.status);

    await setCookie("userInfo", apiFormData);
    return response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 422) {
      return error.response;
    }
    throw error;
  }
};

export const resendcode = async (uri: string, data: FormData) => {
  try {
    const response: AxiosResponse = await http.post(uri, data);
    return response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 422) {
      return error.response;
    }
    throw error;
  }
};

// export const verifyEmail = async (uri: string, data: FormData) => {
//   try {
//     const response: AxiosResponse<{
//       user: {
//         id: number;
//         name: string | null;
//         email: string;
//         status: string;
//         profile_status: string | null;
//       };
//       token: string;
//     }> = await http.post(uri, data);
//     console.log(response);
//     if (response.status === 422) {
//       return response;
//     }
//     const apiFormData = new FormData();
//     const user = response.data.user;
//     apiFormData.append("token", response.data.token);
//     apiFormData.append("id", user.id.toString());
//     apiFormData.append("name", user.name || "");
//     apiFormData.append("email", user.email);
//     apiFormData.append("status", user.status);

//     await setCookie("userInfo", apiFormData);
//     return response;
//   } catch (error) {
//     if (axios.isAxiosError(error) && error.response?.status === 422) {
//       return error.response;
//     }
//     throw error;
//   }
// };

export const fetchDataWithToken = async (uri: string) => {
  try {
    await ensureToken();
    const response = await http.get(uri);
    console.log(response);
    return response.data;
  } catch (error) {
    console.log(error);
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};
export const fetchDataWithOutToken = async (uri: string) => {
  try {
    const response = await http.get(uri);
    console.log(response);
    return response.data;
  } catch (error) {
    console.log(error);
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

export const postDataWithToken = async (uri: string, data: FormData) => {
  try {
    await ensureToken();
    const response = await http.post(uri, data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};
export const postDataWithTokenData = async (
  uri: string,
  data: {
    details: {
      key: string;
      value: string;
      extra: string;
    }[];
  }
) => {
  try {
    await ensureToken();
    const response = await http.post(uri, data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};
export const postDataWithOutToken = async (uri: string, data: FormData) => {
  try {
    const response = await http.post(uri, data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw error.response.data;
    }
    throw error;
  }
};

export const changePdfToText = async (data: FormData) => {
  try {
    const response: AxiosResponse = await axios.post(
      "/apii/proxy", // Use the internal proxy to avoid CORS
      data
    );
    return response;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 422) {
      return error.response;
    }
    throw error;
  }
};
export const useLogout = () => {
  const router = useRouter();
  const dispatch = useDispatch();

  const logout = async () => {
    try {
      await http.post("/auth/logout");
      dispatch(clearToken());
      await removeCookie("userInfo");
      router.push("/");
    } catch (error) {
      dispatch(clearToken());
      await removeCookie("userInfo");
      router.push("/");
      console.error("Logout failed", error);
    }
  };

  return logout;
};

const api = {
  http,
  login,
  register,
  verifycode,
  resendcode,
  verifyPhone,
  fetchDataWithToken,
  postDataWithToken,
  fetchDataWithOutToken,
  postDataWithOutToken,
  changePdfToText,
};
export default api;
