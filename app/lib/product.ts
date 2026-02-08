export interface Product {
  id: string;
  supplier_id: string | null;
  parameter_form_id: string | null;
  name: string;
  category: string;
  description: string;
  price_per_unit: string;
  unit_type: string;
  available_quantity: string;
  min_order_quantity: string;
  dynamic_attributes: string;
  is_listed: boolean;
  is_approved: boolean;
  listed_at: string;
  created_at: string;
  updated_at: string;
}

export interface ParsedDynamicAttributes {
  origin?: string;
  ore_type?: string;
  fe_content_percent?: number;
  caco3_percent?: number;
  al2o3_percent?: number;
  cu_percent?: number;
  tree_type?: string;
  moisture_percent?: number;
  species?: string;
  length_ft?: number;
  grain_size_mm?: string;
  stone_size_mm?: string;
  cv_kcal_kg?: number;
  staple_length_mm?: number;
  grade?: string;
  rubber_type?: string;
  fiber_length_cm?: number;
  [key: string]: string | number | undefined;
}

export const PRODUCT_CATEGORIES = [
  "Minerals",
  "Wood",
  "Aggregates",
  "Fossil Fuels",
  "Natural Fibers",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const CATEGORY_ICONS: Record<ProductCategory, string> = {
  "Minerals": "🪨",
  "Wood": "🪵",
  "Aggregates": "🏗️",
  "Fossil Fuels": "⛽",
  "Natural Fibers": "🧶",
};
