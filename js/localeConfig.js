// js/localeConfig.js
// Frontend mirror of backend config/localeConfig.js
// Imported as an ES module by all pages that need locale-aware formatting.

export const LOCALE_MAP = {

  IN: {
    country:          'India',
    countryCode:      'IN',
    currency:         'INR',
    currencySymbol:   '₹',
    locale:           'en-IN',
    dateFormat:       'DD/MM/YYYY',
    timezone:         'Asia/Kolkata',
    taxLabel:         'GST',
    taxIdLabel:       'GST Number',
    taxIdPlaceholder: '27ABCDE1234F1Z5',
    addressFields: {
      stateLabel:  'State',
      postalLabel: 'PIN Code',
    },
    defaultPaymentTerms: 'Payment due within 15 days of invoice date.',
    paymentMethods: ['upi', 'bank', 'cash'],
    plans: {
      starter: { amount: 499,  display: '₹499'  },
      growth:  { amount: 999,  display: '₹999'  },
      pro:     { amount: 1999, display: '₹1,999' },
    },
  },

  US: {
    country:          'United States',
    countryCode:      'US',
    currency:         'USD',
    currencySymbol:   '$',
    locale:           'en-US',
    dateFormat:       'MM/DD/YYYY',
    timezone:         'America/New_York',
    taxLabel:         'Tax',
    taxIdLabel:       'EIN / Tax ID',
    taxIdPlaceholder: 'XX-XXXXXXX',
    addressFields: {
      stateLabel:  'State',
      postalLabel: 'Zip Code',
    },
    defaultPaymentTerms: 'Payment due within Net 30 days.',
    paymentMethods: ['bank'],
    plans: {
      starter: { amount: 19, display: '$19' },
      growth:  { amount: 49, display: '$49' },
      pro:     { amount: 99, display: '$99' },
    },
  },

  GB: {
    country:          'United Kingdom',
    countryCode:      'GB',
    currency:         'GBP',
    currencySymbol:   '£',
    locale:           'en-GB',
    dateFormat:       'DD/MM/YYYY',
    timezone:         'Europe/London',
    taxLabel:         'VAT',
    taxIdLabel:       'VAT Number',
    taxIdPlaceholder: 'GB123456789',
    addressFields: {
      stateLabel:  'County',
      postalLabel: 'Postcode',
    },
    defaultPaymentTerms: 'Payment due within 30 days of invoice date.',
    paymentMethods: ['bank'],
    plans: {
      starter: { amount: 15, display: '£15' },
      growth:  { amount: 39, display: '£39' },
      pro:     { amount: 79, display: '£79' },
    },
  },

  SG: {
    country:          'Singapore',
    countryCode:      'SG',
    currency:         'SGD',
    currencySymbol:   'S$',
    locale:           'en-SG',
    dateFormat:       'DD/MM/YYYY',
    timezone:         'Asia/Singapore',
    taxLabel:         'GST',
    taxIdLabel:       'UEN / GST Reg No.',
    taxIdPlaceholder: '201234567A',
    addressFields: {
      stateLabel:  null,
      postalLabel: 'Postal Code',
    },
    defaultPaymentTerms: 'Payment due within 30 days of invoice date.',
    paymentMethods: ['bank'],
    plans: {
      starter: { amount: 25,  display: 'S$25'  },
      growth:  { amount: 65,  display: 'S$65'  },
      pro:     { amount: 129, display: 'S$129' },
    },
  },

  AU: {
    country:          'Australia',
    countryCode:      'AU',
    currency:         'AUD',
    currencySymbol:   'A$',
    locale:           'en-AU',
    dateFormat:       'DD/MM/YYYY',
    timezone:         'Australia/Sydney',
    taxLabel:         'GST',
    taxIdLabel:       'ABN',
    taxIdPlaceholder: '12 345 678 901',
    addressFields: {
      stateLabel:  'State / Territory',
      postalLabel: 'Postcode',
    },
    defaultPaymentTerms: 'Payment due within 30 days of invoice date.',
    paymentMethods: ['bank'],
    plans: {
      starter: { amount: 29,  display: 'A$29'  },
      growth:  { amount: 75,  display: 'A$75'  },
      pro:     { amount: 149, display: 'A$149' },
    },
  },

  CA: {
    country:          'Canada',
    countryCode:      'CA',
    currency:         'CAD',
    currencySymbol:   'CA$',
    locale:           'en-CA',
    dateFormat:       'DD/MM/YYYY',
    timezone:         'America/Toronto',
    taxLabel:         'HST / GST',
    taxIdLabel:       'GST/HST Number',
    taxIdPlaceholder: '123456789 RT 0001',
    addressFields: {
      stateLabel:  'Province / Territory',
      postalLabel: 'Postal Code',
    },
    defaultPaymentTerms: 'Payment due within Net 30 days.',
    paymentMethods: ['bank'],
    plans: {
      starter: { amount: 25,  display: 'CA$25'  },
      growth:  { amount: 65,  display: 'CA$65'  },
      pro:     { amount: 129, display: 'CA$129' },
    },
  },

};

/** All supported countries as an array for <select> dropdowns */
export const COUNTRY_OPTIONS = Object.values(LOCALE_MAP).map(l => ({
  value:   l.country,
  code:    l.countryCode,
  label:   l.country,
}));

/** Get locale by ISO country code. Falls back to IN. */
export function getLocale(countryCode) {
  return LOCALE_MAP[countryCode?.toUpperCase()] || LOCALE_MAP['IN'];
}

/** Get locale by full country name. Falls back to IN. */
export function getLocaleByCountryName(countryName) {
  if (!countryName) return LOCALE_MAP['IN'];
  const match = Object.values(LOCALE_MAP).find(
    l => l.country.toLowerCase() === countryName.toLowerCase()
  );
  return match || LOCALE_MAP['IN'];
}

/**
 * Format a currency amount for display.
 * Uses browser Intl API — same as backend.
 */
export function formatCurrency(amount, countryCode) {
  const lc = getLocale(countryCode);
  return new Intl.NumberFormat(lc.locale, {
    style:                 'currency',
    currency:              lc.currency,
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

/**
 * Format a date for display.
 */
export function formatDate(date, countryCode) {
  if (!date) return '—';
  const lc = getLocale(countryCode);
  return new Date(date).toLocaleDateString(lc.locale, {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

/**
 * Get/set the active locale in localStorage.
 * Set on login/settings-save; read by all pages.
 */
export function getActiveLocale() {
  const code = localStorage.getItem('countryCode') || 'IN';
  return getLocale(code);
}

export function setActiveLocale(countryCode) {
  const lc = getLocale(countryCode);
  localStorage.setItem('countryCode',      lc.countryCode);
  localStorage.setItem('currency',         lc.currency);
  localStorage.setItem('currencySymbol',   lc.currencySymbol);
  localStorage.setItem('localeStr',        lc.locale);
  return lc;
}