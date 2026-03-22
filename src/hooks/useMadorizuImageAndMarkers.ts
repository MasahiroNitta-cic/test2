import { useState, useRef, useEffect, useCallback } from "react";
import { fetchImageAsDataUrl } from "../utils/fetchImageAsDataUrl";
import type {
  MarkerInfo,
  MadorizuRef,
} from "../myp/myp002/components/Madorizu/Madorizu/Madorizu";

/**
 * 間取図用画像の読み込みとマーカー状態をまとめたフック。
 */
export function useMadorizuImageAndMarkers(imageUrl: string) {
  const [markers, setMarkers] = useState<MarkerInfo[]>([]);
  const [imageData, setImageData] = useState("");
  const madorizuRef = useRef<MadorizuRef>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const data = await fetchImageAsDataUrl(imageUrl);
      console.log("画像データURLが読み込まれました:", data);
      if (!cancelled) setImageData(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  const handleMarkerAdd = useCallback((x: number, y: number) => {
    setMarkers((prev) => [...prev, { id: prev.length + 1, x, y }]);
  }, []);

  const removeMarkerById = useCallback((markerId: number) => {
    madorizuRef.current?.removeMarker(markerId);
  }, []);

  return {
    imageData,
    markers,
    madorizuRef,
    handleMarkerAdd,
    onMarkersChange: setMarkers,
    removeMarkerById,
  };
}
