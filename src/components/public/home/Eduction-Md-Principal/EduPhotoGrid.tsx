"use client";

import { EduPhotoTile } from "./EduPhotoTile";

export type EduPhoto = {
  id: string;
  title: string;
  src: string;
  alt: string;
};

type EduPhotoGridProps = {
  photos: EduPhoto[];
};

export function EduPhotoGrid({ photos }: EduPhotoGridProps) {
  if (photos.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2" aria-label="School information photos">
      {photos.map((photo, index) => (
        <EduPhotoTile key={photo.id} {...photo} delay={index * 0.1} />
      ))}
    </div>
  );
}
