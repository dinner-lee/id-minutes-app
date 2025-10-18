"use client";

import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";

type RoomHandle = {
  ydoc: Y.Doc;
  provider: WebrtcProvider;
  refCount: number;
};

// Persist across HMR/fast-refresh
const g = globalThis as any;
if (!g.__YJS_ROOMS__) g.__YJS_ROOMS__ = new Map<string, RoomHandle>();
const rooms: Map<string, RoomHandle> = g.__YJS_ROOMS__;

/** Get (or create) a Yjs room by id. Increments refcount. */
export function acquireRoom(roomId: string) {
  let handle = rooms.get(roomId);

  if (!handle) {
    const ydoc = new Y.Doc();

    // Guard against rare cases where a previous provider exists internally.
    let provider: WebrtcProvider;
    try {
      provider = new WebrtcProvider(roomId, ydoc, {
        // Optionally add custom signaling to improve stability:
        // signaling: ["wss://signaling.yjs.dev"],
        // awareness is provider.awareness
      });
    } catch (e) {
      // If a previous provider is still around from HMR, try to clean it up
      // and retry once. (y-webrtc throws when a room already exists)
      console.warn("[yjs-room] Provider existed for room:", roomId, e);
      // Best-effort: find stale handle and destroy
      const stale = rooms.get(roomId);
      if (stale) {
        try { stale.provider.destroy(); } catch {}
        try { stale.ydoc.destroy(); } catch {}
        rooms.delete(roomId);
      }
      provider = new WebrtcProvider(roomId, ydoc);
    }

    handle = { ydoc, provider, refCount: 0 };
    rooms.set(roomId, handle);
  }

  handle.refCount += 1;
  return handle;
}

/** Decrement refcount; when it hits zero, destroy and remove the room. */
export function releaseRoom(roomId: string) {
  const handle = rooms.get(roomId);
  if (!handle) return;
  handle.refCount -= 1;
  if (handle.refCount <= 0) {
    try { handle.provider.destroy(); } catch {}
    try { handle.ydoc.destroy(); } catch {}
    rooms.delete(roomId);
  }
}

/** Optional: for debugging in dev */
export function forceReleaseAllRooms() {
  for (const [id, h] of rooms.entries()) {
    try { h.provider.destroy(); } catch {}
    try { h.ydoc.destroy(); } catch {}
    rooms.delete(id);
  }
}
