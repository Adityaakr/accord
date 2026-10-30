import { motion } from "motion/react"
import { Link } from "react-router-dom"
import { SPRING_UI } from "../lib/motion"
import styles from "./Button.module.css"

/* Framer "Button" component (P90iAy18v)
   Primary:   fill White, text Link preset (rgb(8,9,10)), hover → 2px white/50% ring
   Secondary: fill Elevation Medium, text Text Medium; hover → fill Elevation Weak, text Text Strong
   Padding 8px 12px, radius 8px, spring 0.4s bounce 0.2 */
type Props = {
  variant?: "primary" | "secondary"
  href?: string
  openInNewTab?: boolean
  children: React.ReactNode
  className?: string
  fullWidth?: boolean
  onClick?: () => void
  type?: "button" | "submit"
}

export function Button({ variant = "primary", href, openInNewTab, children, className = "", fullWidth, onClick, type }: Props) {
  const cls = [styles.button, variant === "primary" ? styles.primary : styles.secondary, fullWidth ? styles.full : "", className].join(" ")
  const inner = <span className={`t-link ${styles.label}`}>{children}</span>
  const motionProps = {
    className: cls,
    transition: SPRING_UI,
    whileHover: variant === "primary" ? { boxShadow: "0px 0px 0px 2px rgba(var(--ink-rgb), 0.5)" } : undefined,
  }
  if (href) {
    const isInternal = href.startsWith("/")
    if (isInternal) {
      const MotionLink = motion.create(Link)
      return <MotionLink to={href} {...motionProps} onClick={onClick}>{inner}</MotionLink>
    }
    return <motion.a href={href} target={openInNewTab ? "_blank" : undefined} rel={openInNewTab ? "noopener noreferrer" : undefined} {...motionProps} onClick={onClick}>{inner}</motion.a>
  }
  return <motion.button type={type ?? "button"} {...motionProps} onClick={onClick}>{inner}</motion.button>
}
