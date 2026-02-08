export default function ProductCard({
  name,
  price,
  image,
}: {
  name: string;
  price: string;
  image: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="h-40 bg-gray-200">
        <img
          src={image}
          alt={name}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="p-4">
        <h3 className="font-semibold">{name}</h3>
        <p className="text-sm text-gray-500 mt-1">
          Starting from
        </p>
        <p className="font-bold text-lg">{price}</p>

        <button className="mt-3 w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600">
          View Details
        </button>
      </div>
    </div>
  );
}
