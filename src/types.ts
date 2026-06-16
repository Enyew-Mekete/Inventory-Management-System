export type UserRole = 'superadmin' | 'admin' | 'user';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  groupId: string; // references Group
  phone?: string;
  address?: string;
  avatar?: string;
  status: 'active' | 'inactive';
}

export interface Group {
  id: string;
  name: string;
  description: string;
  permissions: string[]; // e.g., ['manage_users', 'manage_products', 'view_reports', ...]
}

export interface Brand {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

export interface Category {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

export interface Store {
  id: string;
  name: string;
  address?: string;
  status: 'active' | 'inactive';
}

export interface Attribute {
  id: string;
  name: string;
  values: string[]; // e.g., ['S', 'M', 'L'] or ['Red', 'Blue', 'Green']
  status: 'active' | 'inactive';
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  description?: string;
  price: number; // selling price
  buyingPrice: number;
  qty: number;
  brandId: string;
  categoryId: string;
  storeId: string;
  attributes: Record<string, string>; // e.g., { Size: 'M', Color: 'Blue' }
  image?: string;
  status: 'active' | 'inactive';
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  sku: string;
  qty: number;
  rate: number; // cost per item
  amount: number; // qty * rate
}

export interface Order {
  id: string;
  orderNo: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: OrderItem[];
  subtotal: number;
  vatPercent: number;
  vatAmount: number;
  serviceChargePercent: number;
  serviceChargeAmount: number;
  discount: number;
  netAmount: number;
  status: 'paid' | 'unpaid' | 'cancelled';
  orderType: 'sales' | 'purchase'; // Sales Order or Purchase Order
  userId: string; // order-creator
  userName: string;
}

export interface Company {
  name: string;
  address: string;
  phone: string;
  vatPercent: number;
  serviceChargePercent: number;
  currency: string;
  footerText: string;
}

export interface AuditLog {
  id: string;
  userEmail: string;
  userName: string;
  userRole: UserRole;
  action: string;
  module: string;
  timestamp: string;
  details: string;
}
