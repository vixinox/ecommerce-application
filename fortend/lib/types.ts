export interface Product {
  id: number;
  ownerId: number;
  name: string;
  category: string;
  description: string;
  defaultImage: string;
  minPrice: number;
  status: string;
  totalStock: number;
  wishlisted: boolean;
  createdAt: Date;
}

export interface Variant {
  id: number;
  color: string;
  size: string;
  price: number;
  image: string | null;
  stockQuantity: number;
  inStock: boolean;
}

export interface ProductDetails {
  id: number;
  name: string;
  category: string;
  minPrice: number;
  description: string;
  features: string;
  specifications: string;
  variants: Variant[];
  overallInStock: boolean;
}

export interface CartItem {
  image: any;
  cartId: number;
  productName: string;
  productCategory: string;
  productVariant: Variant;
  quantity: number;
}

export interface OrderItem {
  id: number;
  orderId: number;
  productId: number;
  productVariantId: number;
  quantity: number;
  purchasedPrice: number;
  snapshotProductName: string;
  snapshotVariantColor: string | null;
  snapshotVariantSize: string | null;
  snapshotVariantImage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: number;
  userId: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderDTO {
  order: Order;
  items: OrderItem[];
}

export interface DashboardData {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingShipmentOrders: number;
  productsPendingApproval: number;
  lowStockVariantsCount: number;
  newUsersToday: number;

  recentSales: Array<{
    date: string;
    amount: number;
  }>;
  productCategoryCounts: Array<{
    category: string;
    count: number;
  }>;
  orderStatusCounts: Array<{
    status: string;
    count: number;
  }>;
}

export interface FetchedProductDTO {
  id?: number;
  name: string;
  category: string;
  description: string;
  featuresJson: string;
  specificationsJson: string;
  variants: {
    id?: string;
    color: string;
    size: string;
    price: number;
    stockQuantity: number;
  }[];
  colorImageUrls?: { [key: string]: string };
  status?: string;
}

export interface OrderDetails {
  order: {
    id: number;
    totalAmount: number;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  items: {
    id: number;
    snapshotProductName: string;
    snapshotVariantColor: string;
    snapshotVariantSize: string;
    snapshotVariantImage: string;
    quantity: number;
    purchasedPrice: number;
  }[];
  buyerInfo: {
    nickname: string;
    email: string;
    avatar: string;
  };
}


export interface OrderDto {
  order: {
    id: number;
    orderNumber?: string;
    userId: number;
    status: string;
    totalAmount: number;
    createdAt: string;
    updatedAt: string;
  };
  items: any[];
  buyerInfo?: any;
}

export interface OrdersResponse {
  list: OrderDto[];
  total: number;
  pageNum: number;
  pageSize: number;
  size: number;
  pages: number;
}