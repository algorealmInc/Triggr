export interface Purchase {
  id: string;
  product: string;
  customer: string;
  amount: number;
  timestamp: Date;
  status: 'completed' | 'processing' | 'pending';
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  stock: number;
  price: number;
  category: string;
  lowStockThreshold: number;
}

export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  lowStockItems: number;
  activeProducts: number;
}
