"use client";
import { motion, useAnimation } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useEffect } from "react";

const ScrollAnimationWrapper = ({
  children,
  direction = "up",
  className,
}: {
  children: React.ReactNode;
  direction?: "left" | "right" | "up" | "down";
  className?: string;
}) => {
  const controls = useAnimation();
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  useEffect(() => {
    if (inView) {
      controls.start("visible");
    }
  }, [controls, inView]);

  // Define hidden states for each direction
  const hiddenStates = {
    up: { opacity: 0, y: 100 },
    down: { opacity: 0, y: -100 },
    left: { opacity: 0, x: 100 },
    right: { opacity: 0, x: -100 },
    // up: { opacity: 0, y: 0 },
    // down: { opacity: 0, y: 0 },
    // left: { opacity: 0, x: 0 },
    // right: { opacity: 0, x: 0 },
  };

  return (
    <motion.div
      className={className}
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={{
        hidden: hiddenStates[direction],
        visible: {
          opacity: 1,
          y: direction === "up" || direction === "down" ? 0 : undefined,
          x: direction === "left" || direction === "right" ? 0 : undefined,
        },
      }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
};

export default ScrollAnimationWrapper;
