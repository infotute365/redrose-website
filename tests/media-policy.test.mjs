import assert from "node:assert/strict";
import test from "node:test";
import {
  RETENTION_DAYS,
  RETENTION_MS,
  managedMediaId,
  referencedMediaIds,
} from "../src/server/util/media-policy.mjs";

test("an uploaded media asset has seven days of retention", () => {
  assert.equal(RETENTION_DAYS, 7);
  assert.equal(RETENTION_MS, 604800000);
  const id = "abcdef012345abcdef012345";
  assert.equal(managedMediaId(`/api/media/${id}`), id);
  for (const unsafe of [
    "/images/school.jpg",
    `/api/media/${id}/download`,
    "https://x.test/api/media/" + id,
    "/api/media/foo",
  ])
    assert.equal(managedMediaId(unsafe), null);
});

test("reference scan preserves images and PDFs across every CMS collection and rollback state", async () => {
  const ids = ["aaaaaaaaaaaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbbbbbbbbbbb", "cccccccccccccccccccccccc"];
  const data = {
    siteContent: [{ key: "public", overrides: { "page:/:i:4": `/api/media/${ids[0]}` } }],
    homeSlides: [
      { src: "/images/original.webp", previousBackground: { src: `/api/media/${ids[1]}` } },
    ],
    schoolEvents: [],
    documents: [{ storageUrl: `/api/media/${ids[2]}` }],
    circulars: [],
  };
  const db = {
    collection(name) {
      assert.ok(name in data);
      return {
        find() {
          return {
            async *[Symbol.asyncIterator]() {
              yield* data[name];
            },
            async close() {},
          };
        },
      };
    },
  };
  assert.deepEqual([...(await referencedMediaIds(db))].sort(), ids);
});

test("a failed collection scan aborts cleanup rather than claiming no references", async () => {
  const db = {
    collection(name) {
      return {
        find() {
          return {
            async *[Symbol.asyncIterator]() {
              if (name === "documents") throw Error("db unavailable");
            },
            async close() {},
          };
        },
      };
    },
  };
  await assert.rejects(referencedMediaIds(db), /db unavailable/);
});
