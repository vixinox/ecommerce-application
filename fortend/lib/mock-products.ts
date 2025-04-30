export interface MockProduct {
  id: string
  name: string
  description?: string
  price: number
  image: string
  images?: string[]
  category: string
  stock: number
  status: "active" | "draft"
  specifications?: Record<string, string>
  features?: string[]
  colors?: string[]
  sizes?: string[]
}

export const mockProducts: MockProduct[] = Array.from({length: 24}, (_, i) => ({
  id: `prod_${i + 1}`,
  name: `Product ${i + 1}`,
  description: `This is a detailed description for Product ${i + 1}. It includes information about the product's features, materials, and usage.`,
  image: `/placeholder.svg?height=50&width=50&text=P${i + 1}`,
  images: [
    `/placeholder.svg?height=600&width=600&text=Product+${i + 1}+Image+1`,
    `/placeholder.svg?height=600&width=600&text=Product+${i + 1}+Image+2`,
    `/placeholder.svg?height=600&width=600&text=Product+${i + 1}+Image+3`,
  ],
  price: Math.floor(Math.random() * 200) + 10,
  category: ["Clothing", "Electronics", "Accessories", "Footwear", "Home"][Math.floor(Math.random() * 5)],
  stock: Math.floor(Math.random() * 100),
  status: Math.random() > 0.2 ? "active" : "draft",
  specifications: {
    Material: ["Cotton", "Leather", "Plastic", "Metal", "Glass"][Math.floor(Math.random() * 5)],
    Dimensions: `${Math.floor(Math.random() * 10) + 5}" x ${Math.floor(Math.random() * 10) + 5}" x ${Math.floor(Math.random() * 5) + 1}"`,
    Weight: `${Math.floor(Math.random() * 5) + 1} lbs`,
    Color: ["Black", "White", "Red", "Blue", "Green"][Math.floor(Math.random() * 5)],
  },
  features: ["Feature 1 for product", "Feature 2 for product", "Feature 3 for product"],
  colors: ["Black", "White", "Red", "Blue", "Green"].slice(0, Math.floor(Math.random() * 4) + 1),
  sizes: ["S", "M", "L", "XL", "XXL"].slice(0, Math.floor(Math.random() * 4) + 1),
}))
