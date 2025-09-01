/**
 * Button Component - Core Interactive Element
 * 
 * A versatile, accessible button component built on top of Radix UI's Slot primitive.
 * This component serves as the foundation for all interactive buttons throughout the
 * Nest by Eden Oasis application, providing consistent styling, behavior, and accessibility.
 * 
 * Updated to follow Apple's Human Interface Guidelines for minimal, clean design
 * 
 * Key Features:
 * - Multiple visual variants (default, destructive, outline, secondary, ghost, link)
 * - Flexible sizing options (default, small, large, icon)
 * - Full accessibility support with ARIA attributes
 * - Loading states and disabled functionality
 * - Consistent hover and focus interactions
 * - Support for both button elements and clickable slots
 * 
 * Design System Integration:
 * - Uses CSS variables for consistent theming
 * - Follows Apple HIG design patterns
 * - Supports light/dark mode automatically
 * - Consistent with Tailwind CSS utility classes
 * 
 * Accessibility Features:
 * - Proper focus management and keyboard navigation
 * - Screen reader support with semantic HTML
 * - High contrast ratios for visibility
 * - Touch-friendly sizing for mobile devices
 * 
 * @fileoverview Core button component with comprehensive variant and accessibility support
 * @author Daniel Chinonso Samuel
 * @version 1.1.0
 * @since 2024-01-15
 */

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Button Variant Configuration
 * 
 * Defines all available button styles using class-variance-authority (CVA).
 * This configuration ensures consistent styling across all button instances
 * while providing flexibility for different use cases.
 * 
 * Updated to follow Apple's Human Interface Guidelines
 * 
 * Variants:
 * - default: Primary action button with Apple Blue colors
 * - destructive: For dangerous actions (delete, remove, etc.)
 * - outline: Secondary actions with subtle border styling
 * - secondary: Subtle actions with muted background
 * - ghost: Minimal styling for tertiary actions
 * - link: Text-only button that looks like a link
 * 
 * Sizes:
 * - default: Standard button size for most use cases
 * - sm: Compact button for tight spaces
 * - lg: Prominent button for primary actions
 * - icon: Square button optimized for icon-only content
 * 
 * @constant {VariantPropsFunction} buttonVariants - CVA configuration function
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all motion-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      /**
       * Visual Variant Styles
       * 
       * Each variant is designed for specific use cases and provides
       * appropriate visual hierarchy and user expectations.
       * Updated to follow Apple's design principles
       */
      variant: {
        /** Primary action button - Apple Blue styling */
        default: "bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/85 shadow-sm hover:shadow-md active:shadow",
        /** Destructive actions - red/danger styling for warnings */
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/85 shadow-sm hover:shadow-md active:shadow",
        /** Secondary actions - subtle border with background on hover */
        outline:
          "border border-border/60 bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/90 hover:border-border/80",
        /** Muted secondary actions - subtle background styling */
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/75 shadow-sm hover:shadow-md active:shadow",
        /** Minimal tertiary actions - transparent with hover background */
        ghost: "hover:bg-accent active:bg-accent/90 hover:text-accent-foreground",
        /** Text-only actions - styled like links */
        link: "text-primary underline-offset-4 hover:underline",
      },
      /**
       * Size Variant Styles
       * 
       * Different sizes for various contexts and importance levels.
       * All sizes maintain proper touch targets for accessibility.
       * Updated with Apple-style spacing
       */
      size: {
        /** Standard size for most buttons - 44px height minimum (Apple HIG) */
        default: "h-11 px-6 py-3",
        /** Compact size for dense interfaces - 36px height minimum */
        sm: "h-9 rounded-lg px-4 py-2",
        /** Prominent size for primary actions - 48px height */
        lg: "h-12 rounded-xl px-8 py-4 text-base",
        /** Square button optimized for icon-only content */
        icon: "h-11 w-11 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

/**
 * Button Component Props Interface
 * 
 * Extends HTML button attributes with additional component-specific props.
 * Uses VariantProps to include all CVA variant options with type safety.
 * 
 * @interface ButtonProps
 * @extends React.ButtonHTMLAttributes<HTMLButtonElement>
 * @extends VariantProps<typeof buttonVariants>
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  /** 
   * When true, renders as a Slot component allowing the button 
   * to merge with child elements instead of rendering its own DOM node.
   * Useful for creating custom button-like components.
   */
  asChild?: boolean
  loading?: boolean
}

/**
 * Button Component
 * 
 * The core button component used throughout the Nest by Eden Oasis application.
 * Provides consistent styling, accessibility, and interaction patterns for all
 * clickable actions in the interface.
 * 
 * Component Behavior:
 * - Automatically handles focus states and keyboard navigation
 * - Supports disabled states with proper visual feedback
 * - Maintains aspect ratios and spacing consistency
 * - Integrates seamlessly with form validation
 * - Provides hover and active state feedback
 * 
 * Performance Considerations:
 * - Uses React.forwardRef for proper ref handling
 * - Minimal re-renders through prop spreading
 * - CSS-based animations for smooth interactions
 * - Optimized class generation with CVA
 * 
 * @component
 * @param {ButtonProps} props - Component props including variant, size, and HTML attributes
 * @param {React.Ref<HTMLButtonElement>} ref - Forwarded ref for the button element
 * @returns {JSX.Element} Styled button or Slot component
 * 
 * @example
 * ```tsx
 * // Primary action button
 * <Button onClick={handleSubmit}>
 *   Submit Request
 * </Button>
 * 
 * // Destructive action with confirmation
 * <Button variant="destructive" onClick={handleDelete}>
 *   Delete Item
 * </Button>
 * 
 * // Secondary action with custom styling
 * <Button variant="outline" size="sm" className="ml-2">
 *   Cancel
 * </Button>
 * 
 * // Icon-only button
 * <Button variant="ghost" size="icon">
 *   <Settings className="h-4 w-4" />
 * </Button>
 * 
 * // Link-style button for navigation
 * <Button variant="link" asChild>
 *   <Link href="/dashboard">Go to Dashboard</Link>
 * </Button>
 * 
 * // Loading state with disabled interaction
 * <Button disabled={isLoading}>
 *   {isLoading ? (
 *     <>
 *       <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 *       Processing...
 *     </>
 *   ) : (
 *     'Submit'
 *   )}
 * </Button>
 * ```
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    if (asChild && (!React.isValidElement(children) || React.Children.count(children) !== 1)) {
      if (process.env.NODE_ENV !== "production") {
        console.error(
          "[Button] When using asChild, you must pass exactly one valid React element as a child."
        );
      }
      throw new Error(
        "[Button] When using asChild, you must pass exactly one valid React element as a child."
      );
    }
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="animate-spin mr-2" />}
            {children}
          </>
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
