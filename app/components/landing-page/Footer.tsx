import { landingImages } from "../../lib/images";
export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-16">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12">
        <div>
          <h3 className="text-white font-semibold text-lg">SupplAI</h3>
          <p className="text-sm mt-2">
            Enterprise B2B procurement platform.
          </p>
        </div>

        <img
          src={landingImages.footer}
          alt="Factory"
          className="rounded-lg opacity-80"
        />
      </div>
    </footer>
  );
}
