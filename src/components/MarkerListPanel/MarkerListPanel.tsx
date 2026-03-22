import type { MarkerInfo } from "../../crm/crm002/components/Madorizu/Madorizu/Madorizu";
import "./MarkerListPanel.css";

type MarkerListPanelProps = {
  markers: MarkerInfo[];
  onRemoveMarker: (markerId: number) => void;
};

export function MarkerListPanel({
  markers,
  onRemoveMarker,
}: MarkerListPanelProps) {
  if (markers.length === 0) return null;

  return (
    <div className="inspection">
      <h3>マーカー一覧</h3>
      <div className="marker-list-grid">
        {markers.map((marker) => (
          <div key={marker.id} className="marker-list-card">
            <div>
              <strong>マーカー {marker.id}</strong>
              <br />
              座標: ({marker.x.toFixed(1)}%, {marker.y.toFixed(1)}%)
            </div>
            <button
              type="button"
              className="marker-list-remove"
              onClick={() => onRemoveMarker(marker.id)}
            >
              削除
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
