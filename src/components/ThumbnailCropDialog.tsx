import { useEffect, useState } from "react";
import { Crop, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ThumbnailCropSettings } from "@/lib/thumbnailCompression";

type ThumbnailCropDialogProps = {
  open: boolean;
  imageUrl: string;
  fileName?: string;
  aspectRatio?: number;
  aspectLabel?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (settings: ThumbnailCropSettings) => Promise<void> | void;
};

const DEFAULT_ASPECT_RATIO = 16 / 9;

const initialSettings: ThumbnailCropSettings = {
  focusX: 50,
  focusY: 50,
  zoom: 1,
};

export function ThumbnailCropDialog({
  open,
  imageUrl,
  fileName,
  aspectRatio = DEFAULT_ASPECT_RATIO,
  aspectLabel = "16:9",
  onOpenChange,
  onConfirm,
}: ThumbnailCropDialogProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (open) setSettings(initialSettings);
  }, [open, imageUrl]);

  const update = (key: keyof ThumbnailCropSettings, value: number) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const confirm = async () => {
    setProcessing(true);
    try {
      await onConfirm({ ...settings, aspectRatio });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !processing && onOpenChange(next)}>
      <DialogContent className="max-w-3xl border-border bg-background">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-sm uppercase tracking-wider">
            <Crop className="h-4 w-4 text-primary" /> Crop Thumbnail
          </DialogTitle>
          <DialogDescription>
            Thumbnail will be cropped to {aspectLabel} and compressed before upload. Original media is not modified.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
          <div className="space-y-2">
            <div className="overflow-hidden rounded-sm border border-border bg-muted" style={{ aspectRatio }}>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={fileName || "Thumbnail preview"}
                  className="h-full w-full object-cover"
                  style={{
                    objectPosition: `${settings.focusX}% ${settings.focusY}%`,
                    transform: `scale(${settings.zoom})`,
                    transformOrigin: `${settings.focusX}% ${settings.focusY}%`,
                  }}
                />
              ) : null}
            </div>
            <p className="truncate text-[10px] font-display uppercase tracking-wider text-muted-foreground">
              {fileName || "Selected image"}
            </p>
          </div>

          <div className="space-y-4 rounded-sm border border-border bg-card/50 p-3">
            <div className="space-y-2">
              <label className="font-heading text-[10px] uppercase tracking-wider text-muted-foreground">
                Focus X
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.focusX}
                onChange={(event) => update("focusX", Number(event.target.value))}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="font-heading text-[10px] uppercase tracking-wider text-muted-foreground">
                Focus Y
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.focusY}
                onChange={(event) => update("focusY", Number(event.target.value))}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label className="font-heading text-[10px] uppercase tracking-wider text-muted-foreground">
                Zoom {settings.zoom.toFixed(1)}x
              </label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={settings.zoom}
                onChange={(event) => update("zoom", Number(event.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={processing}>
            Cancel
          </Button>
          <Button type="button" onClick={confirm} disabled={processing}>
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crop className="h-4 w-4" />}
            Compress and Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
