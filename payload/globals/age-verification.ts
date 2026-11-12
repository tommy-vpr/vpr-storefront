import type { GlobalConfig } from 'payload';
import { AGE_VERIFICATION_DEFAULTS as defaults, isAgeRedirectURL } from '../../lib/age-verification-settings';

export const AgeVerification: GlobalConfig = {
  slug: 'age-verification',
  label: 'Age Verification',
  admin: { group: 'Site', description: 'Manage the storefront’s 21+ confirmation popup. This is a self-declaration, not an ID check.' },
  access: { read: () => true, update: ({req}) => Boolean(req.user) },
  fields: [
    {name: 'enabled', label: 'Show 21+ popup', type: 'checkbox', defaultValue: defaults.enabled},
    {name: 'logo', type: 'upload', relationTo: 'media', admin: {description: 'Logo shown in the popup. Default: the VPR Collection wordmark.'}},
    {name: 'heading', type: 'text', required: true, maxLength: 120, defaultValue: defaults.heading},
    {name: 'description', type: 'textarea', required: true, maxLength: 1000, defaultValue: defaults.description},
    {name: 'confirmLabel', label: 'Confirm button', type: 'text', required: true, maxLength: 80, defaultValue: defaults.confirmLabel},
    {name: 'denyLabel', label: 'Under-21 button', type: 'text', required: true, maxLength: 80, defaultValue: defaults.denyLabel},
    {name: 'deniedRedirectUrl', label: 'Under-21 redirect URL', type: 'text', required: true, defaultValue: defaults.deniedRedirectUrl,
      admin: {description: 'Where to send visitors who select the under-21 option. Defaults to Google.'},
      validate: (value: unknown) => isAgeRedirectURL(value) || 'Enter a full http(s) URL.'},
    {name: 'deniedMessage', label: 'Under-21 message', type: 'textarea', required: true, maxLength: 1000, defaultValue: defaults.deniedMessage},
    {name: 'rememberDays', label: 'Remember confirmation (days)', type: 'number', required: true, min: 0, max: 365, defaultValue: defaults.rememberDays,
      admin: {description: '30 by default. Set 0 to remember only for the current browser tab session.'},
      validate: (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 365 || 'Choose a whole number from 0 to 365.'},
  ],
};
