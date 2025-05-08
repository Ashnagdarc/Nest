"use client";

import dynamic from 'next/dynamic';

// Use dynamic import to avoid potential bundling issues
const HamburgerDynamic = dynamic(
    () => import('hamburger-react').then((mod) => mod.default),
    { ssr: false, loading: () => <div className="w-5 h-5" /> }
);

interface CustomHamburgerProps {
    size?: number;
    direction?: "left" | "right";
    toggled?: boolean;
    toggle?: () => void;
}

export default function CustomHamburger({
    size = 20,
    direction = "right",
    toggled,
    toggle
}: CustomHamburgerProps) {
    return (
        <HamburgerDynamic
            size={size}
            direction={direction}
            toggled={toggled}
            toggle={toggle}
        />
    );
} 