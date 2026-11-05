export const backgroundPositions = ["center", "left", "right", "top", "bottom"] as const;
export type BackgroundPosition = (typeof backgroundPositions)[number];
export type BackgroundImage = { src: string; position: BackgroundPosition | null };
export type HomepageBackground = {
  slideId: string;
  title: string;
  src: string;
  position: BackgroundPosition | null;
  revision: number;
  previous: BackgroundImage | null;
};

export function isBackgroundPosition(value: unknown): value is BackgroundPosition {
  return typeof value === "string" && backgroundPositions.some((position) => position === value);
}
export function isSafeImageReference(value: unknown): value is string {
  return (
    typeof value === "string" &&
    !value.includes("..") &&
    (/^\/images\/(?:[\w-]+\/)*[\w.-]+\.(?:jpe?g|png|webp|gif)$/i.test(value) ||
      /^\/api\/media\/[a-f0-9]{24}$/.test(value))
  );
}
