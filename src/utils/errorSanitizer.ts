/**
 * Universal Error Sanitizer for DataFlow / MediaFlow Studio
 * 
 * Prevents raw exceptions, system paths, stack traces, and internal module names
 * from ever reaching the user in production toasts, modals, or banners.
 */

// Regex patterns to detect sensitive or internal system information
const PATH_PATTERN_WIN = /[a-zA-Z]:\\[\w.\- \\/]+/g;
const PATH_PATTERN_POSIX = /(?:\/[\w.\-]+){2,}/g;
const STACK_LINE_PATTERN = /\s+at\s+[\w.<>$]+\s+\([^)]+\)|\s+at\s+[^\n]+/g;
const PYTHON_TRACEBACK_PATTERN = /Traceback \(most recent call last\):[\s\S]+/i;
const PYTHON_FILE_LINE_PATTERN = /File\s+["'][^"']+["'],\s+line\s+\d+[^,\n]*/gi;

/**
 * Strips raw filesystem paths, stack frames, and Python tracebacks from any error string.
 */
export function stripSensitiveErrorDetails(rawMessage: string): string {
  if (!rawMessage || typeof rawMessage !== 'string') return '';

  let cleaned = rawMessage
    .replace(PYTHON_TRACEBACK_PATTERN, '')
    .replace(PYTHON_FILE_LINE_PATTERN, '')
    .replace(STACK_LINE_PATTERN, '')
    .replace(PATH_PATTERN_WIN, '[folder]')
    .replace(PATH_PATTERN_POSIX, '[folder]')
    .trim();

  // Remove leading "Error:" or "Uncaught (in promise)" prefixes
  cleaned = cleaned.replace(/^(?:Error:\s*|Uncaught\s*(?:\(in promise\))?:\s*)+/i, '');

  return cleaned.trim();
}

/**
 * Transforms an unknown error into a clean, human-readable message.
 *
 * @param error The caught error (Error object, string, or unknown)
 * @param fallbackMessage Contextual fallback message to use if error is low-level or unknown
 * @returns Clean, user-friendly error string with zero paths, stacks, or OS codes.
 */
export function toUserErrorMessage(error: unknown, fallbackMessage: string = 'An unexpected error occurred. Please try again.'): string {
  // Always log full technical details to dev console for internal diagnosis
  if (typeof console !== 'undefined' && console.error) {
    console.error('[Internal Technical Error]:', error);
  }

  if (!error) {
    return fallbackMessage;
  }

  const rawMessage =
    typeof error === 'string'
      ? error
      : (error as any)?.message || (error as any)?.error || String(error);

  const lower = rawMessage.toLowerCase();

  // 1. Permission / Access Denied
  if (
    lower.includes('eacces') ||
    lower.includes('eperm') ||
    lower.includes('permission denied') ||
    lower.includes('operation not permitted') ||
    lower.includes('access is denied')
  ) {
    return 'Access was denied. Please check folder permissions and try again.';
  }

  // 2. Resource Busy / Locked
  if (
    lower.includes('ebusy') ||
    lower.includes('resource locked') ||
    lower.includes('locked by another') ||
    lower.includes('used by another process')
  ) {
    return 'The file or folder is currently in use by another program. Please close any open files and retry.';
  }

  // 3. File or Directory Not Found
  if (
    lower.includes('enoent') ||
    lower.includes('no such file') ||
    lower.includes('does not exist') ||
    lower.includes('not found') ||
    lower.includes('cannot find the file')
  ) {
    return 'The specified file or folder could not be found. Please check that the directory still exists.';
  }

  // 4. Insufficient Storage / Disk Space
  if (
    lower.includes('enospc') ||
    lower.includes('disk full') ||
    lower.includes('not enough space') ||
    lower.includes('insufficient storage')
  ) {
    return 'There is not enough disk space on the target drive to complete this operation.';
  }

  // 5. Folder Already Exists / Conflict
  if (
    lower.includes('eexist') ||
    lower.includes('already exists') ||
    lower.includes('file exists')
  ) {
    return 'A folder or file with this name already exists in the destination.';
  }

  // 6. Network / Connectivity Timeout
  if (
    lower.includes('econnrefused') ||
    lower.includes('etimedout') ||
    lower.includes('enotfound') ||
    lower.includes('network error') ||
    lower.includes('internet disconnected')
  ) {
    return 'Unable to establish network connection. Please check your internet connectivity.';
  }

  // 7. Excel / Workbook Parsing
  if (
    lower.includes('openpyxl') ||
    lower.includes('excel') ||
    lower.includes('workbook') ||
    lower.includes('bad zip file') ||
    lower.includes('corrupted')
  ) {
    return 'Unable to process the Excel workbook. Please verify the spreadsheet format and ensure it is not corrupted.';
  }

  // 8. Cross-Device / Drive Move
  if (lower.includes('exdev') || lower.includes('cross-device')) {
    return 'Cross-drive file relocation encountered an error. Please verify both drive connections.';
  }

  // 9. If the message is already short, clean, and contains NO paths, codes, or traces, return it safely
  const cleaned = stripSensitiveErrorDetails(rawMessage);
  if (
    cleaned &&
    cleaned.length > 5 &&
    cleaned.length < 140 &&
    !cleaned.includes('[folder]') &&
    !lower.includes('traceback') &&
    !lower.includes('node:') &&
    !lower.includes('python') &&
    !lower.includes('exit code') &&
    !lower.includes('failed to parse')
  ) {
    return cleaned;
  }

  // Default to the contextual human-readable fallback
  return fallbackMessage;
}
