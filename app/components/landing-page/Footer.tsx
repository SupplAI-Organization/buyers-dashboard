export default function Footer() {
  return (
    <footer id="footer" className="bg-[#0F172A] text-gray-400 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Top section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="text-white text-xl font-semibold">SupplAI</h3>
            <p className="mt-4 max-w-md text-sm leading-relaxed">
              SupplAI is a modern B2B procurement platform that helps businesses
              source raw materials from verified suppliers with clarity,
              transparency, and control.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="text-white font-medium mb-4">Product</p>
            <ul className="space-y-3 text-sm">
              <li className="hover:text-white transition">Suppliers</li>
              <li className="hover:text-white transition">Buyers</li>
              <li className="hover:text-white transition">How it works</li>
              <li className="hover:text-white transition">Pricing</li>
            </ul>
          </div>

          {/* Links */}
          <div>
            <p className="text-white font-medium mb-4">Company</p>
            <ul className="space-y-3 text-sm">
              <li className="hover:text-white transition">About us</li>
              <li className="hover:text-white transition">Contact</li>
              <li className="hover:text-white transition">Privacy policy</li>
              <li className="hover:text-white transition">Terms of service</li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} SupplAI. All rights reserved.
          </p>

          <p className="text-xs text-gray-500">
            Built for modern supply chains.
          </p>
        </div>
      </div>
    </footer>
  );
}
