import "./styles/global.css" // must load before App so section CSS modules override `.section`
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { MotionConfig } from "motion/react"
import { App } from "./App"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>,
)
