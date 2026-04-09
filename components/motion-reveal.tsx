"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type MotionRevealProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  delay?: number;
  as?: "div" | "section" | "aside";
  once?: boolean;
};

export function MotionReveal({
  children,
  className,
  delay = 0,
  as = "div",
  once = true,
  style,
  ...rest
}: MotionRevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) {
            observer.disconnect();
          }
        } else if (!once) {
          setVisible(false);
        }
      },
      {
        threshold: 0.16,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [once]);

  const Component = as as "div";

  return (
    <Component
      ref={(node) => {
        ref.current = node;
      }}
      className={cn("motion-reveal", visible && "is-visible", className)}
      style={{ transitionDelay: `${delay}ms`, ...style }}
      {...rest}
    >
      {children}
    </Component>
  );
}
