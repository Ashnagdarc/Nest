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
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4 sm:px-6 py-12 sm:py-16 bg-black">
            <div className="text-center w-full max-w-4xl mx-auto relative">
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 sm:mb-8 leading-[1.1] sm:leading-tight text-white">
                    Streamline Gear<br />
                    Management for<br />
                    Eden Oasis
                </h1>
                <div className="text-2xl md:text-3xl font-normal text-neutral-400 mb-6">
                    Effortlessly manage equipment <FlipWords words={words} className="text-[#ff6300] font-semibold" />.
                </div>
                <p className="text-base sm:text-lg md:text-xl text-gray-400 mb-8 sm:mb-12 max-w-2xl mx-auto leading-relaxed px-4 sm:px-0">
                    Efficiently track, request, and manage company equipment with our intuitive platform designed for real estate professionals.
                </p>
            </div>
        </div>
    );
} 