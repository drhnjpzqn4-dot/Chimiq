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

// Common English connector words that signal "this is prose, not an ingredient list".
const PROSE_STOP_WORDS = new Set([
  "the", "and", "is", "are", "was", "were", "this", "that", "these", "those",
  "with", "without", "from", "for", "have", "has", "had", "will", "would",
  "should", "could", "but", "because", "however", "therefore", "you", "your",
  "we", "our", "they", "them", "their", "it", "its", "as", "if", "then",
]);

export function sanitizeIngredients(raw: unknown, allowEmpty = false): string {
  // Convert one-per-line paste into a comma-separated list BEFORE the
  // generic sanitizer collapses all whitespace. Many product labels list
  // ingredients with newlines instead of commas; without this normalization
  // the "at least 3 ingredients" check would reject a legitimate paste.
  let normalized: unknown = raw;
  if (typeof raw === "string" && /\r|\n/.test(raw)) {
    normalized = raw
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((line) => line.trim().replace(/[,;\s]+$/g, ""))
      .filter((line) => line.length > 0)
      .join(", ");
  }
  const cleaned = sanitizeText(normalized, {
    fieldName: "Ingredient list",
    maxLength: 5000,
    minLength: allowEmpty ? undefined : 5,
    allowEmpty,
  });
  if (cleaned.length === 0) return cleaned;

  const letterRatio = (cleaned.match(/[a-zA-Z]/g) ?? []).length / cleaned.length;
  if (letterRatio < 0.4) {
    throw new SanitizationError(
      "Ingredient list looks invalid. Please paste the comma-separated INCI list from the product label.",
    );
  }

  // Split on commas OR newlines (real INCI lists use one or the other).
  const tokens = cleaned
    .split(/[,\n;]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (tokens.length < 3) {
    throw new SanitizationError(
      "Ingredient list must contain at least 3 ingredients separated by commas (e.g. 'Aqua, Glycerin, Niacinamide…').",
    );
  }

  // Each token should look like an ingredient name: short-to-medium length, mostly
  // letters/numbers/parens/hyphens, no full sentences. Allow up to 25% of tokens to
  // be unusual (CI numbers, blends, etc.) before flagging.
  let suspiciousTokens = 0;
  for (const tok of tokens) {
    const wordCount = tok.split(/\s+/).length;
    const looksTooLong = tok.length > 80 || wordCount > 8;
    const hasSentencePunct = /[.!?]{1,}\s+[A-Z]/.test(tok); // mid-token sentence break
    const tokenLetters = (tok.match(/[a-zA-Z]/g) ?? []).length;
    const tokenLetterRatio = tokenLetters / tok.length;
    if (looksTooLong || hasSentencePunct || tokenLetterRatio < 0.3) {
      suspiciousTokens += 1;
    }
  }
  if (suspiciousTokens > Math.max(1, Math.floor(tokens.length * 0.25))) {
    throw new SanitizationError(
      "That doesn't look like an ingredient list. Paste the comma-separated INCI list (e.g. 'Aqua, Glycerin, Niacinamide…').",
    );
  }

  // Reject obvious prose: too many English connector words across the whole text.
  const allWords = cleaned.toLowerCase().split(/\W+/).filter(Boolean);
  if (allWords.length >= 6) {
    const proseHits = allWords.filter((w) => PROSE_STOP_WORDS.has(w)).length;
    if (proseHits / allWords.length > 0.15) {
      throw new SanitizationError(
        "Ingredient list reads like a sentence. Please paste only the comma-separated INCI list from the product label.",
      );
    }
  }

  return cleaned;
}
