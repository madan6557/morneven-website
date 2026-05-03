import { useEffect, useState } from "react";
import { getAuthenticatedImageUrl, getProxyUrl } from "@/services/fileProxyService";

type AuthenticatedImageProps = {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  decoding?: "sync" | "async" | "auto";
};

export function AuthenticatedImage({ src, alt, className, loading, decoding }: AuthenticatedImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!src) {
        setResolvedSrc("");
        return;
      }
      if (src.startsWith("data:")) {
        setResolvedSrc(src);
        return;
      }

      const blobUrl = await getAuthenticatedImageUrl(src);
      if (!cancelled) {
        setResolvedSrc(blobUrl || getProxyUrl(src));
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!resolvedSrc) return null;
  return <img src={resolvedSrc} alt={alt} className={className} loading={loading} decoding={decoding} />;
}
