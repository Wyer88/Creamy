const MAX_USERNAME_LENGTH = 32;

// Basic block list. Extend as needed for production deployments.
const BLOCKED_SUBSTRINGS = [
  'fuck',
  'shit',
  'bitch',
  'cunt',
  'nazi',
  'hitler',
  'kkk',
  'slave',
  'terrorist',
  'whore',
  'rape',
];

const normalizeForComparison = (value) => {
  const folded = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  return folded
    .toLowerCase()
    .replace(/[\s'._-]+/g, '')
    .replace(/[0-9]/g, '');
};

export const sanitizeUsernameInput = (value) => {
  if (!value) return '';
  const normalized = value.normalize('NFKC');
  const stripped = normalized.replace(/[^\p{L}\p{N}\s'._-]/gu, '');
  const collapsed = stripped.replace(/\s+/g, ' ').trimStart();
  return collapsed.slice(0, MAX_USERNAME_LENGTH);
};

export const containsBlockedLanguage = (value) => {
  if (!value) return false;
  const normal = normalizeForComparison(value);
  return BLOCKED_SUBSTRINGS.some((needle) => normal.includes(needle));
};

export const validateUsername = (rawValue) => {
  const sanitized = sanitizeUsernameInput(rawValue);
  if (!sanitized) {
    return {
      sanitized,
      error: null,
    };
  }
  if (containsBlockedLanguage(sanitized)) {
    return {
      sanitized,
      error: 'Please choose a more friendly username.',
    };
  }
  if (sanitized.trim().length < 2) {
    return {
      sanitized,
      error: 'Use at least 2 characters.',
    };
  }
  return {
    sanitized,
    error: null,
  };
};

export const MAX_USERNAME_CHARACTERS = MAX_USERNAME_LENGTH;
