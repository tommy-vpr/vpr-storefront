"use server";

import { revalidatePath } from "next/cache";
import { getAuthedClient } from "@/lib/wms/session";
import { WmsError } from "@/lib/wms/client";

export interface FormState {
  error: string | null;
  success: string | null;
}

// NOTE: the initial state lives in forms.tsx, not here. A "use server" file may
// only export async functions — exporting a plain object from one throws
// "can only export async functions, found object" at module evaluation. Types
// are fine, since they're erased before the loader sees them.

/**
 * Profile update.
 *
 * Email is deliberately not editable here. Changing it would move the account
 * to a different identity — the WMS keys customers on (storeId, email) — and
 * would silently redirect every future order email. That needs a verify-new-
 * address flow, which doesn't exist yet.
 */
export async function updateProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const addressLine1 = String(formData.get("addressLine1") ?? "").trim();
  const addressLine2 = String(formData.get("addressLine2") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const zip = String(formData.get("zip") ?? "").trim();

  try {
    const client = await getAuthedClient();
    await client.updateProfile({
      name,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      zip,
    });
  } catch (err) {
    if (err instanceof WmsError && err.status === 401) {
      return { error: "Your session expired. Please sign in again.", success: null };
    }
    return { error: "Couldn't save those changes. Please try again.", success: null };
  }

  revalidatePath("/account");
  return { error: null, success: "Saved." };
}

/**
 * Password change. Requires the current password — the WMS enforces that, and
 * it's what stops a borrowed session from locking the real owner out.
 */
export async function changePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword) {
    return { error: "Both passwords are required.", success: null };
  }
  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters.", success: null };
  }
  if (newPassword !== confirmPassword) {
    return { error: "The new passwords don't match.", success: null };
  }

  try {
    const client = await getAuthedClient();
    await client.changePassword({ currentPassword, newPassword });
  } catch (err) {
    if (err instanceof WmsError) {
      // 401 here means the CURRENT password was wrong, not that the session
      // died — the request carried a valid JWT to get this far.
      if (err.status === 401 || err.status === 400) {
        return { error: "That current password isn't right.", success: null };
      }
    }
    return { error: "Couldn't change your password. Please try again.", success: null };
  }

  return { error: null, success: "Password updated." };
}
