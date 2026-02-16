import { useEffect, useState } from "react";

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Start fade out after 2 seconds
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 2000);

    // Call onFinish after fade animation completes
    const finishTimer = setTimeout(() => {
      onFinish();
    }, 2500);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
      style={{
        background: "linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)",
      }}
    >
      <div className="flex flex-col items-center gap-6 animate-pulse">
        {/* MPG Logo */}
        <div className="relative">
          <div className="absolute inset-0 bg-mpg-gold/20 blur-3xl rounded-full" />
          <img
            src="/mpg-logo.png"
            alt="Madang Provincial Government"
            className="w-32 h-32 object-contain relative z-10"
          />
        </div>

        {/* Government Name */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-mpg-gold">
            Madang Provincial Government
          </h1>
          <p className="text-white/80 text-sm">Citizen Registry System</p>
        </div>

        {/* Loading Indicator */}
        <div className="flex gap-2">
          <div className="w-2 h-2 rounded-full bg-mpg-gold animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-mpg-gold animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-mpg-gold animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>

        {/* Version */}
        <p className="text-white/40 text-xs mt-4">Version 1.0</p>
      </div>
    </div>
  );
}
