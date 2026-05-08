export default function AboutUs() {
  return (
    <section id="about-us" className="bg-[#EA7B7B] py-20 scroll-mt-16">
      <div className="max-w-4xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-white/80 text-3xl font-bold tracking-wide">
            About Us
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-3">
            Simplifying raw material procurement
          </h2>
        </div>

        {/* Content */}
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-white/90 text-lg leading-relaxed mb-4">
            SupplAI was built to solve a simple problem: sourcing raw materials takes too long 
            and involves too many unknowns. We created a platform where buyers find verified 
            suppliers, compare specifications, and connect directly.
          </p>
          <p className="text-white/75 text-base leading-relaxed">
            No middlemen. No hidden costs. Just transparent procurement 
            that helps your business move faster.
          </p>
        </div>

        {/* Stats */}
        <div className="flex justify-center gap-12 md:gap-20 mt-14">
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-bold text-white">500+</p>
            <p className="text-sm text-white/70 mt-1">Verified Suppliers</p>
          </div>
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-bold text-white">12k</p>
            <p className="text-sm text-white/70 mt-1">Products Listed</p>
          </div>
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-bold text-white">98%</p>
            <p className="text-sm text-white/70 mt-1">Buyer Satisfaction</p>
          </div>
        </div>
      </div>
    </section>
  );
}
