/**
 * Card Component Family - Composable content containers
 * 
 * A collection of card components that follow the compound component pattern:
 * - Card: Root container with elevation and styling
 * - CardHeader: Top section for titles and metadata  
 * - CardTitle: Primary heading with semantic structure
 * - CardDescription: Secondary text for context
 * - CardContent: Main content area with consistent spacing
 * - CardFooter: Bottom section for actions
 * 
 * Updated to follow Apple's Human Interface Guidelines for minimal, clean design
 * 
 * @author Daniel Chinonso Samuel
 * @version 1.1.0
 */

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Root card container with Apple-style elevation and border styling
 */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl border border-border/50 bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-200",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

/**
 * Header section with Apple-style spacing and typography
 */
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-2 p-6", className)} {...props} />
))
CardHeader.displayName = "CardHeader"

/**
 * Primary heading with Apple-style semantic structure
 */
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-lg font-semibold leading-tight tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

/**
 * Secondary text for additional context with Apple-style typography
 */
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

/**
 * Main content area with Apple-style spacing
 */
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

/**
 * Footer section for actions and navigation with Apple-style spacing
 */
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
