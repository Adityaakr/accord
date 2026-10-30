import { usePageMeta } from "../lib/meta"
import { PageHero } from "../components/PageHero"
import styles from "./NotFound.module.css"

/* ------------------------------------------------------------------
   404 page (WebPageNode Nvv2EHdv3, path /404)
   Desktop breakpoint HA67beE5U; Tablet B1YGR0tf7; Phone MhxH5_TrV.
   The breakpoint uses layout template vLUWo2njy: Nav/Footer/Smooth Scroll (yRqIxnNkw) are provided by App.tsx.
   Main hIwfdG7eE is the PageHero shell (its geometry and timings were copied from this page):
   Tag "404" + Title + Description (word reveal) + Button B5NiqNbhX (Secondary, "Back to home" → "/").
   The footer pins to the bottom of short viewports through App `.content` (flex 1 0 auto).
------------------------------------------------------------------- */
export function NotFound() {
  usePageMeta("Accord: Not found", "There is no deal room at this address.")
  return (
    <div className={styles.page}>
      <PageHero
        pill="404"
        title="There is no deal room at this address."
        lead="Check the link, or start from the homepage or the public record."
        actions={[{ label: "Back to home", href: "/", variant: "primary" }, { label: "View the record", href: "/record", variant: "secondary" }]}
      />
    </div>
  )
}
