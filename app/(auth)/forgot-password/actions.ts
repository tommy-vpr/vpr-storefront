"use server";

import { getClient } from "@/lib/wms/session";

export interface ForgotPasswordState {
  error: string | null;
  sent: boolean;
}

export async function forgotPasswordAction(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Email is required.", sent: false };
  }

  try {
    // WMS always returns success to prevent email enumeration.
    // We do the same on the client — show "if it exists..." regardless.
    await getClient().forgotPassword(email);
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      sent: false,
    };
  }

  return { error: null, sent: true };
}
