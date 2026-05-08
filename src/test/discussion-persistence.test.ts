import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DiscussionMention } from "@/types";

type EntityWithDiscussions = {
  discussions?: Array<{
    id: string;
    text: string;
    mentions?: DiscussionMention[];
    replies: Array<{
      id: string;
      text: string;
      mentions?: DiscussionMention[];
    }>;
  }>;
};

type ApiModule = typeof import("@/services/api");

type DiscussionCase = {
  name: string;
  id: string;
  getById: (api: ApiModule, id: string) => Promise<EntityWithDiscussions | undefined>;
  addComment: (
    api: ApiModule,
    id: string,
    author: string,
    text: string,
    mentions?: DiscussionMention[],
  ) => Promise<EntityWithDiscussions | undefined>;
  addReply: (
    api: ApiModule,
    id: string,
    commentId: string,
    author: string,
    text: string,
    mentions?: DiscussionMention[],
  ) => Promise<EntityWithDiscussions | undefined>;
  editComment: (
    api: ApiModule,
    id: string,
    commentId: string,
    text: string,
    mentions?: DiscussionMention[],
  ) => Promise<EntityWithDiscussions | undefined>;
  deleteComment: (api: ApiModule, id: string, commentId: string) => Promise<EntityWithDiscussions | undefined>;
  editReply: (
    api: ApiModule,
    id: string,
    commentId: string,
    replyId: string,
    text: string,
    mentions?: DiscussionMention[],
  ) => Promise<EntityWithDiscussions | undefined>;
  deleteReply: (
    api: ApiModule,
    id: string,
    commentId: string,
    replyId: string,
  ) => Promise<EntityWithDiscussions | undefined>;
};

