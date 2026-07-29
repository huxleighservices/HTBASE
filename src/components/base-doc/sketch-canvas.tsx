'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const CANVAS_BG = '#ffffff';
const PRESET_COLORS = ['#111827', '#EF4444', '#3B82F6', '#22C55E', '#A855F7', '#F97316', '#0EA5E9'];

export type SketchCanvasHandle = {
  getDataUrl: () => string;
  isBlank: () => boolean;
};

type SketchCanvasProps = {
  initialDataUrl?: string;
};

export const SketchCanvas = forwardRef<SketchCanvasHandle, SketchCanvasProps>(
  ({ initialDataUrl }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    const loadedRef = useRef(false);
    const [color, setColor] = useState('#111827');
    const [brushSize, setBrushSize] = useState(4);
    const [erasing, setErasing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(!!initialDataUrl);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || loadedRef.current) return;
      loadedRef.current = true;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = CANVAS_BG;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (initialDataUrl) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        img.src = initialDataUrl;
      }
    }, [initialDataUrl]);

    useImperativeHandle(ref, () => ({
      getDataUrl: () => canvasRef.current?.toDataURL('image/png') ?? '',
      isBlank: () => !hasDrawn,
    }));

    const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - rect.left) / rect.width) * canvas.width,
        y: ((e.clientY - rect.top) / rect.height) * canvas.height,
      };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      drawingRef.current = true;
      lastPointRef.current = getPoint(e);
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const point = getPoint(e);
      const last = lastPointRef.current ?? point;
      ctx.strokeStyle = erasing ? CANVAS_BG : color;
      ctx.lineWidth = erasing ? brushSize * 3 : brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      lastPointRef.current = point;
      setHasDrawn(true);
    };

    const stopDrawing = () => {
      drawingRef.current = false;
      lastPointRef.current = null;
    };

    const handleClear = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      ctx.fillStyle = CANVAS_BG;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setHasDrawn(false);
    };

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setErasing(false); }}
              className={cn(
                'h-6 w-6 rounded-full border-2 transition-transform',
                color === c && !erasing ? 'border-primary scale-110' : 'border-border/40'
              )}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => { setColor(e.target.value); setErasing(false); }}
            className="h-6 w-6 rounded border border-border/40 bg-transparent cursor-pointer"
          />
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-[10px] text-muted-foreground">Size</span>
            <input
              type="range"
              min={1}
              max={24}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-20"
            />
          </div>
          <Button
            variant={erasing ? 'default' : 'outline'}
            size="sm"
            className="h-7 gap-1 text-xs ml-2"
            onClick={() => setErasing((v) => !v)}
          >
            <Eraser className="h-3.5 w-3.5" />
            Eraser
          </Button>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={handleClear}>
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </Button>
        </div>
        <div className="flex-1 min-h-0 p-3">
          <canvas
            ref={canvasRef}
            width={1200}
            height={800}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDrawing}
            onPointerLeave={stopDrawing}
            className="w-full h-full rounded-lg border border-border/40 touch-none cursor-crosshair bg-white"
          />
        </div>
      </div>
    );
  }
);

SketchCanvas.displayName = 'SketchCanvas';
