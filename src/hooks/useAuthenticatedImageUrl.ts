import { useEffect, useState } from "react";
import { getAuthenticatedImageUrl } from "@/services/fileProxyService";

/**
 * Hook to fetch and display images from authenticated proxy endpoints
 * Requires valid Bearer token to be present in localStorage
 *
 * @param url - Original S3 URL or storage path
 * @returns Object with blobUrl (for img src) and loading state
 */
export function useAuthenticatedImageUrl(url: string | undefined) {
  const [blobUrl, setBlobUrl] = useState<string>("");
  const [loading, setLoading] = useState(!!url);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!url) {
      setBlobUrl("");
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;

    const fetchUrl = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await getAuthenticatedImageUrl(url);
        if (isMounted) {
          setBlobUrl(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setBlobUrl("");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchUrl();

    return () => {
      isMounted = false;
    };
  }, [url]);

  return { blobUrl, loading, error };
}
