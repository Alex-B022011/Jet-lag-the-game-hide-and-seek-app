import type { GuessRow } from "../game/types";

interface Props {
  columns: readonly string[];
  rows: GuessRow[];
}

const ARROW = { up: "▲", down: "▼" } as const;

export function GuessTable({ columns, rows }: Props) {
  if (!rows.length) return null;
  return (
    <>
      <div className="table-wrap">
        <table className="guesses">
          <thead>
            <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <div className={`cell name${row.correct ? " hit" : ""}`}>
                    {row.image && <img className="cell-thumb" src={row.image} alt="" />}
                    <span>{row.name}</span>
                  </div>
                </td>
                {row.cells.map((cell, i) => (
                  <td key={cell.label}>
                    <div className={`cell ${cell.state}`} style={{ animationDelay: `${i * 70}ms` }}>
                      <span>{cell.value}</span>
                      {cell.direction && <span className="cell-arrow" aria-label={cell.direction === "up" ? "higher" : "lower"}>{ARROW[cell.direction]}</span>}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="legend">
        <span><i className="swatch" style={{ background: "var(--hit)" }} /> exact</span>
        <span><i className="swatch" style={{ background: "var(--close)" }} /> partial / close</span>
        <span><i className="swatch" style={{ background: "var(--miss)" }} /> wrong</span>
        <span>▲ answer is higher · ▼ lower</span>
      </p>
    </>
  );
}
