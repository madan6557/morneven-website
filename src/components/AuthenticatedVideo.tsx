import { useMemo } from "react";
import { getProxyUrl, isDirectStorageUrl, isProxyUrl } from "@/services/fileProxyService";
import { useResolvedFileUrl } from "@/hooks/useResolvedFileUrl";

type AuthenticatedVideoProps = {
  src: string;
  title: string;
  className?: string;
  controls?: boolean;
  muted?: boolean;
  preload?: "none" | "metadata" | "auto";
};

function shouldRenderIframe(src: string) {
  if (!src) return false;
  const proxyUrl = getProxyUrl(src);
  if (isProxyUrl(proxyUrl) || isDirectStorageUrl(src)) return false;
  return !/\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(src);
}

export function AuthenticatedVideo({
  src,
  title,
  className,
  controls = true,
  muted = false,
  preload = "metadata",
}: AuthenticatedVideoProps) {
  const iframeMode = useMemo(() => shouldRenderIframe(src), [src]);
  const resolvedSrc = useResolvedFileUrl(iframeMode ? undefined : src, "video/*");

  if (!src) return null;

  if (iframeMode) {
    return (
      <iframe
        src={src}
        className={className}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={title}
      />
    );
  }

  if (!resolvedSrc) {
    return (
      <div className={className}>
        <div className="flex h-full min-h-[160px] w-full items-center justify-center bg-black/60 text-[10px] font-heading uppercase tracking-wider text-muted-foreground">
          Loading video
        </div>
      </div>
    );
  }

  return (
    <video
      src={resolvedSrc}
      controls={controls}
      muted={muted}
      preload={preload}
      playsInline
      className={className}
    />
  );
}
