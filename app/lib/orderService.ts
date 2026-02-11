import { supabase } from "./supabaseClient";
import { OrderItem, Order, OrderItemInsert } from "./order";

export async function createOrderItem(
    data: OrderItemInsert
): Promise<{ orderItem: OrderItem | null; order: Order | null; error: string | null }> {
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
        return { orderItem: null, order: null, error: "User not authenticated" };
    }

    // 1. Create an order first in the orders table
    const insertPayload = {
        buyer_id: userData.user.id,
        shipping_address: data.shipping_address,
        payment_method: data.payment_method,
        order_date: data.date_time,
        special_requirments: data.special_requirments,
        status: "pending",
        payment_status: "pending",
    };
    console.log("Inserting order with payload:", JSON.stringify(insertPayload, null, 2));

    const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert(insertPayload)
        .select()
        .single();

    if (orderError) {
        console.error("Error creating order:", JSON.stringify(orderError, null, 2));
        console.error("Error code:", orderError.code);
        console.error("Error message:", orderError.message);
        console.error("Error details:", orderError.details);
        console.error("Error hint:", orderError.hint);
        return { orderItem: null, order: null, error: orderError.message || "Failed to create order" };
    }

    // 2. Create the order item linked to the order
    const { data: orderItemData, error: orderItemError } = await supabase
        .from("order_items")
        .insert({
            product_id: data.product_id,
            order_id: orderData.id,
            quantity: data.quantity,
            unit_price: data.unit_price,
            total_price: data.total_price,
            product_snapshot: data.product_snapshot,
            special_requirments: data.special_requirments,
            shipping_address: data.shipping_address,
            payment_method: data.payment_method,
            date_time: data.date_time,
        })
        .select()
        .single();

    if (orderItemError) {
        console.error("Error creating order item:", orderItemError);
        return { orderItem: null, order: orderData, error: orderItemError.message };
    }

    return { orderItem: orderItemData, order: orderData, error: null };
}

export async function fetchOrders(): Promise<Order[]> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];

    const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("buyer_id", userData.user.id)
        .order("order_date", { ascending: false });

    if (error) {
        console.error("Error fetching orders:", error);
        return [];
    }

    return data || [];
}

export async function fetchOrderItems(orderId: string): Promise<OrderItem[]> {
    const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", orderId);

    if (error) {
        console.error("Error fetching order items:", error);
        return [];
    }

    return data || [];
}
