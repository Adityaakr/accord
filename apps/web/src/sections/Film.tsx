import { useRef, useState } from "react"
import { Appear, EASE_APPEAR, type AppearEffect } from "../lib/motion"
import { LogoMark } from "../components/Logo"
import styles from "./Film.module.css"

/* Home · The film (#film), directly under the hero: the 2:41 launch film in a framed player. The cover is a still of
   the film's opening; one press plays it with sound and native controls. preload="none" so the 16 MB file loads
   only when someone presses play. Served by the site (public/media), byte ranges answered by scripts/serve.mjs. */

const rise: AppearEffect = {
  threshold: 0.2,
  replay: false,
  enter: { opacity: 0, x: 0, y: 24, scale: 1, rotate: 0, transition: { type: "tween", ease: EASE_APPEAR, duration: "1s", delay: "0.1s" } },
}

export function Film() {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const play = () => {
    const v = ref.current
    if (!v) return
    setPlaying(true)
    void v.play().catch(() => setPlaying(false))
  }
  return (
    <section id="film" className={`section ${styles.section}`} aria-label="The Accord film">
      <Appear className={styles.wrap} effect={rise}>
        <div className={styles.head}>
          <span className={styles.tag}><span className={styles.mark} aria-hidden="true"><LogoMark size={13} /></span><span className="t-body-sm">The film · 2:41</span></span>
          <span className={`t-body-sm ${styles.note}`}>The deal room, a refused payment and market making, recorded on NEAR testnet.</span>
        </div>
        <div className={styles.frame}>
          <video
            ref={ref}
            className={styles.video}
            src="/media/accord-film.mp4"
            poster="/media/accord-film-cover.jpg"
            preload="none"
            playsInline
            controls={playing}
            onEnded={() => setPlaying(false)}
          />
          {!playing ? (
            <button type="button" className={styles.play} onClick={play} aria-label="Play the Accord film, 2 minutes 41 seconds">
              <span className={styles.playText}>Watch the film <span>2:41</span></span>
            </button>
          ) : null}
        </div>
      </Appear>
    </section>
  )
}
