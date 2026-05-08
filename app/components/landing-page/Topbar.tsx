"use client";

import Link from "next/link";

export default function Topbar() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToSection = (
    e: React.MouseEvent<HTMLAnchorElement>,
    sectionId: string,
  ) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 h-16">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={scrollToTop}
          className="relative flex items-center text-2xl font-bold text-gray-900 cursor-pointer"
        >
          <img
            src="/landing/SupplAI_logo.jpg"
            alt="SupplAI Logo"
            className="absolute -left-7 h-28 w-28 object-contain"
          />
          <span className="ml-12">
            Suppl<span className="text-[#EA7B7B]">AI</span>
          </span>
        </button>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <a
            href="#hero"
            onClick={(e) => scrollToSection(e, "hero")}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Home
          </a>
          <a
            href="#about-us"
            onClick={(e) => scrollToSection(e, "about-us")}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            About Us
          </a>
          <a
            href="#suppliers"
            onClick={(e) => scrollToSection(e, "suppliers")}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Suppliers
          </a>
          <a
            href="#how-it-works"
            onClick={(e) => scrollToSection(e, "how-it-works")}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            How It Works
          </a>
          <a
            href="#footer"
            onClick={(e) => scrollToSection(e, "footer")}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Contact
          </a>
        </nav>

        {/* CTA Buttons */}
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="bg-[#EA7B7B] hover:bg-[#d96a6a] text-white px-5 py-2 rounded-full font-medium transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}
