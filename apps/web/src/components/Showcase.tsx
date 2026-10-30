import { useState, type ReactNode } from "react"
import { motion } from "motion/react"
import { SPRING_UI } from "../lib/motion"
import { ShowcaseAccordion } from "./ShowcaseAccordion"
import styles from "./Showcase.module.css"

/* Framer "Showcase" component (e8KEhUs8c): 10 variants:
   Desktop "1".."5" = lFM1FmVJN (primary) / YRNCa9Kip / qmZvvS6qC / VfCs_uYUy / gg1No4ReI
   Mobile  "1".."5" = IXkggha3r / cunO9PtgJ / hj23uBn1v / LsoNDAkya / gsqGEn9Rs
   Variant N = accordion N Open (others Closed) + Image N opacity 1 (others 0).
   Each accordion's Click event → SET_VARIANT <variant N> (desktop ids on desktop variants,
   mobile ids on mobile variants). No onAppear / delayed actions → no auto-advance.
   Root variant transition: spring 0.4s bounce 0.2 (image crossfade).
   Accordion open/close animates with the accordion's own tween 0.4s [0.12,0.23,0.5,1].
   Layout: desktop = horizontal stack gap 24, height 410, overflow hidden, align/justify center;
           mobile  = vertical stack gap 16, height auto, Images first (aspect 1.29), accordions gap 8.
   Data-driven: `items` (N accordions ↔ N images, same variant/crossfade logic); defaults to the template's five. */
export type ShowcaseItem = { id: string; title: ReactNode; description: ReactNode; aside?: ReactNode; image: string }

const ITEMS: ShowcaseItem[] = [
  { id: "gcgI0_bUk", title: "Automate your workflows", description: "Build or use predefined workflows to manage investments, track performance, and adapt efficiently to market conditions.", image: "/assets/showcase-image-1.png" },
  { id: "HTRHgyK5f", title: "Access prompt library", description: "Explore a curated prompt library to accelerate research, generate insights, and support smarter investing decisions.", image: "/assets/showcase-image-2.png" },
  { id: "XjpLIVHRa", title: "Manage finance agents", description: "Configure and manage financial agents that automate tasks, monitor signals, and support ongoing investment operations.", image: "/assets/showcase-image-3.png" },
  { id: "DUwVrHG2y", title: "Chat with data source", description: "Interact directly with your data sources to analyze trends, uncover insights, and guide investment decisions faster.", image: "/assets/showcase-image-4.png" },
  { id: "VsOrToXRO", title: "Connect to internal systems", description: "Integrate internal tools and data infrastructure to streamline workflows and maintain consistency across financial operations.", image: "/assets/showcase-image-5.png" },
]

export function Showcase({ items = ITEMS, className = "" }: { items?: ShowcaseItem[]; className?: string }) {
  const [active, setActive] = useState(0)
  return (
    <div className={`${styles.root} ${className}`}>
      {/* Showcase accordions (pZ8ok7Kaq) */}
      <div className={styles.accordions}>
        {items.map((item, i) => (
          <ShowcaseAccordion
            key={item.id}
            title={item.title}
            description={item.description}
            aside={item.aside}
            open={i === active}
            onClick={() => setActive(i)}
          />
        ))}
      </div>
      {/* Images (vdskbTAZm): absolute 100%×100% frames, DOM order N→1, opacity crossfade */}
      <div className={styles.images} aria-hidden="true">
        {[...items].reverse().map((item, ri) => {
          const i = items.length - 1 - ri
          return (
            <motion.div
              key={item.id}
              className={styles.image}
              style={{ backgroundImage: `url("${item.image}")` }}
              initial={false}
              animate={{ opacity: i === active ? 1 : 0 }}
              transition={SPRING_UI}
            />
          )
        })}
      </div>
    </div>
  )
}
