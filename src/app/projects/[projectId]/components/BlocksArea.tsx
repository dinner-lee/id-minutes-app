"use client";

import BlocksList from "./BlocksList";
import FloatingPlus from "./FloatingPlus";
import { useSWRConfig } from "swr";

export default function BlocksArea({ minuteId }: { minuteId: string }) {
  const { mutate } = useSWRConfig();
  const key = `/api/minutes/${minuteId}`;

  return (
    <>
      <BlocksList minuteId={minuteId} />
      <FloatingPlus
        minuteId={minuteId}
        onAdded={() => {
          mutate(key); // refresh attachments after add
        }}
      />
    </>
  );
}
