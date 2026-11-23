import { isSupabaseConfigured, supabase } from "../utils/supabase";
import type {
  CategoryRow,
  ExpensePayerRow,
  ExpenseRow,
  ExpenseShareRow,
  ItineraryRow,
  NominationDayRow,
  NominationRevealStatusRow,
  NominationRevealVoteRow,
  NominationRow,
  PersonRow,
  TodoAssignmentRow,
  TodoRow,
} from "../types/database";

type RelatedPerson = Pick<PersonRow, "id" | "name">;

export type ExpenseDetails = ExpenseRow & {
  category: Pick<CategoryRow, "id" | "name"> | null;
  payers: (ExpensePayerRow & { person: RelatedPerson | null })[];
  shares: (ExpenseShareRow & { person: RelatedPerson | null })[];
};

export type TodoDetails = TodoRow & {
  assignments: (TodoAssignmentRow & { person: RelatedPerson | null })[];
};

export type TodoDraft = {
  name: string;
  comment: string | null;
  done: boolean;
  assignments: { personId: string; isDone?: boolean }[];
};

export type ExpenseDraft = {
  amount: number;
  isPeso: boolean;
  expenseCategoryId: string | null;
  description: string | null;
  spentAt: string;
  payers: { personId: string; amountPaid: number }[];
  shares: { personId: string; amount: number; isPaid?: boolean }[];
};

export type ItineraryDraft = {
  date: string;
  time: string | null;
  locationPin: string | null;
  locationName: string | null;
  address: string | null;
  googlePlaceId: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
};

export type TripData = {
  people: PersonRow[];
  categories: CategoryRow[];
  expenses: ExpenseDetails[];
  itinerary: ItineraryRow[];
  todos: TodoDetails[];
  nominationDays: NominationDayRow[];
  nominations: NominationRow[];
  nominationRevealVotes: NominationRevealVoteRow[];
  nominationRevealStatus: NominationRevealStatusRow[];
};

const todoDetailsSelection = `
  id, name, comment, done,
  assignments:todo_assignments(
    todo_id, person_id, is_done,
    person:people(id, name)
  )
`;

const expenseDetailsSelection = `
  id, amount, is_peso, expense_category_id, description, spent_at, created_at,
  category:expense_categories(id, name),
  payers:expense_payers(
    id, expense_id, person_id, amount_paid, created_at,
    person:people(id, name)
  ),
  shares:expense_shares(
    id, expense_id, person_id, amount, is_paid, paid_at, created_at,
    person:people(id, name)
  )
`;

function minorUnits(amount: number) {
  return Math.round(amount * 100);
}

function dataError(action: string, error: { message: string }) {
  return new Error(`${action}: ${error.message}`);
}

function validateDraft(draft: ExpenseDraft) {
  if (!Number.isFinite(draft.amount) || draft.amount < 0) {
    throw new Error("Enter a valid expense total of zero or more.");
  }
  if (minorUnits(draft.amount) / 100 !== draft.amount) {
    throw new Error("Amounts can have at most two decimal places.");
  }
  if (!draft.spentAt || Number.isNaN(Date.parse(draft.spentAt))) {
    throw new Error("Choose a valid expense date.");
  }
  if (draft.shares.length === 0) {
    throw new Error("Choose at least one person to share this expense.");
  }

  const sharePeople = new Set(draft.shares.map((share) => share.personId));
  if (sharePeople.size !== draft.shares.length) {
    throw new Error("Each person can only have one share per expense.");
  }
  if (
    draft.shares.some(
      (share) =>
        !Number.isFinite(share.amount) ||
        share.amount < 0 ||
        minorUnits(share.amount) / 100 !== share.amount,
    )
  ) {
    throw new Error("Share amounts must be zero or more.");
  }
  const shareTotal = draft.shares.reduce((total, share) => total + minorUnits(share.amount), 0);
  if (shareTotal !== minorUnits(draft.amount)) {
    throw new Error("The share amounts must add up to the expense total.");
  }

  if (
    draft.payers.some(
      (payer) =>
        !Number.isFinite(payer.amountPaid) ||
        payer.amountPaid <= 0 ||
        minorUnits(payer.amountPaid) / 100 !== payer.amountPaid,
    )
  ) {
    throw new Error("Payer amounts must be greater than zero.");
  }
  const payerPeople = new Set(draft.payers.map((payer) => payer.personId));
  if (payerPeople.size !== draft.payers.length) {
    throw new Error("Each payer can only be listed once per expense.");
  }
  if (
    draft.payers.length > 0 &&
    draft.payers.reduce((total, payer) => total + minorUnits(payer.amountPaid), 0) >
      minorUnits(draft.amount)
  ) {
    throw new Error("Payer amounts cannot exceed the expense total.");
  }
}

