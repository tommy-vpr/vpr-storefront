"use client";

import { cn } from "@/lib/utils";
import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { motion, AnimatePresence } from "motion/react";

import { useEffect, useState } from "react";

type Testimonial = {
  quote: string;
  name: string;
  designation: string;
  src: string;
  bgColor?: string;
  /** Set true if the background is dark so text switches to light */
  darkBg?: boolean;
};

export const AnimatedTestimonials = ({
  testimonials,
  autoplay = false,
}: {
  testimonials: Testimonial[];
  autoplay?: boolean;
}) => {
  const [active, setActive] = useState(0);
  const activeBg = testimonials[active]?.bgColor;
  const isDark = testimonials[active]?.darkBg ?? false;

  const handleNext = () => {
    setActive((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrev = () => {
    setActive((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const isActive = (index: number) => {
    return index === active;
  };

  useEffect(() => {
    if (autoplay) {
      const interval = setInterval(handleNext, 5000);
      return () => clearInterval(interval);
    }
  }, [autoplay]);

  /**
   * Rotation for the scattered-card effect.
   *
   * Deterministic, derived from the card's index. This previously used
   * Math.random(), which produced a different value on the server than on the
   * client and broke hydration on every page load — React cannot reconcile a
   * style attribute that changed between SSR and the first client render.
   *
   * The multiplier is coprime with the modulus so consecutive cards get
   * visibly different angles rather than a repeating pattern. Range is
   * -10..10, matching the previous random spread.
   */
  const rotateFor = (index: number) => ((index * 13) % 21) - 10;

  return (
    // Outer: full-width colored background
    <div
      className={cn(
        "w-full px-4 py-20 font-sans antialiased transition-colors duration-500 md:px-8 lg:px-12",
        activeBg,
      )}
    >
      {/* Inner: centered content */}
      <div className="mx-auto max-w-sm md:max-w-4xl">
        <div className="relative grid grid-cols-1 gap-20 md:grid-cols-2">
          <div>
            <div className="relative h-80 w-full">
              <AnimatePresence>
                {testimonials.map((testimonial, index) => (
                  <motion.div
                    key={testimonial.src}
                    initial={{
                      opacity: 0,
                      scale: 0.9,
                      z: -100,
                      rotate: rotateFor(index),
                    }}
                    animate={{
                      opacity: isActive(index) ? 1 : 0.7,
                      scale: isActive(index) ? 1 : 0.95,
                      z: isActive(index) ? 0 : -100,
                      rotate: isActive(index) ? 0 : rotateFor(index),
                      zIndex: isActive(index)
                        ? 40
                        : testimonials.length + 2 - index,
                      y: isActive(index) ? [0, -80, 0] : 0,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.9,
                      z: 100,
                      rotate: rotateFor(index),
                    }}
                    transition={{
                      duration: 0.4,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-0 origin-bottom"
                  >
                    <img
                      src={testimonial.src}
                      alt={testimonial.name}
                      width={500}
                      height={500}
                      draggable={false}
                      className="h-full w-full rounded-3xl object-cover object-center"
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex flex-col justify-between py-4">
            <motion.div
              key={active}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <h3
                className={cn(
                  "text-2xl font-bold transition-colors duration-500",
                  isDark ? "text-white" : "text-black",
                )}
              >
                {testimonials[active].name}
              </h3>
              <p
                className={cn(
                  "text-sm transition-colors duration-500",
                  isDark ? "text-neutral-300" : "text-gray-600",
                )}
              >
                {testimonials[active].designation}
              </p>
              <motion.p
                className={cn(
                  "mt-8 text-lg transition-colors duration-500",
                  isDark ? "text-neutral-200" : "text-gray-700",
                )}
              >
                {testimonials[active].quote.split(" ").map((word, index) => (
                  <motion.span
                    key={index}
                    initial={{ filter: "blur(10px)", opacity: 0, y: 5 }}
                    animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.2,
                      ease: "easeInOut",
                      delay: 0.02 * index,
                    }}
                    className="inline-block"
                  >
                    {word}&nbsp;
                  </motion.span>
                ))}
              </motion.p>
            </motion.div>

            <div className="flex gap-4 pt-12 md:pt-0">
              <button
                onClick={handlePrev}
                aria-label="Previous testimonial"
                className={cn(
                  "group/button flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-500",
                  isDark
                    ? "bg-white/10 hover:bg-white/20"
                    : "bg-black/10 hover:bg-black/20",
                )}
              >
                <IconArrowLeft
                  className={cn(
                    "h-5 w-5 transition-transform duration-300 group-hover/button:rotate-12",
                    isDark ? "text-white" : "text-black",
                  )}
                />
              </button>
              <button
                onClick={handleNext}
                aria-label="Next testimonial"
                className={cn(
                  "group/button flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-500",
                  isDark
                    ? "bg-white/10 hover:bg-white/20"
                    : "bg-black/10 hover:bg-black/20",
                )}
              >
                <IconArrowRight
                  className={cn(
                    "h-5 w-5 transition-transform duration-300 group-hover/button:-rotate-12",
                    isDark ? "text-white" : "text-black",
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
