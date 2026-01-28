const SAFE_IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_-]*$/;

export function isSafeIdentifier(value) {
  return typeof value === 'string' && SAFE_IDENTIFIER.test(value);
}

export function quoteIdent(value) {
  if (!isSafeIdentifier(value)) {
    throw new Error('Invalid identifier');
  }
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}
