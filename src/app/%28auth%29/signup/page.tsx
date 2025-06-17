"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupRedirect() {
    const router = useRouter();

    useEffect(() => {
        // Redirect to the actual signup page
        router.replace('/signup');
    }, [router]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Redirecting to signup...</p>
            </div>
        </div>
    );
}