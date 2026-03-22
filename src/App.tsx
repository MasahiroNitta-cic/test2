import { useState, useEffect, useCallback, useRef } from "react";
import "./App.css";
import Madorizu from "./crm/crm002/components/Madorizu/Madorizu/Madorizu";
import type {
  MarkerInfo,
  MadorizuRef,
} from "./crm/crm002/components/Madorizu/Madorizu/Madorizu";
import { MarkerListPanel } from "./components/MarkerListPanel/MarkerListPanel";

async function fetchImageAsDataUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) return "";
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

function App() {
  const [imageData, setImageData] = useState("");
  const [markers, setMarkers] = useState<MarkerInfo[]>([]);
  const madorizuRef = useRef<MadorizuRef>(null);

  useEffect(() => {
    void (async () => {
      const data = await fetchImageAsDataUrl("madorizu.gif");
      //console.log("画像データURLが読み込まれました:", data);
      setImageData(data);
    })();
  }, []);

  const removeMarkerById = useCallback((markerId: number) => {
    madorizuRef.current?.removeMarker(markerId);
  }, []);

  return (
    <>
      <section id="center">
        <h3>間取り図</h3>
        <Madorizu
          isMarkable={true}
          imageData={imageData}
          markers={markers}
          onMarkersChange={setMarkers}
          ref={madorizuRef}
        />
        <MarkerListPanel markers={markers} onRemoveMarker={removeMarkerById} />
      </section>
    </>
  );
}

export default App;
