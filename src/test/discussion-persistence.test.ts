import { beforeEach, describe, expect, it, vi } from "vitest";
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

describe("discussion persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.resetModules();
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
