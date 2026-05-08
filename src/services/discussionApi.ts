import type {
  Character,
  Creature,
  DiscussionMention,
  Project,
  LoreEvent,
  OtherLore,
  Place,
  Technology,
} from "@/types";
import { apiRequest } from "@/services/restClient";

function createLoreDiscussionCrud<T>(category: string) {
  return {
    addComment(entityId: string, _author: string, text: string, mentions: DiscussionMention[] = []) {
      return apiRequest<T>(`/lore/${category}/${entityId}/comments`, {
        method: "POST",
        body: { text, mentions },
      });
    },

    addReply(
      entityId: string,
      commentId: string,
      _author: string,
      text: string,
      mentions: DiscussionMention[] = [],
    ) {
      return apiRequest<T>(`/lore/${category}/${entityId}/comments/${commentId}/replies`, {
        method: "POST",
        body: { text, mentions },
      });
    },

    editComment(entityId: string, commentId: string, text: string, mentions: DiscussionMention[] = []) {
      return apiRequest<T>(`/lore/${category}/${entityId}/comments/${commentId}`, {
        method: "PUT",
        body: { text, mentions },
      });
    },

    deleteComment(entityId: string, commentId: string) {
      return apiRequest<T>(`/lore/${category}/${entityId}/comments/${commentId}`, {
        method: "DELETE",
      });
    },

    editReply(
      entityId: string,
      commentId: string,
      replyId: string,
      text: string,
      mentions: DiscussionMention[] = [],
    ) {
      return apiRequest<T>(`/lore/${category}/${entityId}/comments/${commentId}/replies/${replyId}`, {
        method: "PUT",
        body: { text, mentions },
      });
    },

    deleteReply(entityId: string, commentId: string, replyId: string) {
      return apiRequest<T>(`/lore/${category}/${entityId}/comments/${commentId}/replies/${replyId}`, {
        method: "DELETE",
      });
    },
  };
}

function createProjectDiscussionCrud<T>() {
  return {
    addComment(entityId: string, _author: string, text: string, mentions: DiscussionMention[] = []) {
      return apiRequest<T>(`/projects/${entityId}/comments`, {
        method: "POST",
        body: { text, mentions },
      });
    },

    addReply(
      entityId: string,
      commentId: string,
      _author: string,
      text: string,
      mentions: DiscussionMention[] = [],
    ) {
      return apiRequest<T>(`/projects/${entityId}/comments/${commentId}/replies`, {
        method: "POST",
        body: { text, mentions },
      });
    },

    editComment(entityId: string, commentId: string, text: string, mentions: DiscussionMention[] = []) {
      return apiRequest<T>(`/projects/${entityId}/comments/${commentId}`, {
        method: "PUT",
        body: { text, mentions },
      });
    },

    deleteComment(entityId: string, commentId: string) {
      return apiRequest<T>(`/projects/${entityId}/comments/${commentId}`, {
        method: "DELETE",
      });
    },

    editReply(
      entityId: string,
      commentId: string,
      replyId: string,
      text: string,
      mentions: DiscussionMention[] = [],
    ) {
      return apiRequest<T>(`/projects/${entityId}/comments/${commentId}/replies/${replyId}`, {
        method: "PUT",
        body: { text, mentions },
      });
    },

    deleteReply(entityId: string, commentId: string, replyId: string) {
      return apiRequest<T>(`/projects/${entityId}/comments/${commentId}/replies/${replyId}`, {
        method: "DELETE",
      });
    },
  };
}

const placeDiscussion = createLoreDiscussionCrud<Place>("places");
const techDiscussion = createLoreDiscussionCrud<Technology>("technology");
const otherDiscussion = createLoreDiscussionCrud<OtherLore>("other");
const characterDiscussion = createLoreDiscussionCrud<Character>("characters");
const creatureDiscussion = createLoreDiscussionCrud<Creature>("creatures");
const eventDiscussion = createLoreDiscussionCrud<LoreEvent>("events");
const projectDiscussion = createProjectDiscussionCrud<Project>();

export const addPlaceDiscussionComment = placeDiscussion.addComment;
export const addPlaceDiscussionReply = placeDiscussion.addReply;
export const editPlaceDiscussionComment = placeDiscussion.editComment;
export const deletePlaceDiscussionComment = placeDiscussion.deleteComment;
export const editPlaceDiscussionReply = placeDiscussion.editReply;
export const deletePlaceDiscussionReply = placeDiscussion.deleteReply;

export const addTechDiscussionComment = techDiscussion.addComment;
export const addTechDiscussionReply = techDiscussion.addReply;
export const editTechDiscussionComment = techDiscussion.editComment;
export const deleteTechDiscussionComment = techDiscussion.deleteComment;
export const editTechDiscussionReply = techDiscussion.editReply;
export const deleteTechDiscussionReply = techDiscussion.deleteReply;

export const addOtherDiscussionComment = otherDiscussion.addComment;
export const addOtherDiscussionReply = otherDiscussion.addReply;
export const editOtherDiscussionComment = otherDiscussion.editComment;
export const deleteOtherDiscussionComment = otherDiscussion.deleteComment;
export const editOtherDiscussionReply = otherDiscussion.editReply;
export const deleteOtherDiscussionReply = otherDiscussion.deleteReply;

export const addCharacterDiscussionComment = characterDiscussion.addComment;
export const addCharacterDiscussionReply = characterDiscussion.addReply;
export const editCharacterDiscussionComment = characterDiscussion.editComment;
export const deleteCharacterDiscussionComment = characterDiscussion.deleteComment;
export const editCharacterDiscussionReply = characterDiscussion.editReply;
export const deleteCharacterDiscussionReply = characterDiscussion.deleteReply;

export const addCreatureDiscussionComment = creatureDiscussion.addComment;
export const addCreatureDiscussionReply = creatureDiscussion.addReply;
export const editCreatureDiscussionComment = creatureDiscussion.editComment;
export const deleteCreatureDiscussionComment = creatureDiscussion.deleteComment;
export const editCreatureDiscussionReply = creatureDiscussion.editReply;
export const deleteCreatureDiscussionReply = creatureDiscussion.deleteReply;

export const addEventDiscussionComment = eventDiscussion.addComment;
export const addEventDiscussionReply = eventDiscussion.addReply;
export const editEventDiscussionComment = eventDiscussion.editComment;
export const deleteEventDiscussionComment = eventDiscussion.deleteComment;
export const editEventDiscussionReply = eventDiscussion.editReply;
export const deleteEventDiscussionReply = eventDiscussion.deleteReply;

export const addProjectDiscussionComment = projectDiscussion.addComment;
export const addProjectDiscussionReply = projectDiscussion.addReply;
export const editProjectDiscussionComment = projectDiscussion.editComment;
export const deleteProjectDiscussionComment = projectDiscussion.deleteComment;
export const editProjectDiscussionReply = projectDiscussion.editReply;
export const deleteProjectDiscussionReply = projectDiscussion.deleteReply;
