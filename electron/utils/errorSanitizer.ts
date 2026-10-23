/**
 * Backend Error Sanitizer for Electron Engines
 * 
 * Ensures that errors thrown across IPC or stored in reports do not contain
 * sensitive local user paths, stack traces, or low-level OS internals.
 */

const PATH_PATTERN_WIN = /[a-zA-Z]:\\[\w.\- \\/]+/g;
const PATH_PATTERN_POSIX = /(?:\/[\w.\-]+){2,}/g;

export function sanitizeBackendError(err: unknown, fallbackMessage: string = 'Operation could not be completed'): string {
  if (!err) return fallbackMessage;

  const rawMessage = typeof err === 'string' ? err : (err as any)?.message || String(err);
  const lower = rawMessage.toLowerCase();

  if (lower.includes('eacces') || lower.includes('eperm') || lower.includes('permission denied')) {
    return 'Permission denied. Please check your folder read/write permissions.';
  }

  if (lower.includes('ebusy') || lower.includes('resource locked') || lower.includes('locked')) {
    return 'The target file or folder is currently locked by another application.';
  }

  if (lower.includes('enoent') || lower.includes('no such file') || lower.includes('does not exist')) {
    return 'The specified directory or file was not found.';
  }

  if (lower.includes('enospc') || lower.includes('disk full') || lower.includes('insufficient storage')) {
    return 'Not enough free disk space on target drive.';
  }

  if (lower.includes('eexist') || lower.includes('already exists')) {
    return 'An item with this name already exists at destination.';
  }

  // Strip file paths if present
  let safe = rawMessage
    .replace(PATH_PATTERN_WIN, '[folder]')
    .replace(PATH_PATTERN_POSIX, '[folder]')
    .replace(/^(?:Error:\s*)+/i, '')
    .trim();

  if (safe.length > 0 && safe.length < 120 && !safe.includes('[folder]')) {
    return safe;
  }

  return fallbackMessage;
}
