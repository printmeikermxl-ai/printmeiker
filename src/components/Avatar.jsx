import { useState, useEffect } from "react";

/**
 * Avatar unificado para toda la app.
 * Si la imagen falla (URL expirada, CORS, etc.) muestra automáticamente
 * el avatar de letra con el gradiente del tema.
 */
export const Avatar = ({
  src,
  name = "U",
  size = 34,
  gradient = "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))",
  style = {},
  className = "",
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const letter = (name || "U")[0].toUpperCase();
  const showPhoto = src && !imgError;

  const base = {
    width: size,
    height: size,
    borderRadius: "50%",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    ...style,
  };

  if (showPhoto) {
    return (
      <div
        className={className}
        style={{
          ...base,
          padding: 2,
          background: gradient,
          boxShadow: "0 2px 8px hsl(var(--primary) / 0.35)",
        }}
      >
        <img
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          style={{
            width: size - 6,
            height: size - 6,
            borderRadius: "50%",
            objectFit: "cover",
            border: "1.5px solid hsl(var(--card))",
            display: "block",
          }}
        />
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        ...base,
        background: gradient,
        color: "white",
        fontWeight: 900,
        fontSize: Math.round(size * 0.42),
        letterSpacing: "-0.02em",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
      }}
    >
      {letter}
    </div>
  );
};
