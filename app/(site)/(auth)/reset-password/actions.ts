"use server";

import { getClient } from "@/lib/wms/session";
import { WmsError } from "@/lib/wms/client";

export interface ResetPasswordState {
  error: string | null;
  done: boolean;
}

export async function resetPasswordAction(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!token) {
    return {
      error: "Reset token missing. Please request a new reset link.",
      done: false,
    };
  }
  if (password.length < 8) {
    return {
      error: "Password must be at least 8 characters.",
      done: false,
    };
  }

  try {
    await getClient().resetPassword({ token, password });
  } catch (err) {
    if (err instanceof WmsError && (err.status === 400 || err.status === 404)) {
      return {
        error:
          "This reset link is invalid or has expired. Please request a new one.",
        done: false,
      };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      done: false,
    };
  }

  return { error: null, done: true };
}
