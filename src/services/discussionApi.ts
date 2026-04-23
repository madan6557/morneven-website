import type {
  Character,
  Creature,
  DiscussionComment,
  DiscussionMention,
  OtherLore,
  Place,
  Technology,
} from "@/types";
import { db, delay, STORAGE_KEYS, todayISO, writeCollection } from "@/services/dataStore";

type EntityWithDiscussions = {
  id: string;
  discussions?: DiscussionComment[];
};

function appendComment(
  list: DiscussionComment[],
  author: string,
  text: string,
  mentions: DiscussionMention[],
): DiscussionComment[] {
  return [
    ...list,
    { id: `dc-${Date.now()}`, author, text, date: todayISO(), mentions, replies: [] },
  ];
}

function appendReply(
  list: DiscussionComment[],
  commentId: string,
  author: string,
  text: string,
  mentions: DiscussionMention[],
): DiscussionComment[] {
  return list.map((c) =>
    c.id === commentId
      ? {
          ...c,
          replies: [
            ...c.replies,
            { id: `dr-${Date.now()}`, author, text, date: todayISO(), mentions },
          ],
        }
      : c,
  );
}

function editComment(
  list: DiscussionComment[],
  commentId: string,
  text: string,
  mentions: DiscussionMention[],
): DiscussionComment[] {
  return list.map((c) => (c.id === commentId ? { ...c, text, mentions } : c));
}

function deleteComment(list: DiscussionComment[], commentId: string): DiscussionComment[] {
  return list.filter((c) => c.id !== commentId);
}

function editReply(
  list: DiscussionComment[],
  commentId: string,
  replyId: string,
  text: string,
  mentions: DiscussionMention[],
): DiscussionComment[] {
  return list.map((c) =>
    c.id === commentId
      ? { ...c, replies: c.replies.map((r) => (r.id === replyId ? { ...r, text, mentions } : r)) }
      : c,
  );
}

function deleteReply(list: DiscussionComment[], commentId: string, replyId: string): DiscussionComment[] {
  return list.map((c) =>
    c.id === commentId ? { ...c, replies: c.replies.filter((r) => r.id !== replyId) } : c,
  );
}

function createDiscussionCrud<T extends EntityWithDiscussions>(
  collection: T[],
  storageKey: string,
) {
  const mutate = (entityId: string, updater: (current: DiscussionComment[]) => DiscussionComment[]): T | undefined => {
    const idx = collection.findIndex((item) => item.id === entityId);
    if (idx === -1) return undefined;

    collection[idx] = {
      ...collection[idx],
      discussions: updater(collection[idx].discussions ?? []),
    } as T;

    writeCollection(storageKey, collection);
    return collection[idx];
  };

  return {
    async addComment(
      entityId: string,
      author: string,
      text: string,
      mentions: DiscussionMention[] = [],
    ): Promise<T | undefined> {
      await delay();
      return mutate(entityId, (list) => appendComment(list, author, text, mentions));
    },

    async addReply(
      entityId: string,
      commentId: string,
      author: string,
      text: string,
      mentions: DiscussionMention[] = [],
    ): Promise<T | undefined> {
      await delay();
      return mutate(entityId, (list) => appendReply(list, commentId, author, text, mentions));
    },

    async editComment(
      entityId: string,
      commentId: string,
      text: string,
      mentions: DiscussionMention[] = [],
    ): Promise<T | undefined> {
      await delay();
      return mutate(entityId, (list) => editComment(list, commentId, text, mentions));
    },

    async deleteComment(entityId: string, commentId: string): Promise<T | undefined> {
      await delay();
      return mutate(entityId, (list) => deleteComment(list, commentId));
    },

    async editReply(
      entityId: string,
      commentId: string,
      replyId: string,
      text: string,
      mentions: DiscussionMention[] = [],
    ): Promise<T | undefined> {
      await delay();
      return mutate(entityId, (list) => editReply(list, commentId, replyId, text, mentions));
    },

    async deleteReply(
      entityId: string,
      commentId: string,
      replyId: string,
    ): Promise<T | undefined> {
      await delay();
      return mutate(entityId, (list) => deleteReply(list, commentId, replyId));
    },
  };
}

const placeDiscussion = createDiscussionCrud<Place>(db.places, STORAGE_KEYS.places);
const techDiscussion = createDiscussionCrud<Technology>(db.technology, STORAGE_KEYS.technology);
const otherDiscussion = createDiscussionCrud<OtherLore>(db.others, STORAGE_KEYS.other);
const characterDiscussion = createDiscussionCrud<Character>(db.characters, STORAGE_KEYS.characters);
const creatureDiscussion = createDiscussionCrud<Creature>(db.creatures, STORAGE_KEYS.creatures);

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
