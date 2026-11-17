import { useState } from "react";

export function OperatorAvatar({
  photoURL,
  name,
  size = "sm",
  className = "",
}: {
  photoURL?: string | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const sizeClass =
    size === "lg"
      ? "w-12 h-12 text-sm"
      : size === "md"
        ? "w-8 h-8 text-xs"
        : "w-6 h-6 text-[10px]";

  const initials = (name || "OP")
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (photoURL && !imgFailed) {
    return (
      <img
        src={photoURL}
        alt={name || "Operator Avatar"}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`${sizeClass} rounded-full object-cover border border-sky-400/60 shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-gradient-to-br from-sky-600 to-cyan-500 text-white font-black flex items-center justify-center border border-sky-300/60 shrink-0 ${className}`}
    >
      {initials || "OP"}
    </div>
  );
}
