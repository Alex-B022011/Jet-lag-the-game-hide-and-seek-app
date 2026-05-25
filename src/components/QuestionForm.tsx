import { useEffect, useMemo, useState } from "react";
import * as turf from "@turf/turf";
import type { Feature, Point } from "geojson";
import { useGame } from "../state/gameStore";
import questions from "../data/questions.json";
import { BOROUGHS, getPOIs } from "../data/datasets";
import type { AskedQuestion, GameSize, LatLng } from "../game/types";
import type { ComposingPreview } from "./Map";

type Tab = "matching" | "radar" | "thermometer" | "measuring" | "tentacle" | "photo";

const TAB_LABELS: Record<Tab, string> = {
  matching: "Matching",
  radar: "Radar",
  thermometer: "Thermometer",
  measuring: "Measuring",
  tentacle: "Tentacle",
  photo: "Photo",
};

const TAB_DRAWS: Record<Tab, string> = {
  matching: "Hider draws 2, keeps 1",
  radar: "Hider draws 2, keeps 1",
  thermometer: "Hider draws 2, keeps 1",
  measuring: "Hider draws 3, keeps 1",
  tentacle: "Hider draws 4, keeps 2",
  photo: "Hider draws (rulebook pending)",
};

function isAllowed(sizes: string[], size: GameSize) {
  return sizes.includes(size);
}

function nearestPoiTo(p: LatLng, dataset: string): { id: string; name: string | null; distMi: number } | null {
  if (dataset === "boroughs") return null;
  const fc = getPOIs(dataset as any);
  if (!fc.features.length) return null;
  let best: { id: string; name: string | null; distMi: number } | null = null;
  const target = turf.point([p.lng, p.lat]);
  for (const f of fc.features) {
    const dKm = turf.distance(target, f as Feature<Point>, { units: "kilometers" });
    const distMi = dKm / 1.609344;
    if (!best || distMi < best.distMi) {
      best = { id: f.properties.id, name: f.properties.name, distMi };
    }
  }
  return best;
}

function seekerBoroughName(p: LatLng): string | null {
  for (const f of BOROUGHS.features) {
    if (turf.booleanPointInPolygon([p.lng, p.lat], f as any)) {
      return (f.properties as any)?.name ?? null;
    }
  }
  return null;
}

export type Props = {
  onPreviewChange: (p: ComposingPreview) => void;
};

export default function QuestionForm({ onPreviewChange }: Props) {
  const seeker = useGame((s) => s.seekerPin);
  const size = useGame((s) => s.size);
  const askQuestion = useGame((s) => s.askQuestion);

  const [tab, setTab] = useState<Tab>("matching");

  return (
    <div className="qform">
      <div className="qform__tabs" role="tablist">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => {
          if (t === "tentacle" && !isAllowed(["M", "L"], size)) return null;
          return (
            <button
              key={t}
              className={`qform__tab ${tab === t ? "is-active" : ""}`}
              onClick={() => {
                setTab(t);
                onPreviewChange(null);
              }}
              role="tab"
              aria-selected={tab === t}
            >
              {TAB_LABELS[t]}
            </button>
          );
        })}
      </div>

      <div className="qform__hint">{TAB_DRAWS[tab]}</div>

      {!seeker && (
        <div className="qform__warn">
          Drop a seeker pin first — tap the map, or use 📍 Locate me.
        </div>
      )}

      {seeker && tab === "matching" && (
        <MatchingForm seeker={seeker} size={size} onApply={askQuestion} />
      )}
      {seeker && tab === "radar" && (
        <RadarForm seeker={seeker} size={size} onApply={askQuestion} onPreview={onPreviewChange} />
      )}
      {seeker && tab === "thermometer" && (
        <ThermometerForm seeker={seeker} size={size} onApply={askQuestion} onPreview={onPreviewChange} />
      )}
      {seeker && tab === "measuring" && (
        <MeasuringForm seeker={seeker} size={size} onApply={askQuestion} />
      )}
      {seeker && tab === "tentacle" && (
        <TentacleForm seeker={seeker} size={size} onApply={askQuestion} onPreview={onPreviewChange} />
      )}
      {seeker && tab === "photo" && <PhotoForm size={size} onApply={askQuestion} />}
    </div>
  );
}

