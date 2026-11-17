/** Persist only a random checkout reference, never customer or payment details. */
export const CHECKOUT_ATTEMPT_KEY = 'vpr_checkout_pending_v1';
export interface AttemptStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
export function readCheckoutAttempt(storage: AttemptStorage): string | null {
  return storage.getItem(CHECKOUT_ATTEMPT_KEY);
}
export function beginCheckoutAttempt(storage: AttemptStorage, id: string): string {
  if (readCheckoutAttempt(storage)) throw new Error('An earlier payment needs confirmation. Do not submit another payment.');
  storage.setItem(CHECKOUT_ATTEMPT_KEY, id);
  if (readCheckoutAttempt(storage) !== id) throw new Error('Unable to save your checkout reference. Please contact us.');
  return id;
}
export function finishCheckoutAttempt(storage: AttemptStorage, id: string): void {
  if (readCheckoutAttempt(storage) === id) storage.removeItem(CHECKOUT_ATTEMPT_KEY);
}
