"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import { Expand, X } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { API_URL } from "@/lib/api";

export function ProductGallery({images}: { images: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)
  const [zoomPosition, setZoomPosition] = useState({x: 0, y: 0})
  const [isFullscreen, setIsFullscreen] = useState(false)

  const handleZoom = () => {
    setIsZoomed(!isZoomed)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return

    const {left, top, width, height} = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - left) / width) * 100
    const y = ((e.clientY - top) / height) * 100

    setZoomPosition({x, y})
  }

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
    setIsZoomed(false)
  }

  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index)
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div
          className={cn(
            "group relative aspect-square overflow-hidden rounded-lg border bg-background",
            isZoomed && "cursor-zoom-out",
            !isZoomed && "cursor-zoom-in",
          )}
          onClick={handleZoom}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => isZoomed && setIsZoomed(false)}
        >
          <Image
            src={`${API_URL}/api/image${images[currentIndex]}` || "/placeholder.svg"}
            alt="Product image"
            fill
            className={cn("object-cover transition-transform", isZoomed && "scale-150")}
            style={
              isZoomed
                ? {
                  transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                }
                : undefined
            }
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 z-10 rounded-full bg-background/80 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
              handleFullscreen()
            }}
          >
            <Expand className="h-5 w-5"/>
            <span className="sr-only">View fullscreen</span>
          </Button>
        </div>

        <div className="flex gap-2 pb-1">
          {images.map((image, index) => (
            <button
              key={index}
              className={cn(
                "relative aspect-square h-20 overflow-hidden rounded-md border",
                currentIndex === index && "ring-2 ring-primary ring-offset-2",
              )}
              onClick={() => handleThumbnailClick(index)}
            >
              <Image
                src={`${API_URL}/api/image${image}` || "/placeholder.svg"}
                alt={`Product thumbnail ${index + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{opacity: 0}}
            animate={{opacity: 1}}
            exit={{opacity: 0}}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-4 z-50 rounded-full bg-background/80 backdrop-blur-sm"
              onClick={handleFullscreen}
            >
              <X className="h-6 w-6"/>
              <span className="sr-only">Close fullscreen</span>
            </Button>

            <Carousel className="w-full max-w-4xl">
              <CarouselContent>
                {images.map((image, index) => (
                  <CarouselItem key={index}>
                    <div className="relative aspect-square overflow-hidden rounded-lg">
                      <Image
                        src={`${API_URL}/api/image${images[currentIndex]}` || "/placeholder.svg"}
                        alt={`Product image ${index + 1}`}
                        fill
                        className="object-contain"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious/>
              <CarouselNext/>
            </Carousel>

            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  className={cn(
                    "h-2 w-2 rounded-full bg-muted transition-colors",
                    index === currentIndex && "bg-primary",
                  )}
                  onClick={() => setCurrentIndex(index)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
