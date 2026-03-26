import { getFCMToken } from "@/lib/firebase";

class FCMService {
  private token: string | null = null;

  async initializeToken(): Promise<string | null> {
    try {
      console.log("FCM Service: Initializing token...");
      this.token = await getFCMToken();
      if (this.token) {
        console.log("FCM Service: Token stored successfully:", this.token);
        if (typeof window !== "undefined") {
          localStorage.setItem("fcm_token", this.token);
        }
      } else {
        console.log("FCM Service: No token obtained");
      }
      return this.token;
    } catch (error) {
      console.error("FCM Service: Failed to initialize token:", error);
      return null;
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== "undefined") {
      this.token = localStorage.getItem("fcm_token");
      console.log("FCM Service: Retrieved token from storage:", this.token);
    }
    return this.token;
  }

  async refreshToken(): Promise<string | null> {
    console.log("FCM Service: Refreshing token...");
    return await this.initializeToken();
  }

  clearToken(): void {
    console.log("FCM Service: Clearing token");
    this.token = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("fcm_token");
    }
  }
}

export const fcmService = new FCMService();
