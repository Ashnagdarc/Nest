'use client'

import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

interface ThemeLogoProps {
    width?: number
    height?: number
    className?: string
    alt?: string
    priority?: boolean
}

export function ThemeLogo({
    width = 32,
    height = 32,
    className = "",
    alt = "Nest Logo",
    priority = false
}: ThemeLogoProps) {
    const { resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Use standard Nest-logo.png for both since other assets were unavailable
    // This resolves 400 Bad Request errors locally and in production.
    const logoSrc = "/Nest-logo.png"

    if (!mounted) {
        return (
            <Image
                src={logoSrc}
                alt={alt}
                width={width}
                height={height}
                className={className}
                priority={priority}
            />
        )
    }

    return (
        <Image
            src={logoSrc}
            alt={alt}
            width={width}
            height={height}
            className={className}
            priority={priority}
        />
    )
}
