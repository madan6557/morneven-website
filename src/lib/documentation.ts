import type { DocItem } from "@/types";

const dateValue = (value?: string) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

export const sortDocsByDateDesc = <T extends Pick<DocItem, "date">>(docs: T[]) =>
  [...docs].sort((a, b) => dateValue(b.date) - dateValue(a.date));

export const normalizeDocsForEditor = <T extends DocItem>(docs: T[], fallbackDate: string) =>
  sortDocsByDateDesc(
    docs.map((doc) => {
      const isImage = doc.type === "image";
      const url = doc.url || (isImage ? doc.thumbnail : "") || "";
      const thumbnail = doc.thumbnail || (isImage ? doc.url : "") || "";
      return {
        ...doc,
        url,
        thumbnail,
        date: doc.date || fallbackDate,
      };
    }),
  );

export const normalizeDocsForSave = (docs: DocItem[] = [], fallbackDate: string) =>
  sortDocsByDateDesc(
    docs.map((doc) => {
      const isImage = doc.type === "image";
      const url = doc.url || (isImage ? doc.thumbnail : "") || "";
      const thumbnail = doc.thumbnail || (isImage ? doc.url : "") || "";
      return {
        type: doc.type,
        url,
        thumbnail,
        caption: doc.caption,
        date: doc.date || fallbackDate,
      };
    }),
  );
