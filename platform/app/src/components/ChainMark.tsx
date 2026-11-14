// A small mark for the chain a funding quote starts from (FundQuote), drawn inline so the room loads no image.
// Simplified from each chain's own mark and colours; decorative, the row's label carries the name. Inline with the
// label's text (not a flex item), so the row keeps the baseline it shares with the amount.

const SIZE = 16;

function Base() {
  return <><rect width="16" height="16" rx="4" fill="#0052FF" /><path d="M7.98 12.6a4.6 4.6 0 1 0-4.56-5.2h6.08v1.2H3.42a4.6 4.6 0 0 0 4.56 4Z" fill="#fff" /></>;
}
function Ethereum() {
  return (
    <>
      <rect width="16" height="16" rx="4" fill="#627EEA" />
      <path d="M8 2.2 4.4 8.1 8 6.5Z" fill="#fff" fillOpacity=".6" /><path d="M8 2.2v4.3l3.6 1.6Z" fill="#fff" />
      <path d="M8 10.3 4.4 8.1 8 6.5Z" fill="#fff" fillOpacity=".6" /><path d="M8 6.5v3.8l3.6-2.2Z" fill="#fff" fillOpacity=".85" />
      <path d="M8 11.1 4.4 8.9 8 13.9Z" fill="#fff" fillOpacity=".6" /><path d="M8 13.9v-2.8l3.6-2.2Z" fill="#fff" />
    </>
  );
}
function Arbitrum() {
  return (
    <>
      <rect width="16" height="16" rx="4" fill="#213147" />
      <path d="M8.9 3.6h1.5L6.3 11.4l-1.2-.7Z" fill="#fff" /><path d="M6.6 3.6h1.5L4.4 10.3l-.7-1.3Z" fill="#fff" />
      <path d="m9.3 6.6 2.3 4-1.2.8-1.9-3.3Z" fill="#12AAFF" /><path d="m8 9 1.7 2.9-1.2.6-1.3-2.2Z" fill="#12AAFF" />
    </>
  );
}
function Solana({ id }: { id: string }) {
  return (
    <>
      <defs><linearGradient id={id} x1="3" y1="13" x2="13" y2="3" gradientUnits="userSpaceOnUse"><stop stopColor="#9945FF" /><stop offset="1" stopColor="#14F195" /></linearGradient></defs>
      <rect x=".5" y=".5" width="15" height="15" rx="3.5" fill="#0B0B12" stroke="#fff" strokeOpacity=".22" />
      <path d="M4.9 4.3h7.4l-1.2 1.4H3.7Zm-1.2 3h7.4l1.2 1.4H4.9Zm1.2 3h7.4l-1.2 1.4H3.7Z" fill={`url(#${id})`} />
    </>
  );
}

/** The mark for a quote source (`base`, `eth`, `arb`, `sol`), or nothing for a source it does not know. */
export function ChainMark({ source }: { source: string }) {
  const s = source.toLowerCase();
  const mark = s.startsWith("base") ? <Base /> : s.startsWith("eth") ? <Ethereum /> : s.startsWith("arb") ? <Arbitrum /> : s.startsWith("sol") ? <Solana id={`sol-${s}`} /> : null;
  if (!mark) return null;
  return <svg width={SIZE} height={SIZE} viewBox="0 0 16 16" aria-hidden="true" focusable="false" style={{ verticalAlign: "-3px", marginRight: 8 }}>{mark}</svg>;
}
