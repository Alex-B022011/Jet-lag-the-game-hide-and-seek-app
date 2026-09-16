import { useMemo, useRef, useState } from "react";
import type { SearchItem } from "../game/modes";

interface Props {
  items: SearchItem[];
  /** Ids already guessed — shown greyed out and not selectable. */
  used: string[];
  disabled: boolean;
  placeholder: string;
  onGuess: (id: string) => void;
}

const MAX_SUGGESTIONS = 8;

export function GuessInput({ items, used, disabled, placeholder, onGuess }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const usedSet = useMemo(() => new Set(used), [used]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const scored = items
      .filter((item) => !usedSet.has(item.id))
      .map((item) => {
        // Prefer a prefix match on any term, then a substring match.
        let best = Infinity;
        let via = "";
        for (const term of item.terms) {
          const i = term.indexOf(q);
          if (i === -1) continue;
          const score = i === 0 ? 0 : 1;
          if (score < best) { best = score; via = term; }
        }
        return best === Infinity ? null : { item, score: best, via };
      })
      .filter((m): m is { item: SearchItem; score: number; via: string } => m !== null);

    scored.sort((a, b) => a.score - b.score || a.item.name.localeCompare(b.item.name));
    return scored.slice(0, MAX_SUGGESTIONS);
  }, [query, items, usedSet]);

  const commit = (id: string) => {
    onGuess(id);
    setQuery("");
    setOpen(false);
    setActive(0);
    inputRef.current?.focus();
  };

  const submitTyped = () => {
    if (matches.length) commit(matches[Math.min(active, matches.length - 1)].item.id);
  };

  return (
    <div className="guessbar">
      <input
        ref={inputRef}
        type="text"
        value={query}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label={placeholder}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setActive(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, matches.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter") { e.preventDefault(); submitTyped(); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      <button className="guessbar-submit" onClick={submitTyped} disabled={disabled} aria-label="Submit guess">↵</button>

      {open && matches.length > 0 && (
        <ul className="suggestions" role="listbox">
          {matches.map((m, i) => {
            const alias = m.via !== m.item.name.toLowerCase();
            return (
              <li key={m.item.id} data-active={i === active} role="option" aria-selected={i === active}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => commit(m.item.id)}>
                  {m.item.name}
                  {alias && <span className="suggestion-alias"> — matched “{m.via}”</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
