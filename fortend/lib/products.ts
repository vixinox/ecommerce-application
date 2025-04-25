export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
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
  description: string;
  category: string;
  basePrice: number;
  images: string[];
  features: string[];
  specifications: ProductSpecifications[];
  variants: Variant[];
  overallInStock: boolean;
}

export interface ProductSpecifications {
  key: string;
  value: string;
}

export interface CartItem {
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