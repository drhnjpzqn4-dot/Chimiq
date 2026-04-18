const HTML_TAG_RE = /<\/?[a-z][\s\S]*?>/gi;
const SCRIPT_PATTERNS = [
  /<\s*script/i,
  /javascript\s*:/i,
  /\bon[a-z]+\s*=/i,
  /data\s*:\s*text\s*\/\s*html/i,
  /<\s*iframe/i,
  /<\s*object/i,
  /<\s*embed/i,
];
const SQL_INJECTION_PATTERNS = [
  /(\b(union\s+select|drop\s+table|insert\s+into|delete\s+from|update\s+\w+\s+set|alter\s+table|create\s+table|truncate\s+table)\b)/i,
  /(--|;\s*--|\/\*|\*\/)/,
  /\bxp_cmdshell\b/i,
];

export class SanitizationError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
    this.name = "SanitizationError";
  }
}

export interface SanitizeOptions {
  fieldName: string;
  maxLength: number;
  minLength?: number;
  allowEmpty?: boolean;
}

function stripHtml(input: string): string {
  return input.replace(HTML_TAG_RE, " ").replace(/&lt;|&gt;|&quot;|&#x27;|&amp;/gi, " ");
}

function detectMalicious(input: string): string | null {
  for (const re of SCRIPT_PATTERNS) {
    if (re.test(input)) return "contains script-like content";
  }
  for (const re of SQL_INJECTION_PATTERNS) {
    if (re.test(input)) return "contains code-like patterns";
  }
  return null;
}

export function sanitizeText(raw: unknown, opts: SanitizeOptions): string {
  if (raw === undefined || raw === null) {
    if (opts.allowEmpty) return "";
    throw new SanitizationError(`${opts.fieldName} is required.`);
  }
  if (typeof raw !== "string") {
    throw new SanitizationError(`${opts.fieldName} must be text.`);
  }

  const malicious = detectMalicious(raw);
  if (malicious) {
    throw new SanitizationError(
      `${opts.fieldName} ${malicious}. Please remove HTML, scripts, or code and submit only product information.`,
    );
  }

  const stripped = stripHtml(raw).replace(/\s+/g, " ").trim();

  if (!opts.allowEmpty && stripped.length === 0) {
    throw new SanitizationError(`${opts.fieldName} is required.`);
  }
  if (opts.minLength !== undefined && stripped.length > 0 && stripped.length < opts.minLength) {
    throw new SanitizationError(`${opts.fieldName} is too short.`);
  }
  if (stripped.length > opts.maxLength) {
    throw new SanitizationError(
      `${opts.fieldName} is too long (max ${opts.maxLength} characters).`,
    );
  }
  return stripped;
}

export function sanitizeProductName(raw: unknown, allowEmpty = false): string {
  return sanitizeText(raw, { fieldName: "Product name", maxLength: 200, allowEmpty });
}

export function sanitizeBrand(raw: unknown, allowEmpty = true): string {
  return sanitizeText(raw, { fieldName: "Brand", maxLength: 200, allowEmpty });
}

export function sanitizeIngredients(raw: unknown, allowEmpty = false): string {
  const cleaned = sanitizeText(raw, {
    fieldName: "Ingredient list",
    maxLength: 5000,
    minLength: allowEmpty ? undefined : 5,
    allowEmpty,
  });
  if (cleaned.length === 0) return cleaned;
  // Heuristic: must look like an ingredient list (has commas or newlines, mostly letters)
  const letters = (cleaned.match(/[a-zA-Z]/g) ?? []).length;
  if (letters < cleaned.length * 0.4) {
    throw new SanitizationError(
      "Ingredient list looks invalid. Please paste a comma-separated INCI list.",
    );
  }
  return cleaned;
}
