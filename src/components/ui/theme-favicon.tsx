'use client'

import { useEffect } from 'react'

export function Favicon() {

    useEffect(() => {
        const updateFavicon = () => {
            const faviconSrc = '/favicon.png'

            // Remove all existing favicon links
            const existingLinks = document.querySelectorAll("link[rel*='icon']")
            existingLinks.forEach(link => link.remove())

            // Create new favicon link
            const link = document.createElement('link')
            link.rel = 'icon'
            link.type = 'image/png'
            link.href = faviconSrc
            link.sizes = '64x64'

            // Add to head
            document.head.appendChild(link)

            // Force browser to reload favicon by adding timestamp
            const timestamp = new Date().getTime()
            link.href = `${faviconSrc}?v=${timestamp}`
        }

        updateFavicon()
    }, [])

    return null
}
