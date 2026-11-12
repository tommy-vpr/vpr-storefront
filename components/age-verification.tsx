"use client";

import { createContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AGE_VERIFICATION_KEY, validAgeConfirmation, type AgeVerificationSettings } from '@/lib/age-verification-settings';
import styles from './age-verification.module.css';

export const AgeVerificationContext = createContext(false);

function subscribeToConfirmation(onChange: () => void) {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

export function AgeVerification({ settings, children }: { settings: AgeVerificationSettings; children: ReactNode }) {
  const [confirmed, setConfirmed] = useState(false);
  const [denied, setDenied] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const remembered = useSyncExternalStore<boolean | null>(subscribeToConfirmation, () => {
    try {
      const stored = (settings.rememberDays === 0 ? sessionStorage : localStorage).getItem(AGE_VERIFICATION_KEY);
      return validAgeConfirmation(stored, settings.rememberDays);
    } catch { return false; }
  }, () => null);
  const blocked = settings.enabled && !(confirmed || remembered);
  const checking = remembered === null && !confirmed;

  useEffect(() => {
    if (!blocked) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    dialog.current?.focus();
    const keepFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.current?.contains(event.target)) dialog.current?.focus();
    };
    const trapKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); return; }
      if (event.key !== 'Tab') return;
      const buttons = dialog.current?.querySelectorAll<HTMLElement>('button, a[href]');
      if (!buttons?.length) { event.preventDefault(); dialog.current?.focus(); return; }
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener('focusin', keepFocus);
    document.addEventListener('keydown', trapKeys);
    return () => {
      document.removeEventListener('focusin', keepFocus);
      document.removeEventListener('keydown', trapKeys);
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = rootOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [blocked, checking]);

  function confirm() {
    const record = JSON.stringify({age: 21, acceptedAt: Date.now()});
    try {
      (settings.rememberDays === 0 ? sessionStorage : localStorage).setItem(AGE_VERIFICATION_KEY, record);
    } catch { /* Confirmation still works in memory when storage is unavailable. */ }
    setConfirmed(true);
  }

  return <AgeVerificationContext.Provider value={!blocked}>
    <div inert={blocked} aria-hidden={blocked || undefined}>{children}</div>
    {blocked && checking && <div ref={dialog} className={styles.pending} role="status" tabIndex={-1}>
      <span className="sr-only">Checking age confirmation…</span>
      <noscript>Please enable JavaScript to confirm your age and enter.</noscript>
    </div>}
    {blocked && !checking && <div className={styles.backdrop}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="age-verification-heading" aria-describedby="age-verification-description" tabIndex={-1} className={styles.card}>
        {settings.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.logoUrl} alt="" className={styles.logo} width={180} height={30} />
        )}
        <h2 id="age-verification-heading" className={styles.heading}>{settings.heading}</h2>
        <p id="age-verification-description" className={styles.description}>{denied ? settings.deniedMessage : settings.description}</p>
        <div className={styles.actions}>
          {!denied && <button type="button" className={styles.confirm} onClick={confirm}>{settings.confirmLabel}</button>}
          <a href={settings.deniedRedirectUrl} className={styles.deny} onClick={() => { setDenied(true); dialog.current?.focus(); }}>{settings.denyLabel}</a>
        </div>
        <noscript>Please enable JavaScript to confirm your age and enter.</noscript>
      </div>
    </div>}
  </AgeVerificationContext.Provider>;
}
