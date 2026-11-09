import { readAppOrigin } from "@/src/server/config/auth.js";

export const publicPages: Record<string, string> = {
  "/": "Red Rose Academy",
  "/gallery": "School Gallery | Red Rose Academy",
  "/circulars": "Circulars & Notices | Red Rose Academy",
  "/pages/about-us": "About Us | Red Rose Academy",
  "/pages/aims-of-objectives": "Aims and Objectives | Red Rose Academy",
  "/pages/contact-us": "Contact Us | Red Rose Academy",
  "/pages/facilities": "Facilities | Red Rose Academy",
  "/pages/mandatory-disclosure": "Mandatory Disclosure | Red Rose Academy",
  "/pages/fee-structure": "Fee Structure | Red Rose Academy",
  "/pages/tc-format": "TC Format | Red Rose Academy",
  "/pages/message-from-md": "A Message from the Managing Director | Red Rose Academy",
  "/pages/message-from-principal": "A Message from the Principal | Red Rose Academy",
  "/pages/message-from-vice_principal": "A Message from the Principal | Red Rose Academy",
};

export function publicOrigin() {
  try {
    const origin = readAppOrigin();
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(origin).hostname)
      ? undefined
      : origin;
  } catch {
    return undefined;
  }
}
