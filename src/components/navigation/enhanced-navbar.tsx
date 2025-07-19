"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Menu,
    X,
    Home,
    Search,
    PlusSquare,
    ListChecks,
    UploadCloud,
    History,
    Bell,
    Settings,
    LogOut,
    User,
    Package,
    Calendar,
    ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme-toggle';
import { useUserProfile } from '@/components/providers/user-profile-provider';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface NavItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description?: string;
}

const userNavItems: NavItem[] = [
    {
        href: '/user/dashboard',
        label: 'Dashboard',
        icon: Home,
        description: 'Overview and statistics'
    },
    {
        href: '/user/browse',
        label: 'Browse Equipment',
        icon: Search,
        description: 'Find available gear'
    },
    {
        href: '/user/request',
        label: 'Request Gear',
        icon: PlusSquare,
        description: 'Submit new requests'
    },
    {
        href: '/user/my-requests',
        label: 'My Requests',
        icon: ListChecks,
        description: 'Track your requests'
    },
    {
        href: '/user/check-in',
        label: 'Check-in Gear',
        icon: UploadCloud,
        description: 'Return equipment'
    },
    {
        href: '/user/calendar',
        label: 'Calendar',
        icon: Calendar,
        description: 'View bookings'
    },
    {
        href: '/user/history',
        label: 'History',
        icon: History,
        description: 'Past activities'
    },
    {
        href: '/user/notifications',
        label: 'Notifications',
        icon: Bell,
        description: 'Stay updated'
    },
    {
        href: '/user/settings',
        label: 'Settings',
        icon: Settings,
        description: 'Account preferences'
    },
];

const adminNavItems: NavItem[] = [
    {
        href: '/admin/dashboard',
        label: 'Dashboard',
        icon: Home,
        description: 'Admin overview'
    },
    {
        href: '/admin/manage-gears',
        label: 'Manage Equipment',
        icon: Package,
        description: 'Equipment management'
    },
    {
        href: '/admin/manage-requests',
        label: 'Manage Requests',
        icon: ListChecks,
        description: 'Request approvals'
    },
    {
        href: '/admin/manage-checkins',
        label: 'Manage Check-ins',
        icon: UploadCloud,
        description: 'Return processing'
    },
    {
        href: '/admin/manage-users',
        label: 'Manage Users',
        icon: User,
        description: 'User management'
    },
    {
        href: '/admin/calendar',
        label: 'Calendar',
        icon: Calendar,
        description: 'Booking calendar'
    },
    {
        href: '/admin/announcements',
        label: 'Announcements',
        icon: Bell,
        description: 'System announcements'
    },
    {
        href: '/admin/reports',
        label: 'Reports',
        icon: History,
        description: 'Analytics & reports'
    },
    {
        href: '/admin/settings',
        label: 'Settings',
        icon: Settings,
        description: 'System settings'
    },
];

interface EnhancedNavbarProps {
    variant?: 'user' | 'admin';
    logoUrl?: string;
}

