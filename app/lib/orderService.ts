import { supabase } from "./supabaseClient";
import { OrderItem, Order, OrderItemInsert } from "./order";

export async function createOrderItem(
    data: OrderItemInsert,
    supplierId: string | null = null
): Promise<{ orderItem: OrderItem | null; order: Order | null; error: string | null }> {
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
        return { orderItem: null, order: null, error: "User not authenticated" };
    }

    // 0. Ensure user exists in the public.users table (profile)
    const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("id", userData.user.id)
        .single();

    if (checkError && checkError.code === "PGRST116") {
        // Create a minimal profile if it doesn't exist
        const { error: insertUserError } = await supabase
            .from("users")
            .insert({
                id: userData.user.id,
                email: userData.user.email,
                business_name: "",
                business_type: "",
                gstin: "",
                contact_person: "",
                contact_number: "",
                business_address: "",
                is_verified: false
            });

        if (insertUserError) {
            console.error("Error creating user profile:", insertUserError);
            // We continue anyway, but it'll likely fail the FK check if it's strict
        }
    }

    // 1. Create an order first in the orders table
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const insertPayload = {
        buyer_id: userData.user.id,
        supplier_id: supplierId,
        order_number: orderNumber,
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

export async function createOrderWithItems(
    orderData: any,
    items: OrderItemInsert[]
): Promise<{ order: Order | null; error: string | null }> {
    // Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
        return { order: null, error: "User not authenticated" };
    }

    // 0. Ensure user exists in the public.users table (profile)
    const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("id", userData.user.id)
        .single();

    if (checkError && checkError.code === "PGRST116") {
        await supabase
            .from("users")
            .insert({
                id: userData.user.id,
                email: userData.user.email,
                business_name: "",
                business_type: "",
                gstin: "",
                contact_person: "",
                contact_number: "",
                business_address: "",
                is_verified: false
            });
    }

    // 1. Create an order first in the orders table
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const insertPayload = {
        buyer_id: userData.user.id,
        supplier_id: items[0]?.supplier_id || null, // Assuming all items from same supplier for simplicity
        order_number: orderNumber,
        shipping_address: orderData.shipping_address,
        payment_method: orderData.payment_method,
        order_date: orderData.date_time,
        special_requirments: orderData.special_requirments || "",
        status: "pending",
        payment_status: "pending",
    };

    const { data: createdOrder, error: orderError } = await supabase
        .from("orders")
        .insert(insertPayload)
        .select()
        .single();

    if (orderError) {
        console.error("Error creating order:", orderError);
        return { order: null, error: orderError.message || "Failed to create order" };
    }

    // 2. Create the order items linked to the order
    const itemsToInsert = items.map(item => ({
        product_id: item.product_id,
        order_id: createdOrder.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        product_snapshot: item.product_snapshot,
        special_requirments: item.special_requirments || "",
        shipping_address: item.shipping_address,
        payment_method: item.payment_method,
        date_time: item.date_time,
    }));

    const { error: itemsError } = await supabase
        .from("order_items")
        .insert(itemsToInsert);

    if (itemsError) {
        console.error("Error creating order items:", itemsError);
        return { order: createdOrder, error: itemsError.message };
    }

    // 3. Clear the cart
    const { data: cartData, error: cartFetchError } = await supabase
        .from("cart")
        .select("id")
        .eq("buyer_id", userData.user.id)
        .single();

    if (!cartFetchError && cartData) {
        // We can just delete all items for this user's cart
        await supabase.from("cart_items").delete().match({ cart_id: cartData.id });
    }
    // Alternatively, use the cartService we just updated (but we'd need to import it)
    // To avoid circular dependency or extra imports, we can do it directly if we have the buyer_id

    return { order: createdOrder, error: null };
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
