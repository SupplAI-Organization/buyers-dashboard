import { landingImages } from "../../lib/images";

const steps = [
  {
    title: "Browse Suppliers",
    description:
      "Search verified suppliers by category, location, or product type.",
    objectPosition: "center bottom", // Crop white part from top
  },
  {
    title: "Compare Specs",
    description:
      "View detailed product specifications and pricing side by side.",
    objectPosition: "center bottom", // Crop white part from top
  },
  {
    title: "Place Orders",
    description: "Connect directly with suppliers and place orders seamlessly.",
    objectPosition: "center center",
  },
  {
    title: "Track Procurement",
    description:
      "Monitor your orders and manage your supply chain in real-time.",
    objectPosition: "center center",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-20 max-w-6xl mx-auto px-6 scroll-mt-16"
    >
      <h2 className="text-2xl font-semibold text-center">How SupplAI Works</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6 mt-12 max-w-4xl mx-auto">
        {landingImages.steps.map((img, i) => (
          <div key={i} className="text-center">
            <div className="w-36 h-36 md:w-40 md:h-40 mx-auto overflow-hidden rounded-xl mb-4 bg-gray-100">
              <img
                src={img}
                className="w-full h-full object-cover scale-110"
                style={{ objectPosition: steps[i]?.objectPosition }}
                alt={steps[i]?.title || `Step ${i + 1}`}
              />
            </div>
            <span className="inline-block text-xs font-semibold text-[#EA7B7B] mb-1">
              Step {i + 1}
            </span>
            <h3 className="font-medium text-gray-900 text-sm">
              {steps[i]?.title}
            </h3>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              {steps[i]?.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
