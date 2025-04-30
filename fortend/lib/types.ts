export interface Product {
  id: string;
  name: string;
  category: string;
  defaultImage: string;
  minPrice: number;
  status: string;
  totalStock: number;
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