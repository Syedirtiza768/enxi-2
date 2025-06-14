'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download } from 'lucide-react';

interface ImageItem {
  id: string;
  url: string;
  alt?: string;
  title?: string;
  description?: string;
  width?: number;
  height?: number;
}

interface ImageGalleryProps {
  images: ImageItem[];
  className?: string;
  columns?: number;
  gap?: number;
  showThumbnails?: boolean;
  enableZoom?: boolean;
  enableDownload?: boolean;
  onImageClick?: (image: ImageItem, index: number) => void;
}

/**
 * Image Gallery component
 * Displays a grid of images with lightbox functionality
 */
export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  className,
  columns = 3,
  gap = 4,
  showThumbnails = true,
  enableZoom = true,
  enableDownload = true,
  onImageClick,
}): void => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  const handleImageClick = useCallback((index: number) => {
    setSelectedIndex(index);
    setZoom(1);
    onImageClick?.(images[index], index);
  }, [images, onImageClick]);

  const handleClose = useCallback(() => {
    setSelectedIndex(null);
    setZoom(1);
  }, []);

  const handlePrevious = useCallback(() => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
      setZoom(1);
    }
  }, [selectedIndex]);

  const handleNext = useCallback(() => {
    if (selectedIndex !== null && selectedIndex < images.length - 1) {
      setSelectedIndex(selectedIndex + 1);
      setZoom(1);
    }
  }, [selectedIndex, images.length]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleDownload = useCallback((image: ImageItem) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.title || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (selectedIndex === null) return;
    
    switch (e.key) {
      case 'Escape':
        handleClose();
        break;
      case 'ArrowLeft':
        handlePrevious();
        break;
      case 'ArrowRight':
        handleNext();
        break;
      case '+':
        handleZoomIn();
        break;
      case '-':
        handleZoomOut();
        break;
    }
  }, [selectedIndex, handleClose, handlePrevious, handleNext, handleZoomIn, handleZoomOut]);

  React.useEffect(() => {
    if (selectedIndex !== null) {
      document.addEventListener('keydown', handleKeyDown);
      return (): void => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedIndex, handleKeyDown]);

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(${columns}, 1fr)`,
    gap: `${gap * 0.25}rem`,
  };

  return (
    <>
      {/* Gallery Grid */}
      <div
        className={cn('image-gallery', className)}
        style={gridStyle}
      >
        {images.map((image, index) => (
          <div
            key={image.id}
            className="relative group cursor-pointer overflow-hidden rounded-lg bg-gray-100"
            onClick={(): void => handleImageClick(index)}
          >
            <div className="relative aspect-square">
              <Image
                src={image.url}
                alt={image.alt || image.title || ''}
                fill
                className="object-cover transition-transform group-hover:scale-110"
                sizes={`(max-width: 768px) 100vw, ${100 / columns}vw`}
              />
            </div>
            {image.title && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-sm font-medium">{image.title}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selectedIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
          >
            <X size={32} />
          </button>

          {/* Navigation */}
          {selectedIndex > 0 && (
            <button
              onClick={handlePrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300"
            >
              <ChevronLeft size={48} />
            </button>
          )}
          
          {selectedIndex < images.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300"
            >
              <ChevronRight size={48} />
            </button>
          )}

          {/* Main Image */}
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <div
              className="relative overflow-hidden"
              style={{ transform: `scale(${zoom})` }}
            >
              <Image
                src={images[selectedIndex].url}
                alt={images[selectedIndex].alt || images[selectedIndex].title || ''}
                width={images[selectedIndex].width || 1200}
                height={images[selectedIndex].height || 800}
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>

            {/* Image Info */}
            {(images[selectedIndex].title || images[selectedIndex].description) && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6 text-white">
                {images[selectedIndex].title && (
                  <h3 className="text-xl font-semibold mb-2">{images[selectedIndex].title}</h3>
                )}
                {images[selectedIndex].description && (
                  <p className="text-sm opacity-90">{images[selectedIndex].description}</p>
                )}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 rounded-lg p-2">
            {enableZoom && (
              <>
                <button
                  onClick={handleZoomOut}
                  className="text-white hover:text-gray-300 p-2"
                  disabled={zoom <= 0.5}
                >
                  <ZoomOut size={20} />
                </button>
                <span className="text-white text-sm">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={handleZoomIn}
                  className="text-white hover:text-gray-300 p-2"
                  disabled={zoom >= 3}
                >
                  <ZoomIn size={20} />
                </button>
              </>
            )}
            
            {enableDownload && (
              <button
                onClick={(): void => handleDownload(images[selectedIndex])}
                className="text-white hover:text-gray-300 p-2"
              >
                <Download size={20} />
              </button>
            )}
          </div>

          {/* Thumbnails */}
          {showThumbnails && images.length > 1 && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 max-w-[80vw] overflow-x-auto">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={(): void => setSelectedIndex(index)}
                  className={cn(
                    'relative w-16 h-16 rounded overflow-hidden border-2 transition-all',
                    selectedIndex === index
                      ? 'border-white'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  )}
                >
                  <Image
                    src={image.url}
                    alt={image.alt || ''}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Counter */}
          <div className="absolute top-4 left-4 text-white text-sm">
            {selectedIndex + 1} / {images.length}
          </div>
        </div>
      )}
    </>
  );
};

// Default export for dynamic imports
export default ImageGallery;