// --------- Matching ---------
function MatchingForm({
  seeker,
  size,
  onApply,
}: {
  seeker: LatLng;
  size: GameSize;
  onApply: (q: AskedQuestion) => void;
}) {
  const cats = questions.matching.categories.filter((c) => isAllowed(c.sizes, size));
  const [catKey, setCatKey] = useState(cats[0]?.key ?? "");
  const [answer, setAnswer] = useState<"yes" | "no">("yes");
  const cat = cats.find((c) => c.key === catKey);

  const anchor = useMemo(() => {
    if (!cat) return null;
    if (cat.kind === "polygon") {
      const n = seekerBoroughName(seeker);
      return n ? { id: n, name: n, distMi: 0 } : null;
    }
    if (cat.kind === "voronoi-point" || cat.kind === "name-length") {
      return nearestPoiTo(seeker, cat.dataset);
    }
    return null;
  }, [cat, seeker]);

  return (
    <div className="qform__body">
      <label className="qform__label">Category</label>
      <select className="qform__input" value={catKey} onChange={(e) => setCatKey(e.target.value)}>
        {cats.map((c) => (
          <option key={c.key} value={c.key}>
            {c.group} — {c.label}
          </option>
        ))}
      </select>

      <div className="qform__anchor">
        Your nearest: <strong>{anchor?.name ?? "—"}</strong>
        {cat?.kind === "name-length" && anchor?.name && (
          <span> ({anchor.name.length} chars)</span>
        )}
      </div>

      <label className="qform__label">Hider's answer</label>
      <div className="qform__choices">
        {(["yes", "no"] as const).map((a) => (
          <button
            key={a}
            className={`qform__choice ${answer === a ? "is-active" : ""}`}
            onClick={() => setAnswer(a)}
          >
            {a}
          </button>
        ))}
      </div>

      <button
        className="qform__apply"
        disabled={!cat || !anchor}
        onClick={() => {
          if (!cat || !anchor) return;
          onApply({
            id: crypto.randomUUID(),
            type: "matching",
            categoryKey: cat.key,
            seekerAnchorId: anchor.id,
            seekerAnchorName: anchor.name,
            answer,
            ts: Date.now(),
          });
        }}
      >
        Apply
      </button>
    </div>
  );
}

// --------- Radar ---------
function RadarForm({
  seeker,
  size,
  onApply,
  onPreview,
}: {
  seeker: LatLng;
  size: GameSize;
  onApply: (q: AskedQuestion) => void;
  onPreview: (p: ComposingPreview) => void;
}) {
  const opts = questions.radar.distances.filter((d) => isAllowed(d.sizes, size));
  const [distLabel, setDistLabel] = useState(opts[2]?.label ?? "");
  const [customMi, setCustomMi] = useState(1);
  const [answer, setAnswer] = useState<"yes" | "no">("yes");

  const chosen = opts.find((d) => d.label === distLabel);
  const radiusMi = chosen?.miles ?? customMi;

  useEffect(() => {
    if (radiusMi > 0) onPreview({ kind: "radar", center: seeker, radiusMi });
  }, [radiusMi, seeker.lat, seeker.lng, onPreview]);

  return (
    <div className="qform__body">
      <label className="qform__label">Distance</label>
      <select className="qform__input" value={distLabel} onChange={(e) => setDistLabel(e.target.value)}>
        {opts.map((d) => (
          <option key={d.label} value={d.label}>
            {d.label}
          </option>
        ))}
      </select>
      {chosen?.miles == null && (
        <input
          className="qform__input"
          type="number"
          step="0.1"
          min="0.01"
          value={customMi}
          onChange={(e) => setCustomMi(parseFloat(e.target.value) || 0)}
          placeholder="miles"
        />
      )}

      <label className="qform__label">Hider's answer</label>
      <div className="qform__choices">
        {(["yes", "no"] as const).map((a) => (
          <button
            key={a}
            className={`qform__choice ${answer === a ? "is-active" : ""}`}
            onClick={() => setAnswer(a)}
          >
            {a}
          </button>
        ))}
      </div>

      <button
        className="qform__apply"
        disabled={radiusMi <= 0}
        onClick={() => {
          onApply({
            id: crypto.randomUUID(),
            type: "radar",
            center: seeker,
            radiusMi,
            answer,
            ts: Date.now(),
          });
          onPreview(null);
        }}
      >
        Apply
      </button>
    </div>
  );
}

