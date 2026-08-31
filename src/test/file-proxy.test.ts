import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearBlobUrlCache,
  getAuthenticatedFileUrl,
  getProxyUrl,
  isPublicStorageUrl,
} from "@/services/fileProxyService";

afterEach(() => {
  clearBlobUrlCache();
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("file proxy URL normalization", () => {
  it("uses the public handler only for explicitly public object namespaces", () => {
    expect(getProxyUrl("gallery/image.png")).toMatch(
      /\/storage\/gallery\/image\.png$/,
    );
    expect(getProxyUrl("/storage/gallery/image.png")).toMatch(
      /\/storage\/gallery\/image\.png$/,
    );
    expect(getProxyUrl("https://backend.example/storage/gallery/image.png")).toMatch(
      /\/storage\/gallery\/image\.png$/,
    );
    expect(getProxyUrl("bot-manager/profiles/id/avatar.png")).toMatch(
      /\/storage\/bot-manager\/profiles\/id\/avatar\.png$/,
    );
    expect(isPublicStorageUrl(getProxyUrl("gallery/image.png"))).toBe(true);
  });

  it("keeps private namespaces behind the authenticated object proxy", () => {
    expect(getProxyUrl("/storage/chat/conversation/private.png")).toMatch(
      /\/api\/files\/object\?path=chat%2Fconversation%2Fprivate\.png$/,
    );
    expect(getProxyUrl("uploads/report.txt")).toMatch(
      /\/api\/files\/object\?path=uploads%2Freport\.txt$/,
    );
    expect(getProxyUrl("bot-manager/workspace/personality/SOUL.md")).toMatch(
      /\/api\/files\/object\?path=bot-manager%2Fworkspace%2Fpersonality%2FSOUL\.md$/,
    );
    expect(isPublicStorageUrl(getProxyUrl("uploads/report.txt"))).toBe(false);
  });

  it("loads public assets for guests without sending an authorization header", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      blob: async () => new Blob(["image"], { type: "image/png" }),
    } as Response);
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:public-image");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    await expect(getAuthenticatedFileUrl("gallery/image.png", "image/*")).resolves.toBe(
      "blob:public-image",
    );
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0]?.[1]?.headers).toEqual({ Accept: "image/*" });
  });

  it("does not request private assets when no bearer token is available", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(getAuthenticatedFileUrl("chat/private.png", "image/*")).resolves.toBe("");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
