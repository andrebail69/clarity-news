import { useState, useCallback, useEffect, useRef } from "react";

// Strip citation tags from API output
const strip = (text) => {
  if (!text) return text;
  if (typeof text === "string") return text.replace(/<\/?cite[^>]*>/g, "");
  if (Array.isArray(text)) return text.map(strip);
  if (typeof text === "object") {
    const out = {};
    for (const k in text) out[k] = strip(text[k]);
    return out;
  }
  return text;
};

// Read tracking — stores which stories the user has tapped into
const getReadStories = () => {
  try { return JSON.parse(localStorage.getItem("clarity-read") || "{}"); } catch { return {}; }
};
const markRead = (headline) => {
  try {
    const read = getReadStories();
    read[headline] = Date.now();
    // Keep only last 200 entries
    const entries = Object.entries(read).sort((a, b) => b[1] - a[1]).slice(0, 200);
    localStorage.setItem("clarity-read", JSON.stringify(Object.fromEntries(entries)));
  } catch {}
};
const isNew = (story) => {
  const read = getReadStories();
  return !read[story.hl];
};

const CATS = [
  { id: "world", label: "World" },
  { id: "politics", label: "Politics" },
  { id: "business", label: "Business" },
  { id: "energy", label: "Energy" },
  { id: "tech", label: "Tech" },
];

const SEV_C = { critical: "#EF4444", significant: "#F59E0B", notable: "#22C55E", routine: "#6B7280" };
const FQ_C = { verified: "#22C55E", likely: "#6CC070", developing: "#F59E0B", contested: "#EF4444", editorial: "#A855F7" };
const FQ_I = { verified: "●", likely: "◐", developing: "◔", contested: "◑", editorial: "◇" };
const STAGE_C = { "front page": "#C8AA78", "developing": "#A855F7", "breaking": "#EF4444" };