function parentValues(draft: ExpenseDraft) {
  return {
    amount: draft.amount,
    is_peso: draft.isPeso,
    expense_category_id: draft.expenseCategoryId,
    description: draft.description,
    spent_at: draft.spentAt,
  };
}

function payerRows(expenseId: string, draft: ExpenseDraft) {
  return draft.payers.map((payer) => ({
    expense_id: expenseId,
    person_id: payer.personId,
    amount_paid: payer.amountPaid,
  }));
}

function shareRows(
  expenseId: string,
  draft: ExpenseDraft,
  previousShares: ExpenseDetails["shares"] = [],
) {
  return draft.shares.map((share) => {
    const previous = previousShares.find(
      (item) => item.person_id === share.personId && minorUnits(item.amount) === minorUnits(share.amount),
    );
    const isPaid = share.isPaid !== undefined ? share.isPaid : (previous?.is_paid ?? false);
    const paidAt = isPaid ? (previous?.paid_at ?? new Date().toISOString()) : null;
    return {
      expense_id: expenseId,
      person_id: share.personId,
      amount: share.amount,
      is_paid: isPaid,
      paid_at: paidAt,
    };
  });
}

async function loadExpense(expenseId: string) {
  const { data, error } = await supabase
    .from("expenses")
    .select(expenseDetailsSelection)
    .eq("id", expenseId)
    .single();

  if (error) throw dataError("Could not load the saved expense", error);
  return data;
}

async function removeExpenseRows(
  expenseId: string,
  expectedPayers: number,
  expectedShares: number,
) {
  const failures: string[] = [];
  const payersResult = await supabase
    .from("expense_payers")
    .delete()
    .eq("expense_id", expenseId)
    .select("id");
  if (payersResult.error) failures.push(`payer rows: ${payersResult.error.message}`);
  else if (payersResult.data.length !== expectedPayers) {
    failures.push(`only ${payersResult.data.length} of ${expectedPayers} payer rows were rolled back`);
  }

  const sharesResult = await supabase
    .from("expense_shares")
    .delete()
    .eq("expense_id", expenseId)
    .select("id");
  if (sharesResult.error) failures.push(`share rows: ${sharesResult.error.message}`);
  else if (sharesResult.data.length !== expectedShares) {
    failures.push(`only ${sharesResult.data.length} of ${expectedShares} share rows were rolled back`);
  }
  return failures;
}

async function restoreExpense(
  expense: ExpenseDetails,
  includeParent: boolean,
  expectedCurrentPayers: number,
  expectedCurrentShares: number,
): Promise<string[]> {
  const failures: string[] = [];

  const payerCleanup = await supabase
    .from("expense_payers")
    .delete()
    .eq("expense_id", expense.id)
    .select("id");
  const shareCleanup = await supabase
    .from("expense_shares")
    .delete()
    .eq("expense_id", expense.id)
    .select("id");

  if (payerCleanup.error) failures.push(`could not clear payer rows: ${payerCleanup.error.message}`);
  else if (payerCleanup.data.length !== expectedCurrentPayers) {
    failures.push(`only ${payerCleanup.data.length} of ${expectedCurrentPayers} current payer rows were cleared`);
  }
  if (shareCleanup.error) failures.push(`could not clear share rows: ${shareCleanup.error.message}`);
  else if (shareCleanup.data.length !== expectedCurrentShares) {
    failures.push(`only ${shareCleanup.data.length} of ${expectedCurrentShares} current share rows were cleared`);
  }

  if (includeParent) {
    const parentResult = await supabase
      .from("expenses")
      .update({
        amount: expense.amount,
        is_peso: expense.is_peso,
        expense_category_id: expense.expense_category_id,
        description: expense.description,
        spent_at: expense.spent_at,
      })
      .eq("id", expense.id);
    if (parentResult.error) failures.push(`expense details: ${parentResult.error.message}`);
  }

  if (!payerCleanup.error && expense.payers.length > 0) {
    const payerResult = await supabase.from("expense_payers").upsert(
      expense.payers.map((payer) => ({
        id: payer.id,
        expense_id: expense.id,
        person_id: payer.person_id,
        amount_paid: payer.amount_paid,
        created_at: payer.created_at,
      })),
      { onConflict: "id" },
    );
    if (payerResult.error) failures.push(`payer rows: ${payerResult.error.message}`);
  }

  if (!shareCleanup.error && expense.shares.length > 0) {
    const shareResult = await supabase.from("expense_shares").upsert(
      expense.shares.map((share) => ({
        id: share.id,
        expense_id: expense.id,
        person_id: share.person_id,
        amount: share.amount,
        is_paid: share.is_paid,
        paid_at: share.paid_at,
        created_at: share.created_at,
      })),
      { onConflict: "id" },
    );
    if (shareResult.error) failures.push(`share rows: ${shareResult.error.message}`);
  }

  return failures;
}

