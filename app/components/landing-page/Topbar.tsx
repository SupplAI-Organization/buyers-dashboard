import Link from "next/link";

export default function Topbar() {
  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 h-16">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="relative flex items-center text-2xl font-bold text-gray-900">
          <img 
            src="/landing/SupplAI_logo.jpg" 
            alt="SupplAI Logo" 
            className="absolute -left-7 h-28 w-28 object-contain"
          />
          <span className="ml-12">Suppl<span className="text-[#EA7B7B]">AI</span></span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
            Home
          </Link>
          <Link href="#about-us" className="text-gray-600 hover:text-gray-900 transition-colors">
            About Us
          </Link>
          <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
            Suppliers
          </Link>
          <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
            How It Works
          </Link>
          <Link href="#" className="text-gray-600 hover:text-gray-900 transition-colors">
            Contact
          </Link>
        </nav>

        {/* CTA Buttons */}
        <div className="flex items-center gap-4">
          <button className="hidden sm:block text-gray-600 hover:text-gray-900 transition-colors">
            Login
          </button>
          <button className="bg-[#EA7B7B] hover:bg-[#d96a6a] text-white px-5 py-2 rounded-full font-medium transition-colors">
            Get Started
          </button>
        </div>
      </div>
    </header>
  );
}
