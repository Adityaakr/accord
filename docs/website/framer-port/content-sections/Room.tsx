import type { ReactNode } from "react"
import { Appear } from "../lib/motion"
import { SectionHeading, appear } from "../components/SectionHeading"
import { Mono } from "../components/Mono"
import styles from "./Room.module.css"

/* §4.4 What's in the room (anchor #room, accent green).
   Brief §6: four equal cards: name large, guarantee under it, limit smaller, command in monospace at the foot.
   Copy is the brief's, set verbatim. The `24 h` timelock is a product parameter with no §9 row, so it carries no <Ref>. */

type Part = {
  id: string
  name: string
  what: ReactNode
  guarantees: ReactNode
  stops: ReactNode
  commands: string[]
}

const PARTS: Part[] = [
  {
    id: "room-sealed-table",
    name: "Sealed table",
    what: (
      <>
        The negotiation enclave. Two mandates in, terms out, nothing else. Two agents negotiate on NEAR AI Cloud private inference inside an
        OutLayer enclave; code checks the terms against both mandates’ hard limits before they leave.
      </>
    ),
    guarantees: (
      <>Raw mandates never leave the enclave; one run per pair of commitments; the contract accepts only an attested result whose commitments match</>
    ),
    stops: (
      <>
        The terms you sign show that you accepted them; attestation proves which code ran, not that the deal was good; hardware trust assumptions
        apply
      </>
    ),
    commands: ["make negotiate"],
  },
  {
    id: "room-terms-as-policy",
    name: "Terms as policy",
    what: (
      <>
        The contract that turns the approved terms into the agent’s only authority. One scoped key, one method, every payment matched to
        milestone, amount, payee version and destination.
      </>
    ),
    guarantees: (
      <>
        Nothing outside the approved terms is ever signed; <Mono>revoke</Mono> ends every new authorisation in one transaction; signed transfers
        are listed and burnable
      </>
    ),
    stops: (
      <>Revocation is not a recall; settlement status is reported by the relayer and checked by the app, not proven to the contract</>
    ),
    commands: ["make pay", "make attack", "make inflight"],
  },
  {
    id: "room-payee",
    name: "Payee",
    what: (
      <>
        Confirmation of payee for agents. The vendor proves control of its domain inside an enclave, its own settlement authority approves the
        destination, the buyer accepts it, and changes wait <Mono>24 h</Mono>.
      </>
    ),
    guarantees: <>Money can only go to the bound payee version; one key alone cannot change it; every version carries its proof</>,
    stops: <>Proves control and authorisation, not that a company exists; legal KYB is a v2 integration</>,
    commands: ["make bind-payee", "make payee-change"],
  },
  {
    id: "room-glassbook",
    name: "Glassbook",
    what: (
      <>
        The first deal type: market making. An observer samples the venue’s public order book inside an enclave and attests spread, depth and
        uptime; a period pays only when <Mono>k</Mono> of <Mono>n</Mono> slots pass.
      </>
    ),
    guarantees: <>The retainer follows the measured book, not the monthly report; a failing period is withheld and a human decides</>,
    stops: <>Measures the venue’s book, not the market maker’s own orders (v1); retainer-only engagements; one venue per agreement</>,
    commands: ["make observe", "make glassbook"],
  },
]

/* Cards appear staggered by 0.1s */
const STAGGER = ["0s", "0.1s", "0.2s", "0.3s"] as const

export function Room() {
  return (
    <section id="room" className={`section ${styles.section}`}>
      <SectionHeading
        eyebrow="What’s in the room"
        title="Four parts, one agreement."
        lead="A deal room is one agreement. Four named parts do the work, and each is a directory in the repository you can run. Every part is stated the same way: what it guarantees, where it stops, and the command that shows it."
        accent="green"
      />

      <ul className={styles.grid} aria-label="The four parts of a deal room">
        {PARTS.map((part, i) => (
          <li key={part.id} id={part.id} className={styles.cell}>
            <Appear className={styles.card} effect={appear(STAGGER[i] ?? "0.3s")}>
            <h4 className={`t-h4 ${styles.name}`}>{part.name}</h4>
            <p className={`t-body-sm ${styles.what}`}>{part.what}</p>

            <div className={styles.block}>
              <h6 className={`t-h6 ${styles.label}`}>What it guarantees</h6>
              <p className={`t-body-lg ${styles.guarantees}`}>{part.guarantees}</p>
            </div>

            <div className={styles.block}>
              <h6 className={`t-h6 ${styles.label}`}>Where it stops</h6>
              <p className={`t-body-sm ${styles.stops}`}>{part.stops}</p>
            </div>

            <div className={styles.foot}>
              {part.commands.map((cmd) => (
                <Mono key={cmd}>{cmd}</Mono>
              ))}
            </div>
            </Appear>
          </li>
        ))}
      </ul>

      <Appear className={styles.after} effect={appear("0.2s")}>
        <p className={`t-body-lg ${styles.afterText}`}>
          The parts compose in one direction. The sealed table produces the terms, the terms name the payee, the payee binding is what the kill
          switch protects, and a deal type decides what evidence releases a payment. Remove any one and a company cannot hand an agent a budget.
          Procurement ships as the reference deal type; Glassbook is the first product.
        </p>
      </Appear>
    </section>
  )
}
