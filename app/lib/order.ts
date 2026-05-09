export interface OrderItem {
    id: string;
    product_id: string;
    order_id: string;
    supplier_id?: string; // Optional, for passing data to services
    quantity: number;
    unit_price: number;
    total_price: number;
    discount_percentage?: number;
    product_snapshot: Record<string, any>;
    special_requirments: string;
    shipping_address: string;
    payment_method: string;
    date_time: string;
}

export interface Order {
    id: string;
    buyer_id: string;
    supplier_id: string | null;
    order_number: string;
    shipping_address: string;
    payment_method: string;
    order_date: string;
    special_requirments: string;
    status: string | null;
    shipping_cost: number | null;
    payment_status: string | null;
    expected_delivery: string | null;
    actual_delivery: string | null;
    created_at?: string;
    updated_at?: string;
}

export type OrderItemInsert = Omit<OrderItem, "id" | "order_id">;
