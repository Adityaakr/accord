import { Inline } from "./Inline"
import { QuietLink } from "../../components/QuietLink"
import { CopyButton } from "../../components/CopyButton"
import { DOC_IMAGES } from "../../content/docs/images"
import type { DocBlock, DocImage } from "../../content/docs/types"
import { HeroPreview } from "../../components/HeroPreview"
import { KitFigure } from "../../components/KitFigure"
import gatesSvg from "../../assets/diagrams/gates.svg?raw"
import tl from "../../styles/Timeline.module.css"
import styles from "./Docs.module.css"

/* Renders one docs block in the timeline language: numbered rows, steps with screenshots, code with copy, claims
   beside their limits. Red only for a refusal or a revocation (tone "refused"). */

const n2 = (i: number) => String(i + 1).padStart(2, "0")

export function Figure({ image }: { image: DocImage }) {
  const meta = DOC_IMAGES[image.id]
  return (
    <figure className={`${styles.figure} ${meta.w < 600 ? styles.figureNarrow : ""}`}>
      <img src={`/docs/${image.id}.webp`} width={meta.w} height={meta.h} alt={image.alt} loading="lazy" decoding="async" />
      {image.caption ? <figcaption><Inline text={image.caption} /></figcaption> : null}
    </figure>
  )
}

export function Block({ b }: { b: DocBlock }) {
  switch (b.kind) {
    case "p":
      return <p className={styles.p}><Inline text={b.text} /></p>
    case "note":
      return <p className={styles.callout}><Inline text={b.text} /></p>
    case "image":
      return <Figure image={b.image} />
    case "pair":
      return (
        <figure className={styles.pair}>
          <div className={styles.pairImages}>
            {b.images.map((im) => {
              const meta = DOC_IMAGES[im.id]
              return <img key={im.id} src={`/docs/${im.id}.webp`} width={meta.w} height={meta.h} alt={im.alt} loading="lazy" decoding="async" />
            })}
          </div>
          {b.caption ? <figcaption><Inline text={b.caption} /></figcaption> : null}
        </figure>
      )
    case "figure":
      return (
        <figure className={styles.figure}>
          {b.figure === "hero" ? <div className={styles.heroFrame}><HeroPreview /></div> : <KitFigure svg={gatesSvg} minWidth={680} />}
          <figcaption><Inline text={b.caption} /></figcaption>
        </figure>
      )
    case "code":
      return (
        <div className={styles.code}>
          {b.label ? <p className={styles.codeLabel}><span>{b.label}</span><CopyButton text={b.code} label={b.label} /></p> : null}
          <div className={styles.codeBody}>
            <pre className="mono">{b.code}</pre>
            {b.label ? null : <CopyButton text={b.code} label="this code" className={styles.codeCopy} />}
          </div>
          {b.caption ? <p className={styles.caption}><Inline text={b.caption} /></p> : null}
        </div>
      )
    case "rows":
      return (
        <div className={tl.group}>
          {b.label ? <p className={tl.groupLabel}><span>{b.label}</span></p> : null}
          <ol className={tl.rows}>
            {b.rows.map((r, i) => (
              <li key={`${r.name}-${i}`} className={`${tl.row} ${styles.docRow}`}>
                <span className={`mono ${tl.num}`}>{n2(i)}</span>
                <span className={styles.rowMain}>
                  <span className={`${tl.name} ${r.tone === "refused" ? tl.refused : ""}`}><Inline text={r.name} /></span>
                  {r.detail ? <span className={styles.rowDetail}><Inline text={r.detail} /></span> : null}
                </span>
                {r.value ? (
                  <span className={`mono ${tl.value} ${r.tone === "ok" ? tl.ok : r.tone === "refused" ? tl.refused : ""}`}>
                    {r.href ? <QuietLink href={r.href}>{r.value}</QuietLink> : r.value}
                  </span>
                ) : <span />}
              </li>
            ))}
          </ol>
        </div>
      )
    case "steps":
      return (
        <div className={tl.group}>
          {b.label ? <p className={tl.groupLabel}><span>{b.label}</span></p> : null}
          <ol className={tl.rows}>
            {b.steps.map((s, i) => (
              <li key={`${s.title}-${i}`} className={`${tl.row} ${styles.stepRow}`}>
                <span className={`mono ${tl.num}`}>{n2(i)}</span>
                <span className={styles.rowMain}>
                  <span className={tl.name}><Inline text={s.title} /></span>
                  {s.body ? <span className={styles.rowBody}><Inline text={s.body} /></span> : null}
                  {s.see ? <span className={styles.rowDetail}><span className={styles.seeLabel}>You see </span><Inline text={s.see} /></span> : null}
                  {s.image ? <Figure image={s.image} /> : null}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )
    case "claims":
      return (
        <div className={tl.group}>
          <p className={tl.groupLabel}><span>Claim</span><span className={tl.groupMeta}>its limit</span></p>
          <ol className={tl.rows}>
            {b.rows.map((c, i) => (
              <li key={i} className={`${tl.row} ${styles.claimRow}`}>
                <span className={`mono ${tl.num}`}>{n2(i)}</span>
                <span className={styles.claim}><Inline text={c.claim} /></span>
                <span className={styles.limit}><Inline text={c.limit} /></span>
              </li>
            ))}
          </ol>
        </div>
      )
  }
}
