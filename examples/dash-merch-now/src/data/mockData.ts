import { Purchase, Product, DashboardStats } from "@/types/dashboard";

// Mock data - replace with your real backend data
export const mockPurchases: Purchase[] = [
  {
    id: '1',
    product: 'Premium T-Shirt',
    customer: 'John Doe',
    amount: 29.99,
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
    status: 'completed'
  },
  {
    id: '2',
    product: 'Classic Hoodie',
    customer: 'Jane Smith',
    amount: 59.99,
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    status: 'processing'
  },
  {
    id: '3',
    product: 'Canvas Tote Bag',
    customer: 'Mike Johnson',
    amount: 19.99,
    timestamp: new Date(Date.now() - 1000 * 60 * 8),
    status: 'completed'
  },
  {
    id: '4',
    product: 'Baseball Cap',
    customer: 'Sarah Williams',
    amount: 24.99,
    timestamp: new Date(Date.now() - 1000 * 60 * 12),
    status: 'completed'
  },
  {
    id: '5',
    product: 'Water Bottle',
    customer: 'Tom Brown',
    amount: 15.99,
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    status: 'pending'
  },
];

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Premium T-Shirt',
    sku: 'TSH-001',
    stock: 45,
    price: 29.99,
    category: 'Apparel',
    lowStockThreshold: 10
  },
  {
    id: '2',
    name: 'Classic Hoodie',
    sku: 'HOD-001',
    stock: 8,
    price: 59.99,
    category: 'Apparel',
    lowStockThreshold: 10
  },
  {
    id: '3',
    name: 'Canvas Tote Bag',
    sku: 'BAG-001',
    stock: 0,
    price: 19.99,
    category: 'Accessories',
    lowStockThreshold: 5
  },
  {
    id: '4',
    name: 'Baseball Cap',
    sku: 'CAP-001',
    stock: 32,
    price: 24.99,
    category: 'Accessories',
    lowStockThreshold: 15
  },
  {
    id: '5',
    name: 'Water Bottle',
    sku: 'BTL-001',
    stock: 67,
    price: 15.99,
    category: 'Drinkware',
    lowStockThreshold: 20
  },
  {
    id: '6',
    name: 'Laptop Sticker Pack',
    sku: 'STK-001',
    stock: 150,
    price: 9.99,
    category: 'Accessories',
    lowStockThreshold: 50
  },
];

export const mockStats: DashboardStats = {
  totalRevenue: 15847.50,
  totalOrders: 342,
  lowStockItems: 2,
  activeProducts: 6
};

// Simulate real-time updates - replace this with your real backend subscription
export const simulateRealtimeUpdate = (
  callback: (purchase: Purchase) => void,
  interval: number = 5000
) => {
  const intervalId = setInterval(() => {
    const newPurchase: Purchase = {
      id: Math.random().toString(36).substr(2, 9),
      product: mockProducts[Math.floor(Math.random() * mockProducts.length)].name,
      customer: ['Alex Chen', 'Maria Garcia', 'James Wilson', 'Emma Davis'][Math.floor(Math.random() * 4)],
      amount: Math.random() * 80 + 10,
      timestamp: new Date(),
      status: ['completed', 'processing', 'pending'][Math.floor(Math.random() * 3)] as Purchase['status']
    };
    callback(newPurchase);
  }, interval);

  return () => clearInterval(intervalId);
};