export async function fetchTripData(): Promise<TripData> {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  const [
    peopleResult,
    categoryResult,
    expenseResult,
    itineraryResult,
    todoResult,
    nominationDaysResult,
    nominationsResult,
    nominationRevealVotesResult,
    nominationRevealStatusResult,
  ] = await Promise.all([
    supabase.from("people").select("id, name, age, details, created_at").order("name"),
    supabase.from("expense_categories").select("id, name").order("name"),
    supabase
      .from("expenses")
      .select(expenseDetailsSelection)
      .order("spent_at", { ascending: false }),
    supabase
      .from("itinerary")
      .select(
        "id, date, time, location_pin, location_name, address, google_place_id, latitude, longitude, description, created_at",
      )
      .order("date")
      .order("time"),
    supabase.from("todos").select(todoDetailsSelection).order("done").order("name"),
    supabase
      .from("nomination_days")
      .select("nomination_date, max_nominations_per_person")
      .order("nomination_date"),
    supabase
      .from("nominations")
      .select("id, nomination_date, voter_person_id, nominee_person_id, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("nomination_reveal_votes")
      .select("nomination_date, person_id, voted_at")
      .order("voted_at"),
    supabase
      .from("nomination_reveal_status")
      .select("nomination_date, total_people, reveal_votes, is_revealed")
      .order("nomination_date"),
  ]);

  const failures = [
    peopleResult.error && dataError("Could not load people", peopleResult.error),
    categoryResult.error && dataError("Could not load expense categories", categoryResult.error),
    expenseResult.error && dataError("Could not load expenses", expenseResult.error),
    itineraryResult.error && dataError("Could not load the itinerary", itineraryResult.error),
    todoResult.error && dataError("Could not load todos", todoResult.error),
    nominationDaysResult.error &&
      dataError("Could not load nomination days", nominationDaysResult.error),
    nominationsResult.error && dataError("Could not load nominations", nominationsResult.error),
    nominationRevealVotesResult.error &&
      dataError("Could not load nomination reveal votes", nominationRevealVotesResult.error),
    nominationRevealStatusResult.error &&
      dataError("Could not load nomination reveal status", nominationRevealStatusResult.error),
  ].filter((error): error is Error => error !== null);

  if (failures.length > 0) {
    throw new Error(
      `${failures.map((failure) => failure.message).join(" ")} Check Supabase table access and row-level security policies.`,
    );
  }

  if (
    !peopleResult.data ||
    !categoryResult.data ||
    !expenseResult.data ||
    !itineraryResult.data ||
    !todoResult.data ||
    !nominationDaysResult.data ||
    !nominationsResult.data ||
    !nominationRevealVotesResult.data ||
    !nominationRevealStatusResult.data
  ) {
    throw new Error(
      "Supabase returned incomplete trip data. Check table access and row-level security policies.",
    );
  }

  return {
    people: peopleResult.data,
    categories: categoryResult.data,
    expenses: expenseResult.data,
    itinerary: itineraryResult.data,
    todos: todoResult.data,
    nominationDays: nominationDaysResult.data,
    nominations: nominationsResult.data,
    nominationRevealVotes: nominationRevealVotesResult.data,
    nominationRevealStatus: nominationRevealStatusResult.data,
  };
}

export async function createExpense(draft: ExpenseDraft) {
  validateDraft(draft);

  const { data: parent, error: parentError } = await supabase
    .from("expenses")
    .insert(parentValues(draft))
    .select("id")
    .single();
  if (parentError) throw dataError("Could not create the expense", parentError);

  let savedPayers = 0;
  let savedShares = 0;
  try {
    if (draft.payers.length > 0) {
      const { error } = await supabase.from("expense_payers").insert(payerRows(parent.id, draft));
      if (error) throw dataError("Could not save payer details", error);
      savedPayers = draft.payers.length;
    }

    const { error: shareError } = await supabase
      .from("expense_shares")
      .insert(shareRows(parent.id, draft));
    if (shareError) throw dataError("Could not save expense shares", shareError);
    savedShares = draft.shares.length;
  } catch (error) {
    const cleanupErrors = await removeExpenseRows(parent.id, savedPayers, savedShares);
    const rollback = await supabase
      .from("expenses")
      .delete()
      .eq("id", parent.id)
      .select("id")
      .maybeSingle();
    const detail = error instanceof Error ? error.message : "Unknown related-record error.";
    if (rollback.error || !rollback.data || cleanupErrors.length > 0) {
      if (rollback.error) cleanupErrors.push(`expense record: ${rollback.error.message}`);
      else if (!rollback.data) cleanupErrors.push("the expense row was not removed");
      throw new Error(
        `${detail} Rollback issues: ${cleanupErrors.join("; ")}. Check database access and remove any incomplete records if needed.`,
      );
    }
    throw new Error(`${detail} The incomplete expense was rolled back.`);
  }

  try {
    return await loadExpense(parent.id);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown refresh error.";
    throw new Error(`Expense and related records were saved, but the record could not be reloaded. ${detail}`);
  }
}

export async function updateExpense(expense: ExpenseDetails, draft: ExpenseDraft) {
  validateDraft(draft);

  const { data, error } = await supabase
    .from("expenses")
    .update(parentValues(draft))
    .eq("id", expense.id)
    .select("id")
    .maybeSingle();
  if (error) throw dataError("Could not update the expense", error);
  if (!data) {
    throw new Error("The expense was not updated. It may have been removed or access may be blocked by row-level security.");
  }

  const payerDelete = await supabase
    .from("expense_payers")
    .delete()
    .eq("expense_id", expense.id)
    .select("id");
  if (payerDelete.error || payerDelete.data.length !== expense.payers.length) {
    const remainingPayers = payerDelete.error
      ? expense.payers.length
      : expense.payers.length - payerDelete.data.length;
    const restoreErrors = await restoreExpense(expense, true, remainingPayers, expense.shares.length);
    throw new Error(
      `Could not replace payer details: ${payerDelete.error?.message ?? "not all prior payer rows could be removed"}${restoreErrors.length ? ` Restore issues: ${restoreErrors.join("; ")}` : ""}`,
    );
  }

  const shareDelete = await supabase
    .from("expense_shares")
    .delete()
    .eq("expense_id", expense.id)
    .select("id");
  if (shareDelete.error || shareDelete.data.length !== expense.shares.length) {
    const remainingShares = shareDelete.error
      ? expense.shares.length
      : expense.shares.length - shareDelete.data.length;
    const restoreErrors = await restoreExpense(expense, true, 0, remainingShares);
    throw new Error(
      `Could not replace share details: ${shareDelete.error?.message ?? "not all prior share rows could be removed"}${restoreErrors.length ? ` Restore issues: ${restoreErrors.join("; ")}` : ""}`,
    );
  }

  let savedPayers = 0;
  let savedShares = 0;
  try {
    if (draft.payers.length > 0) {
      const { error: payerError } = await supabase.from("expense_payers").insert(payerRows(expense.id, draft));
      if (payerError) throw dataError("Could not save payer details", payerError);
      savedPayers = draft.payers.length;
    }
    const { error: shareError } = await supabase
      .from("expense_shares")
      .insert(shareRows(expense.id, draft, expense.shares));
    if (shareError) throw dataError("Could not save expense shares", shareError);
    savedShares = draft.shares.length;
  } catch (error) {
    const restoreErrors = await restoreExpense(expense, true, savedPayers, savedShares);
    const detail = error instanceof Error ? error.message : "Unknown related-record error.";
    throw new Error(
      `${detail} The previous expense data was restored${restoreErrors.length ? ` with issues: ${restoreErrors.join("; ")}` : ""}.`,
    );
  }

  try {
    return await loadExpense(expense.id);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown refresh error.";
    throw new Error(`Expense changes were saved, but the updated record could not be reloaded. ${detail}`);
  }
}

export async function deleteExpense(expense: ExpenseDetails) {
  const payerDelete = await supabase
    .from("expense_payers")
    .delete()
    .eq("expense_id", expense.id)
    .select("id");
  if (payerDelete.error || payerDelete.data.length !== expense.payers.length) {
    const remainingPayers = payerDelete.error
      ? expense.payers.length
      : expense.payers.length - payerDelete.data.length;
    const restoreErrors = await restoreExpense(
      expense,
      false,
      remainingPayers,
      expense.shares.length,
    );
    throw new Error(
      `Could not remove payer details: ${payerDelete.error?.message ?? "not all payer rows could be removed"}${restoreErrors.length ? ` Restore issues: ${restoreErrors.join("; ")}` : ""}`,
    );
  }

  const shareDelete = await supabase
    .from("expense_shares")
    .delete()
    .eq("expense_id", expense.id)
    .select("id");
  if (shareDelete.error || shareDelete.data.length !== expense.shares.length) {
    const remainingShares = shareDelete.error
      ? expense.shares.length
      : expense.shares.length - shareDelete.data.length;
    const restoreErrors = await restoreExpense(expense, false, 0, remainingShares);
    throw new Error(
      `Could not remove expense shares: ${shareDelete.error?.message ?? "not all share rows could be removed"}${restoreErrors.length ? ` Restore issues: ${restoreErrors.join("; ")}` : ""}`,
    );
  }

  const parentDelete = await supabase.from("expenses").delete().eq("id", expense.id).select("id").maybeSingle();
  if (parentDelete.error || !parentDelete.data) {
    const restoreErrors = await restoreExpense(expense, false, 0, 0);
    const reason = parentDelete.error?.message ?? "The expense was not found or row-level security blocked the delete.";
    throw new Error(
      `Could not delete the expense: ${reason}${restoreErrors.length ? ` Restore issues: ${restoreErrors.join("; ")}` : ""}`,
    );
  }
}

export async function setSharePaid(share: ExpenseShareRow, isPaid: boolean) {
  const { data, error } = await supabase
    .from("expense_shares")
    .update({ is_paid: isPaid, paid_at: isPaid ? new Date().toISOString() : null })
    .eq("id", share.id)
    .select("id")
    .maybeSingle();
  if (error) throw dataError("Could not update share payment status", error);
  if (!data) {
    throw new Error("Share status was not updated. Check access policies or refresh the expense.");
  }
}

const itinerarySelection =
  "id, date, time, location_pin, location_name, address, google_place_id, latitude, longitude, description, created_at";

function validateItineraryDraft(draft: ItineraryDraft) {
  if (!draft.date || Number.isNaN(Date.parse(`${draft.date}T12:00:00`))) {
    throw new Error("Choose a valid itinerary date.");
  }
  if (
    !draft.description?.trim() &&
    !draft.locationPin?.trim() &&
    !draft.locationName?.trim() &&
    !draft.address?.trim()
  ) {
    throw new Error("Enter a description or location for the itinerary entry.");
  }
  if (
    (draft.latitude !== null && (!Number.isFinite(draft.latitude) || Math.abs(draft.latitude) > 90)) ||
    (draft.longitude !== null && (!Number.isFinite(draft.longitude) || Math.abs(draft.longitude) > 180))
  ) {
    throw new Error("Enter valid latitude (-90 to 90) and longitude (-180 to 180) coordinates.");
  }
}

function itineraryValues(draft: ItineraryDraft) {
  const locationName = draft.locationName?.trim() || null;
  const locationPin = draft.locationPin?.trim() || locationName || null;
  return {
    date: draft.date,
    time: draft.time?.trim() || null,
    location_pin: locationPin,
    location_name: locationName,
    address: draft.address?.trim() || null,
    google_place_id: draft.googlePlaceId?.trim() || null,
    latitude: draft.latitude,
    longitude: draft.longitude,
    description: draft.description?.trim() || null,
  };
}

export async function createItineraryEntry(draft: ItineraryDraft): Promise<ItineraryRow> {
  validateItineraryDraft(draft);
  const { data, error } = await supabase
    .from("itinerary")
    .insert(itineraryValues(draft))
    .select(itinerarySelection)
    .single();
  if (error) throw dataError("Could not create itinerary entry", error);
  return data;
}

export async function updateItineraryEntry(
  id: string,
  draft: ItineraryDraft,
): Promise<ItineraryRow> {
  validateItineraryDraft(draft);
  const { data, error } = await supabase
    .from("itinerary")
    .update(itineraryValues(draft))
    .eq("id", id)
    .select(itinerarySelection)
    .maybeSingle();
  if (error) throw dataError("Could not update itinerary entry", error);
  if (!data) {
    throw new Error(
      "The itinerary entry was not updated. It may have been removed or blocked by row-level security.",
    );
  }
  return data;
}

export async function deleteItineraryEntry(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("itinerary")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) throw dataError("Could not delete itinerary entry", error);
  if (!data) {
    throw new Error(
      "The itinerary entry was not removed. It may have already been deleted or blocked by row-level security.",
    );
  }
}

