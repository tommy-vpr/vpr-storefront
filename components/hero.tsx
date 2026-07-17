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
  eyebrow?: string;
  heading: string;
  subheading?: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** darken the image so overlaid text stays legible */
  dark?: boolean;
};

const SLIDES: Slide[] = [
  {
    src: "/images/VPR-web_banners_2.webp",
    alt: "SKWEZED wholesale collection",
    eyebrow: "Now stocking",
    heading: "SKWEZED — Tastes Just Like It",
    subheading: "Wholesale pricing. Free shipping on every order.",
    ctaLabel: "Shop SKWEZED",
    ctaHref: "/collections",
  },
  {
    src: "/images/VPR-web_banners.webp",
    alt: "iJoy x SKWEZED collection",
    eyebrow: "New collab",
    heading: "iJoy \u00d7 SKWEZED",
    subheading: "Transparent pricing and a 90-day buy-back policy.",
    ctaLabel: "Browse the drop",
    ctaHref: "/collections",
  },
];

const Hero = () => {
  return (
    <section className="hero-swiper mb-12 w-full">
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
        {SLIDES.map((slide, i) => (
          <SwiperSlide key={slide.src} className="relative">
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
