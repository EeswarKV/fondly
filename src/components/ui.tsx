export const P = {
  cocoa: "#1B2A33",
  cocoaSoft: "#5C7480",
  accent: "#0F5C7A",
  sage: "#1E8074",
  rust: "#C1443B",
  blue: "#4A90B8",
  teal: "#3D8C8C",
  indigo: "#3B5B92",
  purple: "#5C6BAE",
  steel: "#6E8B9E",
  line: "#D7E3EA",
};

export const body = '"Helvetica Neue", Arial, sans-serif';
export const display = '"Georgia", "Iowan Old Style", serif';

export const inr = (n: number) => "\u20b9" + Math.round(n).toLocaleString("en-IN");

export function Avatar({
  founder,
  size = 22,
}: {
  founder: { initial: string; color: string; name: string } | undefined;
  size?: number;
}) {
  if (!founder) {
    return (
      <div
        style={{
          width: size, height: size, borderRadius: "50%", background: "#fff",
          border: `2px dashed ${P.line}`, flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      title={founder.name}
      style={{
        width: size, height: size, borderRadius: "50%", background: "#fff",
        border: `2px solid ${founder.color}`, color: founder.color,
        fontSize: size * 0.4, fontWeight: 700, display: "flex",
        alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}
    >
      {founder.initial}
    </div>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${P.line}`, borderRadius: 12, padding: 20, ...style }}>
      {children}
    </div>
  );
}

export function Alert({ icon, color, children }: { icon: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${P.line}`, borderLeft: `3px solid ${color}`, borderRadius: 6, padding: "10px 14px", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
      <span style={{ color, fontSize: 14 }}>{icon}</span>
      <span style={{ color: P.cocoa }}>{children}</span>
    </div>
  );
}