function validateTodoDraft(draft: TodoDraft) {
  if (!draft.name.trim()) {
    throw new Error("Enter a todo name.");
  }
  const uniquePeople = new Set(draft.assignments.map((item) => item.personId));
  if (uniquePeople.size !== draft.assignments.length) {
    throw new Error("Each person can only be assigned once to the same todo.");
  }
}

async function loadTodo(todoId: string): Promise<TodoDetails> {
  const { data, error } = await supabase
    .from("todos")
    .select(todoDetailsSelection)
    .eq("id", todoId)
    .single();
  if (error) throw dataError("Could not load the saved todo", error);
  return data;
}

export async function createTodo(draft: TodoDraft): Promise<TodoDetails> {
  validateTodoDraft(draft);
  const { data: parent, error: parentError } = await supabase
    .from("todos")
    .insert({
      name: draft.name.trim(),
      comment: draft.comment?.trim() || null,
      done: draft.done,
    })
    .select("id")
    .single();
  if (parentError) throw dataError("Could not create todo", parentError);

  if (draft.assignments.length > 0) {
    const { error: assignError } = await supabase.from("todo_assignments").insert(
      draft.assignments.map((item) => ({
        todo_id: parent.id,
        person_id: item.personId,
        is_done: Boolean(item.isDone),
      })),
    );
    if (assignError) {
      await supabase.from("todos").delete().eq("id", parent.id);
      throw dataError("Could not save todo assignments", assignError);
    }
  }

  return await loadTodo(parent.id);
}

