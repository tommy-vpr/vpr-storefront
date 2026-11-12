"use server";

import { redirect } from "next/navigation";
import { getClient, setSessionToken } from "@/lib/wms/session";
import { WmsError } from "@/lib/wms/client";

export interface AcceptInviteState {
  error: string | null;
}

export async function acceptInviteAction(
  _prevState: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const redirectRaw = String(formData.get("redirect") ?? "");

  if (!token) return { error: "Invite token missing. Re-open the invite link." };
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  let authToken: string;
  try {
    const res = await getClient().acceptInvite({
      token,
      password,
      name: name || undefined,
      phone: phone || undefined,
    });
    authToken = res.token;
  } catch (err) {
    if (err instanceof WmsError) {
      if (err.status === 410) {
        return {
          error: "This invite has expired or has already been used.",
        };
      }
      if (err.status === 409) {
        return {
          error: "An account with this email already exists. Please sign in.",
        };
      }
      return { error: err.message };
    }
    return {
      error:
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
    };
  }

  await setSessionToken(authToken);

  const dest =
    redirectRaw.startsWith("/") && !redirectRaw.startsWith("//")
      ? redirectRaw
      : "/";
  redirect(dest);
}
