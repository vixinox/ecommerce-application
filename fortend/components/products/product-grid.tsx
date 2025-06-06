"use client";

import { useState } from "react";
import { ProductCard } from "@/components/products/product-card";
import { Badge } from "@/components/ui/badge";
import { AnimatePresence, motion } from "framer-motion";
import { Product } from "@/lib/types";

const containerVariants = {
  hidden: {opacity: 0},
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: {opacity: 0, y: 20},
  visible: {opacity: 1, y: 0},
  exit: {opacity: 0, y: 20, transition: {duration: 0.1}},
};

interface ProductGridProps {
  initialProducts: Product[];
  isNetworkError?: boolean;
}

export default function ProductGrid({initialProducts, isNetworkError = false}: ProductGridProps) {
  if (isNetworkError)
    return (
      <div className="text-center py-16 flex flex-col items-center">
        <p className="text-lg font-bold">请检查网络连接......</p>
      </div>
    );

  const [selectedCategory, setSelectedCategory] = useState("全部");
  const categories = ["全部", ...new Set(initialProducts.map((product) => product.category))];
  const filteredProducts =
    selectedCategory === "全部"
      ? initialProducts
      : initialProducts.filter((product) => product.category === selectedCategory);

  if (filteredProducts.length === 0)
    return (
      <div className="text-center py-16 flex flex-col items-center">
        <p className="text-lg font-bold">似乎还没有商品......</p>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Badge
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </Badge>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedCategory}
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredProducts.map((product) => (
            <motion.div
              key={product.id}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              layout
            >
              <ProductCard product={product}/>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