export async function updateTodo(todo: TodoDetails, draft: TodoDraft): Promise<TodoDetails> {
  validateTodoDraft(draft);
  const { data, error } = await supabase
    .from("todos")
    .update({
      name: draft.name.trim(),
      comment: draft.comment?.trim() || null,
      done: draft.done,
    })
    .eq("id", todo.id)
    .select("id")
    .maybeSingle();
  if (error) throw dataError("Could not update todo", error);
  if (!data) {
    throw new Error(
      "The todo was not updated. It may have been removed or blocked by row-level security.",
    );
  }

  const clearResult = await supabase
    .from("todo_assignments")
    .delete()
    .eq("todo_id", todo.id);
  if (clearResult.error) {
    throw dataError("Could not update todo assignments", clearResult.error);
  }

  if (draft.assignments.length > 0) {
    const { error: insertError } = await supabase.from("todo_assignments").insert(
      draft.assignments.map((item) => ({
        todo_id: todo.id,
        person_id: item.personId,
        is_done: Boolean(item.isDone),
      })),
    );
    if (insertError) throw dataError("Could not save todo assignments", insertError);
  }

  return await loadTodo(todo.id);
}

export async function deleteTodo(todo: TodoDetails): Promise<void> {
  if (todo.assignments.length > 0) {
    const { error: clearError } = await supabase
      .from("todo_assignments")
      .delete()
      .eq("todo_id", todo.id);
    if (clearError) throw dataError("Could not remove todo assignments", clearError);
  }
  const { data, error } = await supabase
    .from("todos")
    .delete()
    .eq("id", todo.id)
    .select("id")
    .maybeSingle();
  if (error) throw dataError("Could not delete todo", error);
  if (!data) {
    throw new Error("The todo was not removed. Check row-level security policies.");
  }
}

