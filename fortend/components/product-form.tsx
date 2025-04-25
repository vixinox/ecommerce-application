"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2, Plus, Trash2, Upload, X } from "lucide-react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { MockProduct } from "@/lib/mock-products"

// Product schema for validation
const productSchema = z.object({
  name: z
    .string()
    .min(3, "Product name must be at least 3 characters")
    .max(100, "Product name cannot exceed 100 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description cannot exceed 1000 characters"),
  price: z.coerce.number().positive("Price must be positive").min(0.01, "Price must be at least 0.01"),
  category: z.string().min(1, "Please select a category"),
  stock: z.coerce.number().int("Stock must be a whole number").min(0, "Stock cannot be negative"),
  status: z.enum(["active", "draft"]),
})

type ProductFormValues = z.infer<typeof productSchema>

interface ProductFormProps {
  product?: MockProduct
}

export function ProductForm({ product }: ProductFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [productImages, setProductImages] = useState<string[]>(product?.images || [])
  const [specifications, setSpecifications] = useState<Record<string, string>>(product?.specifications || {})
  const [newSpecKey, setNewSpecKey] = useState("")
  const [newSpecValue, setNewSpecValue] = useState("")
  const [colors, setColors] = useState<string[]>(product?.colors || [])
  const [newColor, setNewColor] = useState("")
  const [sizes, setSizes] = useState<string[]>(product?.sizes || [])
  const [newSize, setNewSize] = useState("")

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      price: product?.price || 0,
      category: product?.category || "",
      stock: product?.stock || 0,
      status: product?.status || "draft",
    },
  })

  async function onSubmit(data: ProductFormValues) {
    setIsSubmitting(true)

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Combine form data with other state
      const productData = {
        ...data,
        images: productImages,
        specifications,
        colors,
        sizes,
      }

      console.log("Product data to submit:", productData)

      toast.success(product ? "Product updated successfully" : "Product created successfully")
      router.push("/account/merchant/products")
    } catch (error) {
      toast.error(product ? "Failed to update product" : "Failed to create product")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // In a real app, we would upload the files to a storage service
    // Here we're just creating object URLs for preview
    const newImages = Array.from(files).map((file) => URL.createObjectURL(file))
    setProductImages([...productImages, ...newImages])

    // Reset the input
    e.target.value = ""
  }

  const removeImage = (index: number) => {
    setProductImages(productImages.filter((_, i) => i !== index))
  }

  const addSpecification = () => {
    if (newSpecKey.trim() && newSpecValue.trim()) {
      setSpecifications({
        ...specifications,
        [newSpecKey]: newSpecValue,
      })
      setNewSpecKey("")
      setNewSpecValue("")
    }
  }

  const removeSpecification = (key: string) => {
    const { [key]: _, ...rest } = specifications
    setSpecifications(rest)
  }

  const addColor = () => {
    if (newColor.trim() && !colors.includes(newColor.trim())) {
      setColors([...colors, newColor.trim()])
      setNewColor("")
    }
  }

  const removeColor = (color: string) => {
    setColors(colors.filter((c) => c !== color))
  }

  const addSize = () => {
    if (newSize.trim() && !sizes.includes(newSize.trim())) {
      setSizes([...sizes, newSize.trim()])
      setNewSize("")
    }
  }

  const removeSize = (size: string) => {
    setSizes(sizes.filter((s) => s !== size))
  }

  return (
    <Tabs defaultValue="basic" className="w-full pl-4 pr-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="basic">Basic Info</TabsTrigger>
        <TabsTrigger value="images">Images</TabsTrigger>
        <TabsTrigger value="specifications">Specifications</TabsTrigger>
        <TabsTrigger value="variants">Variants</TabsTrigger>
      </TabsList>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pt-6">
          <TabsContent value="basic" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product name" {...field} />
                    </FormControl>
                    <FormDescription>The name of your product as it will appear to customers.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-muted-foreground">$</span>
                        <Input type="number" step="0.01" placeholder="0.00" className="pl-7" {...field} />
                      </div>
                    </FormControl>
                    <FormDescription>The price of your product in USD.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Clothing">Clothing</SelectItem>
                        <SelectItem value="Electronics">Electronics</SelectItem>
                        <SelectItem value="Accessories">Accessories</SelectItem>
                        <SelectItem value="Footwear">Footwear</SelectItem>
                        <SelectItem value="Home">Home</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>The category your product belongs to.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormDescription>The number of items in stock.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter product description" className="min-h-32 resize-none" {...field} />
                  </FormControl>
                  <FormDescription>
                    Detailed description of your product. This helps customers understand what you're selling.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active Status</FormLabel>
                    <FormDescription>Set whether this product is active and visible to customers.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value === "active"}
                      onCheckedChange={(checked) => field.onChange(checked ? "active" : "draft")}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="images" className="space-y-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium">Product Images</h4>
                <p className="text-sm text-muted-foreground">
                  Upload images of your product. The first image will be used as the main image.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {productImages.map((image, index) => (
                  <div key={index} className="group relative aspect-square overflow-hidden rounded-md border">
                    <Image
                      src={image || "/placeholder.svg"}
                      alt={`Product image ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Remove image</span>
                    </Button>
                    {index === 0 && <Badge className="absolute left-1 top-1">Main</Badge>}
                  </div>
                ))}

                <label
                  htmlFor="image-upload"
                  className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border border-dashed text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  <Upload className="mb-2 h-6 w-6" />
                  <span className="text-xs">Upload</span>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </label>
              </div>

              <p className="text-xs text-muted-foreground">Supported formats: JPEG, PNG, WebP. Max file size: 5MB.</p>
            </div>
          </TabsContent>

          <TabsContent value="specifications" className="space-y-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium">Product Specifications</h4>
                <p className="text-sm text-muted-foreground">Add technical specifications for your product.</p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <FormLabel htmlFor="spec-key">Specification</FormLabel>
                          <Input
                            id="spec-key"
                            placeholder="e.g., Material"
                            value={newSpecKey}
                            onChange={(e) => setNewSpecKey(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <FormLabel htmlFor="spec-value">Value</FormLabel>
                          <div className="flex space-x-2">
                            <Input
                              id="spec-value"
                              placeholder="e.g., Cotton"
                              value={newSpecValue}
                              onChange={(e) => setNewSpecValue(e.target.value)}
                            />
                            <Button
                              type="button"
                              size="icon"
                              onClick={addSpecification}
                              disabled={!newSpecKey.trim() || !newSpecValue.trim()}
                            >
                              <Plus className="h-4 w-4" />
                              <span className="sr-only">Add specification</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <h5 className="text-sm font-medium">Current Specifications</h5>
                      {Object.keys(specifications).length > 0 ? (
                        <div className="space-y-2">
                          {Object.entries(specifications).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between rounded-md border px-3 py-2">
                              <div>
                                <span className="font-medium">{key}:</span> {value}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => removeSpecification(key)}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Remove {key}</span>
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No specifications added yet.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="variants" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium">Colors</h4>
                  <p className="text-sm text-muted-foreground">Add available colors for your product.</p>
                </div>

                <div className="flex space-x-2">
                  <Input placeholder="e.g., Red" value={newColor} onChange={(e) => setNewColor(e.target.value)} />
                  <Button
                    type="button"
                    onClick={addColor}
                    disabled={!newColor.trim() || colors.includes(newColor.trim())}
                  >
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {colors.length > 0 ? (
                    colors.map((color) => (
                      <Badge key={color} variant="secondary" className="flex items-center gap-1 pr-1">
                        {color}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 rounded-full p-0 hover:bg-destructive/20 hover:text-destructive"
                          onClick={() => removeColor(color)}
                        >
                          <X className="h-3 w-3" />
                          <span className="sr-only">Remove {color}</span>
                        </Button>
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No colors added yet.</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium">Sizes</h4>
                  <p className="text-sm text-muted-foreground">Add available sizes for your product.</p>
                </div>

                <div className="flex space-x-2">
                  <Input placeholder="e.g., XL" value={newSize} onChange={(e) => setNewSize(e.target.value)} />
                  <Button type="button" onClick={addSize} disabled={!newSize.trim() || sizes.includes(newSize.trim())}>
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {sizes.length > 0 ? (
                    sizes.map((size) => (
                      <Badge key={size} variant="secondary" className="flex items-center gap-1 pr-1">
                        {size}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 rounded-full p-0 hover:bg-destructive/20 hover:text-destructive"
                          onClick={() => removeSize(size)}
                        >
                          <X className="h-3 w-3" />
                          <span className="sr-only">Remove {size}</span>
                        </Button>
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No sizes added yet.</p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <Separator />

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/account/merchant/products")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {product ? "Updating..." : "Creating..."}
                </>
              ) : product ? (
                "Update Product"
              ) : (
                "Create Product"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </Tabs>
  )
}
