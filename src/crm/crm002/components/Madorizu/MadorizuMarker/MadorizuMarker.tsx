import React from "react";
import type { MarkerInfo } from "../Madorizu/Madorizu";
import "../MadorizuMarker/MadorizuMarker.css";

interface MadorizuMarkerProps {
  info: MarkerInfo;
  sizePx?: number;
}

const MadorizuMarker: React.FC<MadorizuMarkerProps> = ({ info, sizePx }) => {
  const size = sizePx ?? 24;
  const fontSize = Math.max(8, Math.round(size * 0.65));
  return (
    <div
      className="madorizu-marker"
      style={{
        left: `${info.x}%`,
        top: `${info.y}%`,
        width: `${size}px`,
        height: `${size}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      aria-hidden
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={`marker-${info.id}`}
        style={{ display: "block" }}
      >
        <circle cx="12" cy="12" r="12" fill="#0B3668" />
        <text
          x="12"
          y="12"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#ffffff"
          fontWeight={700}
          style={{ fontSize: `${fontSize}px` }}
        >
          {info.id}
        </text>
      </svg>
    </div>
  );
};

export default MadorizuMarker;
