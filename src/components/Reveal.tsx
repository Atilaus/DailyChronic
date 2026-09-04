import { createElement, useEffect, useRef, type ReactNode, type Ref } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "article" | "section" | "li";
}

export default function Reveal({ children, className, delay = 0, as = "div" }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("is-in");
            io.disconnect();
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return createElement(
    as,
    {
      ref: ref as Ref<HTMLElement>,
      className: `reveal ${className ?? ""}`,
      style: delay ? { transitionDelay: `${delay}ms` } : undefined,
    },
    children
  );
}
