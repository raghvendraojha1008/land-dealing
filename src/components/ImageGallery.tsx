import { useState } from "react";
import { ChevronLeft, ChevronRight, Images } from "lucide-react";

interface ImageGalleryProps {
  images: string[];
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="h-48 bg-muted flex items-center justify-center text-muted-foreground">
        No Image
      </div>
    );
  }

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="relative h-48 bg-muted group">
      <img
        src={images[currentIndex]}
        alt="Land"
        className="w-full h-full object-cover transition-opacity duration-300"
      />
      {images.length > 1 && (
        <>
          <div className="absolute inset-0 flex items-center justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={prev}
              className="bg-black/50 hover:bg-black/70 text-white p-1 rounded-full backdrop-blur-sm"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={next}
              className="bg-black/50 hover:bg-black/70 text-white p-1 rounded-full backdrop-blur-sm"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {images.map((_, idx) => (
              <div
                key={idx}
                className={`w-1.5 h-1.5 rounded-full shadow-sm gallery-dot ${
                  idx === currentIndex ? "bg-white scale-125" : "bg-white/50"
                }`}
              />
            ))}
          </div>
          <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm">
            <Images size={10} /> {currentIndex + 1}/{images.length}
          </div>
        </>
      )}
    </div>
  );
}
