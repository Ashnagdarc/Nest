/**
 * Core Utility Functions
 * 
 * This module provides essential utility functions used throughout the Nest by Eden Oasis
 * application. These utilities handle common operations like CSS class merging, ensuring
 * consistent styling and preventing class conflicts.
 * 
 * @fileoverview Core utility functions for the asset management system
 * @author Daniel Chinonso Samuel
 * @version 1.0.0
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines and merges CSS class names intelligently
 * 
 * This utility function combines multiple CSS class inputs and resolves any
 * Tailwind CSS conflicts by using twMerge. It's essential for dynamic styling
 * throughout the application, especially when combining conditional classes
 * with base component styles.
 * 
 * @function cn
 * @param {...ClassValue[]} inputs - Variable number of class name inputs (strings, objects, arrays)
 * @returns {string} Merged and optimized CSS class string
 * 
 * @example
 * ```typescript
 * // Basic usage
 * cn("bg-blue-500", "text-white")
 * // Result: "bg-blue-500 text-white"
 * 
 * // Conditional classes
 * cn("base-class", isActive && "active-class", { "error": hasError })
 * // Result: "base-class active-class" (if isActive is true)
 * 
 * // Tailwind conflict resolution
 * cn("bg-red-500", "bg-blue-500")
 * // Result: "bg-blue-500" (later class wins)
 * ```
 * 
 * @see {@link https://github.com/dcastil/tailwind-merge} - twMerge documentation
 * @see {@link https://github.com/lukeed/clsx} - clsx documentation
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
