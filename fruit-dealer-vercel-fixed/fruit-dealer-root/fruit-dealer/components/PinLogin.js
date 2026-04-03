import { useState, useEffect, useRef } from "react";

const CORRECT_PIN = "1234"; // ← change this to your desired PIN

export default function PinLogin({ onUnlock }) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError]   = useState(false);
  const [shake, setShake]   = useState(false);
  const inputs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => { inputs[0].current?.focus(); }, []);

  function handleChange(i, val) {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    setError(false);
    if (val && i < 3) inputs[i + 1].current?.focus();
    if (i === 3 && val) {
      const pin = [...next.slice(0, 3), val].join("");
      checkPin(pin);
    }
  }

  function handleKeyDown(i, e) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputs[i - 1].current?.focus();
    }
  }

  function checkPin(pin) {
    if (pin === CORRECT_PIN) {
      onUnlock();
    } else {
      setShake(true);
      setError(true);
      setDigits(["", "", "", ""]);
      setTimeout(() => { setShake(false); inputs[0].current?.focus(); }, 600);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0d2e0d 0%, #1a4a1a 40%, #2d7a2d 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Georgia', serif",
    }}>
      {/* Decorative background circles */}
      <div style={{ position:"fixed", top:-120, right:-120, width:400, height:400, borderRadius:"50%", background:"rgba(76,175,80,0.07)", pointerEvents:"none" }}/>
      <div style={{ position:"fixed", bottom:-80, left:-80, width:300, height:300, borderRadius:"50%", background:"rgba(45,122,45,0.1)", pointerEvents:"none" }}/>

      <div style={{
        background: "rgba(255,255,255,0.97)",
        borderRadius: 24,
        padding: "52px 44px",
        boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
        textAlign: "center",
        width: "100%",
        maxWidth: 360,
        position: "relative",
      }}>
        {/* Logo */}
        <div style={{ fontSize: 52, marginBottom: 6 }}>🍊</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#1a4a1a", letterSpacing: 0.5 }}>
          Orangs Wholesale
        </div>
        <div style={{ fontSize: 11, color: "#888", letterSpacing: 2, textTransform: "uppercase", marginBottom: 36 }}>
          Fruit Dealer Management System
        </div>

        <div style={{ fontSize: 14, color: "#555", marginBottom: 24, fontWeight: 600 }}>
          Enter your PIN to continue
        </div>

        {/* PIN dots display */}
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 28 }}>
          {digits.map((d, i) => (
            <div key={i} style={{
              width: 16, height: 16, borderRadius: "50%",
              background: d ? "#2d7a2d" : "#e0e0e0",
              transition: "background 0.15s",
              boxShadow: d ? "0 0 10px rgba(45,122,45,0.4)" : "none",
            }}/>
          ))}
        </div>

        {/* Hidden number inputs */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: 14,
          animation: shake ? "shake 0.5s ease" : "none",
        }}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={inputs[i]}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              style={{
                width: 52,
                height: 60,
                textAlign: "center",
                fontSize: 24,
                fontWeight: 700,
                borderRadius: 12,
                border: `2px solid ${error ? "#c84b00" : d ? "#2d7a2d" : "#d0d0d0"}`,
                background: error ? "#fff5f0" : d ? "#f0fff4" : "#fafafa",
                outline: "none",
                fontFamily: "'Georgia', serif",
                color: "#1a4a1a",
                transition: "border-color 0.2s, background 0.2s",
                boxShadow: d ? "0 2px 10px rgba(45,122,45,0.15)" : "none",
              }}
            />
          ))}
        </div>

        {error && (
          <div style={{ marginTop: 18, color: "#c84b00", fontSize: 13, fontWeight: 600 }}>
            ✕ Incorrect PIN. Try again.
          </div>
        )}

        <div style={{ marginTop: 36, fontSize: 11, color: "#bbb" }}>
          Secured access only
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-8px); }
          80% { transform: translateX(8px); }
        }
      `}</style>
    </div>
  );
}
