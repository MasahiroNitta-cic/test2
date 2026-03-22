import React from "react";
import type { MarkerInfo } from "../Madorizu/Madorizu";
import "./MadorizuMarker.css";

interface MadorizuMarkerProps {
  info: MarkerInfo;
}

const MadorizuMarker: React.FC<MadorizuMarkerProps> = ({ info }) => (
  <div
    className="madorizu-marker"
    style={{
      left: `${info.x}%`,
      top: `${info.y}%`,
    }}
  >
    <div className="marker-num">{info.id}</div>
  </div>
);

export default MadorizuMarker;