// --------- Thermometer ---------
function ThermometerForm({
  seeker,
  size,
  onApply,
  onPreview,
}: {
  seeker: LatLng;
  size: GameSize;
  onApply: (q: AskedQuestion) => void;
  onPreview: (p: ComposingPreview) => void;
}) {
  const opts = questions.thermometer.distances.filter((d) => isAllowed(d.sizes, size));
  const [distLabel, setDistLabel] = useState(opts[0]?.label ?? "");
  const [endLat, setEndLat] = useState<number>(seeker.lat);
  const [endLng, setEndLng] = useState<number>(seeker.lng);
  const [answer, setAnswer] = useState<"hotter" | "colder">("hotter");

  const end: LatLng = { lat: endLat, lng: endLng };

  useEffect(() => {
    onPreview({ kind: "thermometer", start: seeker, end: { lat: endLat, lng: endLng } });
  }, [endLat, endLng, seeker.lat, seeker.lng, onPreview]);

  return (
    <div className="qform__body">
      <label className="qform__label">Recommended travel distance</label>
      <select className="qform__input" value={distLabel} onChange={(e) => setDistLabel(e.target.value)}>
        {opts.map((d) => (
          <option key={d.label} value={d.label}>
            {d.label}
          </option>
        ))}
      </select>

      <label className="qform__label">End-point lat / lng</label>
      <div className="qform__row">
        <input
          className="qform__input"
          type="number"
          step="0.0001"
          value={endLat}
          onChange={(e) => setEndLat(parseFloat(e.target.value) || 0)}
        />
        <input
          className="qform__input"
          type="number"
          step="0.0001"
          value={endLng}
          onChange={(e) => setEndLng(parseFloat(e.target.value) || 0)}
        />
      </div>
      <div className="qform__hint">Tip: tap the map at your end-point, then copy from the seeker pin if needed.</div>

      <label className="qform__label">Hider's answer (from their reference frame: are YOU hotter at the end?)</label>
      <div className="qform__choices">
        {(["hotter", "colder"] as const).map((a) => (
          <button
            key={a}
            className={`qform__choice ${answer === a ? "is-active" : ""}`}
            onClick={() => setAnswer(a)}
          >
            {a}
          </button>
        ))}
      </div>

      <button
        className="qform__apply"
        onClick={() => {
          onApply({
            id: crypto.randomUUID(),
            type: "thermometer",
            startPin: seeker,
            endPin: end,
            answer,
            ts: Date.now(),
          });
          onPreview(null);
        }}
      >
        Apply
      </button>
    </div>
  );
}

// --------- Measuring ---------
function MeasuringForm({
  seeker,
  size,
  onApply,
}: {
  seeker: LatLng;
  size: GameSize;
  onApply: (q: AskedQuestion) => void;
}) {
  const cats = questions.measuring.categories.filter((c) => isAllowed(c.sizes, size));
  const [catKey, setCatKey] = useState(cats[0]?.key ?? "");
  const [answer, setAnswer] = useState<"closer" | "further">("closer");
  const cat = cats.find((c) => c.key === catKey);

  const seekerNearest = useMemo(() => {
    if (!cat) return null;
    return nearestPoiTo(seeker, cat.dataset);
  }, [cat, seeker]);

  return (
    <div className="qform__body">
      <label className="qform__label">Category</label>
      <select className="qform__input" value={catKey} onChange={(e) => setCatKey(e.target.value)}>
        {cats.map((c) => (
          <option key={c.key} value={c.key}>
            {c.group} — {c.label}
          </option>
        ))}
      </select>

      <div className="qform__anchor">
        Your nearest {cat?.label.toLowerCase()}: <strong>{seekerNearest?.name ?? "—"}</strong>
        {seekerNearest && <span> ({seekerNearest.distMi.toFixed(2)} mi)</span>}
      </div>

      <label className="qform__label">Hider's answer</label>
      <div className="qform__choices">
        {(["closer", "further"] as const).map((a) => (
          <button
            key={a}
            className={`qform__choice ${answer === a ? "is-active" : ""}`}
            onClick={() => setAnswer(a)}
          >
            {a}
          </button>
        ))}
      </div>

      <button
        className="qform__apply"
        disabled={!seekerNearest}
        onClick={() => {
          if (!cat || !seekerNearest) return;
          onApply({
            id: crypto.randomUUID(),
            type: "measuring",
            categoryKey: cat.key,
            seekerNearestDistanceMi: seekerNearest.distMi,
            answer,
            ts: Date.now(),
          });
        }}
      >
        Apply
      </button>
    </div>
  );
}

