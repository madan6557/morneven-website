import { useEffect, useState } from "react";
import { getAuthenticatedImageUrl } from "@/services/fileProxyService";

export function useResolvedImageUrl(src: string) {
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
        setResolvedSrc(blobUrl);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [src]);

  return resolvedSrc;
}
