/**
 * Browser-safe utilities for SSR compatibility
 * These utilities safely check for browser APIs that aren't available during server-side rendering
 */

/**
 * Safely check if a value is a FileList instance
 * Only works in browser environment
 */
export function isFileList(value: any): value is FileList {
    if (typeof window === 'undefined') return false;
    return value instanceof FileList;
}

/**
 * Safely check if a value is a File instance
 * Only works in browser environment
 */
export function isFile(value: any): value is File {
    if (typeof window === 'undefined') return false;
    return value instanceof File;
}

/**
 * Safely check if a value is either FileList or File
 * Only works in browser environment
 */
export function isFileOrFileList(value: any): value is File | FileList {
    return isFile(value) || isFileList(value);
}

/**
 * Safely get the first file from a FileList or File
 * Returns undefined if not in browser or no file available
 */
export function getFirstFile(value: File | FileList | undefined): File | undefined {
    if (!value) return undefined;
    if (isFile(value)) return value;
    if (isFileList(value) && value.length > 0) return value[0];
    return undefined;
}
