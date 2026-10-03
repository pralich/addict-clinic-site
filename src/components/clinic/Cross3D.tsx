interface Cross3DProps {
  size?: number;
  className?: string;
}

const Cross3D = ({ size = 140, className = "" }: Cross3DProps) => {
  const layers = Array.from({ length: 15 }, (_, i) => i);
  return (
    <div className={`cross-stage relative ${className}`} style={{ width: size, height: size * 1.4 }} aria-hidden="true">
      <div
        className="cross-shadow"
        style={{ left: size * -0.04, top: size * 1.24, width: size * 1.07, height: size * 0.19 }}
      />
      <div className="cross3d" style={{ left: 0, top: 0, width: size, height: size }}>
        {layers.map((i) => (
          <div
            key={i}
            className={`layer ${i === 14 ? "front" : ""}`}
            style={{ ["--i" as string]: i } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
};

export default Cross3D;