export async function setTodoDone(todoId: string, done: boolean): Promise<void> {
  const { data, error } = await supabase
    .from("todos")
    .update({ done })
    .eq("id", todoId)
    .select("id")
    .maybeSingle();
  if (error) throw dataError("Could not update todo status", error);
  if (!data) {
    throw new Error("Todo status was not updated. Check access policies.");
  }
}

export async function setTodoAssignmentDone(
  todoId: string,
  personId: string,
  isDone: boolean,
): Promise<void> {
  const { data, error } = await supabase
    .from("todo_assignments")
    .update({ is_done: isDone })
    .eq("todo_id", todoId)
    .eq("person_id", personId)
    .select("todo_id")
    .maybeSingle();
  if (error) throw dataError("Could not update todo assignment status", error);
  if (!data) {
    throw new Error("Todo assignment status was not updated. Check access policies.");
  }
}

export async function updatePersonProfile(
  personId: string,
  draft: { age: number | null; details: string | null },
): Promise<PersonRow> {
  const { data, error } = await supabase
    .from("people")
    .update({
      age: draft.age,
      details: draft.details?.trim() || null,
    })
    .eq("id", personId)
    .select("id, name, age, details, created_at")
    .maybeSingle();
  if (error) throw dataError("Could not update person profile", error);
  if (!data) {
    throw new Error("Profile was not updated. Check row-level security policies.");
  }
  return data;
}

