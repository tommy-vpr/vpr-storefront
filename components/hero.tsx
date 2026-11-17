"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation, EffectFade } from "swiper/modules";

import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import "swiper/css/effect-fade";

type Slide = {
  src: string;
  alt: string;
  href?: string | null;
};

/** Site → Homepage → Hero slider. */
const Hero = ({ slides }: { slides: Slide[] }) => {
  if (!slides.length) return null;
  return (
    /* Full-bleed: no rounding and no side margin, so the slider meets the
       viewport edges. The rounded-xl that used to be here only made sense
       inside the centred container. */
    <section className="hero-swiper mb-12 w-full overflow-hidden">
      <Swiper
        modules={[Autoplay, Pagination, Navigation, EffectFade]}
        effect="fade"
        fadeEffect={{ crossFade: true }}
        loop
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        pagination={{ clickable: true }}
        navigation
        className="h-[60vh] min-h-[280px] w-full overflow-hidden"
      >
        {slides.map((slide, i) => (
          <SwiperSlide key={slide.src + i} className="relative">
            {slide.href ? (
              <Link href={slide.href} className="absolute inset-0 z-10" aria-label={slide.alt} />
            ) : null}
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover"
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
};

export default Hero;
