"use client";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage, } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";

const productSchema = z.object({
  name: z.string().min(1, {message: "商品名称不能为空"}),
  category: z.string().min(1, {message: "分类不能为空"}),
  description: z.string().optional(),
});
type ProductFormValues = z.infer<typeof productSchema>;

interface UploadVariantDTO {
  id?: string;
  color: string;
  size: string;
  price: number;
  stockQuantity: number;
}

interface UploadProductDTO {
  id?: number;
  name: string;
  category: string;
  description: string;
  featuresJson: string;
  specificationsJson: string;
  variants: UploadVariantDTO[];
  status?: string;
}

interface FetchedProductDTO extends Omit<UploadProductDTO, 'colorImages'> {
  colorImageUrls?: { [key: string]: string };
}

export function ProductForm({param}: { param?: string }) {
  const {token, isLoading: isAuthLoading} = useAuth();
  const router = useRouter();
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
    },
  });
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState<string>('');
  const [specifications, setSpecifications] = useState<Record<string, string>>({});
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");
  const [variants, setVariants] = useState<UploadVariantDTO[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [newColor, setNewColor] = useState("");
  const [newSize, setNewSize] = useState("");
  const [deletedColors, setDeletedColors] = useState<string[]>([]);
  const [colorImages, setColorImages] = useState<{ [key: string]: File }>({});
  const [colorImageUrls, setColorImageUrls] = useState<{ [key: string]: string }>({});
  const prevColorImagesRef = useRef<{ [key: string]: File }>({});
  const initialColorImageUrlsRef = useRef<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!param) {
      setIsLoading(false);
      setIsHydrated(true);
      return;
    }
    if (!token) {
      toast.error("请先登录");
      router.push("/auth/login");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setIsHydrated(false);
    const fetchProduct = async () => {
      try {
        const res = await fetch(`${API_URL}/api/products/edit/${param}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data: FetchedProductDTO = await res.json();
          form.reset({
            name: data.name || "",
            description: data.description || "",
            category: data.category || "",
          });
          try {
            setFeatures(JSON.parse(data.featuresJson || '[]'));
          } catch (e) {
            console.error("Failed to parse featuresJson", e);
            setFeatures([]);
          }
          try {
            const specsArray = JSON.parse(data.specificationsJson || '[]');
            const specsObject = specsArray.reduce((acc: Record<string, string>, item: {
              key: string,
              value: string
            }) => {
              acc[item.key] = item.value;
              return acc;
            }, {});
            setSpecifications(specsObject);
          } catch (e) {
            console.error("Failed to parse specificationsJson", e);
            setSpecifications({});
          }
          setVariants(data.variants || []);
          const fetchedVariants = data.variants || [];
          setColors(Array.from(new Set(fetchedVariants.map(v => v.color))).filter(Boolean));
          setSizes(Array.from(new Set(fetchedVariants.map(v => v.size))).filter(Boolean));
          if (data.colorImageUrls) {
            setColorImageUrls(data.colorImageUrls);
            initialColorImageUrlsRef.current = data.colorImageUrls;
          } else {
            setColorImageUrls({});
            initialColorImageUrlsRef.current = {};
          }
        } else {
          setColors([]);
          setSizes([]);
          const errorText = await res.text();
          console.error(`Fetch Error (${res.status}):`, errorText);
          if (res.status === 401) {
            toast.error("登录状态过期，请重新登录");
            router.push("/auth/login");
          } else if (res.status === 404) {
            toast.error("商品不存在");
            router.push("/account/merchant/products");
          } else {
            toast.error(`获取商品失败`, {description: errorText || res.statusText});
          }
          form.reset({name: "", description: "", category: ""});
          setFeatures([]);
          setSpecifications({});
          setVariants([]);
          setColorImages({});
          setColorImageUrls({});
          initialColorImageUrlsRef.current = {};
        }
      } catch (error: any) {
        console.error("Fetch error:", error);
        toast.error(`获取商品详情失败`, {description: error.message || "网络请求失败"});
        form.reset({name: "", description: "", category: ""});
        setFeatures([]);
        setSpecifications({});
        setVariants([]);
        setColorImages({});
        setColorImageUrls({});
        setColors([]);
        setSizes([]);
        initialColorImageUrlsRef.current = {};
      } finally {
        setIsLoading(false);
        setIsHydrated(true);
      }
    };
    fetchProduct();
  }, [param, token, router, form]);
  useEffect(() => {
    const prevFiles = prevColorImagesRef.current;
    const currentFiles = colorImages;
    const nextImageUrls: { [key: string]: string } = {};
    Object.keys(colorImageUrls).forEach(color => {
      if (!currentFiles[color]) {
        nextImageUrls[color] = colorImageUrls[color];
      }
    });
    Object.keys(prevFiles).forEach(color => {
      const prevFile = prevFiles[color];
      const currentFile = currentFiles[color];
      if (prevFile instanceof File) {
        if (!currentFile || currentFile !== prevFile) {
          const urlToRevoke = URL.createObjectURL(prevFile);
          if (colorImageUrls[color] === urlToRevoke) {
            try {
              URL.revokeObjectURL(urlToRevoke);
            } catch (e) {
              console.warn("Failed to revoke URL:", urlToRevoke, e);
            }
          }
        }
      }
    });

    Object.keys(currentFiles).forEach(color => {
      const file = currentFiles[color];
      if (file instanceof File)
        nextImageUrls[color] = URL.createObjectURL(file);
    });
    setColorImageUrls(nextImageUrls);
    prevColorImagesRef.current = currentFiles;
    return () => {
      Object.values(colorImageUrls).forEach(url => {
        if (url && url.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(url);
          } catch (e) {
            console.warn("Failed to revoke URL in cleanup:", url, e);
          }
        }
      });
      prevColorImagesRef.current = {};
      initialColorImageUrlsRef.current = {};
    };
  }, [colorImages]);
  useEffect(() => {
    if (!isHydrated) return;
    const desiredVariantCombinations: { color: string, size: string }[] = [];
    if (colors.length > 0 && sizes.length > 0) {
      colors.forEach(color => {
        sizes.forEach(size => {
          desiredVariantCombinations.push({color, size});
        });
      });
    }
    const existingVariantsMap = new Map<string, UploadVariantDTO>();
    variants.forEach(v => {
      if (v.color && v.size) {
        existingVariantsMap.set(`${v.color}_${v.size}`, v);
      }
    });
    const newVariantsState: UploadVariantDTO[] = desiredVariantCombinations.map(combo => {
      const existingVariant = existingVariantsMap.get(`${combo.color}_${combo.size}`);
      if (existingVariant) {
        return existingVariant;
      } else {
        return {
          color: combo.color,
          size: combo.size,
          price: 0,
          stockQuantity: 0,
          id: undefined,
        };
      }
    });
    const sortedCurrentVariantKeys = variants.map(v => `${v.color}_${v.size}`).filter(key => key !== '_').sort().join(',');
    const sortedNewVariantKeys = newVariantsState.map(v => `${v.color}_${v.size}`).filter(key => key !== '_').sort().join(',');
    if (sortedCurrentVariantKeys !== sortedNewVariantKeys)
      setVariants(newVariantsState);
  }, [colors, sizes, isHydrated]);
  const addSpecification = useCallback(() => {
    if (newSpecKey.trim() && newSpecValue.trim()) {
      setSpecifications((prevSpecs) => ({
        ...prevSpecs,
        [newSpecKey.trim()]: newSpecValue.trim(),
      }));
      setNewSpecKey("");
      setNewSpecValue("");
    }
  }, [newSpecKey, newSpecValue]);
  const removeSpecification = useCallback((keyToRemove: string) => {
    setSpecifications((prevSpecs) => {
      const {[keyToRemove]: _, ...rest} = prevSpecs;
      return rest;
    });
  }, []);
  const addFeature = useCallback(() => {
    if (newFeature.trim() && !features.includes(newFeature.trim())) {
      setFeatures((prevFeatures) => [...prevFeatures, newFeature.trim()]);
      setNewFeature('');
    }
  }, [newFeature, features]);
  const removeFeature = useCallback((indexToRemove: number) => {
    setFeatures((prevFeatures) => prevFeatures.filter((_, index) => index !== indexToRemove));
  }, []);
  const addColor = useCallback(() => {
    const trimmedColor = newColor.trim();
    if (trimmedColor && !colors.includes(trimmedColor)) {
      setColors(prevColors => [...prevColors, trimmedColor]);
      setNewColor("");
    }
  }, [newColor, colors]);
  const removeColor = useCallback((colorToRemove: string) => {
    setColors(prevColors => prevColors.filter(color => color !== colorToRemove));
    if (initialColorImageUrlsRef.current[colorToRemove] || colorImages[colorToRemove]) {
      setDeletedColors(prev => {
        if (initialColorImageUrlsRef.current[colorToRemove] && !prev.includes(colorToRemove)) {
          return [...prev, colorToRemove];
        }
        return prev;
      });
    }
    setColorImages(prevColorImages => {
      const nextImages = {...prevColorImages};
      delete nextImages[colorToRemove];
      return nextImages;
    });
  }, [initialColorImageUrlsRef, colorImages]);
  const addSize = useCallback(() => {
    const trimmedSize = newSize.trim();
    if (trimmedSize && !sizes.includes(trimmedSize)) {
      setSizes(prevSizes => [...prevSizes, trimmedSize]);
      setNewSize("");
    }
  }, [newSize, sizes]);
  const removeSize = useCallback((sizeToRemove: string) => {
    setSizes(prevSizes => prevSizes.filter(size => size !== sizeToRemove))
  }, []);
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>, color: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxFileSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      toast.error("不支持的图片格式", {description: "支持 JPEG, PNG, WebP"});
      e.target.value = "";
      return;
    }

    if (file.size > maxFileSize) {
      toast.error("文件过大", {description: "最大文件大小为 5MB"});
      e.target.value = "";
      return;
    }

    setColorImages(prevColorImages => {
      setDeletedColors(prev => prev.filter(deletedColor => deletedColor !== color));
      const oldNewFile = prevColorImages[color];
      if (oldNewFile instanceof File && oldNewFile !== file) {
        const oldLocalUrl = colorImageUrls[color];
        if (oldLocalUrl && oldLocalUrl.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(oldLocalUrl);
          } catch (e) {
            console.warn("Failed to revoke old local URL on replace:", oldLocalUrl, e);
          }
        }
      }
      return {
        ...prevColorImages,
        [color]: file,
      };
    });
    e.target.value = "";
  }, [colorImageUrls]);

  const removeImage = useCallback((color: string) => {
    const urlToRemove = colorImageUrls[color];

    if (initialColorImageUrlsRef.current[color]) {
      setDeletedColors(prev => {
        if (!prev.includes(color)) {
          return [...prev, color];
        }
        return prev;
      });
    }

    setColorImages(prevColorImages => {
      const nextColorImages = {...prevColorImages};
      delete nextColorImages[color];
      return nextColorImages;
    });

    setColorImageUrls(prevColorImageUrls => {
      const nextColorImageUrls = {...prevColorImageUrls};
      delete nextColorImageUrls[color];
      return nextColorImageUrls;
    });

    if (urlToRemove && urlToRemove.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(urlToRemove);
      } catch (e) {
        console.warn("Failed to revoke URL on explicit removal:", urlToRemove, e);
      }
    }
  }, [initialColorImageUrlsRef, colorImageUrls]);

  const onSubmit = useCallback(async (data: ProductFormValues) => {
    if (!token) {
      toast.error("请先登录");
      router.push("/auth/login");
      return;
    }
    setIsSubmitting(true);
    const isEditing = !!param;
    const endpoint = isEditing ? `${API_URL}/api/products/edit/${param}` : `${API_URL}/api/products/add`;
    const method = isEditing ? 'PUT' : 'POST';
    try {
      const formData = new FormData();
      if (isEditing && param) {
        formData.append("id", param.toString());
        deletedColors.forEach(color => {
          formData.append('deletedColors', color)
        });
      }
      formData.append("name", data.name);
      formData.append("category", data.category);
      formData.append("description", data.description || "");
      const specificationsArray = Object.entries(specifications).map(([key, value]) => ({key, value}));
      formData.append("specificationsJson", JSON.stringify(specificationsArray));
      formData.append("featuresJson", JSON.stringify(features));
      variants.forEach((variant, index) => {
        if (variant.id)
          formData.append(`variants[${index}].id`, variant.id);
        formData.append(`variants[${index}].color`, variant.color);
        formData.append(`variants[${index}].size`, variant.size);
        formData.append(`variants[${index}].price`, variant.price.toString());
        formData.append(`variants[${index}].stockQuantity`, variant.stockQuantity.toString());
      });
      Object.entries(colorImages).forEach(([color, file]) => {
        if (file instanceof File)
          formData.append(`colorImages[${color}]`, file, file.name);
      });
      const res = await fetch(endpoint, {
        method: method,
        headers: {Authorization: `Bearer ${token}`},
        body: formData,
      });
      if (res.ok) {
        const successMessage = isEditing ? '商品更新成功' : '商品添加成功';
        toast.success(successMessage, {description: data.name});
        router.push("/account/merchant/products");
      } else {
        const errorText = await res.text();
        console.error(`API Error (${res.status}):`, errorText);
        if (res.status === 401) {
          toast.error("登录状态过期，请重新登录", {description: "请重新登录"});
          router.push("/auth/login");
        } else {
          const errorMessage = isEditing ? '商品更新失败' : '商品添加失败';
          try {
            const errorJson = JSON.parse(errorText);
            toast.error(errorMessage, {description: errorJson.message || JSON.stringify(errorJson)});
          } catch (e) {
            toast.error(errorMessage, {description: errorText || res.statusText});
          }
        }
      }
    } catch (error: any) {
      console.error("Submission error:", error);
      const errorMessage = isEditing ? '商品更新失败' : '商品添加失败';
      toast.error(errorMessage, {description: error.message || "网络请求失败"});
    } finally {
      setIsSubmitting(false);
    }
  }, [token, router, param, specifications, features, variants, colorImages]);

  if (isLoading && !isHydrated) {
    return (
      <div className="flex justify-center items-center min-h-60">
        <Loader2 className="mr-2 h-8 w-8 animate-spin"/>
        <span className="text-lg text-muted-foreground">
          {param ? "加载商品信息..." : "准备表单..."}
        </span>
      </div>
    );
  }

  if (!isHydrated && !isLoading) {
    return (
      <div className="flex justify-center items-center min-h-60 text-destructive">
        <p>加载商品信息失败或权限不足，请稍后再试或检查登录状态。</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="basic" className="w-full pl-4 pr-4">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="basic" disabled={isSubmitting}>基本信息</TabsTrigger>
        <TabsTrigger value="specifications" disabled={isSubmitting}>商品规格/特点</TabsTrigger>
        <TabsTrigger value="variants" disabled={isSubmitting}>商品款式</TabsTrigger>
      </TabsList>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pt-6">
          <TabsContent value="basic" className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>商品名称</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入商品名称" {...field} disabled={isSubmitting}/>
                    </FormControl>
                    <FormDescription>商品在商城中展示的名称。</FormDescription>
                    <FormMessage/>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>分类</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入商品分类，例如：服装、电子产品" {...field} disabled={isSubmitting}/>
                    </FormControl>
                    <FormDescription>商品的分类名称。</FormDescription>
                    <FormMessage/>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({field}) => (
                <FormItem>
                  <FormLabel>商品描述</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="请输入商品详细描述"
                      className="min-h-32 resize-none"
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    详细描述您的商品。这将帮助顾客了解您销售的商品。
                  </FormDescription>
                  <FormMessage/>
                </FormItem>
              )}
            />
          </TabsContent>
          <TabsContent value="specifications" className="space-y-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium">商品规格</h4>
                <p className="text-sm text-muted-foreground">添加商品的技术规格。</p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <FormLabel htmlFor="spec-key">规格项</FormLabel>
                          <Input
                            id="spec-key"
                            value={newSpecKey}
                            onChange={(e) => setNewSpecKey(e.target.value)}
                            disabled={isSubmitting}
                          />
                        </div>
                        <div className="space-y-2">
                          <FormLabel htmlFor="spec-value">规格值</FormLabel>
                          <div className="flex space-x-2">
                            <Input
                              id="spec-value"
                              value={newSpecValue}
                              onChange={(e) => setNewSpecValue(e.target.value)}
                              disabled={isSubmitting}
                            />
                            <Button
                              type="button"
                              size="icon"
                              onClick={addSpecification}
                              disabled={!newSpecKey.trim() || !newSpecValue.trim() || isSubmitting}
                            >
                              <Plus className="h-4 w-4"/>
                              <span className="sr-only">添加规格</span>
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
                      <h5 className="text-sm font-medium">当前规格</h5>
                      {Object.keys(specifications).length > 0 ? (
                        <div className="space-y-2">
                          {Object.entries(specifications).map(([key, value]) => (
                            <div
                              key={key}
                              className="flex items-center justify-between rounded-md border px-3 py-2"
                            >
                              <div>
                                <span className="font-medium">{key}:</span>{" "}
                                {value}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => removeSpecification(key)}
                                disabled={isSubmitting}
                              >
                                <Trash2 className="h-4 w-4"/>
                                <span className="sr-only">移除 {key}</span>
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">暂无规格项。</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            <Separator className="my-6"/>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium">商品特性</h4>
                <p className="text-sm text-muted-foreground">添加商品的特性或卖点。</p>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <h5 className="text-sm font-medium">添加新特性</h5>
                      <div className="space-y-2">
                        <FormLabel htmlFor="feature-value">特性值</FormLabel>
                        <div className="flex space-x-2">
                          <Input
                            id="feature-value"
                            value={newFeature}
                            onChange={(e) => setNewFeature(e.target.value)}
                            disabled={isSubmitting}
                          />
                          <Button
                            type="button"
                            size="icon"
                            onClick={addFeature}
                            disabled={!newFeature.trim() || features.includes(newFeature.trim()) || isSubmitting}
                          >
                            <Plus className="h-4 w-4"/>
                            <span className="sr-only">添加特性</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <h5 className="text-sm font-medium">当前特性</h5>
                      {features.length > 0 ? (
                        <div className="space-y-2">
                          {features.map((feature, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between rounded-md border px-3 py-2"
                            >
                              <div>
                                {feature}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => removeFeature(index)}
                                disabled={isSubmitting}
                              >
                                <Trash2 className="h-4 w-4"/>
                                <span className="sr-only">移除 {feature}</span>
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">暂无特性项。</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="variants" className="space-y-6">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium">商品图片</h4>
                <p className="text-sm text-muted-foreground">为每个颜色上传图片。</p>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {colors.map((color) => {
                  const imageUrl = colorImageUrls[color];
                  const isUploadDisabled = isSubmitting;
                  return (
                    <div
                      key={color}
                      className="group relative aspect-square overflow-hidden rounded-md border"
                    >
                      {imageUrl ? (
                        <>
                          <Image
                            src={imageUrl.startsWith("blob") ? imageUrl : `${API_URL}/api/image${imageUrl}`}
                            alt={`商品图片 - ${color}`}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            unoptimized={imageUrl.startsWith('blob:')}
                          />
                          <Button
                            variant="destructive"
                            size="icon"
                            type="button"
                            className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100 z-10"
                            onClick={() => removeImage(color)}
                            disabled={isUploadDisabled}
                          >
                            <X className="h-4 w-4"/>
                            <span className="sr-only">移除图片 {color}</span>
                          </Button>
                          <Badge className="absolute left-1 top-1 z-10">{color}</Badge>
                        </>
                      ) : (
                        <label
                          htmlFor={`image-upload-${color}`}
                          className={`flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border border-dashed text-muted-foreground hover:bg-accent hover:text-accent-foreground ${isUploadDisabled ? 'cursor-not-allowed opacity-50 hover:bg-transparent hover:text-muted-foreground' : ''}`}
                        >
                          <Upload className="mb-2 h-6 w-6"/>
                          <span className="text-xs">上传 {color}</span>
                          <Input
                            id={`image-upload-${color}`}
                            type="file"
                            accept="image/*"
                            multiple={false}
                            className="hidden"
                            onChange={(e) => handleImageUpload(e, color)}
                            disabled={isUploadDisabled}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
                {colors.length === 0 && (
                  <div
                    className="aspect-square rounded-md border border-dashed flex flex-col items-center justify-center text-muted-foreground opacity-50">
                    <Upload className="mb-2 h-6 w-6"/>
                    <span className="text-xs text-center">请添加颜色以上传图片</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                支持格式：JPEG, PNG, WebP。最大文件大小：5MB。 每种颜色仅保存一张图片。
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium">颜色</h4>
                  <p className="text-sm text-muted-foreground">添加商品的可选颜色。</p>
                </div>
                <div className="flex space-x-2">
                  <Input
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="输入颜色，如：红色"
                  />
                  <Button
                    type="button"
                    onClick={addColor}
                    disabled={!newColor.trim() || colors.includes(newColor.trim()) || isSubmitting}
                  >
                    添加
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {colors.length > 0 ? (
                    colors.map((color) => (
                      <Badge
                        key={color}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        {color}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 rounded-full p-0 hover:bg-destructive/20 hover:text-destructive"
                          onClick={() => removeColor(color)}
                          disabled={isSubmitting}
                        >
                          <X className="h-3 w-3"/>
                          <span className="sr-only">移除 {color}</span>
                        </Button>
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">暂无颜色添加。</p>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium">尺寸</h4>
                  <p className="text-sm text-muted-foreground">添加商品的可选尺寸。</p>
                </div>
                <div className="flex space-x-2">
                  <Input
                    value={newSize}
                    onChange={(e) => setNewSize(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="输入尺寸，如：M、大号"
                  />
                  <Button
                    type="button"
                    onClick={addSize}
                    disabled={!newSize.trim() || sizes.includes(newSize.trim()) || isSubmitting}
                  >
                    添加
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.length > 0 ? (
                    sizes.map((size) => (
                      <Badge
                        key={size}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1"
                      >
                        {size}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 rounded-full p-0 hover:bg-destructive/20 hover:text-destructive"
                          onClick={() => removeSize(size)}
                          disabled={isSubmitting}
                        >
                          <X className="h-3 w-3"/>
                          <span className="sr-only">移除 {size}</span>
                        </Button>
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">暂无尺寸添加。</p>
                  )}
                </div>
              </div>
            </div>
            <Separator className="my-6"/>
            <div className="space-y-4">
              {(colors && colors.length > 0) && (sizes && sizes.length > 0) ? (
                <>
                  <div>
                    <h4 className="text-sm font-medium">组合配置</h4>
                    <p className="text-sm text-muted-foreground">
                      为每个颜色和尺寸的组合配置具体的价格和库存。
                    </p>
                  </div>
                  <div className="border rounded-md overflow-auto dark:bg-black">
                    <table className="min-w-full divide-y divide-gray-200 dark:bg-black">
                      <thead className="bg-gray-50 dark:bg-black sticky top-0 z-10">
                      <tr>
                        <th scope="col"
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-200 uppercase tracking-wider">颜色
                        </th>
                        <th scope="col"
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-200 uppercase tracking-wider">尺寸
                        </th>
                        <th scope="col"
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-200 uppercase tracking-wider w-1/4">价格
                        </th>
                        <th scope="col"
                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-neutral-200 uppercase tracking-wider w-1/4">库存
                        </th>
                      </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 dark:bg-black">
                      {variants.slice().sort((a, b) => {
                        const colorComparison = a.color.localeCompare(b.color);
                        if (colorComparison !== 0) return colorComparison;
                        return a.size.localeCompare(b.size);
                      }).map((variant) => {
                        const key = variant.id || `${variant.color}_${variant.size}`;
                        return (
                          <tr key={key}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">{variant.color}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">{variant.size}</td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <Input
                                type="number"
                                placeholder="价格"
                                value={variant.price}
                                onChange={(e) => {
                                  const newPrice = parseFloat(e.target.value) || 0;
                                  setVariants((prevVariants) =>
                                    prevVariants.map((v) =>
                                      v.color === variant.color && v.size === variant.size
                                        ? {...v, price: newPrice}
                                        : v
                                    )
                                  );
                                }}
                                className="w-full text-sm"
                                disabled={isSubmitting}
                              />
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                              <Input
                                type="number"
                                placeholder="库存"
                                value={variant.stockQuantity}
                                onChange={(e) => {
                                  const newStock = parseInt(e.target.value, 10) || 0;
                                  setVariants((prevVariants) =>
                                    prevVariants.map((v) =>
                                      v.color === variant.color && v.size === variant.size
                                        ? {...v, stockQuantity: newStock}
                                        : v
                                    )
                                  );
                                }}
                                className="w-full text-sm"
                                disabled={isSubmitting}
                              />
                            </td>
                          </tr>
                        );
                      })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div>
                  <h4 className="text-sm font-medium">款式组合配置</h4>
                  <p className="text-sm text-muted-foreground">
                    请先添加颜色和尺寸，然后在此配置每种款式的价格和库存。
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
          <Separator/>
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/account/merchant/products")}
              disabled={isSubmitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                  {param ? "更新中..." : "创建中..."}
                </>
              ) : param ? (
                "更新商品"
              ) : (
                "创建商品"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </Tabs>
  );
}