// --------- Tentacle ---------
function TentacleForm({
  seeker,
  size,
  onApply,
  onPreview,
}: {
  seeker: LatLng;
  size: GameSize;
  onApply: (q: AskedQuestion) => void;
  onPreview: (p: ComposingPreview) => void;
}) {
  const prompts = questions.tentacle.prompts.filter((p) => isAllowed(p.sizes, size));
  const [promptKey, setPromptKey] = useState(prompts[0]?.key ?? "");
  const prompt = prompts.find((p) => p.key === promptKey);

  const inRange = useMemo(() => {
    if (!prompt) return [];
    const fc = getPOIs(prompt.dataset as any);
    const radiusKm = prompt.radiusMi * 1.609344;
    const target = turf.point([seeker.lng, seeker.lat]);
    return fc.features.filter(
      (f) => turf.distance(target, f as Feature<Point>, { units: "kilometers" }) <= radiusKm,
    );
  }, [prompt, seeker.lat, seeker.lng]);

  const [answerId, setAnswerId] = useState<string>("");

  useEffect(() => {
    if (prompt) onPreview({ kind: "tentacle", center: seeker, radiusMi: prompt.radiusMi });
  }, [prompt?.key, prompt?.radiusMi, seeker.lat, seeker.lng, onPreview]);

  return (
    <div className="qform__body">
      <label className="qform__label">Category</label>
      <select className="qform__input" value={promptKey} onChange={(e) => setPromptKey(e.target.value)}>
        {prompts.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>

      <div className="qform__anchor">{inRange.length} in range</div>

      <label className="qform__label">Hider's nearest (in range)</label>
      <select className="qform__input" value={answerId} onChange={(e) => setAnswerId(e.target.value)}>
        <option value="">— pick —</option>
        <option value="out-of-range">Out of range</option>
        {inRange.map((f) => (
          <option key={f.properties.id} value={f.properties.id}>
            {f.properties.name || f.properties.id}
          </option>
        ))}
      </select>

      <button
        className="qform__apply"
        disabled={!prompt || !answerId}
        onClick={() => {
          if (!prompt || !answerId) return;
          const chosen = inRange.find((f) => f.properties.id === answerId);
          onApply({
            id: crypto.randomUUID(),
            type: "tentacle",
            promptKey: prompt.key,
            radiusMi: prompt.radiusMi,
            seekerCenter: seeker,
            nearestPoiId: answerId === "out-of-range" ? "out-of-range" : answerId,
            nearestPoiName: chosen?.properties.name ?? null,
            ts: Date.now(),
          });
          onPreview(null);
        }}
      >
        Apply
      </button>
    </div>
  );
}

// --------- Photo ---------
function PhotoForm({ size, onApply }: { size: GameSize; onApply: (q: AskedQuestion) => void }) {
  const prompts = questions.photo.prompts.filter((p) => isAllowed(p.sizes, size));
  const [promptKey, setPromptKey] = useState(prompts[0]?.key ?? "");
  const prompt = prompts.find((p) => p.key === promptKey);

  return (
    <div className="qform__body">
      <label className="qform__label">Photo prompt</label>
      <select className="qform__input" value={promptKey} onChange={(e) => setPromptKey(e.target.value)}>
        {prompts.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
      </select>

      <div className="qform__hint">
        Photo questions don't auto-eliminate. Log the question; review the photo, then use Radar/Matching/etc. with what
        you learned. (A lasso tool for manual elimination can be added later.)
      </div>

      <button
        className="qform__apply"
        disabled={!prompt}
        onClick={() => {
          if (!prompt) return;
          onApply({
            id: crypto.randomUUID(),
            type: "photo",
            promptKey: prompt.key,
            promptLabel: prompt.label,
            polygon: null,
            ts: Date.now(),
          });
        }}
      >
        Log photo question
      </button>
    </div>
  );
}
