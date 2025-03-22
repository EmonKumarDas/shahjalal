import { Database } from "./supabase";

export type Supplier = Database["public"]["Tables"]["suppliers"]["Row"];
export type SupplierInsert =
  Database["public"]["Tables"]["suppliers"]["Insert"];
export type SupplierUpdate =
  Database["public"]["Tables"]["suppliers"]["Update"];

export type Shop = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type ShopInsert = {
  id?: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ShopUpdate = {
  id?: string;
  name?: string;
  address?: string | null;
  phone?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type Product = Database["public"]["Tables"]["products"]["Row"] & {
  shop_id?: string | null;
  advance_payment?: number;
  remaining_amount?: number;
};

export type ProductInsert =
  Database["public"]["Tables"]["products"]["Insert"] & {
    shop_id?: string | null;
    advance_payment?: number;
    remaining_amount?: number;
  };

export type ProductUpdate =
  Database["public"]["Tables"]["products"]["Update"] & {
    shop_id?: string | null;
    advance_payment?: number;
    remaining_amount?: number;
  };

export type Payment = {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
};

export type PaymentInsert = {
  id?: string;
  invoice_id: string;
  amount: number;
  payment_date?: string;
  payment_method?: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string | null;
};

export type PaymentUpdate = {
  id?: string;
  invoice_id?: string;
  amount?: number;
  payment_date?: string;
  payment_method?: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string | null;
};

export type Employee = {
  id: string;
  name: string;
  position: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  hire_date: string | null;
  salary: number | null;
  status: string;
  created_at: string;
  updated_at: string | null;
};

export type EmployeeInsert = {
  id?: string;
  name: string;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  hire_date?: string | null;
  salary?: number | null;
  status?: string;
  created_at?: string;
  updated_at?: string | null;
};

export type EmployeeUpdate = {
  id?: string;
  name?: string;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  hire_date?: string | null;
  salary?: number | null;
  status?: string;
  created_at?: string;
  updated_at?: string | null;
};

export type OthersCost = {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string | null;
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
};

export type OthersCostInsert = {
  id?: string;
  description: string;
  amount: number;
  date?: string;
  category?: string | null;
  payment_method?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string | null;
};

export type OthersCostUpdate = {
  id?: string;
  description?: string;
  amount?: number;
  date?: string;
  category?: string | null;
  payment_method?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string | null;
};
