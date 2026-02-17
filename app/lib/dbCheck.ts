import { supabase } from "./supabaseClient";

async function check() {
    const { data: product } = await supabase.from("products").select("*").limit(1).single();
    console.log("Product columns:", Object.keys(product || {}));

    const { data: cart } = await supabase.from("cart").select("*").limit(1).single();
    console.log("Cart columns:", Object.keys(cart || {}));

    const { data: order } = await supabase.from("orders").select("*").limit(1).single();
    console.log("Order columns:", Object.keys(order || {}));
}

check();
