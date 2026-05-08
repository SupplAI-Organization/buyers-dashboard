const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
    try {
        const { data: products } = await supabase.from("products").select("*").limit(1);
        console.log("Product columns:", products && products[0] ? Object.keys(products[0]) : "No products found");

        const { data: cart } = await supabase.from("cart").select("*").limit(1);
        console.log("Cart columns:", cart && cart[0] ? Object.keys(cart[0]) : "No carts found");

        const { data: orders } = await supabase.from("orders").select("*").limit(1);
        console.log("Order columns:", orders && orders[0] ? Object.keys(orders[0]) : "No orders found");
    } catch (e) {
        console.error(e);
    }
}

inspect();
