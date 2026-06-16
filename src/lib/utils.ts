/**
 * @module CoreUtils
 * @description Essential shared utilities for styling and UI logic.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Efficiently merges Tailwind CSS classes using clsx and tailwind-merge.
 * Handles conditional classes and ensures no style conflicts.
 * 
 * @function cn
 * @param {...ClassValue[]} inputs - Variadic list of class names or conditional objects
 * @returns {string} The optimized class string
 * 
 * @example
 * cn("p-4", isActive && "bg-blue-500", customClass)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
