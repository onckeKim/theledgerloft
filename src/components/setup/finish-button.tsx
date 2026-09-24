"use client";

import { useState, useTransition } from "react";
import { finishSetup } from "@/app/(setup)/app/setup/actions";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";

export function FinishButton() {
  const [pending, start] = useTransition();
  const [failed, setFailed] = useState(false);
  return (
    <>
      {failed ? (
        <Alert tone="danger" live className="mb-4">
          <p>We couldn&apos;t finish setup just now. Your answers are saved. Please try again.</p>
        </Alert>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await finishSetup();
            if (result?.status === "error") setFailed(true);
          })
        }
        className={`${buttonClasses()} max-sm:w-full`}
      >
        {pending ? "Finishing…" : "Finish and go to my dashboard"}
      </button>
    </>
  );
}
