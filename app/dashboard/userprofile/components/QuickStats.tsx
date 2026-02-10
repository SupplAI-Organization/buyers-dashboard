interface QuickStatsProps {
  orders?: number;
  wishlist?: number;
  quotes?: number;
  suppliers?: number;
}

export default function QuickStats({
  orders = 0,
  wishlist = 0,
  quotes = 0,
  suppliers = 0,
}: QuickStatsProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#EA7B7B]">{orders}</p>
          <p className="text-xs text-gray-500 mt-1">Orders</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#EA7B7B]">{wishlist}</p>
          <p className="text-xs text-gray-500 mt-1">Wishlist</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#EA7B7B]">{quotes}</p>
          <p className="text-xs text-gray-500 mt-1">Quotes</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#EA7B7B]">{suppliers}</p>
          <p className="text-xs text-gray-500 mt-1">Suppliers</p>
        </div>
      </div>
    </div>
  );
}
