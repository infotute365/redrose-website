import { getDatabase } from "@/src/server/config/database";
import { classroomShowcase, schoolEvents, type SchoolEvent } from "@/src/lib/content/home";
import { getSiteOverrides } from "./site-content";
import {
  isSafeImageReference,
  type BackgroundImage,
  type BackgroundPosition,
} from "./background-types";
export type HomeSlide = {
  id: string;
  title: string;
  description: string;
  src: string;
  alt: string;
  isPublished?: boolean;
  displayOrder?: number;
  backgroundPosition?: BackgroundPosition | null;
  backgroundRevision?: number;
  previousBackground?: BackgroundImage;
  previousBackgroundExpiresAt?: Date;
};
export type EditableEvent = SchoolEvent & { isPublished?: boolean; displayOrder?: number };
export async function getHomeSlides(): Promise<HomeSlide[]> {
  if (!process.env.MONGODB_URI)
    return [classroomShowcase[1], classroomShowcase[0], classroomShowcase[2]];
  const slides = await (
    await getDatabase()
  )
    .collection<HomeSlide>("homeSlides")
    .find({ isPublished: { $ne: false } }, { projection: { _id: 0 } })
    .sort({ displayOrder: 1, id: 1 })
    .toArray();
  // Preserve an older visual-editor image until staff explicitly save through
  // the background manager. No migration or database write happens on reads.
  if (slides[0] && !slides[0].backgroundRevision) {
    const legacy = (await getSiteOverrides())["page:/:i:0"];
    if (isSafeImageReference(legacy)) slides[0] = { ...slides[0], src: legacy };
  }
  return slides;
}
export async function getSchoolEvents(): Promise<EditableEvent[]> {
  if (!process.env.MONGODB_URI) return [...schoolEvents];
  return (await getDatabase())
    .collection<EditableEvent>("schoolEvents")
    .find({ isPublished: { $ne: false } }, { projection: { _id: 0 } })
    .sort({ displayOrder: 1, slug: 1 })
    .toArray();
}
export async function getAllSections() {
  if (!process.env.MONGODB_URI)
    return { slides: [...classroomShowcase], events: [...schoolEvents] };
  const db = await getDatabase();
  return {
    slides: await db
      .collection<HomeSlide>("homeSlides")
      .find({}, { projection: { _id: 0 } })
      .sort({ displayOrder: 1, id: 1 })
      .toArray(),
    events: await db
      .collection<EditableEvent>("schoolEvents")
      .find({}, { projection: { _id: 0 } })
      .sort({ displayOrder: 1 })
      .toArray(),
  };
}
