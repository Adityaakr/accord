import "./styles/global.css" // must load before App so section CSS modules override `.section`
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { MotionConfig } from "motion/react"
import { App, NOT_FOUND, ROUTE_TABLE } from "./App"
import { preloadRoute } from "./lib/lazyPage"

/* Load the first page's chunk before React replaces the pre-rendered HTML, so the swap shows no empty frame */
void preloadRoute(ROUTE_TABLE, window.location.pathname, NOT_FOUND).then(() => createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <App />
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>,
))
