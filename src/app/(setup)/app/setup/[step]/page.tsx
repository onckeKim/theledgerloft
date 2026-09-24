import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { Route } from "next";
import { BasicsForm } from "@/components/setup/basics-form";
import { DebtsGoalsForm } from "@/components/setup/debts-goals-form";
import { MoneyRowsForm } from "@/components/setup/money-rows-form";
import { Review } from "@/components/setup/review";
import { StepFrame } from "@/components/setup/step-frame";
import { Welcome } from "@/components/setup/welcome";
import { verifySession } from "@/lib/auth/dal";
import { bpToInput, centsToInput } from "@/lib/money";
import { loadSetup } from "@/lib/setup/queries";
import { BILL_SUGGESTIONS, SPENDING_SUGGESTIONS, isSetupRoute, stepInfo } from "@/lib/setup/steps";

export async function generateMetadata({
  params,
}: PageProps<"/app/setup/[step]">): Promise<Metadata> {
  const { step } = await params;
  if (!isSetupRoute(step)) return { title: "Setup" };
  const title = step === "welcome" ? "Welcome" : `Setup: ${stepInfo(step).label}`;
  return { title };
}

const rowsFrom = (items: { id: string; name: string; cents: number }[]) =>
  items.map((i) => ({
    key: `k${i.id.slice(0, 8)}${i.id.slice(-8)}`,
    id: i.id,
    name: i.name,
    amount: centsToInput(i.cents),
  }));

export default async function Page({ params }: PageProps<"/app/setup/[step]">) {
  const { step } = await params;
  await verifySession(`/app/setup/${step}`);
  if (!isSetupRoute(step)) notFound();

  const data = await loadSetup();
  if (data.household.setup_completed_at) redirect("/app" as Route);

  switch (step) {
    case "welcome":
      return <Welcome />;
    case "basics":
      return (
        <StepFrame
          step="basics"
          title="The basics"
          intro="These shape how your months are laid out. You can change any of them later in Settings."
        >
          <BasicsForm
            initial={{
              payFrequency: data.household.pay_frequency,
              monthStartDay: String(data.household.month_start_day),
              budgetStyle: data.household.budget_style,
            }}
          />
        </StepFrame>
      );
    case "income":
      return (
        <StepFrame
          step="income"
          title="Your income"
          intro="Add the money you expect each month, after tax and deductions. A rough figure is fine."
        >
          <MoneyRowsForm step="income" back="/app/setup/basics" initial={rowsFrom(data.income)} />
        </StepFrame>
      );
    case "bills":
      return (
        <StepFrame
          step="bills"
          title="Fixed bills"
          intro="Costs that are about the same every month, like rent, electricity, phone and insurance."
        >
          <MoneyRowsForm
            step="bills"
            back="/app/setup/income"
            initial={rowsFrom(data.bills)}
            suggestions={BILL_SUGGESTIONS}
          />
        </StepFrame>
      );
    case "spending":
      return (
        <StepFrame
          step="spending"
          title="Everyday spending"
          intro="Things that change month to month. Plan an amount you're comfortable with; you'll see how it compares as the month goes."
        >
          <MoneyRowsForm
            step="spending"
            back="/app/setup/bills"
            initial={rowsFrom(data.spending)}
            suggestions={SPENDING_SUGGESTIONS}
          />
        </StepFrame>
      );
    case "debts-goals":
      return (
        <StepFrame
          step="debts-goals"
          title="Debts and goals"
          intro="Optional. Add them now or skip, and come back any time."
        >
          <DebtsGoalsForm
            currentPeriod={data.currentPeriod}
            initial={{
              debts: data.debts.map((d) => ({
                key: `k${d.id.slice(0, 8)}${d.id.slice(-8)}`,
                id: d.id,
                name: d.name,
                balance: centsToInput(d.balance),
                minPayment: centsToInput(d.minPayment),
                rate: d.rateBp === null ? "" : bpToInput(d.rateBp),
              })),
              goals: data.goals.map((g) => ({
                key: `k${g.id.slice(0, 8)}${g.id.slice(-8)}`,
                id: g.id,
                kind: g.kind,
                name: g.name,
                target: centsToInput(g.target),
                monthly: g.monthly ? centsToInput(g.monthly) : "",
                starting: g.starting ? centsToInput(g.starting) : "",
                due: g.due ?? "",
              })),
            }}
          />
        </StepFrame>
      );
    case "review":
      return (
        <StepFrame
          step="review"
          title="Review your plan"
          intro="Here's your first month. Nothing is final: you can change anything from your dashboard."
        >
          <Review data={data} />
        </StepFrame>
      );
  }
}
