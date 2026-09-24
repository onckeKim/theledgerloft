"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormAction } from "@/components/forms/use-form-action";
import { Button } from "@/components/ui/button";
import { ErrorSummary } from "@/components/ui/error-summary";
import { TextField } from "@/components/ui/field";
import { deleteAccount } from "@/lib/settings/actions";
import { useHydrated } from "@/lib/use-hydrated";

/** Delete my account (PRD US-44 AC1): step 1 explains and offers the download, step 2 needs DELETE and the password. */
export function DeleteAccount() {
  const hydrated = useHydrated();
  const [step, setStep] = useState<1 | 2>(1);
  const f = useFormAction({ confirm: "", password: "" });

  if (step === 1)
    return (
      <div>
        <p>This permanently deletes:</p>
        <ul className="mb-4 pl-5">
          <li>your sign-in and profile</li>
          <li>your plan, transactions, goals, debts, check-ins and payment records</li>
        </ul>
        <p className="text-body-sm text-fg-muted">
          It can&apos;t be undone. We keep only a record that an account was deleted, with no
          financial details. <Link href={"#download" as never}>Download your data first</Link> if
          you&apos;d like a copy. PayFast keeps its own record of any payment.
        </p>
        <Button type="button" variant="danger" disabled={!hydrated} onClick={() => setStep(2)}>
          Continue to delete my account
        </Button>
      </div>
    );

  return (
    <form noValidate onSubmit={(e) => (e.preventDefault(), f.run(() => deleteAccount(f.values)))}>
      <fieldset disabled={!hydrated} className="m-0 min-w-0 border-0 p-0">
        <ErrorSummary
          items={f.summary("delete")}
          message={f.errors.form}
          focusToken={f.focusToken}
        />
        <TextField
          id="delete-confirm"
          label="Type DELETE to confirm"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={f.values.confirm}
          onChange={(e) => f.set("confirm", e.target.value)}
          error={f.errors.confirm}
        />
        <TextField
          id="delete-password"
          label="Your password"
          type="password"
          autoComplete="current-password"
          value={f.values.password}
          onChange={(e) => f.set("password", e.target.value)}
          error={f.errors.password}
        />
        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="danger" disabled={f.pending}>
            {f.pending ? "Deleting…" : "Delete my account permanently"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => setStep(1)}>
            Cancel
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
