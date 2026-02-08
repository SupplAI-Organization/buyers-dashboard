import ProductCard from "./ProductCard";

export default function ProductGrid() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        Available Suppliers
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <ProductCard
          name="Evergreen Timbers"
          price="$400"
          image="/wood1.jpg"
        />
        <ProductCard
          name="SteelWorks Co."
          price="$260"
          image="/steel.jpg"
        />
        <ProductCard
          name="ChemTech Innovations"
          price="$480"
          image="/chemical.jpg"
        />
      </div>
    </div>
  );
}
