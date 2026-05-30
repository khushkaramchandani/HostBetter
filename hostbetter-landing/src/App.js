import { useState, useEffect, useRef } from "react";

const NAV_LINKS_LEFT = [
  { label: "Home", href: "#hero" },
  { label: "Process", href: "#how" },
];
const NAV_LINKS_RIGHT = [
  { label: "Features", href: "#features" },
];

const TUNNEL_COUNT = 1518;

function useTypewriter(texts, speed = 60) {
  const [display, setDisplay] = useState("");
  const [idx, setIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = texts[idx];
    const timeout = setTimeout(() => {
      if (!deleting) {
        setDisplay(current.slice(0, charIdx + 1));
        if (charIdx + 1 === current.length) {
          setTimeout(() => setDeleting(true), 1800);
        } else {
          setCharIdx(c => c + 1);
        }
      } else {
        setDisplay(current.slice(0, charIdx - 1));
        if (charIdx - 1 === 0) {
          setDeleting(false);
          setIdx(i => (i + 1) % texts.length);
          setCharIdx(0);
        } else {
          setCharIdx(c => c - 1);
        }
      }
    }, deleting ? 30 : speed);
    return () => clearTimeout(timeout);
  }, [charIdx, deleting, idx, texts, speed]);

  return display;
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} style={{
      background: copied ? "#1a3a1a" : "#1a1a2e",
      border: `1px solid ${copied ? "#22c55e44" : "#3b82f633"}`,
      borderRadius: 8,
      padding: "4px 10px",
      color: copied ? "#22c55e" : "#64748b",
      fontSize: 12,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 4,
      transition: "all 0.2s",
      fontFamily: "inherit",
    }}>
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function TerminalWindow() {
  const typed = useTypewriter([
    "ssh -t -R 80:localhost:3000 -p 2222 root@t.hostbetter.live",
    "ssh -t -R 80:localhost:8080 -p 2222 root@t.hostbetter.live",
    "ssh -t -R 80:localhost:5173 -p 2222 root@t.hostbetter.live",
  ], 55);

  const [showOutput, setShowOutput] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowOutput(true), 3200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{
      background: "#0d1117",
      borderRadius: 16,
      border: "1px solid #21262d",
      overflow: "hidden",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 13,
      boxShadow: "0 0 0 1px #30363d, 0 32px 64px rgba(0,0,0,0.6)",
      maxWidth: 640,
      width: "100%",
    }}>
      {/* title bar */}
      <div style={{
        background: "#161b22",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        borderBottom: "1px solid #21262d",
      }}>
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e" }} />
        <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840" }} />
        <span style={{ marginLeft: 8, color: "#8b949e", fontSize: 12 }}>bash</span>
      </div>

      {/* body */}
      <div style={{ padding: "20px 20px", lineHeight: 1.8 }}>
        <div style={{ color: "#8b949e" }}>$ <span style={{ color: "#e6edf3" }}>{typed}</span>
          <span style={{ animation: "blink 1s step-end infinite", color: "#3b82f6" }}>▋</span>
        </div>

        {showOutput && (
          <div style={{ marginTop: 16, animation: "fadeIn 0.4s ease" }}>
            <div style={{ color: "#8b949e" }}>Connected to <span style={{ color: "#3b82f6" }}>t.hostbetter.live</span>.</div>
            <div style={{ color: "#22c55e", fontWeight: 600 }}>Tunnel is live!</div>
            <div>
              <span style={{ color: "#8b949e" }}>Public URL: </span>
              <span style={{ color: "#a78bfa" }}>https://brave-falcon-a1b2c3d4.t.hostbetter.live</span>
            </div>
            <div>
              <span style={{ color: "#8b949e" }}>Expires:    </span>
              <span style={{ color: "#e6edf3" }}>May 27, 2026 at 10:26 UTC (or 2h idle)</span>
            </div>
            <div style={{ marginTop: 12, color: "#8b949e", fontSize: 11, letterSpacing: 1 }}>
              {["█▀▀▀▀▀█ ▄ ▄ █▀▀▀▀▀█", "█ ███ █ █▀  █ ███ █", "▀▀▀▀▀▀▀ ▀▄▀ ▀▀▀▀▀▀▀"].map((row, i) => (
                <div key={i}>{row}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Step({ number, title, desc }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      gap: 16, padding: "32px 28px",
      background: "#0d1117", borderRadius: 16,
      border: "1px solid #21262d", position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: "linear-gradient(90deg, #3b82f6, transparent)",
      }} />
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: "#3b82f6",
            background: "#1e3a5f", padding: "2px 8px", borderRadius: 100,
            letterSpacing: 1, textTransform: "uppercase",
          }}>Step {number}</span>
        </div>
        <h3 style={{ color: "#e6edf3", fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>{title}</h3>
        <p style={{ color: "#8b949e", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{desc}</p>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div style={{
      padding: "24px",
      background: "#0d1117",
      borderRadius: 12,
      border: "1px solid #21262d",
      transition: "border-color 0.2s",
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "#3b82f644"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "#21262d"}
    >
      <div style={{ fontSize: 24, marginBottom: 12 }}>{icon}</div>
      <h4 style={{ color: "#e6edf3", fontSize: 15, fontWeight: 600, margin: "0 0 6px" }}>{title}</h4>
      <p style={{ color: "#8b949e", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{desc}</p>
    </div>
  );
}

export default function App() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const CMD = "ssh -t -R 80:localhost:3000 -p 2222 root@t.hostbetter.live";

  return (
    <div style={{
      background: "#010409",
      minHeight: "100vh",
      color: "#e6edf3",
      fontFamily: "'Inter', sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono&display=swap');
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #010409; }
        ::-webkit-scrollbar-thumb { background: #21262d; border-radius: 3px; }
      `}</style>

      {/* NAVBAR */}
      <nav style={{
        position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
        zIndex: 100, width: "fit-content",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 2,
          background: scrolled ? "rgba(10,12,18,0.97)" : "rgba(10,12,18,0.85)",
          backdropFilter: "blur(24px)",
          border: "1px solid #30363d",
          borderRadius: 100,
          padding: "6px 8px",
          transition: "all 0.3s",
          boxShadow: scrolled ? "0 8px 32px rgba(0,0,0,0.5)" : "none",
        }}>

          {/* Left links */}
          {NAV_LINKS_LEFT.map(link => (
            <a key={link.label} href={link.href} style={{
              color: "#8b949e", fontSize: 14, fontWeight: 700, textDecoration: "none",
              padding: "7px 16px", borderRadius: 100,
              transition: "all 0.2s", whiteSpace: "nowrap",
            }}
              onMouseEnter={e => { e.target.style.color = "#e6edf3"; e.target.style.background = "#21262d"; }}
              onMouseLeave={e => { e.target.style.color = "#8b949e"; e.target.style.background = "transparent"; }}
            >
              {link.label}
            </a>
          ))}

          {/* HB Logo — center */}
          <a href="#hero" style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            textDecoration: "none",
            margin: "0 10px",
            transition: "all 0.25s",
            flexShrink: 0,
          }}
            onMouseEnter={e => {
              e.currentTarget.querySelector("svg").style.filter = "drop-shadow(0 0 6px rgba(255,255,255,0.6)) brightness(1.3)";
            }}
            onMouseLeave={e => {
              e.currentTarget.querySelector("svg").style.filter = "none";
            }}
          >
            <svg width="26" height="26" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"
              style={{ transition: "filter 0.25s" }}>
              {/* H */}
              <rect x="8" y="12" width="10" height="76" rx="3" fill="white" stroke="white" strokeWidth="1"/>
              <rect x="8" y="44" width="34" height="10" rx="3" fill="white" stroke="white" strokeWidth="1"/>
              <rect x="32" y="12" width="10" height="76" rx="3" fill="white" stroke="white" strokeWidth="1"/>
              {/* B */}
              <rect x="48" y="12" width="10" height="76" rx="3" fill="white" stroke="white" strokeWidth="1"/>
              <path d="M58 12 Q88 12 88 33 Q88 50 58 50" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round"/>
              <path d="M58 50 Q92 50 92 73 Q92 88 58 88" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round"/>
            </svg>
          </a>

          {/* Right links */}
          {NAV_LINKS_RIGHT.map(link => (
            <a key={link.label} href={link.href} style={{
              color: "#8b949e", fontSize: 14, fontWeight: 700, textDecoration: "none",
              padding: "7px 16px", borderRadius: 100,
              transition: "all 0.2s", whiteSpace: "nowrap",
            }}
              onMouseEnter={e => { e.target.style.color = "#e6edf3"; e.target.style.background = "#21262d"; }}
              onMouseLeave={e => { e.target.style.color = "#8b949e"; e.target.style.background = "transparent"; }}
            >
              {link.label}
            </a>
          ))}

          {/* GitHub icon */}
          <a href="https://github.com/khushkaramchandani/HostBetter" target="_blank" rel="noreferrer"
            style={{
              marginLeft: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              textDecoration: "none",
              transition: "all 0.2s",
              flexShrink: 0,
            }}
            onMouseEnter={e => e.currentTarget.querySelector("svg path").style.fill = "#e6edf3"}
            onMouseLeave={e => e.currentTarget.querySelector("svg path").style.fill = "#8b949e"}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path style={{ transition: "fill 0.2s", fill: "#8b949e" }} d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section id="hero" style={{
        minHeight: "100vh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "120px 24px 80px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* grid bg */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(#21262d22 1px, transparent 1px), linear-gradient(90deg, #21262d22 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
        }} />
        {/* glow */}
        <div style={{
          position: "absolute", top: "30%", left: "50%", transform: "translate(-50%,-50%)",
          width: 600, height: 300,
          background: "radial-gradient(ellipse, #3b82f614 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ position: "relative", textAlign: "center", maxWidth: 780 }}>
          {/* badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "#1e3a5f", border: "1px solid #3b82f633",
            borderRadius: 100, padding: "6px 16px", marginBottom: 32,
            fontSize: 13, color: "#93c5fd",
            animation: "fadeIn 0.6s ease",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            {TUNNEL_COUNT.toLocaleString()} tunnels opened this week
          </div>

          <h1 style={{
            fontSize: "clamp(40px, 7vw, 72px)",
            fontWeight: 700, lineHeight: 1.1,
            letterSpacing: -2,
            margin: "0 0 24px",
            animation: "fadeIn 0.7s ease 0.1s both",
          }}>
            Your Local Host<br />
            <span style={{
              background: "linear-gradient(135deg, #3b82f6, #818cf8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>just went global</span>
          </h1>

          <p style={{
            fontSize: "clamp(16px, 2.5vw, 20px)",
            color: "#8b949e", lineHeight: 1.6,
            maxWidth: 520, margin: "0 auto 40px",
            animation: "fadeIn 0.7s ease 0.2s both",
          }}>
            SSH tunnel service with instant HTTPS URLs, QR codes, WebSocket support and zero signups.
          </p>

          {/* command box */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "#0d1117", border: "1px solid #21262d",
            borderRadius: 12, padding: "14px 18px",
            maxWidth: 580, margin: "0 auto 48px",
            animation: "fadeIn 0.7s ease 0.3s both",
          }}>
            <span style={{ color: "#3b82f6", fontFamily: "monospace", userSelect: "none" }}>$</span>
            <code style={{
              flex: 1, textAlign: "left", fontSize: 13,
              fontFamily: "'JetBrains Mono', monospace",
              color: "#e6edf3", wordBreak: "break-all",
            }}>{CMD}</code>
            <CopyButton text={CMD} />
          </div>

          {/* terminal */}
          <div style={{
            display: "flex", justifyContent: "center",
            animation: "fadeIn 0.8s ease 0.4s both",
          }}>
            <TerminalWindow />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <p style={{ color: "#3b82f6", fontSize: 13, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>How it works</p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 700, letterSpacing: -1, marginBottom: 16 }}>
            Three steps to go public
          </h2>
          <p style={{ color: "#8b949e", fontSize: 16, maxWidth: 480, margin: "0 auto" }}>
            No clients, no accounts, no config files. Just SSH.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          <Step number={1} title="Start your local app"
            desc="Run any app on any port — a React dev server, a Flask API, a game server. Anything that listens on localhost." />
          <Step number={2} title="Run the SSH command"
            desc="One SSH command with the -R flag. No installation, no config, no account. Works on Mac, Windows, and Linux." />
          <Step number={3} title="Share your public URL"
            desc="Instantly get an HTTPS URL and a QR code. Share it with anyone — it works from anywhere in the world." />
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: "100px 24px", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 64 }}>
          <p style={{ color: "#3b82f6", fontSize: 13, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Features</p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 700, letterSpacing: -1, marginBottom: 16 }}>
            Built for developers
          </h2>
          <p style={{ color: "#8b949e", fontSize: 16, maxWidth: 480, margin: "0 auto" }}>
            Everything you need, nothing you don't.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          <Feature  title="Automatic HTTPS" desc="Every tunnel gets a TLS certificate automatically. No Let's Encrypt setup needed on your end." />
          <Feature  title="QR Code" desc="A scannable QR code prints in your terminal so you can test on mobile instantly." />
          <Feature  title="WebSocket support" desc="Full bidirectional WebSocket proxying. Works with Next.js HMR, socket.io, and anything else." />
          <Feature  title="Abuse protection" desc="Rate limiting, IP blocking, and a phishing warning interstitial protect users from malicious tunnels." />
          <Feature  title="Memorable URLs" desc="Subdomains like brave-falcon-a1b2c3d4 are random but readable — easy to share verbally." />
          <Feature  title="No signup" desc="Zero accounts, zero emails, zero forms. Just SSH. Works from any machine with OpenSSH installed." />
        </div>
      </section>

      {/* CTA */}
      <section style={{
        padding: "80px 24px 120px",
        textAlign: "center",
        maxWidth: 680, margin: "0 auto",
      }}>
        <div style={{
          background: "#0d1117",
          border: "1px solid #21262d",
          borderRadius: 24, padding: "64px 40px",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
            width: "80%", height: 1,
            background: "linear-gradient(90deg, transparent, #3b82f6, transparent)",
          }} />
          <h2 style={{ fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 700, marginBottom: 16, letterSpacing: -1 }}>
            Ready to tunnel?
          </h2>
          <p style={{ color: "#8b949e", fontSize: 16, marginBottom: 32, lineHeight: 1.6 }}>
            No account needed. Open your terminal and run:
          </p>
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "#010409", border: "1px solid #30363d",
            borderRadius: 10, padding: "14px 18px",
            marginBottom: 24,
          }}>
            <span style={{ color: "#3b82f6", fontFamily: "monospace" }}>$</span>
            <code style={{
              flex: 1, textAlign: "left", fontSize: 12,
              fontFamily: "'JetBrains Mono', monospace",
              color: "#e6edf3", wordBreak: "break-all",
            }}>{CMD}</code>
            <CopyButton text={CMD} />
          </div>
          <p style={{ color: "#8b949e", fontSize: 13 }}>
            Replace <code style={{ color: "#a78bfa", background: "#1a1a2e", padding: "1px 6px", borderRadius: 4 }}>3000</code> with your local port
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: "1px solid #21262d",
        padding: "32px 24px",
        display: "flex", alignItems: "center", justifyContent: "center",
        maxWidth: 1100, margin: "0 auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <svg width="26" height="26" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="12" width="10" height="76" rx="3" fill="white" stroke="white" strokeWidth="1"/>
            <rect x="8" y="44" width="34" height="10" rx="3" fill="white" stroke="white" strokeWidth="1"/>
            <rect x="32" y="12" width="10" height="76" rx="3" fill="white" stroke="white" strokeWidth="1"/>
            <rect x="48" y="12" width="10" height="76" rx="3" fill="white" stroke="white" strokeWidth="1"/>
            <path d="M58 12 Q88 12 88 33 Q88 50 58 50" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round"/>
            <path d="M58 50 Q92 50 92 73 Q92 88 58 88" stroke="white" strokeWidth="8" fill="none" strokeLinecap="round"/>
          </svg>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#e6edf3" }}>HostBetter Tunnel</span>
          <span style={{ color: "#8b949e", fontSize: 13 }}>— Open source SSH tunneling</span>
        </div>
      </footer>
    </div>
  );
}