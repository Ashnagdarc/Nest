'use client'

import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

interface ThemeLogoProps {
    width?: number
    height?: number
    className?: string
    alt?: string
}

export function ThemeLogo({
    width = 32,
    height = 32,
    className = "",
    alt = "Nest Logo"
}: ThemeLogoProps) {
    const { theme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        // Return light logo as default during SSR
        return (
            <Image
                src="/Logo/Logo Light.png"
                alt={alt}
                width={width}
                height={height}
                className={className}
            />
        )
    }

    const isDark = resolvedTheme === 'dark'
    const logoSrc = isDark ? '/Logo/Logo Dark.png' : '/Logo/Logo Light.png'

    return (
        <Image
            src={logoSrc}
            alt={alt}
            width={width}
            height={height}
            className={className}
        />
    )
}
