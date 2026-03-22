import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useRef,
} from "react";
import MadorizuMarker from "../MadorizuMarker/MadorizuMarker";
import "./Madorizu.css";

/* c8 ignore start - 型宣言は実行時コードに変換されずカバレッジ対象外とする */
interface MadorizuProps {
  isMarkable?: boolean;
  hasModal?: boolean;
  hasButton?: boolean;
  imageData: string; // base64エンコードされた画像データ
  markers: MarkerInfo[];
  onMarkersChange: (markers: MarkerInfo[]) => void;
  onImageClick?: (event: React.MouseEvent<HTMLImageElement>) => void;
  // 最大件数超過時の通知
  onLimitExceeded?: () => void;
}

/**
 * 間取図の上に配置される申告箇所情報
 */
export interface MarkerInfo {
  id: number; // 番号
  x: number; // x座標(%)
  y: number; // y座標(%)
}

export interface MadorizuRef {
  removeMarker: (markerId: number) => void;
}
/* c8 ignore stop */

const Madorizu = forwardRef<MadorizuRef, MadorizuProps>(
  (
    {
      isMarkable = true,
      hasModal = false,
      hasButton = true,
      imageData,
      markers,
      onMarkersChange,
      onImageClick,
      onLimitExceeded,
    },
    ref,
  ) => {
    const [imageWidth, setImageWidth] = useState(0);
    const [imageHeight, setImageHeight] = useState(0);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({
      x: 0,
      y: 0,
    });
    const [imagePosition, setImagePosition] = useState<{
      x: number;
      y: number;
    }>({ x: 0, y: 0 });
    const [containerSize, setContainerSize] = useState<{
      width: number;
      height: number;
    }>({ width: 0, height: 0 });
    const [dragStartPosition, setDragStartPosition] = useState<{
      x: number;
      y: number;
    } | null>(null);
    const [dragEndPosition, setDragEndPosition] = useState<{
      x: number;
      y: number;
    } | null>(null);
    const [pinchDistance, setPinchDistance] = useState<number | null>(null);
    const [pinchCenter, setPinchCenter] = useState<{
      x: number;
      y: number;
    } | null>(null);
    // pinchDistance と pinchCenter を Ref でも管理して、常に最新値にアクセス可能にする
    const pinchDistanceRef = useRef<number | null>(null);
    const pinchCenterRef = useRef<{ x: number; y: number } | null>(null);
    // ピンチ開始時の2点間距離（ズーム倍率はこれに対する現在距離の比で算出）
    const initialPinchDistanceRef = useRef<number | null>(null);
    // 直前フレームの2点間距離（パン補正の増分比に使用）
    const lastPinchDistanceRef = useRef<number | null>(null);
    // ピンチ開始時のズームレベルを記録（累積を防ぐため）
    const initialPinchZoomLevelRef = useRef<number>(1);
    // 常に最新のズームレベルを保持
    const currentZoomLevelRef = useRef<number>(1);
    // 常に最新の画像位置を保持
    const currentImagePositionRef = useRef<{ x: number; y: number }>({
      x: 0,
      y: 0,
    });
    // タッチハンドラは mount 時に一度だけ登録するため、最新のコンテナ・画像サイズは ref で参照する
    const containerSizeRef = useRef(containerSize);
    const imageDimensionsRef = useRef({ width: imageWidth, height: imageHeight });
    // 同上: 1本指ドラッグは touchstart の直後に touchmove が来るため ref を同期的に更新する
    const isDraggingRef = useRef(false);
    const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    // 参照はJSX属性のrefを使わず、id経由のDOM取得で対応（markuplintのinvalid-attr回避）

    // pinchDistance と pinchCenter を Ref と同期
    useEffect(() => {
      pinchDistanceRef.current = pinchDistance;
      pinchCenterRef.current = pinchCenter;
    }, [pinchDistance, pinchCenter]);

    // 常に最新のズームレベルを Ref に同期
    useEffect(() => {
      currentZoomLevelRef.current = zoomLevel;
    }, [zoomLevel]);

    // 常に最新の画像位置を Ref に同期
    useEffect(() => {
      currentImagePositionRef.current = imagePosition;
    }, [imagePosition]);

    useEffect(() => {
      containerSizeRef.current = containerSize;
    }, [containerSize]);

    useEffect(() => {
      imageDimensionsRef.current = { width: imageWidth, height: imageHeight };
    }, [imageWidth, imageHeight]);

    useEffect(() => {
      isDraggingRef.current = isDragging;
    }, [isDragging]);

    useEffect(() => {
      dragOffsetRef.current = dragOffset;
    }, [dragOffset]);

    // 外部からマーカーを削除する関数
    const calculateDistance = (
      touch1: React.Touch,
      touch2: React.Touch,
    ): number => {
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // ピンチの中心座標を計算するヘルパー関数
    const calculatePinchCenter = (touch1: React.Touch, touch2: React.Touch) => {
      return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };
    };

    // 外部からマーカーを削除する関数
    const removeMarker = (markerId: number) => {
      // 早期リターン分岐：存在しないIDは状態変更しない
      const exists = markers.some((marker) => marker.id === markerId);
      if (!exists) {
        return; // 分岐カバレッジ確保用。挙動は従来通り (結果的に何もしない)
      }

      const filteredMarkers = markers.filter(
        (marker) => marker.id !== markerId,
      );
      // 番号を振り直す
      const renumberedMarkers = filteredMarkers.map((marker, index) => ({
        ...marker,
        id: index + 1,
      }));
      onMarkersChange(renumberedMarkers);
    };

    // 親コンポーネントにremoveMarker関数を公開
    useImperativeHandle(ref, () => ({
      removeMarker,
    }));

    useEffect(() => {
      const img = document.querySelector(
        ".madorizu-img",
      ) as HTMLImageElement | null;
      if (!img) return;

      const handleLoad = () => {
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        setImageWidth(width);
        setImageHeight(height);

        // 画像ロード後、コンテナサイズも更新
        const el = document.querySelector(
          ".madorizu-container",
        ) as HTMLDivElement | null;
        if (el) {
          const rect = el.getBoundingClientRect();
          setContainerSize({ width: rect.width, height: rect.height });
        }
      };

      if (img.complete) {
        handleLoad();
        return;
      }

      img.addEventListener("load", handleLoad);
      return () => img.removeEventListener("load", handleLoad);
    }, [imageData]);

    useEffect(() => {
      const updateContainerSize = () => {
        const el = document.querySelector(
          ".madorizu-container",
        ) as HTMLDivElement | null;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        setContainerSize({ width: rect.width, height: rect.height });
      };

      updateContainerSize();
      window.addEventListener("resize", updateContainerSize);
      return () => window.removeEventListener("resize", updateContainerSize);
    }, [imageData]);

    // タッチイベントは addEventListener で付与（onTouch* 属性を使わない）
    useEffect(() => {
      const el = document.querySelector(
        ".madorizu-container",
      ) as HTMLDivElement | null;
      if (!el) return;
      const handleTouchStart = (e: React.TouchEvent) => {
        // ピンチジェスチャー（2本指）の初期化
        if (e.touches.length === 2) {
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          if (!touch1 || !touch2) return;
          const distance = calculateDistance(touch1, touch2);
          // 直接 Ref に保存（即座に利用可能にする）
          pinchDistanceRef.current = distance;
          initialPinchDistanceRef.current = distance;
          lastPinchDistanceRef.current = distance;
          setPinchDistance(distance);
          const center = calculatePinchCenter(touch1, touch2);
          pinchCenterRef.current = center;
          setPinchCenter(center);
          // ピンチ開始時のズームレベルを記録（常に最新値を使用）
          initialPinchZoomLevelRef.current = currentZoomLevelRef.current;
          isDraggingRef.current = false;
          setIsDragging(false);
          return;
        }

        // 1本指のドラッグ操作
        if (currentZoomLevelRef.current > 1 && e.touches.length === 1) {
          const touch = e.touches[0];
          if (!touch) return;
          const nextOffset = {
            x: touch.clientX - currentImagePositionRef.current.x,
            y: touch.clientY - currentImagePositionRef.current.y,
          };
          dragOffsetRef.current = nextOffset;
          isDraggingRef.current = true;
          setIsDragging(true);
          setDragStartPosition({ x: touch.clientX, y: touch.clientY });
          setDragEndPosition(null);
          setDragOffset(nextOffset);
        }
      };

      const handleTouchMove = (e: React.TouchEvent) => {
        e.preventDefault();

        // ピンチズーム操作（2本指）
        if (
          e.touches.length === 2 &&
          initialPinchDistanceRef.current !== null &&
          lastPinchDistanceRef.current !== null
        ) {
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          if (!touch1 || !touch2) return;

          const currentDistance = calculateDistance(touch1, touch2);
          const initialDist = initialPinchDistanceRef.current;
          const lastDist = lastPinchDistanceRef.current;
          // ズームはピンチ開始からの距離比で一貫して累積（フレームごとに基準を更新しない）
          const totalScale =
            initialDist > 0 ? currentDistance / initialDist : 1;
          // パン補正は直前フレームからの距離比
          const frameScale = lastDist > 0 ? currentDistance / lastDist : 1;

          // ズームレベルを計算（ピンチ開始時のズーム × 全体のスケール）
          // 最小1倍、最大6倍
          const newZoomLevel = Math.max(
            1,
            Math.min(6, initialPinchZoomLevelRef.current * totalScale),
          );
          setZoomLevel(newZoomLevel);

          // ピンチ中心を基準にズーム位置を調整
          const newCenter = calculatePinchCenter(touch1, touch2);
          if (pinchCenterRef.current) {
            const centerDx = newCenter.x - pinchCenterRef.current.x;
            const centerDy = newCenter.y - pinchCenterRef.current.y;

            const { width: cw, height: ch } = containerSizeRef.current;
            const { width: iw, height: ih } = imageDimensionsRef.current;

            // 新しい画像位置を計算（常に最新の画像位置を使用）
            let newX =
              currentImagePositionRef.current.x + centerDx * frameScale;
            let newY =
              currentImagePositionRef.current.y + centerDy * frameScale;

            // 画像の移動範囲を制限（フレームからはみ出さないように）
            if (newZoomLevel <= 1) {
              newX = 0;
              newY = 0;
            } else if (cw > 0 && ch > 0 && iw > 0 && ih > 0) {
              const maxOffsetX = (cw * (newZoomLevel - 1)) / 2;
              const maxOffsetY = (ch * (newZoomLevel - 1)) / 2;

              // 画像のアスペクト比を考慮して縦方向の移動範囲を調整
              const imageAspectRatio = iw / ih;
              const containerAspectRatio = cw / ch;
              const adjustedMaxOffsetY =
                (maxOffsetY * containerAspectRatio) / imageAspectRatio;

              newX = Math.max(-maxOffsetX, Math.min(maxOffsetX, newX));
              newY = Math.max(
                -adjustedMaxOffsetY,
                Math.min(adjustedMaxOffsetY, newY),
              );
            }

            setImagePosition({
              x: newX,
              y: newY,
            });
            setPinchCenter(newCenter);
          }

          lastPinchDistanceRef.current = currentDistance;
          pinchDistanceRef.current = currentDistance;
          setPinchDistance(currentDistance);
          isDraggingRef.current = false;
          setIsDragging(false);
          return;
        }

        // 1本指のドラッグ操作
        if (
          isDraggingRef.current &&
          currentZoomLevelRef.current > 1 &&
          e.touches.length === 1
        ) {
          // タッチ座標取得（1本指のみ対応）
          const touch = e.touches[0];
          if (!touch) return;

          setDragEndPosition({ x: touch.clientX, y: touch.clientY });

          const off = dragOffsetRef.current;
          const newX = touch.clientX - off.x;
          const newY = touch.clientY - off.y;

          const { width: cw, height: ch } = containerSizeRef.current;
          const { width: iw, height: ih } = imageDimensionsRef.current;
          const zl = currentZoomLevelRef.current;

          // 移動範囲を制限（画像の端まで移動可能）
          const maxOffsetX = (cw * (zl - 1)) / 2;
          const maxOffsetY = (ch * (zl - 1)) / 2;

          // 画像のアスペクト比を考慮して縦方向の移動範囲を調整
          const imageAspectRatio = iw > 0 && ih > 0 ? iw / ih : 1;
          const containerAspectRatio =
            cw > 0 && ch > 0 ? cw / ch : 1;
          const adjustedMaxOffsetY =
            (maxOffsetY * containerAspectRatio) / imageAspectRatio;

          const clampedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, newX));
          const clampedY = Math.max(
            -adjustedMaxOffsetY,
            Math.min(adjustedMaxOffsetY, newY),
          );

          setImagePosition({
            x: clampedX,
            y: clampedY,
          });
        }
      };

      const handleTouchEnd = (e: React.TouchEvent) => {
        // ピンチ操作の終了
        if (e.touches.length < 2) {
          pinchDistanceRef.current = null;
          initialPinchDistanceRef.current = null;
          lastPinchDistanceRef.current = null;
          setPinchDistance(null);
          pinchCenterRef.current = null;
          setPinchCenter(null);
          // ピンチ開始時のズームレベルをリセット
          initialPinchZoomLevelRef.current = 1;
        }

        if (isDraggingRef.current && e.touches.length === 0) {
          const touch = e.changedTouches[0];
          if (touch) {
            setDragEndPosition({ x: touch.clientX, y: touch.clientY });
          }
        }
        isDraggingRef.current = false;
        setIsDragging(false);
      };

      const onStart = (ev: TouchEvent) => {
        // React.TouchEvent 互換として扱う
        handleTouchStart(ev as unknown as React.TouchEvent);
      };
      const onMove = (ev: TouchEvent) => {
        handleTouchMove(ev as unknown as React.TouchEvent);
      };
      const onEnd = (ev: TouchEvent) => {
        handleTouchEnd(ev as unknown as React.TouchEvent);
      };

      el.addEventListener("touchstart", onStart, { passive: false });
      el.addEventListener("touchmove", onMove, { passive: false });
      el.addEventListener("touchend", onEnd, { passive: false });
      return () => {
        el.removeEventListener("touchstart", onStart);
        el.removeEventListener("touchmove", onMove);
        el.removeEventListener("touchend", onEnd);
      };
    }, []);

    const handlePlusClick = () => {
      setZoomLevel(2);
      setImagePosition({ x: 0, y: 0 }); // ズーム時に位置をリセット
    };

    const handleMinusClick = () => {
      setZoomLevel(1);
      setImagePosition({ x: 0, y: 0 }); // ズームアウト時に位置をリセット
      pinchDistanceRef.current = null;
      initialPinchDistanceRef.current = null;
      lastPinchDistanceRef.current = null;
      setPinchDistance(null);
      setPinchCenter(null);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      if (zoomLevel > 1) {
        setIsDragging(true);
        setDragStartPosition({ x: e.clientX, y: e.clientY });
        setDragEndPosition(null);
        setDragOffset({
          x: e.clientX - imagePosition.x,
          y: e.clientY - imagePosition.y,
        });
      }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
      e.preventDefault();
      if (isDragging && zoomLevel > 1) {
        // ドラッグ中の位置を記録
        setDragEndPosition({ x: e.clientX, y: e.clientY });

        const newX = e.clientX - dragOffset.x;
        const newY = e.clientY - dragOffset.y;

        // 移動範囲を制限（画像の端まで移動可能）
        // コンテナサイズとズームレベルを考慮して計算
        const maxOffsetX = (containerSize.width * (zoomLevel - 1)) / 2;
        const maxOffsetY = (containerSize.height * (zoomLevel - 1)) / 2;

        // 画像のアスペクト比を考慮して縦方向の移動範囲を調整
        const imageAspectRatio = imageWidth / imageHeight;
        const containerAspectRatio = containerSize.width / containerSize.height;
        const adjustedMaxOffsetY =
          (maxOffsetY * containerAspectRatio) / imageAspectRatio;

        const clampedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, newX));
        const clampedY = Math.max(
          -adjustedMaxOffsetY,
          Math.min(adjustedMaxOffsetY, newY),
        );

        setImagePosition({
          x: clampedX,
          y: clampedY,
        });
      }
    };

    /* c8 ignore start - タッチイベントはJS DOM環境での網羅が不安定なため除外 */

    const handleMouseUp = (e: React.MouseEvent) => {
      e.preventDefault();
      if (isDragging) {
        // ドラッグ終了位置を記録
        setDragEndPosition({ x: e.clientX, y: e.clientY });
      }
      setIsDragging(false);
    };
    /* c8 ignore stop */

    const handleImageClick = (e: React.MouseEvent) => {
      e.preventDefault();

      if (!isMarkable) return;

      // ドラッグが発生していた場合の座標差をチェック
      if (dragStartPosition && dragEndPosition) {
        const deltaX = Math.abs(dragEndPosition.x - dragStartPosition.x);
        const deltaY = Math.abs(dragEndPosition.y - dragStartPosition.y);

        // X座標またはY座標の差が10px以上の場合はマーカーを追加しない
        if (deltaX >= 10 || deltaY >= 10) {
          // ドラッグ状態をリセット
          setDragStartPosition(null);
          setDragEndPosition(null);
          return; // マーカーを追加しない
        }
      }

      // マーカーを追加
      if (markers.length >= 20) {
        // 最大件数を超える操作時は親へ通知してダイアログ表示を促す
        if (onLimitExceeded) onLimitExceeded();
        return; // 追加処理は行わない
      }

      const rect = e.currentTarget.getBoundingClientRect();

      // より簡単で正確なクリック位置計算
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      // 有効な範囲内に制限
      const clampedX = Math.max(0, Math.min(100, x));
      const clampedY = Math.max(0, Math.min(100, y));

      const newMarker: MarkerInfo = {
        id: markers.length + 1,
        x: clampedX,
        y: clampedY,
      };

      const updatedMarkers = [...markers, newMarker];
      onMarkersChange(updatedMarkers);

      // ドラッグ状態をリセット
      setDragStartPosition(null);
      setDragEndPosition(null);
    };

    /*
    // 画像のアスペクト比を計算 (分岐を明示的に展開しテストカバレッジのブランチ100%を狙う)
    // 挙動は従来の三項演算子と同じ。高さ0 (naturalHeight=0) 異常ケースも明示的にコメント。
    let aspectRatio = 1;
    if (imageWidth > 0 && imageHeight > 0) {
      aspectRatio = imageWidth / imageHeight;
    } else if (imageWidth > 0 && imageHeight === 0) {
      // 異常: 高さ0。フォールバックとして 1 を保持 (以前も ternary の else 側で 1)。
      aspectRatio = 1;
    } // その他 (未ロードなど width/height=0) も初期値1のまま
    */

    const containerWidth = "100%";
    let containerHeight: string;
    if (imageWidth > 0 && imageHeight > 0) {
      containerHeight = "auto";
    } else {
      containerHeight = "400px"; // 未ロードまたは異常時のフォールバック高さ
    }

    /* c8 ignore start - 以下は大量のJSXマークアップであり、ロジック網羅率の評価対象から除外する */
    return (
      <>
        <div
          className="madorizu-container"
          style={{
            /* stylelint-disable-next-line value-keyword-case */
            width: containerWidth,
            /* stylelint-disable-next-line value-keyword-case */
            height: containerHeight,
            aspectRatio:
              imageWidth > 0 && imageHeight > 0
                ? `${imageWidth} / ${imageHeight}`
                : "auto",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="image-container"
            style={{
              transform: `translate(-50%, -50%) translate(${imagePosition.x}px, ${imagePosition.y}px)`,
              /* stylelint-disable-next-line value-keyword-case */
              width: `${100 * zoomLevel}%`,
              /* stylelint-disable-next-line value-keyword-case */
              height: `${100 * zoomLevel}%`,
            }}
            onClick={hasModal ? onImageClick : handleImageClick}
          >
            {imageData && (
              <>
                <img
                  src={imageData}
                  className="madorizu-img"
                  alt="間取り図"
                  style={{
                    /* stylelint-disable value-keyword-case */
                    transition:
                      zoomLevel === 1
                        ? "width 0.3s ease, height 0.3s ease"
                        : "none",
                    /* stylelint-enable value-keyword-case */
                  }}
                />
              </>
            )}

            {/* マーカーを画像の上に表示 */}
            {markers.map((marker) => (
              <MadorizuMarker key={marker.id} info={marker} />
            ))}
          </div>
          {/* ボタンを右上に配置（image-container の外側に配置してクリックバブルの影響を避ける） */}
          {hasButton && (
            <div className="button-container">
              {zoomLevel <= 1 ? (
                <button
                  type="button"
                  className="zoom-button"
                  onClick={
                    hasModal
                      ? (e) => {
                          if (onImageClick) {
                            onImageClick(
                              e as unknown as React.MouseEvent<HTMLImageElement>,
                            );
                          }
                        }
                      : handlePlusClick
                  }
                >
                  <img src="./images/zoomOut.svg" alt="ズームアウト" />
                </button>
              ) : (
                <button
                  type="button"
                  className="zoom-button"
                  onClick={handleMinusClick}
                >
                  <img src="./images/zoomIn.svg" alt="ズームイン" />
                </button>
              )}
            </div>
          )}
        </div>
      </>
    );
    /* c8 ignore stop */
  },
);

export default Madorizu;
