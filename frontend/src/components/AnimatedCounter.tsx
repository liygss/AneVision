import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  decimals?: number;
  duration?: number;
  suffix?: string;
  className?: string;
}

export default function AnimatedCounter({
  value,
  decimals = 1,
  duration = 1200,
  suffix = "",
  className = "",
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * value);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {display.toFixed(decimals)}{suffix}
    </motion.span>
  );
}
