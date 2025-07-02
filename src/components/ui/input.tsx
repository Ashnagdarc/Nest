/**
 * Input Component - Consistent form input with styling and accessibility
 * 
 * @author Daniel Chinonso Samuel
 * @version 1.0.0
 */

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Input Component Props Interface
 * 
 * Extends all standard HTML input attributes while maintaining
 * full compatibility with React's typing system. This ensures
 * the component can be used as a drop-in replacement for
 * standard input elements with enhanced styling.
 * 
 * @interface InputProps
 * @extends React.InputHTMLAttributes<HTMLInputElement>
 */
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> { }

/**
 * Styled input component with consistent theming and accessibility features.
 * Supports all standard HTML input props and integrates with form validation.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)

// Set display name for better debugging and React DevTools integration
Input.displayName = "Input"

export { Input }
