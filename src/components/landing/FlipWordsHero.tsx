import { FlipWords } from "@/components/ui/flip-words";

export default function FlipWordsHero() {
    const words = [
        "faster",
        "smarter",
        "easier",
        "securely",
        "together",
        "with confidence"
    ];

    return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-background px-4 py-12 sm:px-6 sm:py-16">
            <div className="text-center w-full max-w-4xl mx-auto relative">
                <h1 className="mb-6 text-4xl font-bold leading-[1.1] text-foreground sm:mb-8 sm:text-5xl sm:leading-tight md:text-6xl lg:text-7xl">
                    Internal Gear<br />
                    Management System for<br />
                    Eden Oasis
                </h1>
                <div className="mb-6 text-2xl font-normal text-muted-foreground md:text-3xl">
                    Effortlessly manage equipment <FlipWords words={words} className="font-semibold text-primary" />.
                </div>
                <p className="mx-auto mb-8 max-w-2xl px-4 text-base leading-relaxed text-muted-foreground sm:mb-12 sm:px-0 sm:text-lg md:text-xl">
                    Efficiently track, request, and manage company equipment with our intuitive platform designed for real estate professionals.
                </p>
            </div>
        </div>
    );
} 