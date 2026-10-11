// Template expansion for dynamic snippet tokens.
//
// Auto tokens (resolved from the current date/time):
//   {{date}}                 -> 2026-10-11
//   {{date:yyyy/MM/dd}}      -> 2026/10/11
//   {{time:HH:mm}}           -> 14:07
//   {{datetime}}             -> 2026-10-11 14:07:03
//   {{date:iso|unix|timestamp}}
//
// Prompt tokens (filled in by the user through a form before the snippet is used):
//   {{ask:Topic}}            -> prompts for "Topic"
//   {{ask:Env=staging}}      -> prompts for "Env", prefilled with "staging"
//
// Expansion happens at action time (copy / paste / type) so tokens always reflect
// the moment the snippet is used. Unknown tokens are left untouched, and a token can
// be escaped with a leading backslash (\{{date}}) to emit it literally.

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const pad = (value: number, length = 2): string => String(value).padStart(length, "0");

// Longest symbols must come first so the regex prefers e.g. "MMMM" over "MM".
const DATE_TOKEN_REGEX = /yyyy|yy|MMMM|MMM|MM|M|dd|d|HH|H|mm|m|ss|s|EEEE|EEE|a/g;

/**
 * Format a Date using BTT/date-fns style symbols (local time).
 * Supported: yyyy yy MM M MMM MMMM dd d HH H mm m ss s EEE EEEE a
 */
export function formatDate(date: Date, pattern: string): string {
  const replacements: { [symbol: string]: () => string } = {
    yyyy: () => String(date.getFullYear()),
    yy: () => pad(date.getFullYear() % 100),
    MMMM: () => MONTHS_LONG[date.getMonth()],
    MMM: () => MONTHS_SHORT[date.getMonth()],
    MM: () => pad(date.getMonth() + 1),
    M: () => String(date.getMonth() + 1),
    dd: () => pad(date.getDate()),
    d: () => String(date.getDate()),
    HH: () => pad(date.getHours()),
    H: () => String(date.getHours()),
    mm: () => pad(date.getMinutes()),
    m: () => String(date.getMinutes()),
    ss: () => pad(date.getSeconds()),
    s: () => String(date.getSeconds()),
    EEEE: () => DAYS_LONG[date.getDay()],
    EEE: () => DAYS_SHORT[date.getDay()],
    a: () => (date.getHours() < 12 ? "AM" : "PM"),
  };

  return pattern.replace(DATE_TOKEN_REGEX, (symbol) => {
    const replace = replacements[symbol];
    return replace ? replace() : symbol;
  });
}

export interface TemplatePrompt {
  label: string;
  defaultValue: string;
}

interface ExpandContext {
  now: Date;
  values: { [label: string]: string };
}

type TokenHandler = (context: ExpandContext, arg?: string) => string;

const DEFAULT_DATE_PATTERN = "yyyy-MM-dd";
const DEFAULT_TIME_PATTERN = "HH:mm:ss";
const DEFAULT_DATETIME_PATTERN = "yyyy-MM-dd HH:mm:ss";

function resolveSpec(now: Date, arg: string | undefined, defaultPattern: string): string {
  const spec = (arg ?? "").trim();
  if (!spec) {
    return formatDate(now, defaultPattern);
  }

  switch (spec.toLowerCase()) {
    case "iso":
      return now.toISOString();
    case "unix":
      return String(Math.floor(now.getTime() / 1000));
    case "timestamp":
      return String(now.getTime());
    default:
      return formatDate(now, spec);
  }
}

// Parse the argument of an {{ask:...}} token into a label and optional default.
// Syntax: "Label" or "Label=Default value".
function parseAskArg(arg?: string): TemplatePrompt {
  const raw = (arg ?? "").trim();
  const equalsIndex = raw.indexOf("=");
  if (equalsIndex === -1) {
    return { label: raw, defaultValue: "" };
  }
  return {
    label: raw.slice(0, equalsIndex).trim(),
    defaultValue: raw.slice(equalsIndex + 1),
  };
}

const HANDLERS: { [name: string]: TokenHandler } = {
  date: ({ now }, arg) => resolveSpec(now, arg, DEFAULT_DATE_PATTERN),
  time: ({ now }, arg) => resolveSpec(now, arg, DEFAULT_TIME_PATTERN),
  datetime: ({ now }, arg) => resolveSpec(now, arg, DEFAULT_DATETIME_PATTERN),
  ask: ({ values }, arg) => {
    const { label, defaultValue } = parseAskArg(arg);
    if (!label) {
      return "";
    }
    return Object.prototype.hasOwnProperty.call(values, label) ? values[label] : defaultValue;
  },
};

// A token is {{ name }} or {{ name:arg }}. The negative lookbehind skips escaped
// tokens (\{{ ... }}), which are later unescaped to a literal "{{".
const TOKEN_REGEX = /(?<!\\)\{\{\s*([a-zA-Z]+)\s*(?::\s*([^}]*?)\s*)?\}\}/g;
const ESCAPED_OPEN_REGEX = /\\\{\{/g;

export interface ExpandTemplateOptions {
  /** Reference date for auto tokens (defaults to now). All tokens in a call share it. */
  now?: Date;
  /** Values for {{ask:Label}} tokens, keyed by label. */
  values?: { [label: string]: string };
}

/**
 * Expand dynamic tokens in a snippet's content.
 */
export function expandTemplate(content: string, options: ExpandTemplateOptions = {}): string {
  if (!content) {
    return content;
  }

  const context: ExpandContext = {
    now: options.now ?? new Date(),
    values: options.values ?? {},
  };

  const expanded = content.replace(TOKEN_REGEX, (match, name: string, arg?: string) => {
    const handler = HANDLERS[name.toLowerCase()];
    return handler ? handler(context, arg) : match;
  });

  return expanded.replace(ESCAPED_OPEN_REGEX, "{{");
}

/**
 * Find all {{ask:Label}} prompts in content, de-duplicated by label and in order
 * of first appearance. Escaped tokens (\{{ask:...}}) are ignored.
 */
export function findTemplatePrompts(content: string): TemplatePrompt[] {
  if (!content) {
    return [];
  }

  const prompts: TemplatePrompt[] = [];
  const seen = new Set<string>();
  const regex = new RegExp(TOKEN_REGEX.source, "gi");

  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    if (match[1].toLowerCase() !== "ask") {
      continue;
    }
    const prompt = parseAskArg(match[2]);
    if (!prompt.label || seen.has(prompt.label)) {
      continue;
    }
    seen.add(prompt.label);
    prompts.push(prompt);
  }

  return prompts;
}

export default expandTemplate;