const cases: DiscussionCase[] = [
  {
    name: "place",
    id: "place-001",
    getById: (api, id) => api.getPlace(id),
    addComment: (api, id, author, text, mentions) => api.addPlaceDiscussionComment(id, author, text, mentions),
    addReply: (api, id, commentId, author, text, mentions) =>
      api.addPlaceDiscussionReply(id, commentId, author, text, mentions),
    editComment: (api, id, commentId, text, mentions) =>
      api.editPlaceDiscussionComment(id, commentId, text, mentions),
    deleteComment: (api, id, commentId) => api.deletePlaceDiscussionComment(id, commentId),
    editReply: (api, id, commentId, replyId, text, mentions) =>
      api.editPlaceDiscussionReply(id, commentId, replyId, text, mentions),
    deleteReply: (api, id, commentId, replyId) => api.deletePlaceDiscussionReply(id, commentId, replyId),
  },
  {
    name: "technology",
    id: "tech-001",
    getById: (api, id) => api.getTech(id),
    addComment: (api, id, author, text, mentions) => api.addTechDiscussionComment(id, author, text, mentions),
    addReply: (api, id, commentId, author, text, mentions) =>
      api.addTechDiscussionReply(id, commentId, author, text, mentions),
    editComment: (api, id, commentId, text, mentions) => api.editTechDiscussionComment(id, commentId, text, mentions),
    deleteComment: (api, id, commentId) => api.deleteTechDiscussionComment(id, commentId),
    editReply: (api, id, commentId, replyId, text, mentions) =>
      api.editTechDiscussionReply(id, commentId, replyId, text, mentions),
    deleteReply: (api, id, commentId, replyId) => api.deleteTechDiscussionReply(id, commentId, replyId),
  },
  {
    name: "other",
    id: "other-001",
    getById: (api, id) => api.getOther(id),
    addComment: (api, id, author, text, mentions) => api.addOtherDiscussionComment(id, author, text, mentions),
    addReply: (api, id, commentId, author, text, mentions) =>
      api.addOtherDiscussionReply(id, commentId, author, text, mentions),
    editComment: (api, id, commentId, text, mentions) => api.editOtherDiscussionComment(id, commentId, text, mentions),
    deleteComment: (api, id, commentId) => api.deleteOtherDiscussionComment(id, commentId),
    editReply: (api, id, commentId, replyId, text, mentions) =>
      api.editOtherDiscussionReply(id, commentId, replyId, text, mentions),
    deleteReply: (api, id, commentId, replyId) => api.deleteOtherDiscussionReply(id, commentId, replyId),
  },
  {
    name: "character",
    id: "char-001",
    getById: (api, id) => api.getCharacter(id),
    addComment: (api, id, author, text, mentions) => api.addCharacterDiscussionComment(id, author, text, mentions),
    addReply: (api, id, commentId, author, text, mentions) =>
      api.addCharacterDiscussionReply(id, commentId, author, text, mentions),
    editComment: (api, id, commentId, text, mentions) =>
      api.editCharacterDiscussionComment(id, commentId, text, mentions),
    deleteComment: (api, id, commentId) => api.deleteCharacterDiscussionComment(id, commentId),
    editReply: (api, id, commentId, replyId, text, mentions) =>
      api.editCharacterDiscussionReply(id, commentId, replyId, text, mentions),
    deleteReply: (api, id, commentId, replyId) => api.deleteCharacterDiscussionReply(id, commentId, replyId),
  },
  {
    name: "creature",
    id: "crea-001",
    getById: (api, id) => api.getCreature(id),
    addComment: (api, id, author, text, mentions) => api.addCreatureDiscussionComment(id, author, text, mentions),
    addReply: (api, id, commentId, author, text, mentions) =>
      api.addCreatureDiscussionReply(id, commentId, author, text, mentions),
    editComment: (api, id, commentId, text, mentions) =>
      api.editCreatureDiscussionComment(id, commentId, text, mentions),
    deleteComment: (api, id, commentId) => api.deleteCreatureDiscussionComment(id, commentId),
    editReply: (api, id, commentId, replyId, text, mentions) =>
      api.editCreatureDiscussionReply(id, commentId, replyId, text, mentions),
    deleteReply: (api, id, commentId, replyId) => api.deleteCreatureDiscussionReply(id, commentId, replyId),
  },
];

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("discussion persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();

    const store = new Map<string, EntityWithDiscussions>([
      ["/lore/places/place-001", { discussions: [] }],
      ["/lore/technology/tech-001", { discussions: [] }],
      ["/lore/other/other-001", { discussions: [] }],
      ["/lore/characters/char-001", { discussions: [] }],
      ["/lore/creatures/crea-001", { discussions: [] }],
    ]);

    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const url = new URL(requestUrl);
      const path = url.pathname.replace(/^\/api/, "");
      const method = init?.method ?? "GET";
      const payload = init?.body ? JSON.parse(String(init.body)) as { text?: string; mentions?: DiscussionMention[] } : {};
      const segments = path.split("/").filter(Boolean);

      if (segments.length >= 3 && segments[0] === "lore") {
        const entityPath = `/${segments.slice(0, 3).join("/")}`;
        const entity = store.get(entityPath);
        if (!entity) return jsonResponse({ message: "Route not found" }, 404);

        if (segments.length === 3 && method === "GET") {
          return jsonResponse(structuredClone(entity));
        }

        if (segments.length === 4 && segments[3] === "comments" && method === "POST") {
          const nextComment = {
            id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            text: payload.text ?? "",
            mentions: payload.mentions ?? [],
            replies: [],
          };
          entity.discussions = [...(entity.discussions ?? []), nextComment];
          return jsonResponse(structuredClone(entity));
        }

        if (segments.length >= 5 && segments[3] === "comments") {
          const commentId = segments[4];
          const comment = entity.discussions?.find((entry) => entry.id === commentId);
          if (!comment) return jsonResponse({ message: "Route not found" }, 404);

          if (segments.length === 5 && method === "PUT") {
            comment.text = payload.text ?? comment.text;
            comment.mentions = payload.mentions ?? [];
            return jsonResponse(structuredClone(entity));
          }

          if (segments.length === 5 && method === "DELETE") {
            entity.discussions = (entity.discussions ?? []).filter((entry) => entry.id !== commentId);
            return jsonResponse(structuredClone(entity));
          }

          if (segments.length === 6 && segments[5] === "replies" && method === "POST") {
            const nextReply = {
              id: `reply-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              text: payload.text ?? "",
              mentions: payload.mentions ?? [],
            };
            comment.replies = [...comment.replies, nextReply];
            return jsonResponse(structuredClone(entity));
          }

          if (segments.length === 7 && segments[5] === "replies") {
            const replyId = segments[6];
            const reply = comment.replies.find((entry) => entry.id === replyId);
            if (!reply) return jsonResponse({ message: "Route not found" }, 404);

            if (method === "PUT") {
              reply.text = payload.text ?? reply.text;
              reply.mentions = payload.mentions ?? [];
              return jsonResponse(structuredClone(entity));
            }

            if (method === "DELETE") {
              comment.replies = comment.replies.filter((entry) => entry.id !== replyId);
              return jsonResponse(structuredClone(entity));
            }
          }
        }
      }

      return jsonResponse({ message: "Route not found" }, 404);
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(cases)("persists full discussion CRUD for $name", async (entry) => {
    const api = await import("@/services/api");

    const commentMentions: DiscussionMention[] = [{ username: "j.huang", start: 6, end: 14 }];
    const replyMentions: DiscussionMention[] = [{ username: "ops.delta", start: 6, end: 16 }];

    const createdCommentText = "Check @j.huang status";
    const editedCommentText = "Updated @j.huang status";
    const createdReplyText = "Pinged @ops.delta";
    const editedReplyText = "Confirmed @ops.delta";

    const withComment = await entry.addComment(api, entry.id, "qa.bot", createdCommentText, commentMentions);
    expect(withComment).toBeDefined();

    const comment = withComment?.discussions?.find((d) => d.text === createdCommentText);
    expect(comment).toBeDefined();
    expect(comment?.mentions).toEqual(commentMentions);

    const reloadedAfterComment = await entry.getById(api, entry.id);
    expect(reloadedAfterComment?.discussions?.some((d) => d.id === comment?.id)).toBe(true);

    const withReply = await entry.addReply(
      api,
      entry.id,
      comment!.id,
      "qa.bot",
      createdReplyText,
      replyMentions,
    );
    const reply = withReply?.discussions?.find((d) => d.id === comment!.id)?.replies.find((r) => r.text === createdReplyText);
    expect(reply).toBeDefined();
    expect(reply?.mentions).toEqual(replyMentions);

    const withEditedComment = await entry.editComment(
      api,
      entry.id,
      comment!.id,
      editedCommentText,
      commentMentions,
    );
    expect(withEditedComment?.discussions?.find((d) => d.id === comment!.id)?.text).toBe(editedCommentText);

    const withEditedReply = await entry.editReply(
      api,
      entry.id,
      comment!.id,
      reply!.id,
      editedReplyText,
      replyMentions,
    );
    expect(withEditedReply?.discussions?.find((d) => d.id === comment!.id)?.replies.find((r) => r.id === reply!.id)?.text).toBe(editedReplyText);

    const withoutReply = await entry.deleteReply(api, entry.id, comment!.id, reply!.id);
    expect(withoutReply?.discussions?.find((d) => d.id === comment!.id)?.replies.some((r) => r.id === reply!.id)).toBe(false);

    const withoutComment = await entry.deleteComment(api, entry.id, comment!.id);
    expect(withoutComment?.discussions?.some((d) => d.id === comment!.id)).toBe(false);
  });
});