// ─── Story Detail — Continuous Scroll ──────────────────────────────────
function StoryScreen({ story: s, onBack }) {
  const factsRef = useRef(null);
  const briefRef = useRef(null);
  const questionsRef = useRef(null);
  const signalsRef = useRef(null);
  const [active, setActive] = useState("facts");
  const isScrolling = useRef(false);

  useEffect(() => {
    const sections = [
      { id: "facts", ref: factsRef },
      { id: "brief", ref: briefRef },
      { id: "questions", ref: questionsRef },
      { id: "signals", ref: signalsRef },
    ];
    const observer = new IntersectionObserver((entries) => {
      if (isScrolling.current) return;
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const found = sections.find(sec => sec.ref.current === entry.target);
          if (found) setActive(found.id);
        }
      });
    }, { rootMargin: "-50px 0px -60% 0px", threshold: 0 });

    sections.forEach(sec => { if (sec.ref.current) observer.observe(sec.ref.current); });
    return () => observer.disconnect();
  }, []);

  const scrollTo = (ref, id) => {
    setActive(id);
    isScrolling.current = true;
    const el = ref.current;
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 50;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
    setTimeout(() => { isScrolling.current = false; }, 800);
  };

  const tabBtn = (id, label, ref) => (
    <button key={id} onClick={() => scrollTo(ref, id)} style={{
      flex: 1, background: "none", border: "none", cursor: "pointer", padding: "12px 4px",
      fontSize: 10, fontWeight: 600, fontFamily: "var(--mono)", letterSpacing: ".03em",
      color: active === id ? "#C8AA78" : "var(--t3)",
      borderBottom: active === id ? "2px solid #C8AA78" : "2px solid transparent",
      whiteSpace: "nowrap",
    }}>{label}</button>
  );

  const SectionLabel = ({ children }) => (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", color: "#C8AA78", fontFamily: "var(--mono)", padding: "20px 0 10px" }}>{children}</div>
  );

  const stage = s.stage || "front page";

  return (
    <div style={{ animation: "slideUp .25s ease" }}>
      {/* Back */}
      <div style={{ background: "var(--bg)", padding: "12px 0 8px", borderBottom: "1px solid var(--c1)" }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, color: "var(--t3)", fontFamily: "var(--mono)", padding: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>‹</span> Stories
        </button>
      </div>

      {/* Header */}
      <div style={{ padding: "16px 0 12px" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".06em", fontFamily: "var(--mono)", color: STAGE_C[stage] || "#C8AA78" }}>{stage.toUpperCase()}</span>
          <span style={{ fontSize: 9, fontWeight: 600, color: FQ_C[s.fq] || "#F59E0B", fontFamily: "var(--mono)" }}>{FQ_I[s.fq] || "◔"} {(s.fq || "").toUpperCase()}</span>
        </div>
        <h1 style={{ fontFamily: "var(--display)", fontSize: 24, fontWeight: 400, color: "var(--t1)", margin: 0, lineHeight: 1.28 }}>{s.hl}</h1>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--t2)", margin: "10px 0 0", fontFamily: "var(--body)" }}>{s.sum}</p>
      </div>

      {/* Jump tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--c1)", position: "sticky", top: 0, background: "var(--bg)", zIndex: 9 }}>
        {tabBtn("facts", "Facts", factsRef)}
        {tabBtn("brief", "Brief", briefRef)}
        {tabBtn("questions", "Open Questions", questionsRef)}
        {tabBtn("signals", "Signals", signalsRef)}
      </div>

      {/* ── FACTS ── */}
      <div ref={factsRef}>
        <SectionLabel>FACTS</SectionLabel>
        {s.facts?.map((fact, i) => (
          <div key={i} style={{ display: "flex", gap: 14, marginBottom: 14 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#C8AA78", flexShrink: 0, marginTop: 9 }} />
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--t2)", margin: 0, fontFamily: "var(--body)" }}>{fact}</p>
          </div>
        ))}
        {s.src && <div style={{ fontSize: 9, color: "var(--t4)", fontFamily: "var(--mono)", paddingTop: 8 }}>{s.src}</div>}
      </div>

      <div style={{ height: 1, background: "var(--c1)", margin: "8px 0" }} />

      {/* ── STORY ── */}
      <div ref={briefRef}>
        <SectionLabel>BRIEF</SectionLabel>
        {(s.story || "").split(/\n\n+/).map((para, i) => (
          <p key={i} style={{ fontSize: 16, lineHeight: 1.7, color: "var(--t2)", margin: "0 0 18px", fontFamily: "var(--body)" }}>{para}</p>
        ))}
      </div>

      <div style={{ height: 1, background: "var(--c1)", margin: "8px 0" }} />

      {/* ── OPEN QUESTIONS ── */}
      <div ref={questionsRef}>
        <SectionLabel>OPEN QUESTIONS</SectionLabel>
        {s.questions?.map((q, i) => (
          <div key={i} style={{ marginBottom: 20, paddingLeft: 16, borderLeft: "2px solid #C8AA78" }}>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--t1)", margin: "0 0 8px", fontFamily: "var(--body)", fontWeight: 500 }}>{q.question}</p>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--t2)", margin: 0, fontFamily: "var(--body)" }}>{q.why}</p>
          </div>
        ))}
      </div>

      <div style={{ height: 1, background: "var(--c1)", margin: "8px 0" }} />

      {/* ── SIGNALS ── */}
      <div ref={signalsRef}>
        <SectionLabel>SIGNALS</SectionLabel>
        {s.resolution?.map((r, i) => (
          <div key={i} style={{ marginBottom: 20, paddingLeft: 16, borderLeft: "2px solid #C8AA78" }}>
            <p style={{ fontSize: 17, lineHeight: 1.6, color: "var(--t1)", margin: "0 0 8px", fontFamily: "var(--body)", fontWeight: 500 }}>{r.indicator}</p>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--t2)", margin: 0, fontFamily: "var(--body)" }}>{r.meaning}</p>
          </div>
        ))}
      </div>

      <div style={{ height: 60 }} />
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────
export default function Clarity() {
  const [briefing, setBriefing] = useState(null);
  const [cat, setCat] = useState("world");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState("");
  const [err, setErr] = useState(null);
  const [view, setView] = useState("feed");
  const [selected, setSelected] = useState(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    fetch("/api/briefing")
      .then(r => r.json())
      .then(data => {
        if (data.error) setErr(data.error);
        else setBriefing(strip(data));
        setLoading(false);
      })
      .catch(e => { setErr(e.message); setLoading(false); });
  }, []);

  const stories = (cat && briefing?.categories?.[cat]?.stories) || [];
  const fetchedAt = briefing?.fetchedAt;

  const formatTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short" });
  };

  // Manual refresh — one category at a time with 60s pause
  const doRefresh = useCallback(async () => {
    setRefreshing(true); setErr(null);
    const cats = ["world", "politics", "business", "energy", "tech"];
    for (let i = 0; i < cats.length; i++) {
      setRefreshStatus(`${cats[i]} (${i + 1}/${cats.length})`);
      try {
        const r = await fetch(`/api/cron?cat=${cats[i]}&key=clarity2026`);
        const data = await r.json();
        if (data.error) { setErr(`${cats[i]}: ${data.error}`); continue; }
      } catch (e) {
        setErr(`${cats[i]}: ${e.message}`); continue;
      }
      try {
        const b = await fetch("/api/briefing");
        const bData = await b.json();
        if (!bData.error) setBriefing(strip(bData));
      } catch {}
      if (i < cats.length - 1) {
        setRefreshStatus(`pausing before ${cats[i+1]} (${i + 2}/${cats.length})`);
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    }
    setRefreshStatus("");
    setRefreshing(false);
  }, []);

  const handleStoryTap = (s) => {
    markRead(s.hl);
    setSelected(s);
    setView("story");
    setErr(null);
    forceUpdate(n => n + 1);
  };

  return (
    <div style={{
      "--bg": "#101114", "--c1": "#1A1D22", "--c2": "#15181D",
      "--t1": "#ECECEC", "--t2": "#9CA3AF", "--t3": "#6B7280", "--t4": "#4B5060",
      "--display": "'Instrument Serif',Georgia,serif",
      "--body": "'Source Serif 4','Charter',Georgia,serif",
      "--mono": "'JetBrains Mono','SF Mono',monospace",
      minHeight: "100vh", minHeight: "100dvh", background: "var(--bg)", color: "var(--t1)",
      fontFamily: "var(--body)", maxWidth: 480, margin: "0 auto",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;600;700;800&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,600;1,8..60,400&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        html,body{margin:0;padding:0;background:#101114}
        ::-webkit-scrollbar{display:none}
      `}</style>

      {/* HEADER */}
      <header style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--c1)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: "var(--display)", fontSize: 22, color: "var(--t1)" }}>Clarity</span>
          <span style={{ fontFamily: "var(--display)", fontSize: 15, color: "#C8AA78", fontStyle: "italic" }}>Briefed, not fed.</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {fetchedAt && (
            <span style={{ fontSize: 10, color: "var(--t4)", fontFamily: "var(--mono)" }}>
              {formatTime(fetchedAt)}
            </span>
          )}
          <button onClick={doRefresh} disabled={refreshing} style={{
            background: refreshing ? "var(--c2)" : "rgba(200,170,120,0.12)",
            color: refreshing ? "var(--t4)" : "#C8AA78",
            border: "none", borderRadius: 6, padding: "6px 10px", cursor: refreshing ? "not-allowed" : "pointer",
            fontSize: 11, fontWeight: 700, fontFamily: "var(--mono)",
          }}>
            <span style={{ display: "inline-block", animation: refreshing ? "spin 1s linear infinite" : "none", fontSize: 13 }}>↻</span>
          </button>
        </div>
      </header>

      {/* PILLS */}
      <div style={{ padding: "10px 20px", display: "flex", gap: 6, flexShrink: 0, borderBottom: "1px solid var(--c1)" }}>
        {CATS.map(c => (
          <button key={c.id} onClick={() => { setCat(c.id); setView("feed"); setSelected(null); setErr(null); }} style={{
            flex: 1,
            background: cat === c.id ? "#C8AA78" : "var(--c2)",
            color: cat === c.id ? "#101114" : "var(--t3)",
            border: "none", borderRadius: 20, padding: "8px 0", cursor: "pointer",
            fontSize: 15, fontWeight: cat === c.id ? 700 : 400,
            fontFamily: "var(--body)", whiteSpace: "nowrap", textAlign: "center",
          }}>{c.label}</button>
        ))}
      </div>

      {/* CONTENT */}
      <div style={{ flex: 1, padding: "0 20px" }}>

        {loading && (
          <div style={{ textAlign: "center", padding: "72px 16px" }}>
            <div style={{ width: 32, height: 32, border: "2px solid var(--c1)", borderTopColor: "#C8AA78", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
            <div style={{ fontSize: 15, color: "var(--t3)", fontFamily: "var(--mono)" }}>Loading briefing...</div>
          </div>
        )}

        {/* Refreshing */}
        {refreshing && (
          <div style={{ textAlign: "center", padding: "72px 16px" }}>
            <div style={{ width: 32, height: 32, border: "2px solid var(--c1)", borderTopColor: "#C8AA78", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }} />
            <div style={{ fontSize: 15, color: "var(--t3)", fontFamily: "var(--mono)" }}>{refreshStatus ? `Fetching ${refreshStatus}` : "Starting refresh..."}</div>
          </div>
        )}

        {err && !loading && !refreshing && (
          <div style={{ background: "rgba(239,68,68,0.06)", borderRadius: 8, padding: "10px 14px", margin: "10px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: 9, color: "#EF4444", margin: 0, lineHeight: 1.4, fontFamily: "var(--mono)", flex: 1 }}>{err}</p>
            <button onClick={() => setErr(null)} style={{ background: "none", border: "none", color: "#EF4444", cursor: "pointer", fontSize: 14, padding: "0 0 0 10px", flexShrink: 0 }}>✕</button>
          </div>
        )}

        {/* FEED */}
        {!loading && !refreshing && view === "feed" && cat && (
          stories.length > 0 ? (
            <div style={{ padding: "12px 0", animation: "fadeIn .3s ease" }}>
              {stories.map((s, i) => {
                const storyIsNew = isNew(s);
                const stage = s.stage || "front page";
                return (
                  <button key={i} onClick={() => handleStoryTap(s)} style={{
                    display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                    background: "var(--c2)", border: "none", borderRadius: 14,
                    padding: "18px", marginBottom: 10,
                    borderLeft: `3px solid ${SEV_C[s.sev] || "#6B7280"}`,
                    position: "relative",
                  }}>
                    {/* NEW pill */}
                    {storyIsNew && (
                      <div style={{
                        position: "absolute", top: 12, right: 12,
                        background: "#C8AA78", borderRadius: 10, padding: "2px 8px",
                        fontSize: 9, fontWeight: 700, color: "#101114", fontFamily: "var(--mono)",
                        letterSpacing: ".04em",
                      }}>NEW</div>
                    )}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".06em", fontFamily: "var(--mono)", color: STAGE_C[stage] || "#C8AA78" }}>{stage.toUpperCase()}</span>
                      <span style={{ fontSize: 9, fontWeight: 600, color: FQ_C[s.fq] || "#F59E0B", fontFamily: "var(--mono)" }}>{FQ_I[s.fq] || "◔"} {(s.fq || "").toUpperCase()}</span>
                    </div>
                    <h3 style={{ fontFamily: "var(--display)", fontSize: 19, fontWeight: 400, color: "var(--t1)", margin: "0 0 6px", lineHeight: 1.3, paddingRight: storyIsNew ? 50 : 0 }}>{s.hl}</h3>
                    <p style={{ fontSize: 14, lineHeight: 1.5, color: "var(--t3)", margin: 0, fontFamily: "var(--body)" }}>{s.sum}</p>
                  </button>
                );
              })}
            </div>
          ) : briefing && (
            <div style={{ textAlign: "center", padding: "60px 16px" }}>
              <p style={{ fontSize: 14, color: "var(--t3)" }}>No stories for this category yet.</p>
              <p style={{ fontSize: 10, color: "var(--t4)" }}>Stories update daily at 6:00 AM ET.</p>
            </div>
          )
        )}

        {/* STORY DETAIL */}
        {view === "story" && selected && (
          <StoryScreen story={selected} onBack={() => { setView("feed"); setSelected(null); }} />
        )}
      </div>
    </div>
  );
}
