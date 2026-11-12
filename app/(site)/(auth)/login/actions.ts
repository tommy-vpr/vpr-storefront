"use server";

import { redirect } from "next/navigation";
import { getClient, setSessionToken } from "@/lib/wms/session";
import { WmsError } from "@/lib/wms/client";

export interface LoginState {
  error: string | null;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectRaw = String(formData.get("redirect") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  let token: string;
  try {
    const res = await getClient().login({ email, password });
    token = res.token;
  } catch (err) {
    if (err instanceof WmsError && err.status === 401) {
      return { error: "Invalid email or password." };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
    };
  }

  await setSessionToken(token);

  // Only honor same-site paths — block open-redirect abuse
  const dest =
    redirectRaw.startsWith("/") && !redirectRaw.startsWith("//")
      ? redirectRaw
      : "/";
  redirect(dest);
}
