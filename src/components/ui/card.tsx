/**
 * Card Component Family - Content Container System
 * 
 * A collection of composable card components that provide consistent content
 * organization throughout the Nest by Eden Oasis application. These components
 * follow the compound component pattern for maximum flexibility and reusability.
 * 
 * Component Family:
 * - Card: Root container with elevation and border styling
 * - CardHeader: Top section for titles and metadata
 * - CardTitle: Primary heading with consistent typography
 * - CardDescription: Secondary text for additional context
 * - CardContent: Main content area with proper spacing
 * - CardFooter: Bottom section for actions and navigation
 * 
 * Design Features:
 * - Consistent elevation and shadow system
 * - Responsive spacing and typography
 * - Automatic dark/light theme support
 * - Accessible semantic structure
 * - Flexible composition patterns
 * 
 * Common Use Cases:
 * - Dashboard statistics and metrics
 * - Equipment/asset information display
 * - User profile and settings sections
 * - Form containers and modal content
 * - List items and data presentation
 * 
 * @fileoverview Composable card component system for content organization
 * @author Daniel Chinonso Samuel
 * @version 1.0.0
 * @since 2024-01-15
 */

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Card - Root Container Component
 * 
 * The foundational container that provides elevation, borders, and background
 * styling. All other card components should be composed within this container
 * to maintain consistent visual hierarchy and spacing.
 * 
 * Visual Features:
 * - Subtle border and shadow for elevation
 * - Rounded corners for modern appearance
 * - Background color that adapts to theme
 * - Responsive padding and margin handling
 * 
 * Accessibility Features:
 * - Proper semantic structure as article/section container
 * - Maintains focus outline when interactive
 * - Color contrast compliant backgrounds
 * - Screen reader friendly structure
 * 
 * @component
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Standard div element props
 * @param {React.Ref<HTMLDivElement>} ref - Forwarded ref for the card container
 * @returns {JSX.Element} Styled card container
 * 
 * @example
 * ```tsx
 * // Basic card with content
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Equipment Status</CardTitle>
 *     <CardDescription>Current asset availability</CardDescription>
 *   </CardHeader>
 *   <CardContent>
 *     <p>25 items available for checkout</p>
 *   </CardContent>
 * </Card>
 * 
 * // Interactive card with click handler
 * <Card className="cursor-pointer hover:shadow-md transition-shadow">
 *   <CardContent className="p-6">
 *     <h3>Click to view details</h3>
 *   </CardContent>
 * </Card>
 * ```
 */
const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border bg-card text-card-foreground shadow",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

/**
 * CardHeader - Header Section Component
 * 
 * Provides the top section of a card, typically containing titles, descriptions,
 * and metadata. Implements consistent spacing and typography hierarchy for
 * all card headers throughout the application.
 * 
 * Layout Features:
 * - Consistent top padding and spacing
 * - Flexible content arrangement
 * - Proper semantic heading structure
 * - Responsive typography scaling
 * 
 * @component
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Standard div element props
 * @param {React.Ref<HTMLDivElement>} ref - Forwarded ref for the header element
 * @returns {JSX.Element} Styled card header section
 * 
 * @example
 * ```tsx
 * // Standard header with title and description
 * <CardHeader>
 *   <CardTitle>Recent Activity</CardTitle>
 *   <CardDescription>Your latest equipment requests</CardDescription>
 * </CardHeader>
 * 
 * // Header with custom actions
 * <CardHeader className="flex flex-row items-center justify-between">
 *   <div>
 *     <CardTitle>Settings</CardTitle>
 *     <CardDescription>Manage your preferences</CardDescription>
 *   </div>
 *   <Button variant="outline" size="sm">Edit</Button>
 * </CardHeader>
 * ```
 */
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
))
CardHeader.displayName = "CardHeader"

