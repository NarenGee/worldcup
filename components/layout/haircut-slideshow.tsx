"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { HAIRCUT_SLIDES, type HaircutSlide } from "@/lib/haircuts";

const INTERVAL_MS = 8000;
const FADE_MS = 2000;

function shuffleSlides(slides: HaircutSlide[]): HaircutSlide[] {
  const copy = [...slides];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function HaircutSlideshow() {
  const [slides, setSlides] = useState(HAIRCUT_SLIDES);
  const [slideIndices, setSlideIndices] = useState<[number, number]>([0, 1]);
  const [activeLayer, setActiveLayer] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const stateRef = useRef({ activeLayer: 0, indices: [0, 1] as [number, number] });

  useEffect(() => {
    setSlides(shuffleSlides(HAIRCUT_SLIDES));

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion || slides.length <= 1) return;

    const id = window.setInterval(() => {
      const { activeLayer: currentLayer, indices } = stateRef.current;
      const nextLayer = 1 - currentLayer;
      const nextSlide = (indices[currentLayer] + 1) % slides.length;
      const newIndices: [number, number] = [...indices];
      newIndices[nextLayer] = nextSlide;
      stateRef.current = { activeLayer: nextLayer, indices: newIndices };
      setSlideIndices(newIndices);
      setActiveLayer(nextLayer);
    }, INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [reducedMotion, slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const upcoming =
      slides[(slideIndices[activeLayer] + 1) % slides.length]?.src;
    if (!upcoming) return;
    const img = new window.Image();
    img.src = upcoming;
  }, [activeLayer, slideIndices, slides]);

  const visibleIndex = slideIndices[activeLayer];
  const visibleSlide = slides[visibleIndex];

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {[0, 1].map((layer) => {
        const slide = slides[slideIndices[layer]];
        if (!slide) return null;
        const isActive = layer === activeLayer;

        return (
          <div
            key={layer}
            className="absolute inset-0 transition-opacity ease-in-out"
            style={{
              opacity: isActive ? 1 : 0,
              transitionDuration: `${FADE_MS}ms`,
            }}
          >
            <Image
              src={slide.src}
              alt=""
              fill
              priority={layer === 0 && slideIndices[0] === 0}
              sizes="100vw"
              className={`object-cover ${isActive && !reducedMotion ? "haircut-slide-image" : ""}`}
            />
          </div>
        );
      })}

      <div className="instrument-bg-overlay absolute inset-0" />

      {visibleSlide && (
        <p
          className="instrument-meta absolute bottom-4 left-4 max-w-[min(70vw,20rem)] text-muted-foreground/80 transition-opacity duration-1000 sm:bottom-6 sm:left-6"
          style={{ opacity: reducedMotion ? 0.6 : 0.85 }}
        >
          {visibleSlide.label}
        </p>
      )}
    </div>
  );
}
