import { landingImages } from "../../lib/images";

const supplierData = [
  {
    title: "Premium Steel Manufacturer",
    description:
      "Specializing in high-grade steel and metal alloys with ISO-certified production facilities and global delivery.",
  },
  {
    title: "Chemical Raw Materials",
    description:
      "Industry-leading supplier of industrial chemicals and compounds with rigorous quality testing and safety compliance.",
  },
  {
    title: "Textile and Fiber Solutions",
    description:
      "Sustainable fabric and fiber sourcing from certified mills with eco-friendly processes and competitive pricing.",
  },
];

export default function TrustedSuppliers() {
  return (
    <section className="bg-gradient-to-b from-white to-gray-50/50 py-28">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section header */}
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[#EA7B7B] mb-3">
            Our Network
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
            Work with trusted,{" "}
            <span className="bg-gradient-to-r from-[#EA7B7B] to-[#d96a6a] bg-clip-text text-transparent">
              verified suppliers
            </span>
          </h2>
          <p className="mt-5 text-lg md:text-xl text-gray-500 leading-relaxed max-w-xl mx-auto">
            Discover reliable raw-material suppliers across industries,
            all verified and ready to do business.
          </p>
        </div>

        {/* Supplier cards */}
        <div className="grid gap-8 mt-20 md:grid-cols-3">
          {landingImages.suppliers.map((img, idx) => (
            <div
              key={idx}
              className="group rounded-3xl border border-gray-100 bg-white overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-gray-200/50 hover:-translate-y-1"
            >
              <div className="h-56 overflow-hidden relative">
                <img
                  src={img}
                  alt={supplierData[idx].title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute top-4 left-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm text-xs font-medium text-gray-700 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Verified
                  </span>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 tracking-tight group-hover:text-[#EA7B7B] transition-colors duration-300">
                  {supplierData[idx].title}
                </h3>
                <p className="mt-3 text-sm text-gray-500 leading-relaxed line-clamp-2">
                  {supplierData[idx].description}
                </p>
                <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    View Profile
                  </span>
                  <span className="text-[#EA7B7B] transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-20 text-center">
          <button className="group bg-[#EA7B7B] hover:bg-[#d96a6a] text-white px-10 py-4 rounded-full font-semibold transition-all duration-300 shadow-lg shadow-[#EA7B7B]/25 hover:shadow-xl hover:shadow-[#EA7B7B]/30 hover:-translate-y-0.5">
            Browse all suppliers
            <span className="inline-block ml-2 transition-transform duration-300 group-hover:translate-x-1">→</span>
          </button>
          <p className="mt-4 text-sm text-gray-400">
            Over 500+ verified suppliers worldwide
          </p>
        </div>
      </div>
    </section>
  );
}