export async function saveVoterNominationsForDay(
  nominationDate: string,
  voterPersonId: string,
  nomineePersonIds: string[],
  maxNominations = 2,
): Promise<NominationRow[]> {
  if (!nominationDate) {
    throw new Error("Choose a valid nomination day.");
  }
  if (!voterPersonId) {
    throw new Error("Select which housemate is voting.");
  }
  const uniqueNominees = Array.from(new Set(nomineePersonIds));
  if (uniqueNominees.length !== nomineePersonIds.length) {
    throw new Error("You cannot nominate the same housemate twice on the same day.");
  }
  if (uniqueNominees.includes(voterPersonId)) {
    throw new Error("Housemates cannot nominate themselves.");
  }
  if (uniqueNominees.length > maxNominations) {
    throw new Error(`You can nominate at most ${maxNominations} housemates per day.`);
  }

  const clearResult = await supabase
    .from("nominations")
    .delete()
    .eq("nomination_date", nominationDate)
    .eq("voter_person_id", voterPersonId);
  if (clearResult.error) {
    throw dataError("Could not update existing nominations", clearResult.error);
  }

  if (uniqueNominees.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("nominations")
    .insert(
      uniqueNominees.map((nomineeId) => ({
        nomination_date: nominationDate,
        voter_person_id: voterPersonId,
        nominee_person_id: nomineeId,
      })),
    )
    .select("id, nomination_date, voter_person_id, nominee_person_id, created_at");

  if (error) {
    throw dataError("Could not save nominations", error);
  }
  return data ?? [];
}

export async function setNominationRevealVote(
  nominationDate: string,
  personId: string,
  shouldVote: boolean,
): Promise<{
  vote: NominationRevealVoteRow | null;
  status: NominationRevealStatusRow | null;
}> {
  if (!nominationDate) {
    throw new Error("Choose a valid nomination day.");
  }
  if (!personId) {
    throw new Error("Choose a valid housemate.");
  }

  let savedVote: NominationRevealVoteRow | null = null;

  if (shouldVote) {
    const { data, error } = await supabase
      .from("nomination_reveal_votes")
      .upsert(
        {
          nomination_date: nominationDate,
          person_id: personId,
        },
        { onConflict: "nomination_date,person_id" },
      )
      .select("nomination_date, person_id, voted_at")
      .single();

    if (error) {
      throw dataError("Could not record reveal vote", error);
    }
    savedVote = data;
  } else {
    const { error } = await supabase
      .from("nomination_reveal_votes")
      .delete()
      .eq("nomination_date", nominationDate)
      .eq("person_id", personId);

    if (error) {
      throw dataError("Could not withdraw reveal vote", error);
    }
  }

  const { data: statusData, error: statusError } = await supabase
    .from("nomination_reveal_status")
    .select("nomination_date, total_people, reveal_votes, is_revealed")
    .eq("nomination_date", nominationDate)
    .maybeSingle();

  if (statusError) {
    throw dataError("Could not load updated reveal status", statusError);
  }

  return {
    vote: savedVote,
    status: statusData,
  };
}
