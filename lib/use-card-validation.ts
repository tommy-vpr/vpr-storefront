"use client";

import { useMemo } from "react";
import valid from "card-validator";

/**
 * Card brand detection, formatting and validation for the checkout form.
 *
 * Wraps Braintree's card-validator. Worth using rather than hand-rolling
 * prefix matching: BIN ranges genuinely change (Mastercard's 2-series was
 * added years after the 51-55 range), and overlapping prefixes need care —
 * Visa and some Elo cards both start with 4, so the library reports both until
 * enough digits arrive to decide.
 *
 * THIS IS UX, NOT SECURITY. Accept.js and Authorize.net remain the authority
 * on whether a card is real. All this does is catch the obvious failures
 * before they cost a round trip and a re-typed card — which matters here,
 * because a rejected tokenize means the customer enters their card again.
 *
 * "Potentially valid" is the concept that makes type-as-you-go bearable: "411"
 * isn't submittable but is on its way to being valid, whereas "41x" can never
 * be, so only the second deserves an error while someone is still typing.
 */

export interface CardInput {
  number: string;
  month: string;
  year: string;
  cvv: string;
}

export interface CardValidation {
  /** credit-card-type's id — "visa", "american-express", "mastercard"… */
  brand: string | null;
  /** Human name, e.g. "American Express". Null until a brand is determined. */
  brandLabel: string | null;
  /** "CVV" for most brands, "CID" for Amex — the library tells us. */
  cvvLabel: string;
  /** 4 for Amex, 3 otherwise. */
  cvvSize: number;
  /** Longest formatted length for this brand, for maxLength on the input. */
  maxNumberLength: number;
  /**
   * Errors worth showing WHILE TYPING — only for values that can no longer
   * become valid. A half-entered number isn't an error.
   */
  errors: {
    number?: string;
    month?: string;
    year?: string;
    cvv?: string;
  };
  /** Everything present and valid — safe to tokenize. */
  isComplete: boolean;
  /**
   * Full check for submit time, including "you haven't finished this field".
   * Returns the first problem, or null.
   */
  firstProblem: string | null;
}

/** Strip everything but digits — the only form card-validator should see. */
export const digitsOnly = (v: string) => v.replace(/\D/g, "");

/**
 * Insert brand-correct spacing: 4-4-4-4 for most, 4-6-5 for Amex.
 *
 * The gap positions come from the library rather than being hardcoded, so
 * Amex, Diners and anything added later group correctly for free.
 *
 * KNOWN LIMITATION: editing in the MIDDLE of the number moves the caret to the
 * end, because the value is rewritten on every keystroke. Fixing that properly
 * means tracking selection offsets; almost nobody edits mid-number, so it's
 * not worth the complexity until someone complains.
 */
export function formatCardNumber(value: string): string {
  const digits = digitsOnly(value);
  if (!digits) return "";

  const card = valid.number(digits).card;
  const gaps = card?.gaps ?? [4, 8, 12];
  const maxLength = card ? Math.max(...card.lengths) : 19;
  const trimmed = digits.slice(0, maxLength);

  let out = "";
  for (let i = 0; i < trimmed.length; i++) {
    if (gaps.includes(i)) out += " ";
    out += trimmed[i];
  }
  return out;
}

export function useCardValidation(card: CardInput): CardValidation {
  return useMemo(() => {
    const number = digitsOnly(card.number);
    const numberResult = valid.number(number);
    const type = numberResult.card;

    const cvvSize = type?.code?.size ?? 3;
    const cvvLabel = type?.code?.name ?? "CVV";

    const monthResult = valid.expirationMonth(card.month);
    const yearResult = valid.expirationYear(card.year);
    const cvvResult = valid.cvv(card.cvv, cvvSize);

    // Both fields present — only then is "the date is in the past" a question
    // that can be asked. Checking earlier would flag a half-typed year.
    const dateResult =
      card.month && card.year
        ? valid.expirationDate({ month: card.month, year: card.year })
        : null;

    const errors: CardValidation["errors"] = {};

    // Note the isPotentiallyValid checks: an error appears only once the value
    // can no longer become correct, not merely because it isn't correct yet.
    if (number.length > 0 && !numberResult.isPotentiallyValid) {
      errors.number = "That card number isn't valid";
    }
    if (card.month.length > 0 && !monthResult.isPotentiallyValid) {
      errors.month = "Invalid month";
    }
    if (card.year.length > 0 && !yearResult.isPotentiallyValid) {
      errors.year = "Invalid year";
    }
    if (dateResult && !dateResult.isValid && !errors.month && !errors.year) {
      errors.month = "That card has expired";
    }
    if (card.cvv.length > 0 && !cvvResult.isPotentiallyValid) {
      errors.cvv = `Invalid ${cvvLabel}`;
    }

    const isComplete =
      numberResult.isValid &&
      monthResult.isValid &&
      yearResult.isValid &&
      cvvResult.isValid &&
      (dateResult?.isValid ?? false);

    // Submit-time messages differ from typing-time ones: here an unfinished
    // field IS a problem, and the customer needs telling which.
    let firstProblem: string | null = null;
    if (!numberResult.isValid) firstProblem = "Check the card number";
    else if (!monthResult.isValid || !yearResult.isValid)
      firstProblem = "Check the expiry date";
    else if (dateResult && !dateResult.isValid)
      firstProblem = "That card has expired";
    else if (!cvvResult.isValid)
      firstProblem = `Check the ${cvvLabel}`;

    const maxNumberLength = type
      ? Math.max(...type.lengths) + (type.gaps?.length ?? 3)
      : 19 + 3;

    return {
      brand: type?.type ?? null,
      brandLabel: type?.niceType ?? null,
      cvvLabel,
      cvvSize,
      maxNumberLength,
      errors,
      isComplete,
      firstProblem,
    };
  }, [card.number, card.month, card.year, card.cvv]);
}