export default function EnhancedNavbar({
    variant = 'user',
    logoUrl = '/Nest-logo.png'
}: EnhancedNavbarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const { profile: currentUser } = useUserProfile();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    const navItems = variant === 'admin' ? adminNavItems : userNavItems;

    // Handle scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close menu when route changes
    useEffect(() => {
        setIsMenuOpen(false);
        setIsUserMenuOpen(false);
    }, [pathname]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMenuOpen]);

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            router.push('/login');
        } catch (error) {
            console.error("Logout error:", error);
        }
    };

    const getInitials = (name: string | null = "") =>
        name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';

    return (
        <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-background/95 backdrop-blur-xl border-b border-border/50' : 'bg-background'
            }`}>
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 sm:h-18">
                    {/* Logo/Brand */}
                    <Link href={variant === 'admin' ? '/admin/dashboard' : '/user/dashboard'}
                        className="flex items-center space-x-3 group">
                        <div className="relative">
                            <img
                                src={logoUrl}
                                alt="Nest Logo"
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-contain transition-transform group-hover:scale-105"
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-lg sm:text-xl bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
                                Nest
                            </span>
                            <span className="text-xs text-muted-foreground hidden sm:block">
                                {variant === 'admin' ? 'Admin Panel' : 'User Portal'}
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center space-x-1">
                        {navItems.slice(0, 6).map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-muted/50 ${pathname === item.href
                                    ? 'bg-primary/10 text-primary border border-primary/20'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <item.icon className="h-4 w-4" />
                                <span>{item.label}</span>
                            </Link>
                        ))}
                    </div>

                    {/* Desktop Right Section */}
                    <div className="hidden lg:flex items-center space-x-3">
                        <ThemeToggle />

                        {/* User Menu */}
                        <div className="relative">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="flex items-center space-x-2 h-10 px-3"
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                            >
                                <Avatar className="h-7 w-7">
                                    <AvatarImage
                                        src={currentUser?.avatar_url || `https://picsum.photos/seed/${currentUser?.email}/100/100`}
                                        alt={currentUser?.full_name || 'User'}
                                    />
                                    <AvatarFallback className="text-xs">
                                        {getInitials(currentUser?.full_name)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium hidden xl:block">
                                    {currentUser?.full_name || 'User'}
                                </span>
                                <ChevronDown className="h-4 w-4 transition-transform duration-200" />
                            </Button>

                            <AnimatePresence>
                                {isUserMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                        transition={{ duration: 0.2 }}
                                        className="absolute right-0 top-full mt-2 w-64 bg-background border border-border rounded-lg shadow-lg p-2"
                                    >
                                        <div className="p-3 border-b border-border/50">
                                            <p className="font-medium text-sm">{currentUser?.full_name || 'User'}</p>
                                            <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
                                        </div>
                                        <div className="p-2 space-y-1">
                                            {navItems.slice(6).map((item) => (
                                                <Link
                                                    key={item.href}
                                                    href={item.href}
                                                    className="flex items-center space-x-3 w-full px-3 py-2 rounded-md text-sm hover:bg-muted/50 transition-colors"
                                                    onClick={() => setIsUserMenuOpen(false)}
                                                >
                                                    <item.icon className="h-4 w-4 text-muted-foreground" />
                                                    <div className="flex-1 text-left">
                                                        <p className="font-medium">{item.label}</p>
                                                        <p className="text-xs text-muted-foreground">{item.description}</p>
                                                    </div>
                                                </Link>
                                            ))}
                                            <div className="border-t border-border/50 mt-2 pt-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={handleLogout}
                                                >
                                                    <LogOut className="h-4 w-4 mr-3" />
                                                    Logout
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="lg:hidden flex items-center space-x-2">
                        <ThemeToggle />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="p-2 h-10 w-10"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                        >
                            <AnimatePresence mode="wait">
                                {isMenuOpen ? (
                                    <motion.div
                                        key="close"
                                        initial={{ rotate: -90, opacity: 0 }}
                                        animate={{ rotate: 0, opacity: 1 }}
                                        exit={{ rotate: 90, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <X className="h-5 w-5" />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="menu"
                                        initial={{ rotate: 90, opacity: 0 }}
                                        animate={{ rotate: 0, opacity: 1 }}
                                        exit={{ rotate: -90, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <Menu className="h-5 w-5" />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMenuOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm lg:hidden z-40"
                            onClick={() => setIsMenuOpen(false)}
                        />

                        {/* Menu Content */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 h-full w-96 max-w-[95vw] bg-background border-l border-border lg:hidden z-50 flex flex-col"
                        >
                            {/* Header - Fixed */}
                            <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <Avatar className="h-12 w-12 flex-shrink-0">
                                        <AvatarImage
                                            src={currentUser?.avatar_url || `https://picsum.photos/seed/${currentUser?.email}/100/100`}
                                            alt={currentUser?.full_name || 'User'}
                                        />
                                        <AvatarFallback>
                                            {getInitials(currentUser?.full_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-sm truncate">{currentUser?.full_name || 'User'}</p>
                                        <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="p-2 h-12 w-12 flex-shrink-0 ml-3"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <X className="h-6 w-6" />
                                </Button>
                            </div>

                            {/* Navigation Items - Scrollable */}
                            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                                <div className="p-4 space-y-4 pb-6">
                                    {navItems.map((item) => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            className={`block w-full p-4 rounded-xl transition-all duration-200 ${pathname === item.href
                                                ? 'bg-primary/10 text-primary border border-primary/20'
                                                : 'hover:bg-muted/50 text-foreground'
                                                }`}
                                            onClick={() => setIsMenuOpen(false)}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={`p-2.5 rounded-lg flex-shrink-0 ${pathname === item.href ? 'bg-primary/20' : 'bg-muted'
                                                    }`}>
                                                    <item.icon className="h-5 w-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-sm mb-1 leading-tight">{item.label}</h3>
                                                    <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>

                            {/* Footer - Fixed */}
                            <div className="p-5 border-t border-border flex-shrink-0">
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 h-12"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="h-5 w-5 mr-3" />
                                    Logout
                                </Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </nav>
    );
} 