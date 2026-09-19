"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Deliberately scoped to the Marquesano pages, preserving the demo identities.
const targets = [
  ".serviceChip", ".mechanismIntro", ".mechanismCard", ".portfolioV12Head",
  ".portfolioV12Card", ".matchCopyV12", ".mosaicCardV12", ".quarterlyReviewCopy",
  ".quarterlyReviewDetails", ".sectionIntro", ".planCard", ".faqList > details",
  ".finalCtaTextV12", ".finalCtaPortrait", ".homeContactForm > div",
  ".projectItem", ".refinedPlans > article", ".serviceEditorial > article",
  ".processBand", ".aboutEditorial > div", ".contactEditorial > aside",
  ".commercialClosing"
].join(",");

export default function SiteMotion() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.querySelector("main.home, main.commercialPage");
    if (!root) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const nodes = Array.from(root.querySelectorAll(targets));
    const header = root.querySelector(".commercialNav");
    let observer;
    let frame = 0;
    const updateHeader = () => {
      header?.classList.toggle("navScrolled", window.scrollY > 16);
      frame = 0;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(updateHeader); };
    function configure() {
      observer?.disconnect();
      nodes.forEach(node => {
        node.classList.remove("motionEnter");
        node.style.removeProperty("--motion-delay");
      });
      if (preference.matches || !("IntersectionObserver" in window)) return;
      observer = new IntersectionObserver(entries => {
        const groups = new Map();
        for (const { target, isIntersecting } of entries) {
          if (!isIntersecting) continue;
          const index = groups.get(target.parentElement) || 0;
          groups.set(target.parentElement, index + 1);
          target.style.setProperty("--motion-delay", `${Math.min(index, 3) * 65}ms`);
          target.classList.add("motionEnter");
          observer.unobserve(target);
        }
      }, { threshold: 0.08 });
      nodes.forEach(node => observer.observe(node));
    }
    configure();
    updateHeader();
    preference.addEventListener("change", configure);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      preference.removeEventListener("change", configure);
      window.removeEventListener("scroll", onScroll);
      header?.classList.remove("navScrolled");
      nodes.forEach(node => {
        node.classList.remove("motionEnter");
        node.style.removeProperty("--motion-delay");
      });
    };
  }, [pathname]);
  return null;
}