/**
 * CardTitle - Primary Heading Component
 * 
 * The main heading for card content with consistent typography and semantic
 * structure. Automatically provides proper heading hierarchy and styling
 * that adapts to different card contexts and themes.
 * 
 * Typography Features:
 * - Semantic heading element (h3) for accessibility
 * - Consistent font weight and sizing
 * - Proper line height for readability
 * - Theme-aware color inheritance
 * 
 * @component
 * @param {React.HTMLAttributes<HTMLHeadingElement>} props - Standard h3 element props
 * @param {React.Ref<HTMLParagraphElement>} ref - Forwarded ref for the heading element
 * @returns {JSX.Element} Styled card title heading
 * 
 * @example
 * ```tsx
 * // Simple title
 * <CardTitle>Equipment Overview</CardTitle>
 * 
 * // Title with custom styling
 * <CardTitle className="text-xl text-blue-600">
 *   Critical Alerts
 * </CardTitle>
 * 
 * // Title with icon
 * <CardTitle className="flex items-center gap-2">
 *   <AlertTriangle className="h-5 w-5" />
 *   Overdue Items
 * </CardTitle>
 * ```
 */
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

/**
 * CardDescription - Secondary Text Component
 * 
 * Provides secondary text content for additional context, explanations,
 * or metadata. Uses muted colors and smaller typography to create proper
 * visual hierarchy without competing with the main title.
 * 
 * Typography Features:
 * - Muted text color for visual hierarchy
 * - Smaller font size for secondary content
 * - Optimized line height for readability
 * - Semantic paragraph structure
 * 
 * @component
 * @param {React.HTMLAttributes<HTMLParagraphElement>} props - Standard p element props
 * @param {React.Ref<HTMLParagraphElement>} ref - Forwarded ref for the paragraph element
 * @returns {JSX.Element} Styled card description text
 * 
 * @example
 * ```tsx
 * // Basic description
 * <CardDescription>
 *   View and manage all your active equipment requests
 * </CardDescription>
 * 
 * // Description with formatting
 * <CardDescription className="text-right">
 *   Last updated: {formatDate(lastUpdate)}
 * </CardDescription>
 * 
 * // Multi-line description
 * <CardDescription>
 *   This section shows real-time statistics about equipment usage.
 *   Data is updated every 5 minutes.
 * </CardDescription>
 * ```
 */
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
))
CardDescription.displayName = "CardDescription"

/**
 * CardContent - Main Content Area Component
 * 
 * The primary content area of the card with consistent padding and spacing.
 * This is where the main information, forms, lists, or other primary content
 * should be placed. Provides flexible layout options for various content types.
 * 
 * Layout Features:
 * - Consistent padding for content alignment
 * - Flexible container for any content type
 * - Proper spacing from header and footer
 * - Responsive padding adjustments
 * 
 * @component
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Standard div element props
 * @param {React.Ref<HTMLDivElement>} ref - Forwarded ref for the content container
 * @returns {JSX.Element} Styled card content area
 * 
 * @example
 * ```tsx
 * // Simple content area
 * <CardContent>
 *   <p>Your equipment request has been approved.</p>
 * </CardContent>
 * 
 * // Content with form elements
 * <CardContent className="space-y-4">
 *   <Input placeholder="Search equipment..." />
 *   <Button className="w-full">Search</Button>
 * </CardContent>
 * 
 * // Content with custom padding
 * <CardContent className="p-4">
 *   <div className="grid grid-cols-2 gap-4">
 *     <Stat label="Available" value="12" />
 *     <Stat label="In Use" value="8" />
 *   </div>
 * </CardContent>
 * ```
 */
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

/**
 * CardFooter - Footer Section Component
 * 
 * The bottom section of the card, typically used for actions, navigation,
 * or additional metadata. Provides consistent spacing and alignment for
 * footer content across all card implementations.
 * 
 * Layout Features:
 * - Consistent bottom padding and spacing
 * - Flexible arrangement for buttons and links
 * - Proper separation from main content
 * - Support for multiple action patterns
 * 
 * @component
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Standard div element props
 * @param {React.Ref<HTMLDivElement>} ref - Forwarded ref for the footer element
 * @returns {JSX.Element} Styled card footer section
 * 
 * @example
 * ```tsx
 * // Footer with action buttons
 * <CardFooter className="flex justify-between">
 *   <Button variant="outline">Cancel</Button>
 *   <Button>Submit Request</Button>
 * </CardFooter>
 * 
 * // Footer with single action
 * <CardFooter>
 *   <Button className="w-full">View All Equipment</Button>
 * </CardFooter>
 * 
 * // Footer with metadata
 * <CardFooter className="text-sm text-muted-foreground">
 *   Created on {formatDate(createdAt)}
 * </CardFooter>
 * ```
 */
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
