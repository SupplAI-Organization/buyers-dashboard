import { landingImages } from "../../lib/images";

export default function Hero() {
  return (
    <section className="relative bg-[#F6F7F9] overflow-hidden min-h-[700px] md:min-h-[800px]">
      {/* FULL WIDTH IMAGE */}
      <div className="absolute inset-0 hidden md:block">
        <img
          src={landingImages.hero}
          alt="Industrial worker in factory"
          className="w-full h-full object-cover object-top"
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 relative z-10">
        {/* LEFT CONTENT - overlaid on the whitish part of the image */}
        <div className="max-w-xl">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-[1.1] tracking-tight">
            Raw-material sourcing{" "}
            <span className="bg-gradient-to-r from-[#EA7B7B] to-[#d96a6a] bg-clip-text text-transparent">
              shouldn't be this hard.
            </span>
          </h1>

<p className="mt-6 text-lg md:text-xl text-gray-600 leading-relaxed max-w-md">
  SupplAI removes confusion from procurement by connecting you
  with <span className="font-semibold text-gray-800">verified suppliers</span> and clear product specifications.
</p>


          <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <button className="group bg-[#EA7B7B] hover:bg-[#d96a6a] text-white px-8 py-4 rounded-full font-semibold transition-all duration-300 shadow-lg shadow-[#EA7B7B]/25 hover:shadow-xl hover:shadow-[#EA7B7B]/30 hover:-translate-y-0.5">
              Get Started
              <span className="inline-block ml-2 transition-transform duration-300 group-hover:translate-x-1">→</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white"></div>
                <div className="w-8 h-8 rounded-full bg-gray-400 border-2 border-white"></div>
                <div className="w-8 h-8 rounded-full bg-gray-500 border-2 border-white"></div>
              </div>
              <span className="text-sm text-gray-600">
                Trusted by <span className="font-semibold text-gray-800">500+</span> industry leaders
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE IMAGE */}
      <div className="md:hidden px-6 pb-12">
        <img
          src={landingImages.hero}
          alt="Industrial worker in factory"
          className="rounded-2xl shadow-xl w-full h-auto object-cover"
        />
      </div>
    </section>
  );
}
