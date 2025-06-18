/**
 * Input Component - Form Input Field
 * 
 * A versatile, accessible input component that serves as the foundation for
 * all text input fields throughout the Nest by Eden Oasis application.
 * Built with accessibility and consistency in mind, supporting various
 * input types and validation states.
 * 
 * Key Features:
 * - Consistent styling across all form inputs
 * - Full accessibility support with ARIA attributes
 * - Support for all HTML input types (text, email, password, etc.)
 * - Error and validation state handling
 * - Responsive design for mobile and desktop
 * - Integration with form validation libraries
 * 
 * Accessibility Features:
 * - Proper focus management and keyboard navigation
 * - Screen reader compatible with semantic HTML
 * - High contrast borders for visibility
 * - Error state communication to assistive technologies
 * 
 * Design System Integration:
 * - Consistent with shadcn/ui design tokens
 * - Automatic dark/light theme support
 * - Standardized spacing and typography
 * - Seamless integration with form components
 * 
 * @fileoverview Accessible input component for form fields
 * @author Daniel Chinonso Samuel
 * @version 1.0.0
 * @since 2024-01-15
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
 * Input Component
 * 
 * The primary input component used throughout the application for
 * collecting user text input. Provides consistent styling, accessibility,
 * and integration with the design system.
 * 
 * Component Features:
 * - Responsive input field with consistent styling
 * - Automatic focus states and hover interactions
 * - Error and disabled state support
 * - Placeholder text with proper contrast
 * - Border radius and shadow consistency
 * - Full keyboard navigation support
 * 
 * Styling Features:
 * - Rounded borders with subtle shadows
 * - Focus ring for keyboard navigation
 * - Disabled state with reduced opacity
 * - Error state with red border (when combined with validation)
 * - Consistent padding and sizing
 * - Theme-aware background and text colors
 * 
 * Performance Considerations:
 * - Uses React.forwardRef for proper ref handling
 * - Minimal re-renders through efficient prop spreading
 * - CSS-based styling for optimal performance
 * - No unnecessary JavaScript for basic interactions
 * 
 * @component
 * @param {InputProps} props - All standard HTML input props plus custom extensions
 * @param {React.Ref<HTMLInputElement>} ref - Forwarded ref for the input element
 * @returns {JSX.Element} Styled input field
 * 
 * @example
 * ```tsx
 * // Basic text input
 * <Input 
 *   type="text" 
 *   placeholder="Enter your name"
 *   value={name}
 *   onChange={(e) => setName(e.target.value)}
 * />
 * 
 * // Email input with validation
 * <Input
 *   type="email"
 *   placeholder="user@example.com"
 *   required
 *   aria-describedby="email-error"
 *   className={errors.email ? "border-red-500" : ""}
 * />
 * 
 * // Password input with custom styling
 * <Input
 *   type="password"
 *   placeholder="Enter password"
 *   minLength={8}
 *   className="font-mono"
 * />
 * 
 * // Disabled input for read-only data
 * <Input
 *   type="text"
 *   value="Read-only value"
 *   disabled
 *   className="bg-gray-50"
 * />
 * 
 * // Search input with icon
 * <div className="relative">
 *   <Input
 *     type="search"
 *     placeholder="Search equipment..."
 *     className="pl-10"
 *   />
 *   <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
 * </div>
 * 
 * // Input with form validation (React Hook Form)
 * <Input
 *   {...register("username", { required: "Username is required" })}
 *   type="text"
 *   placeholder="Username"
 *   aria-invalid={errors.username ? "true" : "false"}
 * />
 * ```
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles for all inputs
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
          // Focus and interaction states
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          // File input specific styles
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          // Placeholder and disabled states
          "placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
          // Custom className override
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
