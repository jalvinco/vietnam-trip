import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowRight,
  BadgeCheck,
  Banknote,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coffee,
  Compass,
  CreditCard,
  ExternalLink,
  Images,
  MapPin,
  Plane,
  Plus,
  ReceiptText,
  Sparkles,
  UsersRound,
  Wallet,
  Waves,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  createExpense,
  createItineraryEntry,
  createTodo,
  deleteExpense,
  deleteItineraryEntry,
  deleteTodo,
  fetchTripData,
  setSharePaid,
  setTodoAssignmentDone,
  setTodoDone,
  updateExpense,
  updateItineraryEntry,
  updateTodo,
  type ExpenseDetails,
  type ExpenseDraft,
  type ItineraryDraft,
  type TodoDetails,
  type TodoDraft,
} from "./data/tripData";
import type { CategoryRow, ItineraryRow, PersonRow } from "./types/database";
import { hasGoogleMapsApiKey, loadGoogleMaps } from "./utils/googleMaps";
import stay1 from "./images/stay1.avif";
import stay2 from "./images/stay2.avif";
import stay3 from "./images/stay3.avif";
import stay4 from "./images/stay4.avif";
import stay5 from "./images/stay5.avif";
import home1 from "./images/home1.avif";
import home2 from "./images/home2.avif";
import home3 from "./images/home3.avif";
import home4 from "./images/home4.avif";
import home5 from "./images/home5.avif";
import home6 from "./images/home6.avif";
import home7 from "./images/home7.avif";
import home8 from "./images/home8.avif";

const hoiAnImages = [stay1, stay2, stay3, stay4, stay5];
const daNangImages = [home1, home2, home3, home4, home5, home6, home7, home8];

const rawPersonImages = import.meta.glob<string>(
  "./images/persons/*.{jpg,jpeg,png,webp,avif}",
  { eager: true, import: "default" },
);

const personImageMap: Record<string, string> = {};
for (const [path, url] of Object.entries(rawPersonImages)) {
  const filename = path.split("/").pop() ?? "";
  const base = filename.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (base) {
    personImageMap[base] = url;
    const withoutDigits = base.replace(/\d+/g, "");
    if (withoutDigits && !personImageMap[withoutDigits]) {
      personImageMap[withoutDigits] = url;
    }
  }
}

function getPersonAvatarUrl(name: string): string | null {
  const normalized = name.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
  if (!normalized) return null;
  if (personImageMap[normalized]) return personImageMap[normalized];
  const withoutDigits = normalized.replace(/\d+/g, "");
  if (withoutDigits && personImageMap[withoutDigits]) return personImageMap[withoutDigits];
  return null;
}

type View = "overview" | "itinerary" | "bookings" | "expenses";
type Category = CategoryRow;
type Participant = PersonRow & { color: string };
type Expense = ExpenseDetails;
type Todo = TodoDetails;

type ItineraryEvent = {
  time: string;
  title: string;
  detail: string;
  icon: LucideIcon;
  confirmed?: boolean;
};

type ItineraryDay = {
  date: string;
  weekday: string;
  title: string;
  city: string;
  events: ItineraryEvent[];
};

const avatarColors = ["#f59e0b", "#ef4444", "#d97706", "#dc2626", "#fbbf24", "#ea580c", "#b91c1c"];

const navItems: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Overview", icon: Compass },
  { id: "itinerary", label: "Itinerary", icon: CalendarDays },
  { id: "bookings", label: "Bookings", icon: Plane },
  { id: "expenses", label: "Expenses", icon: Wallet },
];

const itinerary: ItineraryDay[] = [
  {
    date: "2026-11-24",
    weekday: "TUE",
    title: "Touch down in Vietnam",
    city: "Manila → Hoi An",
    events: [
      {
        time: "7:50 PM",
        title: "Flight departs Manila",
        detail: "Outbound flight · airline and flight number to add",
        icon: Plane,
        confirmed: true,
      },
      {
        time: "11:00 PM",
        title: "Arrive at Hoi An accommodation",
        detail: "Late check-in · booking details to add",
        icon: MapPin,
        confirmed: true,
      },
    ],
  },
  {
    date: "2026-11-25",
    weekday: "WED",
    title: "A first day in Hoi An",
    city: "Hoi An",
    events: [
      {
        time: "Flexible",
        title: "Explore Hoi An",
        detail: "Keep the first full day open for the Old Town and riverside.",
        icon: Compass,
      },
      {
        time: "Evening",
        title: "Dinner together",
        detail: "Choose a spot as a group · plan to confirm",
        icon: Coffee,
      },
    ],
  },
  {
    date: "2026-11-26",
    weekday: "THU",
    title: "One more day in Hoi An",
    city: "Hoi An",
    events: [
      {
        time: "Flexible",
        title: "Make it your own",
        detail: "A free day for markets, a beach break, or a slower pace.",
        icon: Sparkles,
      },
    ],
  },
  {
    date: "2026-11-27",
    weekday: "FRI",
    title: "On to Da Nang",
    city: "Hoi An → Da Nang",
    events: [
      {
        time: "12:00 PM",
        title: "Check out of Hoi An stay",
        detail: "Checkout time confirmed",
        icon: CheckCircle2,
        confirmed: true,
      },
      {
        time: "After checkout",
        title: "Travel to Da Nang",
        detail: "Transfer time and transport to arrange",
        icon: ArrowRight,
      },
      {
        time: "Later",
        title: "Check in to Da Nang stay",
        detail: "Accommodation details to add",
        icon: MapPin,
      },
    ],
  },
  {
    date: "2026-11-28",
    weekday: "SAT",
    title: "A full day in Da Nang",
    city: "Da Nang",
    events: [
      {
        time: "Flexible",
        title: "Da Nang day",
        detail: "Add your group plans, places, and meal stops here.",
        icon: Waves,
      },
    ],
  },
  {
    date: "2026-11-29",
    weekday: "SUN",
    title: "One last day, then home",
    city: "Da Nang → Manila",
    events: [
      {
        time: "Daytime",
        title: "Last day in Da Nang",
        detail: "Checkout and luggage plan to confirm with your stay.",
        icon: Coffee,
      },
      {
        time: "10:30 PM",
        title: "Return flight to Manila",
        detail: "Return flight · airport and flight number to add",
        icon: Plane,
        confirmed: true,
      },
    ],
  },
];

const STORAGE_KEYS = {
  exchangeRate: "vietnam-trip-planner:vnd-per-php:v1",
};

function readSaved<T>(key: string, fallback: T): T {
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch (error) {
    console.error(`Could not load saved trip data (${key}).`, error);
    return fallback;
  }
}

function useSavedState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => readSaved(key, fallback));

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Could not save trip data (${key}).`, error);
    }
  }, [key, value]);

  return [value, setValue] as const;
}

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPhp(amount: number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(amount);
}

function toVnd(amount: number, isPeso: boolean, vndPerPhp: number) {
  return isPeso ? amount * vndPerPhp : amount;
}

function toPhp(amount: number, isPeso: boolean, vndPerPhp: number) {
  if (isPeso) return amount;
  return vndPerPhp > 0 ? amount / vndPerPhp : 0;
}

function formatExpenseAmount(amount: number, isPeso: boolean, vndPerPhp: number) {
  if (isPeso) {
    return formatPhp(amount);
  }
  return `${formatVnd(amount)} (${formatPhp(toPhp(amount, false, vndPerPhp))})`;
}

function formatTripDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

function splitAmount(amount: number, personIds: string[]) {
  const shares = new Map<string, number>();
  if (personIds.length === 0) return shares;

  const totalCents = Math.round(amount * 100);
  const base = Math.floor(totalCents / personIds.length);
  const remainder = totalCents % personIds.length;
  personIds.forEach((id, index) => {
    shares.set(id, (base + (index < remainder ? 1 : 0)) / 100);
  });
  return shares;
}

function getPersonInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function PersonAvatar({
  name,
  color,
  sizeClass = "size-6 text-[10px]",
  borderClass = "border border-[#f59e0b]/40",
}: {
  name: string;
  color?: string;
  sizeClass?: string;
  borderClass?: string;
}) {
  const avatarUrl = getPersonAvatarUrl(name);
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-bold text-[#451a03] ${sizeClass} ${borderClass}`}
      style={{ backgroundColor: color ?? "#fcd34d" }}
      title={name}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          loading="lazy"
          className="size-full object-cover"
        />
      ) : (
        getPersonInitial(name)
      )}
    </span>
  );
}

function AvatarStack({
  people,
  size = "normal",
}: {
  people: Participant[];
  size?: "normal" | "small";
}) {
  return (
    <div className="flex items-center" aria-label={`${people.length} trip members`}>
      {people.slice(0, 7).map((person, index) => {
        const avatarUrl = getPersonAvatarUrl(person.name);
        return (
          <span
            key={person.id}
            className={`relative grid place-items-center overflow-hidden rounded-full border-2 border-[#fffaf3] font-semibold text-[#451a03] shadow-sm ${
              size === "small" ? "size-7 text-[9px]" : "size-9 text-[10px]"
            } ${index ? "-ml-2" : ""}`}
            style={{ backgroundColor: person.color, zIndex: 10 - index }}
            title={person.name}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={person.name}
                loading="lazy"
                className="size-full object-cover"
              />
            ) : (
              getPersonInitial(person.name)
            )}
          </span>
        );
      })}
      {people.length > 7 && (
        <span
          className={`-ml-2 grid place-items-center rounded-full border-2 border-[#fffaf3] bg-[#fef3c7] font-semibold text-[#991b1b] ${
            size === "small" ? "size-7 text-[9px]" : "size-9 text-[10px]"
          }`}
        >
          +{people.length - 7}
        </span>
      )}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
}) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#b91c1c]">
        {eyebrow}
      </p>
      <h1 className="text-[clamp(1.7rem,4vw,2.4rem)] font-semibold tracking-[-0.045em] text-[#2a1810]">
        {title}
      </h1>
      {detail && <p className="mt-2 max-w-2xl text-sm leading-6 text-[#785c4e]">{detail}</p>}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  caption,
  tone = "dark",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  caption: string;
  tone?: "dark" | "light";
}) {
  const isDark = tone === "dark";
  return (
    <div
      className={`rounded-[22px] border p-5 ${
        isDark
          ? "border-[#991b1b] bg-gradient-to-br from-[#991b1b] via-[#b91c1c] to-[#7f1d1d] text-white shadow-sm"
          : "border-[#eddcc4] bg-white"
      }`}
    >
      <div className="mb-5 flex items-center justify-between">
        <span className={`text-xs font-medium ${isDark ? "text-[#fde68a]/85" : "text-[#785c4e]"}`}>
          {label}
        </span>
        <span
          className={`grid size-9 place-items-center rounded-full ${
            isDark ? "bg-[#fbbf24]/20 text-[#fde68a]" : "bg-[#fef3c7] text-[#b91c1c]"
          }`}
        >
          <Icon size={17} strokeWidth={1.8} />
        </span>
      </div>
      <p className={`text-[clamp(1.35rem,3vw,1.8rem)] font-semibold tracking-[-0.04em] ${isDark ? "text-[#fffbeb]" : "text-[#2a1810]"}`}>
        {value}
      </p>
      <p className={`mt-1.5 text-xs ${isDark ? "text-[#fde68a]/75" : "text-[#8c6f60]"}`}>{caption}</p>
    </div>
  );
}

function useModalBackHandler(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    let closedByPopState = false;
    const stateKey = `modal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    window.history.pushState({ ...(window.history.state ?? {}), __agyModal: stateKey }, "");

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handlePopState() {
      closedByPopState = true;
      onCloseRef.current();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseRef.current();
      }
    }

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (!closedByPopState && window.history.state?.__agyModal === stateKey) {
        window.history.back();
      }
    };
  }, [isOpen]);
}

function FormModal({
  isOpen,
  eyebrow,
  title,
  onClose,
  children,
}: {
  isOpen: boolean;
  eyebrow: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useModalBackHandler(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[26px] border border-[#dfe8df] bg-[#fafaf9] shadow-2xl sm:max-h-[88dvh] sm:rounded-[26px]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e8e9e3] bg-white px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
              {eyebrow}
            </p>
            <h2 className="mt-0.5 text-base font-semibold tracking-[-0.02em] text-[#17231f] sm:text-lg">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#f3f4ef] px-3.5 text-xs font-semibold text-[#536058] transition hover:bg-[#e7eae4]"
          >
            <X size={15} />
            Close
          </button>
        </div>
        <div className="overflow-y-auto p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

function TodoForm({
  people,
  initialTodo,
  isSaving,
  onSave,
  onCancel,
}: {
  people: Participant[];
  initialTodo?: Todo;
  isSaving: boolean;
  onSave: (draft: TodoDraft) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialTodo?.name ?? "");
  const [comment, setComment] = useState(initialTodo?.comment ?? "");
  const [done, setDone] = useState(Boolean(initialTodo?.done));
  const [assignedIds, setAssignedIds] = useState<string[]>(
    () => initialTodo?.assignments.map((item) => item.person_id) ?? [],
  );
  const [assignmentDone, setAssignmentDone] = useState<Record<string, boolean>>(() => {
    if (!initialTodo) return {};
    return Object.fromEntries(
      initialTodo.assignments.map((item) => [item.person_id, Boolean(item.is_done)]),
    );
  });
  const [error, setError] = useState("");

  function toggleAssignee(personId: string) {
    setAssignedIds((current) =>
      current.includes(personId)
        ? current.filter((id) => id !== personId)
        : [...current, personId],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Enter a todo name.");
      return;
    }
    try {
      await onSave({
        name: name.trim(),
        comment: comment.trim() || null,
        done,
        assignments: assignedIds.map((personId) => ({
          personId,
          isDone: Boolean(assignmentDone[personId]),
        })),
      });
    } catch (saveErr) {
      setError(saveErr instanceof Error ? saveErr.message : "Could not save todo.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[#713f12]">Todo name</span>
          <input
            required
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Buy Vietnam e-SIMs or book airport transfer"
            className="h-11 w-full rounded-xl border border-[#fde047] bg-white px-3 text-sm outline-none focus:border-[#ca8a04]"
          />
        </label>
        <button
          type="button"
          aria-pressed={done}
          onClick={() => setDone((current) => !current)}
          className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-xs font-semibold transition ${
            done
              ? "border-[#ca8a04] bg-[#fef08a] text-[#713f12]"
              : "border-[#e5e7eb] bg-white text-[#785c4e]"
          }`}
        >
          <Check size={14} />
          {done ? "Marked done" : "Mark as done"}
        </button>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-[#713f12]">
          Comment / notes (optional)
        </span>
        <input
          type="text"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Add extra details, links, or reminders…"
          className="h-11 w-full rounded-xl border border-[#fde047] bg-white px-3 text-sm outline-none focus:border-[#ca8a04]"
        />
      </label>

      <fieldset>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <legend className="text-xs font-semibold text-[#713f12]">
            Assign people (optional)
          </legend>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#854d0e]">
              {assignedIds.length === 0
                ? "No one assigned (optional)"
                : `${assignedIds.length} assigned`}
            </span>
            {people.length > 0 && (
              <button
                type="button"
                onClick={() => setAssignedIds(people.map((person) => person.id))}
                disabled={assignedIds.length === people.length}
                className="min-h-7 rounded-full border border-[#eab308] bg-[#fef08a] px-3 py-0.5 text-[11px] font-semibold text-[#713f12] transition hover:bg-[#fde047] disabled:cursor-default disabled:opacity-55"
              >
                Add All
              </button>
            )}
            {assignedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setAssignedIds([])}
                className="min-h-7 rounded-full border border-[#eddcc4] bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#854d0e] transition hover:bg-[#fefce8]"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {people.map((person, index) => {
            const selected = assignedIds.includes(person.id);
            return (
              <button
                key={person.id}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleAssignee(person.id)}
                className={`flex min-h-10 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  selected
                    ? "border-[#eab308] bg-[#fef08a] text-[#713f12] shadow-xs"
                    : "border-[#eddcc4] bg-white text-[#8c6f60]"
                }`}
              >
                <PersonAvatar
                  name={person.name}
                  color={person.color ?? avatarColors[index % avatarColors.length]}
                  sizeClass="size-5 text-[9px]"
                />
                {person.name}
                {selected && <Check size={12} />}
              </button>
            );
          })}
        </div>

        {assignedIds.length > 0 && (
          <div className="mt-3 space-y-1.5 rounded-2xl border border-[#fde047] bg-[#fefce8] p-3">
            <p className="text-[11px] font-semibold text-[#854d0e]">
              Individual assignment status
            </p>
            <div className="flex flex-wrap gap-2">
              {assignedIds.map((personId, index) => {
                const person = people.find((item) => item.id === personId);
                if (!person) return null;
                const isPersonDone = Boolean(assignmentDone[personId]);
                return (
                  <button
                    key={personId}
                    type="button"
                    aria-pressed={isPersonDone}
                    onClick={() =>
                      setAssignmentDone((current) => ({
                        ...current,
                        [personId]: !current[personId],
                      }))
                    }
                    className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      isPersonDone
                        ? "border-[#ca8a04] bg-[#fde047] text-[#713f12]"
                        : "border-[#fde047] bg-white text-[#854d0e]"
                    }`}
                  >
                    <PersonAvatar
                      name={person.name}
                      color={person.color ?? avatarColors[index % avatarColors.length]}
                      sizeClass="size-5 text-[9px]"
                    />
                    <span>{person.name}</span>
                    <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px]">
                      {isPersonDone ? "Done ✓" : "Pending"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </fieldset>

      {error && (
        <p role="alert" className="text-xs font-medium text-rose-700">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-[#fde047] pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-10 rounded-full px-4 text-xs font-medium text-[#854d0e] hover:bg-[#fef9c3]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#ca8a04] px-5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#a16207] disabled:opacity-60"
        >
          <Plus size={14} />
          {isSaving ? "Saving…" : initialTodo ? "Save todo" : "Add todo"}
        </button>
      </div>
    </form>
  );
}

function TodosPanel({
  todos,
  people,
  isLoading,
  isSaving,
  busyTodoId,
  busyAssignmentKey,
  message,
  error,
  onCreateTodo,
  onUpdateTodo,
  onDeleteTodo,
  onToggleTodoDone,
  onToggleAssignmentDone,
}: {
  todos: Todo[];
  people: Participant[];
  isLoading: boolean;
  isSaving: boolean;
  busyTodoId: string | null;
  busyAssignmentKey: string | null;
  message: string;
  error: string;
  onCreateTodo: (draft: TodoDraft) => Promise<void>;
  onUpdateTodo: (todo: Todo, draft: TodoDraft) => Promise<void>;
  onDeleteTodo: (todo: Todo) => Promise<void>;
  onToggleTodoDone: (todo: Todo, done: boolean) => Promise<void>;
  onToggleAssignmentDone: (todo: Todo, personId: string, isDone: boolean) => Promise<void>;
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const completedCount = todos.filter((todo) => todo.done).length;

  return (
    <section className="rounded-[26px] border-2 border-[#facc15] bg-gradient-to-br from-[#fef9c3] via-[#fefce8] to-[#fef08a]/75 p-5 shadow-sm sm:p-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#a16207]">
            Before & during the trip
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#422006]">
            Todos
          </h2>
          <p className="mt-1 text-xs text-[#854d0e]">
            Shared tasks and reminders · assigning people is optional, and both todos and individual assignments can be marked done.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#eab308]/40 bg-[#fef08a] px-3 py-1.5 text-xs font-semibold text-[#713f12]">
            {completedCount} / {todos.length} done
          </span>
          <button
            type="button"
            onClick={() => {
              setEditingTodo(null);
              setShowAddModal(true);
            }}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#ca8a04] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#a16207]"
          >
            <Plus size={15} />
            Add todo
          </button>
        </div>
      </div>

      {message && (
        <p
          role="status"
          className="mb-4 rounded-xl border border-[#eab308]/40 bg-[#fef08a] px-4 py-2.5 text-xs font-medium text-[#713f12]"
        >
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-2.5 text-xs text-rose-800">
          {error}
        </p>
      )}

      <FormModal
        isOpen={Boolean(showAddModal || editingTodo)}
        eyebrow={editingTodo ? "Edit todo" : "New todo"}
        title={editingTodo ? "Update trip todo" : "Add a trip todo"}
        onClose={() => {
          setShowAddModal(false);
          setEditingTodo(null);
        }}
      >
        <TodoForm
          key={editingTodo?.id ?? "new-todo"}
          people={people}
          initialTodo={editingTodo ?? undefined}
          isSaving={isSaving}
          onCancel={() => {
            setShowAddModal(false);
            setEditingTodo(null);
          }}
          onSave={async (draft) => {
            if (editingTodo) {
              await onUpdateTodo(editingTodo, draft);
            } else {
              await onCreateTodo(draft);
            }
            setShowAddModal(false);
            setEditingTodo(null);
          }}
        />
      </FormModal>

      {isLoading ? (
        <p className="rounded-2xl border border-[#fde047] bg-white/80 px-4 py-6 text-sm text-[#854d0e]">
          Loading todos…
        </p>
      ) : todos.length === 0 ? (
        <div className="grid min-h-40 place-items-center rounded-2xl border border-dashed border-[#eab308]/60 bg-white/75 px-6 py-8 text-center">
          <div>
            <span className="mx-auto grid size-11 place-items-center rounded-full bg-[#fef08a] text-[#854d0e]">
              <CheckCircle2 size={20} />
            </span>
            <p className="mt-3 text-sm font-semibold text-[#422006]">No todos yet</p>
            <p className="mt-1 text-xs leading-5 text-[#854d0e]">
              Add your first todo for packing, bookings, SIM cards, or group reminders.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {todos.map((todo) => {
            const isBusy = busyTodoId === todo.id;
            return (
              <article
                key={todo.id}
                className={`rounded-2xl border p-4 transition ${
                  todo.done
                    ? "border-[#eab308]/40 bg-[#fef9c3]/70"
                    : "border-[#facc15] bg-white/95 shadow-xs"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <button
                      type="button"
                      aria-pressed={todo.done}
                      disabled={isBusy}
                      onClick={() => void onToggleTodoDone(todo, !todo.done)}
                      title={todo.done ? "Mark todo as not done" : "Mark todo as done"}
                      className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg border-2 transition disabled:opacity-50 ${
                        todo.done
                          ? "border-[#ca8a04] bg-[#eab308] text-white"
                          : "border-[#eab308] bg-[#fefce8] text-transparent hover:bg-[#fef08a]"
                      }`}
                    >
                      <Check size={14} strokeWidth={2.5} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3
                          className={`text-sm font-semibold ${
                            todo.done ? "text-[#854d0e] line-through" : "text-[#422006]"
                          }`}
                        >
                          {todo.name}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            todo.done
                              ? "bg-[#fde047] text-[#713f12]"
                              : "bg-[#fef3c7] text-[#a16207]"
                          }`}
                        >
                          {todo.done ? "Done" : "To do"}
                        </span>
                      </div>
                      {todo.comment && (
                        <p className="mt-1 text-xs leading-5 text-[#713f12]/85">{todo.comment}</p>
                      )}

                      {todo.assignments.length > 0 ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-semibold text-[#854d0e]">
                            Assigned:
                          </span>
                          {todo.assignments.map((assignment, idx) => {
                            const person = people.find((item) => item.id === assignment.person_id);
                            const personName =
                              assignment.person?.name ?? person?.name ?? "Unknown";
                            const assignKey = `${todo.id}:${assignment.person_id}`;
                            const isAssignBusy = busyAssignmentKey === assignKey;
                            return (
                              <button
                                key={assignment.person_id}
                                type="button"
                                disabled={isAssignBusy}
                                aria-pressed={assignment.is_done}
                                onClick={() =>
                                  void onToggleAssignmentDone(
                                    todo,
                                    assignment.person_id,
                                    !assignment.is_done,
                                  )
                                }
                                title={`Toggle ${personName}'s assignment status`}
                                className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition disabled:opacity-50 ${
                                  assignment.is_done
                                    ? "border-[#ca8a04] bg-[#fde047] text-[#713f12]"
                                    : "border-[#fde047] bg-[#fefce8] text-[#854d0e] hover:bg-[#fef08a]"
                                }`}
                              >
                                <PersonAvatar
                                  name={personName}
                                  color={
                                    person?.color ?? avatarColors[idx % avatarColors.length]
                                  }
                                  sizeClass="size-4 text-[8px]"
                                />
                                <span className={assignment.is_done ? "line-through" : ""}>
                                  {personName}
                                </span>
                                {assignment.is_done ? (
                                  <Check size={12} className="text-[#713f12]" />
                                ) : (
                                  <span className="size-2 rounded-full bg-[#eab308]" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-2 text-[11px] text-[#a16207]/80">
                          Everyone / unassigned
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        setEditingTodo(todo);
                        setShowAddModal(false);
                      }}
                      className="min-h-8 rounded-full px-2.5 text-[11px] font-semibold text-[#854d0e] hover:bg-[#fef08a] disabled:opacity-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void onDeleteTodo(todo)}
                      className="min-h-8 rounded-full px-2.5 text-[11px] font-semibold text-[#9a3412] hover:bg-[#ffedd5] disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

const DEFAULT_VIETNAM_CENTER = { lat: 15.8801, lng: 108.338 }; // Hoi An / Da Nang area

function getSampleCoordinates(city: string): {
  location_name: string;
  address: string;
  latitude: number;
  longitude: number;
} {
  if (city.includes("Da Nang") && !city.startsWith("Hoi An")) {
    return {
      location_name: "Đà Nẵng",
      address: "Da Nang, Vietnam",
      latitude: 16.0544,
      longitude: 108.2022,
    };
  }
  return {
    location_name: "Hội An Ancient Town",
    address: "Hoi An, Quang Nam, Vietnam",
    latitude: 15.8801,
    longitude: 108.338,
  };
}

function ItineraryForm({
  initialEntry,
  defaultDate,
  isSaving,
  onSave,
  onCancel,
}: {
  initialEntry?: ItineraryRow;
  defaultDate: string;
  isSaving: boolean;
  onSave: (draft: ItineraryDraft) => Promise<void>;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(initialEntry?.date ?? (defaultDate || "2026-11-24"));
  const initialTime =
    initialEntry?.time && /^\d{2}:\d{2}/.test(initialEntry.time)
      ? initialEntry.time.slice(0, 5)
      : "";
  const [time, setTime] = useState(initialTime);
  const [locationName, setLocationName] = useState(
    initialEntry?.location_name ?? initialEntry?.location_pin ?? "",
  );
  const [locationPin, setLocationPin] = useState(initialEntry?.location_pin ?? "");
  const [address, setAddress] = useState(initialEntry?.address ?? "");
  const [googlePlaceId, setGooglePlaceId] = useState(initialEntry?.google_place_id ?? "");
  const [latitude, setLatitude] = useState(
    initialEntry?.latitude !== null && initialEntry?.latitude !== undefined
      ? String(initialEntry.latitude)
      : "",
  );
  const [longitude, setLongitude] = useState(
    initialEntry?.longitude !== null && initialEntry?.longitude !== undefined
      ? String(initialEntry.longitude)
      : "",
  );
  const [description, setDescription] = useState(initialEntry?.description ?? "");
  const [mapError, setMapError] = useState("");
  const [error, setError] = useState("");

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!hasGoogleMapsApiKey()) return;
    let isCancelled = false;

    void loadGoogleMaps()
      .then((maps) => {
        if (isCancelled || !mapContainerRef.current) return;

        const parsedLat = Number(latitude);
        const parsedLng = Number(longitude);
        const hasInitialCoords =
          latitude.trim() !== "" &&
          longitude.trim() !== "" &&
          Number.isFinite(parsedLat) &&
          Number.isFinite(parsedLng);

        const initialCenter = hasInitialCoords
          ? { lat: parsedLat, lng: parsedLng }
          : DEFAULT_VIETNAM_CENTER;

        const map = new maps.Map(mapContainerRef.current, {
          center: initialCenter,
          zoom: hasInitialCoords ? 15 : 11,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        mapInstanceRef.current = map;

        const marker = new maps.Marker({
          map,
          position: hasInitialCoords ? initialCenter : null,
          visible: hasInitialCoords,
        });
        markerInstanceRef.current = marker;

        const geocoder = new maps.Geocoder();

        map.addListener("click", (event: any) => {
          const lat = event?.latLng?.lat?.();
          const lng = event?.latLng?.lng?.();
          if (typeof lat !== "number" || typeof lng !== "number") return;

          const nextLat = Number(lat.toFixed(6));
          const nextLng = Number(lng.toFixed(6));
          setLatitude(String(nextLat));
          setLongitude(String(nextLng));
          marker.setPosition({ lat: nextLat, lng: nextLng });
          marker.setVisible(true);

          geocoder.geocode({ location: { lat: nextLat, lng: nextLng } }, (results: any, status: string) => {
            if (status === "OK" && results?.[0]) {
              const top = results[0];
              const formatted = top.formatted_address ?? "";
              setAddress(formatted);
              if (top.place_id) setGooglePlaceId(top.place_id);
              setLocationName((current) => current || formatted.split(",")[0] || "Pinned location");
              setLocationPin((current) => current || formatted.split(",")[0] || "Pinned location");
            }
          });
        });

        if (searchInputRef.current && maps.places?.Autocomplete) {
          const autocomplete = new maps.places.Autocomplete(searchInputRef.current, {
            fields: ["place_id", "name", "formatted_address", "geometry"],
          });
          autocomplete.bindTo("bounds", map);
          autocomplete.addListener("place_changed", () => {
            const place = autocomplete.getPlace();
            if (!place) return;

            const pickedName = place.name || "";
            const pickedAddress = place.formatted_address || "";
            const pickedPlaceId = place.place_id || "";
            if (pickedName) {
              setLocationName(pickedName);
              setLocationPin((current) => current || pickedName);
            }
            if (pickedAddress) setAddress(pickedAddress);
            if (pickedPlaceId) setGooglePlaceId(pickedPlaceId);

            const loc = place.geometry?.location;
            if (loc) {
              const lat = Number(loc.lat().toFixed(6));
              const lng = Number(loc.lng().toFixed(6));
              setLatitude(String(lat));
              setLongitude(String(lng));
              const pos = { lat, lng };
              map.panTo(pos);
              map.setZoom(16);
              marker.setPosition(pos);
              marker.setVisible(true);
            }
          });
        }
      })
      .catch((loadErr) => {
        if (!isCancelled) {
          setMapError(
            loadErr instanceof Error ? loadErr.message : "Could not load Google Maps picker.",
          );
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const marker = markerInstanceRef.current;
    if (!map || !marker) return;
    const parsedLat = Number(latitude);
    const parsedLng = Number(longitude);
    if (
      latitude.trim() !== "" &&
      longitude.trim() !== "" &&
      Number.isFinite(parsedLat) &&
      Number.isFinite(parsedLng)
    ) {
      const pos = { lat: parsedLat, lng: parsedLng };
      marker.setPosition(pos);
      marker.setVisible(true);
      map.panTo(pos);
    }
  }, [latitude, longitude]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!date || Number.isNaN(Date.parse(`${date}T12:00:00`))) {
      setError("Choose a valid date.");
      return;
    }
    if (
      !description.trim() &&
      !locationName.trim() &&
      !locationPin.trim() &&
      !address.trim()
    ) {
      setError("Enter a description or select a location.");
      return;
    }

    const latValue = latitude.trim() === "" ? null : Number(latitude);
    const lngValue = longitude.trim() === "" ? null : Number(longitude);
    if (
      (latValue !== null && (!Number.isFinite(latValue) || Math.abs(latValue) > 90)) ||
      (lngValue !== null && (!Number.isFinite(lngValue) || Math.abs(lngValue) > 180))
    ) {
      setError("Latitude must be between -90 and 90, and longitude between -180 and 180.");
      return;
    }

    try {
      const cleanName = locationName.trim() || null;
      const cleanPin = locationPin.trim() || cleanName || null;
      await onSave({
        date,
        time: time.trim() || null,
        locationPin: cleanPin,
        locationName: cleanName,
        address: address.trim() || null,
        googlePlaceId: googlePlaceId.trim() || null,
        latitude: latValue,
        longitude: lngValue,
        description: description.trim() || null,
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not save itinerary entry.",
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[#536058]">Date</span>
          <input
            required
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-10 w-full rounded-xl border border-[#e3e6df] bg-white px-3 text-xs outline-none focus:border-emerald-700"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[#536058]">
            Time (optional)
          </span>
          <input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className="h-10 w-full rounded-xl border border-[#e3e6df] bg-white px-3 text-xs outline-none focus:border-emerald-700"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-[#536058]">
            Description
          </span>
          <input
            type="text"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="e.g. Lantern walk & riverside dinner"
            className="h-10 w-full rounded-xl border border-[#e3e6df] bg-white px-3 text-xs outline-none focus:border-emerald-700"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-[#e1e8e0] bg-white p-3.5 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-[#26342d]">Google Maps location picker</p>
            <p className="text-[11px] text-[#8b928d]">
              Search with Google Places or click directly on the map to populate location details.
            </p>
          </div>
          {latitude && longitude && (
            <span className="rounded-full bg-[#edf7ef] px-2.5 py-1 text-[10px] font-semibold text-emerald-800">
              {Number(latitude).toFixed(4)}, {Number(longitude).toFixed(4)}
            </span>
          )}
        </div>

        <label className="mb-3 block">
          <span className="mb-1.5 block text-[11px] font-semibold text-[#536058]">
            Search place on Google Maps
          </span>
          <input
            ref={searchInputRef}
            type="text"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
              }
            }}
            placeholder="Search a place, hotel, restaurant, or attraction in Vietnam…"
            className="h-10 w-full rounded-xl border border-[#e3e6df] bg-[#fafaf8] px-3 text-xs outline-none focus:border-emerald-700 focus:bg-white"
          />
        </label>

        {mapError ? (
          <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{mapError}</p>
        ) : (
          <div
            ref={mapContainerRef}
            className="mb-3 h-56 w-full overflow-hidden rounded-xl border border-[#e8e9e3] bg-[#eef0ec]"
          />
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-[#536058]">
              Location name (location_name)
            </span>
            <input
              type="text"
              value={locationName}
              onChange={(event) => {
                setLocationName(event.target.value);
                if (!locationPin) setLocationPin(event.target.value);
              }}
              placeholder="e.g. Hội An Ancient Town"
              className="h-9 w-full rounded-xl border border-[#e3e6df] bg-white px-3 text-xs outline-none focus:border-emerald-700"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-[#536058]">
              Location pin / label (location_pin)
            </span>
            <input
              type="text"
              value={locationPin}
              onChange={(event) => setLocationPin(event.target.value)}
              placeholder="e.g. Hoi An Old Town"
              className="h-9 w-full rounded-xl border border-[#e3e6df] bg-white px-3 text-xs outline-none focus:border-emerald-700"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-semibold text-[#536058]">
              Address (address)
            </span>
            <input
              type="text"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Full street address"
              className="h-9 w-full rounded-xl border border-[#e3e6df] bg-white px-3 text-xs outline-none focus:border-emerald-700"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-[#536058]">
              Latitude (latitude)
            </span>
            <input
              type="number"
              step="any"
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              placeholder="15.8801"
              className="h-9 w-full rounded-xl border border-[#e3e6df] bg-white px-3 text-xs outline-none focus:border-emerald-700"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold text-[#536058]">
              Longitude (longitude)
            </span>
            <input
              type="number"
              step="any"
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              placeholder="108.3380"
              className="h-9 w-full rounded-xl border border-[#e3e6df] bg-white px-3 text-xs outline-none focus:border-emerald-700"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-[11px] font-semibold text-[#536058]">
              Google Place ID (google_place_id)
            </span>
            <input
              type="text"
              value={googlePlaceId}
              onChange={(event) => setGooglePlaceId(event.target.value)}
              placeholder="Auto-filled from Google Places search or map click"
              className="h-9 w-full rounded-xl border border-[#e3e6df] bg-white px-3 text-xs outline-none focus:border-emerald-700"
            />
          </label>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs font-medium text-rose-700">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-[#e8e9e3] pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-10 rounded-full px-4 text-xs font-medium text-[#68736c] hover:bg-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#193127] px-5 text-xs font-semibold text-white transition hover:bg-[#244537] disabled:opacity-60"
        >
          <Plus size={14} />
          {isSaving ? "Saving…" : initialEntry ? "Save changes" : "Add to itinerary"}
        </button>
      </div>
    </form>
  );
}

function ItineraryDayMap({
  dayEntries,
  selectedEntryId,
  onSelectEntry,
}: {
  dayEntries: ItineraryRow[];
  selectedEntryId: string | null;
  onSelectEntry: (id: string) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, { marker: any; position: { lat: number; lng: number }; entry: ItineraryRow }>>(
    new Map(),
  );
  const polylineRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const [mapLoadError, setMapLoadError] = useState("");
  const [resolvedCount, setResolvedCount] = useState(0);

  function openEntryInfoWindow(entry: ItineraryRow, position: { lat: number; lng: number }, marker: any) {
    const map = mapRef.current;
    const infoWindow = infoWindowRef.current;
    if (!map || !infoWindow) return;

    const container = document.createElement("div");
    container.style.maxWidth = "230px";
    container.style.fontFamily = "inherit";

    const titleEl = document.createElement("div");
    titleEl.style.fontWeight = "600";
    titleEl.style.fontSize = "13px";
    titleEl.style.color = "#17231f";
    titleEl.textContent =
      entry.location_name || entry.location_pin || entry.description || "Itinerary stop";
    container.appendChild(titleEl);

    if (entry.description && (entry.location_name || entry.location_pin)) {
      const descEl = document.createElement("div");
      descEl.style.fontSize = "11px";
      descEl.style.color = "#536058";
      descEl.style.marginTop = "2px";
      descEl.textContent = entry.description;
      container.appendChild(descEl);
    }

    if (entry.address) {
      const addrEl = document.createElement("div");
      addrEl.style.fontSize = "11px";
      addrEl.style.color = "#747d77";
      addrEl.style.marginTop = "3px";
      addrEl.textContent = entry.address;
      container.appendChild(addrEl);
    }

    infoWindow.setContent(container);
    infoWindow.open({ map, anchor: marker, position });
  }

  useEffect(() => {
    if (!hasGoogleMapsApiKey()) return;
    let isCancelled = false;

    void loadGoogleMaps()
      .then(async (maps) => {
        if (isCancelled || !mapContainerRef.current) return;

        if (!mapRef.current) {
          mapRef.current = new maps.Map(mapContainerRef.current, {
            center: DEFAULT_VIETNAM_CENTER,
            zoom: 12,
            mapTypeControl: false,
            streetViewControl: false,
          });
          infoWindowRef.current = new maps.InfoWindow();
        }

        const map = mapRef.current;
        markersRef.current.forEach(({ marker }) => marker.setMap(null));
        markersRef.current.clear();
        if (polylineRef.current) {
          polylineRef.current.setMap(null);
          polylineRef.current = null;
        }

        const geocoder = new maps.Geocoder();
        const bounds = new maps.LatLngBounds();
        const pathCoordinates: { lat: number; lng: number }[] = [];

        for (let i = 0; i < dayEntries.length; i++) {
          const entry = dayEntries[i];
          let pos: { lat: number; lng: number } | null = null;

          if (
            entry.latitude !== null &&
            entry.longitude !== null &&
            Number.isFinite(Number(entry.latitude)) &&
            Number.isFinite(Number(entry.longitude))
          ) {
            pos = { lat: Number(entry.latitude), lng: Number(entry.longitude) };
          } else {
            const query = entry.address || entry.location_name || entry.location_pin;
            if (query) {
              pos = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
                geocoder.geocode({ address: `${query}, Vietnam` }, (results: any, status: string) => {
                  if (status === "OK" && results?.[0]?.geometry?.location) {
                    const loc = results[0].geometry.location;
                    resolve({ lat: loc.lat(), lng: loc.lng() });
                  } else {
                    resolve(null);
                  }
                });
              });
            }
          }

          if (isCancelled) return;
          if (!pos) continue;

          bounds.extend(pos);
          pathCoordinates.push(pos);

          const marker = new maps.Marker({
            map,
            position: pos,
            label: {
              text: String(i + 1),
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: "700",
            },
            title: entry.location_name || entry.location_pin || entry.description || `Stop ${i + 1}`,
          });

          const resolvedPos = pos;
          marker.addListener("click", () => {
            onSelectEntry(entry.id);
            openEntryInfoWindow(entry, resolvedPos, marker);
          });

          markersRef.current.set(entry.id, { marker, position: resolvedPos, entry });
        }

        setResolvedCount(pathCoordinates.length);

        if (pathCoordinates.length > 1) {
          polylineRef.current = new maps.Polyline({
            path: pathCoordinates,
            geodesic: true,
            strokeColor: "#b91c1c",
            strokeOpacity: 0.78,
            strokeWeight: 3,
            map,
          });
        }

        if (pathCoordinates.length === 1) {
          map.setCenter(pathCoordinates[0]);
          map.setZoom(14);
        } else if (pathCoordinates.length > 1) {
          map.fitBounds(bounds, 48);
        } else {
          map.setCenter(DEFAULT_VIETNAM_CENTER);
          map.setZoom(11);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setMapLoadError(err instanceof Error ? err.message : "Could not load Google Maps.");
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [dayEntries]);

  useEffect(() => {
    if (!selectedEntryId || !mapRef.current) return;
    const item = markersRef.current.get(selectedEntryId);
    if (!item) return;
    mapRef.current.panTo(item.position);
    if ((mapRef.current.getZoom() ?? 12) < 14) {
      mapRef.current.setZoom(15);
    }
    openEntryInfoWindow(item.entry, item.position, item.marker);
  }, [selectedEntryId]);

  if (!hasGoogleMapsApiKey()) {
    return null;
  }

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-[#eddcc4] bg-[#fffaf3]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eddcc4] bg-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="grid size-6 place-items-center rounded-full bg-[#fef3c7] text-[#b91c1c]">
            <MapPin size={13} />
          </span>
          <span className="text-xs font-semibold text-[#2a1810]">
            Day map · {resolvedCount} mapped stop{resolvedCount === 1 ? "" : "s"}
          </span>
        </div>
        <span className="text-[11px] text-[#8c6f60]">
          Click an activity below or a pin on the map to focus
        </span>
      </div>
      {mapLoadError ? (
        <p className="p-4 text-xs text-amber-800">{mapLoadError}</p>
      ) : (
        <div ref={mapContainerRef} className="h-72 w-full bg-[#eef0ec] sm:h-80" />
      )}
    </div>
  );
}

function ItineraryTimeline({
  entries,
  isSaving,
  message,
  error,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
}: {
  entries: ItineraryRow[];
  isSaving: boolean;
  message: string;
  error: string;
  onCreateEntry: (draft: ItineraryDraft) => Promise<void>;
  onUpdateEntry: (id: string, draft: ItineraryDraft) => Promise<void>;
  onDeleteEntry: (entry: ItineraryRow) => Promise<void>;
}) {
  const [activeDate, setActiveDate] = useState("");
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ItineraryRow | null>(null);
  const isUsingSample = entries.length === 0;
  const displayEntries: ItineraryRow[] =
    !isUsingSample
      ? entries
      : itinerary.flatMap((day) =>
          day.events.map((event, index) => {
            const sampleLoc = getSampleCoordinates(day.city);
            return {
              id: `sample-${day.date}-${index}`,
              date: day.date,
              time: event.time,
              location_pin: day.city,
              location_name: sampleLoc.location_name,
              address: sampleLoc.address,
              google_place_id: null,
              latitude: sampleLoc.latitude,
              longitude: sampleLoc.longitude,
              description: `${event.title} — ${event.detail}`,
              created_at: "",
            };
          }),
        );
  const dates = Array.from(new Set(displayEntries.map((entry) => entry.date))).sort();
  const selectedDate = dates.includes(activeDate) ? activeDate : (dates[0] ?? "");
  const dayEntries = displayEntries.filter((entry) => entry.date === selectedDate);

  return (
    <section className="rounded-[24px] border border-[#eddcc4] bg-white p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#b91c1c]">
            The plan so far
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#2a1810]">
            {isUsingSample
              ? "Sample itinerary · awaiting database entries"
              : `${dates.length} day${dates.length === 1 ? "" : "s"} planned`}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#fef3c7] px-3 py-1.5 text-xs font-medium text-[#991b1b]">
            Times are local to Vietnam
          </span>
          <button
            type="button"
            onClick={() => {
              setEditingEntry(null);
              setShowAddForm(true);
            }}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#b91c1c] px-3.5 py-1.5 text-xs font-semibold text-[#fef3c7] shadow-sm transition hover:bg-[#991b1b]"
          >
            <Plus size={14} />
            Add activity
          </button>
        </div>
      </div>

      {message && (
        <p role="status" className="mb-4 rounded-xl bg-[#edf7ef] px-4 py-2.5 text-xs text-emerald-900">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-2.5 text-xs text-rose-800">
          {error}
        </p>
      )}

      <FormModal
        isOpen={Boolean(showAddForm || editingEntry)}
        eyebrow={editingEntry ? "Edit itinerary item" : "New itinerary item"}
        title={editingEntry ? "Update activity & map location" : "Add an activity & map location"}
        onClose={() => {
          setShowAddForm(false);
          setEditingEntry(null);
        }}
      >
        <ItineraryForm
          key={editingEntry?.id ?? `new-${selectedDate}`}
          initialEntry={editingEntry ?? undefined}
          defaultDate={editingEntry?.date ?? (selectedDate || "2026-11-24")}
          isSaving={isSaving}
          onCancel={() => {
            setShowAddForm(false);
            setEditingEntry(null);
          }}
          onSave={async (draft) => {
            if (editingEntry && !editingEntry.id.startsWith("sample-")) {
              await onUpdateEntry(editingEntry.id, draft);
            } else {
              await onCreateEntry(draft);
            }
            setActiveDate(draft.date);
            setShowAddForm(false);
            setEditingEntry(null);
          }}
        />
      </FormModal>

      <div className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1">
        {dates.map((date, index) => (
          <button
            key={date}
            type="button"
            onClick={() => {
              setActiveDate(date);
              setSelectedEntryId(null);
            }}
            aria-pressed={selectedDate === date}
            className={`min-w-[67px] rounded-2xl px-3 py-2.5 text-left transition-colors ${
              selectedDate === date
                ? "bg-[#b91c1c] text-[#fef3c7] shadow-sm"
                : "bg-[#fdf4e7] text-[#785c4e] hover:bg-[#f7ebd9]"
            }`}
          >
            <span className="block text-[9px] font-bold tracking-[0.12em] opacity-70">
              DAY {index + 1}
            </span>
            <span className="mt-1 block text-sm font-semibold">
              {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
                new Date(`${date}T12:00:00`),
              )}
            </span>
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#eff0eb] pb-4">
        <div>
          <h3 className="font-semibold text-[#26342d]">
            {dayEntries[0]?.description ?? "No itinerary entries for this day"}
          </h3>
          <p className="mt-1 text-xs text-[#8b928d]">
            {Array.from(
              new Set(
                dayEntries
                  .map((entry) => entry.location_name || entry.location_pin)
                  .filter(Boolean),
              ),
            ).join(" · ")}
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-[#747d77]">
          <CalendarDays size={14} />
          {selectedDate
            ? `${new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date(`${selectedDate}T12:00:00`))}, ${formatTripDate(selectedDate)}`
            : "No dates"}
        </span>
      </div>

      <ItineraryDayMap
        dayEntries={dayEntries}
        selectedEntryId={selectedEntryId}
        onSelectEntry={(id) => setSelectedEntryId(id)}
      />

      <div className="pt-2">
        {dayEntries.map((entry, index) => {
          const isSample = entry.id.startsWith("sample-");
          const isSelected = selectedEntryId === entry.id;
          const displayLocationName = entry.location_name || entry.location_pin;
          const hasCoordinates =
            entry.latitude !== null &&
            entry.longitude !== null &&
            Number.isFinite(Number(entry.latitude)) &&
            Number.isFinite(Number(entry.longitude));
          const googleMapsHref = entry.google_place_id
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                displayLocationName || entry.address || "Vietnam",
              )}&query_place_id=${encodeURIComponent(entry.google_place_id)}`
            : hasCoordinates
              ? `https://www.google.com/maps/search/?api=1&query=${entry.latitude},${entry.longitude}`
              : displayLocationName || entry.address
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${displayLocationName || ""} ${entry.address || ""}`.trim(),
                  )}`
                : null;

          return (
            <div
              className={`relative flex gap-4 rounded-2xl px-3 py-3.5 transition ${
                isSelected ? "bg-[#f2f8f3]" : "hover:bg-[#fafaf8]"
              }`}
              key={entry.id}
            >
              {index < dayEntries.length - 1 && (
                <span className="absolute bottom-[-4px] left-[27px] top-12 w-px bg-[#e7eae4]" />
              )}
              <button
                type="button"
                onClick={() => setSelectedEntryId(entry.id)}
                title="Focus this stop on the day map"
                className={`relative z-10 grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold transition ${
                  isSelected
                    ? "bg-[#b91c1c] text-[#fef3c7]"
                    : "bg-[#fef3c7] text-[#991b1b] hover:bg-[#fde68a]"
                }`}
              >
                {index + 1}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {entry.time && (
                        <span className="text-xs font-semibold text-[#785c4e]">
                          {/^\d{2}:\d{2}:\d{2}$/.test(entry.time)
                            ? entry.time.slice(0, 5)
                            : entry.time}
                        </span>
                      )}
                      {displayLocationName && (
                        <button
                          type="button"
                          onClick={() => setSelectedEntryId(entry.id)}
                          className="inline-flex items-center gap-1 rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-[11px] font-semibold text-[#991b1b] hover:bg-[#fde68a]"
                        >
                          <MapPin size={11} />
                          {displayLocationName}
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-[#2a1810]">
                      {entry.description || displayLocationName || "Trip activity"}
                    </p>
                    {entry.address && (
                      <p className="mt-0.5 text-xs leading-5 text-[#785c4e]">{entry.address}</p>
                    )}
                    {entry.location_pin &&
                      entry.location_name &&
                      entry.location_pin !== entry.location_name && (
                        <p className="mt-0.5 text-[11px] text-[#8c6f60]">
                          Pin label: {entry.location_pin}
                        </p>
                      )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-[#8c6f60]">
                      <button
                        type="button"
                        onClick={() => setSelectedEntryId(entry.id)}
                        className="font-semibold text-[#b91c1c] hover:underline"
                      >
                        Show on day map
                      </button>
                      {hasCoordinates && (
                        <span>
                          {Number(entry.latitude).toFixed(4)}, {Number(entry.longitude).toFixed(4)}
                        </span>
                      )}
                      {googleMapsHref && (
                        <a
                          href={googleMapsHref}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-[#536058] hover:text-[#17231f] hover:underline"
                        >
                          Open in Google Maps
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        setEditingEntry(entry);
                        setShowAddForm(false);
                      }}
                      className="min-h-8 rounded-full px-2.5 text-[11px] font-medium text-emerald-800 hover:bg-[#edf7ef] disabled:opacity-50"
                    >
                      Edit
                    </button>
                    {!isSample && (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => void onDeleteEntry(entry)}
                        className="min-h-8 rounded-full px-2.5 text-[11px] font-medium text-[#9a6d61] hover:bg-[#fbf2ef] disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {dayEntries.length === 0 && (
          <p className="py-4 text-sm text-[#8b928d]">
            Itinerary entries will appear here when available.
          </p>
        )}
      </div>
    </section>
  );
}

function StayCard({
  city,
  dates,
  nights,
  variant,
  images,
  airbnbId,
  airbnbHref,
  airbnbSummary,
}: {
  city: string;
  dates: string;
  nights: string;
  variant: "hoi-an" | "da-nang";
  images: string[];
  airbnbId: string;
  airbnbHref: string;
  airbnbSummary: string;
}) {
  const isHoiAn = variant === "hoi-an";
  const [activeIndex, setActiveIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  useModalBackHandler(isGalleryOpen, () => setIsGalleryOpen(false));

  useEffect(() => {
    const src = "https://www.airbnb.co.uk/embeddable/airbnb_jssdk";
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.remove();
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    document.body.appendChild(script);
  }, [airbnbId]);

  const totalImages = images.length;
  const safeIndex = totalImages > 0 ? activeIndex % totalImages : 0;

  function showPrev() {
    setActiveIndex((current) => (current - 1 + totalImages) % totalImages);
  }

  function showNext() {
    setActiveIndex((current) => (current + 1) % totalImages);
  }

  return (
    <article className="overflow-hidden rounded-[24px] border border-[#e8e9e3] bg-white">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#eceee9]">
        {totalImages > 0 && (
          <img
            src={images[safeIndex]}
            alt={`${city} stay photo ${safeIndex + 1} of ${totalImages}`}
            className="size-full object-cover transition-all duration-300"
          />
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-black/25" />

        <div className="absolute inset-x-4 top-4 z-10 flex items-center justify-between gap-2">
          <span className="rounded-full bg-black/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-white backdrop-blur-md">
            {isHoiAn ? "First stop" : "Second stop"}
          </span>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
              {safeIndex + 1} / {totalImages}
            </span>
            <button
              type="button"
              onClick={() => setIsGalleryOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#17231f] shadow-sm backdrop-blur transition hover:bg-white"
            >
              <Images size={13} />
              Gallery
            </button>
          </div>
        </div>

        {totalImages > 1 && (
          <>
            <button
              type="button"
              onClick={showPrev}
              aria-label={`Previous ${city} photo`}
              className="absolute left-3 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-[#17231f] shadow-md backdrop-blur transition hover:bg-white"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={showNext}
              aria-label={`Next ${city} photo`}
              className="absolute right-3 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-[#17231f] shadow-md backdrop-blur transition hover:bg-white"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}

        <div className="absolute inset-x-5 bottom-4 z-10 flex items-end justify-between text-white">
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.04em]">{city}</h2>
            <p className="mt-0.5 text-xs text-white/85">{airbnbSummary}</p>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/20 backdrop-blur">
            {isHoiAn ? <MapPin size={18} /> : <Waves size={18} />}
          </span>
        </div>
      </div>

      {totalImages > 1 && (
        <div className="flex gap-2 overflow-x-auto border-b border-[#eff0eb] bg-[#fafaf8] px-5 py-3">
          {images.map((imgSrc, idx) => (
            <button
              key={imgSrc}
              type="button"
              onClick={() => setActiveIndex(idx)}
              aria-label={`View ${city} photo ${idx + 1}`}
              aria-current={idx === safeIndex ? "true" : undefined}
              className={`relative aspect-[4/3] h-14 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                idx === safeIndex
                  ? "border-emerald-700 ring-2 ring-emerald-700/20"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <img
                src={imgSrc}
                alt={`${city} thumbnail ${idx + 1}`}
                className="size-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      <div className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-semibold text-[#26342d]">{dates}</p>
            <p className="mt-1 text-xs text-[#8b928d]">{nights}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#f4f5f0] px-3 py-1.5 text-xs font-medium text-[#66716b]">
              7 travelers
            </span>
            <a
              href={airbnbHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#b91c1c] px-3.5 py-1.5 text-xs font-semibold text-[#fef3c7] transition hover:bg-[#991b1b]"
            >
              Airbnb
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto border-t border-[#eff0eb] pt-4">
          <div
            className="airbnb-embed-frame"
            data-id={airbnbId}
            data-view="home"
            data-hide-price="true"
            style={{ width: "450px", maxWidth: "100%", height: "300px", margin: "auto" }}
          >
            <a href={airbnbHref}>View on Airbnb</a>
            <a href={airbnbHref} rel="nofollow">
              {airbnbSummary}
            </a>
          </div>
        </div>
      </div>

      {isGalleryOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${city} photo gallery`}
          className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4 text-white backdrop-blur-md sm:p-6"
        >
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 pb-4">
            <div>
              <h3 className="text-lg font-semibold">{city} Stay Gallery</h3>
              <p className="text-xs text-white/70">
                Photo {safeIndex + 1} of {totalImages} · {airbnbSummary}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsGalleryOpen(false)}
              aria-label="Close gallery"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white/15 px-4 text-xs font-semibold text-white transition hover:bg-white/25"
            >
              <X size={16} />
              Close
            </button>
          </div>

          <div className="relative mx-auto flex min-h-0 w-full max-w-5xl flex-1 items-center justify-center">
            <img
              src={images[safeIndex]}
              alt={`${city} stay photo ${safeIndex + 1}`}
              className="max-h-full max-w-full rounded-2xl object-contain"
            />
            {totalImages > 1 && (
              <>
                <button
                  type="button"
                  onClick={showPrev}
                  aria-label="Previous photo"
                  className="absolute left-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  onClick={showNext}
                  aria-label="Next photo"
                  className="absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </div>

          <div className="mx-auto mt-4 flex max-w-5xl gap-2 overflow-x-auto pb-2">
            {images.map((imgSrc, idx) => (
              <button
                key={imgSrc}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`relative aspect-[4/3] h-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                  idx === safeIndex
                    ? "border-emerald-400 opacity-100"
                    : "border-transparent opacity-55 hover:opacity-90"
                }`}
              >
                <img
                  src={imgSrc}
                  alt={`${city} thumbnail ${idx + 1}`}
                  className="size-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

function FlightCard({
  label,
  date,
  departure,
  departureCity,
  arrival,
  arrivalCity,
  note,
}: {
  label: string;
  date: string;
  departure: string;
  departureCity: string;
  arrival: string;
  arrivalCity: string;
  note: string;
}) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-[#e8e9e3] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eff0eb] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-[#edf5ee] text-emerald-800">
            <Plane size={17} />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#26342d]">{label}</p>
            <p className="mt-0.5 text-xs text-[#8b928d]">{date}</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-full bg-[#edf7ef] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800">
          <BadgeCheck size={13} />
          Time noted
        </span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-6 sm:px-8 sm:py-7">
        <div>
          <p className="text-2xl font-semibold tracking-[-0.04em] text-[#17231f]">{departure}</p>
          <p className="mt-1 text-xs text-[#7b847e]">{departureCity}</p>
        </div>
        <div className="flex min-w-16 items-center gap-1 text-[#a2aaa4]">
          <span className="h-px flex-1 border-t border-dashed border-[#cbd1cb]" />
          <Plane size={15} className="rotate-90 text-emerald-700" />
          <span className="h-px flex-1 border-t border-dashed border-[#cbd1cb]" />
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tracking-[-0.04em] text-[#17231f]">{arrival}</p>
          <p className="mt-1 text-xs text-[#7b847e]">{arrivalCity}</p>
        </div>
      </div>
      <div className="mx-5 mb-5 rounded-xl bg-[#f7f7f3] px-4 py-3 text-xs leading-5 text-[#747d77] sm:mx-6 sm:mb-6">
        {note}
      </div>
    </article>
  );
}

function ExpenseForm({
  people,
  categories,
  initialExpense,
  vndPerPhp,
  isSaving,
  onSave,
  onCancel,
}: {
  people: Participant[];
  categories: Category[];
  initialExpense?: Expense;
  vndPerPhp: number;
  isSaving: boolean;
  onSave: (draft: ExpenseDraft) => Promise<void>;
  onCancel: () => void;
}) {
  const [description, setDescription] = useState(initialExpense?.description ?? "");
  const [amount, setAmount] = useState(String(initialExpense?.amount ?? ""));
  const [isPeso, setIsPeso] = useState(Boolean(initialExpense?.is_peso));
  const [categoryId, setCategoryId] = useState(initialExpense?.expense_category_id ?? "");
  const [date, setDate] = useState(initialExpense?.spent_at.slice(0, 10) ?? "2026-11-24");
  const initialShareIds =
    initialExpense?.shares.map((share) => share.person_id) ?? people.map((person) => person.id);
  const [participantIds, setParticipantIds] = useState(initialShareIds);
  const [shareAmounts, setShareAmounts] = useState<Record<string, string>>(() => {
    if (initialExpense) {
      return Object.fromEntries(
        initialExpense.shares.map((share) => [share.person_id, String(share.amount)]),
      );
    }
    return Object.fromEntries(
      Array.from(splitAmount(0, initialShareIds), ([id, share]) => [id, String(share)]),
    );
  });
  const [sharePaidStatus, setSharePaidStatus] = useState<Record<string, boolean>>(() => {
    if (initialExpense) {
      return Object.fromEntries(
        initialExpense.shares.map((share) => [share.person_id, Boolean(share.is_paid)]),
      );
    }
    return {};
  });
  const [payerAmounts, setPayerAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (initialExpense?.payers ?? []).map((payer) => [payer.person_id, String(payer.amount_paid)]),
    ),
  );
  const [error, setError] = useState("");
  const currencySymbol = isPeso ? "₱" : "₫";

  function applyAutomaticShares(
    nextTotalAmount: number,
    nextParticipantIds: string[],
    nextPayerAmounts: Record<string, string>,
  ) {
    const totalCents = Math.round((nextTotalAmount || 0) * 100);
    const paidEntries = Object.entries(nextPayerAmounts)
      .map(([personId, raw]) => ({ personId, value: Number(raw) }))
      .filter((item) => Number.isFinite(item.value) && item.value > 0);
    const totalPaidCents = paidEntries.reduce(
      (sum, item) => sum + Math.round(item.value * 100),
      0,
    );

    const payerMap = new Map(paidEntries.map((item) => [item.personId, item.value]));
    const remainingIds = nextParticipantIds.filter((id) => !payerMap.has(id));

    if (
      totalPaidCents > 0 &&
      totalPaidCents < totalCents &&
      remainingIds.length > 0 &&
      paidEntries.every((item) => nextParticipantIds.includes(item.personId))
    ) {
      const remainingAmount = Math.max(0, (totalCents - totalPaidCents) / 100);
      const remainingSplit = splitAmount(remainingAmount, remainingIds);
      const nextShares: Record<string, string> = {};
      nextParticipantIds.forEach((id) => {
        const paidVal = payerMap.get(id);
        if (paidVal !== undefined) {
          nextShares[id] = String(paidVal);
        } else {
          nextShares[id] = String(remainingSplit.get(id) ?? 0);
        }
      });
      setShareAmounts(nextShares);
    } else {
      setShareAmounts(
        Object.fromEntries(
          Array.from(splitAmount(nextTotalAmount || 0, nextParticipantIds), ([personId, share]) => [
            personId,
            String(share),
          ]),
        ),
      );
    }

    if (paidEntries.length > 0) {
      setSharePaidStatus((current) => {
        const next = { ...current };
        paidEntries.forEach((item) => {
          next[item.personId] = true;
        });
        return next;
      });
    }
  }

  function togglePerson(id: string) {
    const nextIds = participantIds.includes(id)
      ? participantIds.filter((item) => item !== id)
      : [...participantIds, id];
    setParticipantIds(nextIds);
    applyAutomaticShares(Number(amount) || 0, nextIds, payerAmounts);
  }

  function changeAmount(value: string) {
    setAmount(value);
    applyAutomaticShares(Number(value) || 0, participantIds, payerAmounts);
  }

  function changePayerAmount(personId: string, value: string) {
    const nextPayerAmounts = { ...payerAmounts, [personId]: value };
    setPayerAmounts(nextPayerAmounts);
    applyAutomaticShares(Number(amount) || 0, participantIds, nextPayerAmounts);
  }

  function setPersonPaidAll(personId: string) {
    const cleanTotal = amount.trim() !== "" ? amount : "0";
    const nextPayerAmounts: Record<string, string> = { [personId]: cleanTotal };
    setPayerAmounts(nextPayerAmounts);
    applyAutomaticShares(Number(cleanTotal) || 0, participantIds, nextPayerAmounts);
  }

  async function submitExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue < 0) {
      setError("Enter a valid expense total of zero or more.");
      return;
    }
    if (!date || Number.isNaN(Date.parse(`${date}T12:00:00`))) {
      setError("Choose a valid expense date.");
      return;
    }
    if (participantIds.length === 0) {
      setError("Choose at least one person to share this expense.");
      return;
    }

    const shares = participantIds.map((personId) => ({
      personId,
      amount: Number(shareAmounts[personId]),
      isPaid: Boolean(sharePaidStatus[personId]),
    }));
    if (
      shares.some((share) => !Number.isFinite(share.amount) || share.amount < 0) ||
      shares.reduce((total, share) => total + Math.round(share.amount * 100), 0) !==
        Math.round(amountValue * 100)
    ) {
      setError("Share amounts must be valid and add up to the expense total.");
      return;
    }

    const enteredPayers = Object.entries(payerAmounts).filter(([, value]) => value.trim() !== "");
    if (enteredPayers.some(([, value]) => !Number.isFinite(Number(value)) || Number(value) <= 0)) {
      setError("Payer amounts must be greater than zero.");
      return;
    }
    const payers = enteredPayers.map(([personId, value]) => ({
      personId,
      amountPaid: Number(value),
    }));
    if (
      payers.length > 0 &&
      payers.reduce((total, payer) => total + Math.round(payer.amountPaid * 100), 0) >
        Math.round(amountValue * 100)
    ) {
      setError("Payer amounts cannot exceed the expense total.");
      return;
    }

    try {
      await onSave({
        amount: amountValue,
        isPeso,
        expenseCategoryId: categoryId || null,
        description: description.trim() || null,
        spentAt: new Date(`${date}T12:00:00`).toISOString(),
        payers,
        shares,
      });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The expense could not be saved.");
    }
  }

  const currentAmount = Number(amount) || 0;
  const totalPaidAmount = Object.values(payerAmounts).reduce((sum, val) => {
    const num = Number(val);
    return Number.isFinite(num) && num > 0 ? sum + num : sum;
  }, 0);
  const remainingAmount = Math.max(0, Number((currentAmount - totalPaidAmount).toFixed(2)));
  const overpaidAmount = Math.max(0, Number((totalPaidAmount - currentAmount).toFixed(2)));
  const activePayerIds = Object.entries(payerAmounts)
    .filter(([, val]) => Number(val) > 0)
    .map(([id]) => id);
  const remainingParticipantIds = participantIds.filter((id) => !activePayerIds.includes(id));
  const isPartialPaymentSplit =
    totalPaidAmount > 0 &&
    totalPaidAmount < currentAmount &&
    remainingParticipantIds.length > 0;
  const perPerson = isPartialPaymentSplit
    ? remainingAmount / remainingParticipantIds.length
    : participantIds.length
      ? currentAmount / participantIds.length
      : 0;

  return (
    <form onSubmit={submitExpense} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold text-[#536058]">What was it for?</span>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="e.g. First-night dinner"
            className="h-11 w-full rounded-xl border border-[#e3e6df] bg-white px-3 text-sm outline-none transition focus:border-emerald-700"
          />
        </label>
        <div className="block">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#536058]">
              Total amount ({isPeso ? "PHP ₱" : "VND ₫"})
            </span>
            <div
              className="inline-flex rounded-full border border-[#dce2d9] bg-white p-0.5 text-[11px] font-semibold"
              role="group"
              aria-label="Expense currency"
            >
              <button
                type="button"
                aria-pressed={!isPeso}
                onClick={() => setIsPeso(false)}
                className={`rounded-full px-2.5 py-0.5 transition ${
                  !isPeso ? "bg-[#193127] text-white" : "text-[#68736c] hover:text-[#17231f]"
                }`}
              >
                VND ₫
              </button>
              <button
                type="button"
                aria-pressed={isPeso}
                onClick={() => setIsPeso(true)}
                className={`rounded-full px-2.5 py-0.5 transition ${
                  isPeso ? "bg-[#193127] text-white" : "text-[#68736c] hover:text-[#17231f]"
                }`}
              >
                PHP ₱
              </button>
            </div>
          </div>
          <div className="flex h-11 items-center rounded-xl border border-[#e3e6df] bg-white px-3 focus-within:border-emerald-700">
            <span className="mr-2 text-sm text-[#8b928d]">{currencySymbol}</span>
            <input
              required
              min="0"
              step="0.01"
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(event) => changeAmount(event.target.value)}
              placeholder={isPeso ? "1500" : "250000"}
              className="w-full bg-transparent text-sm outline-none"
            />
            {!isPeso && currentAmount > 0 && (
              <span className="ml-2 shrink-0 text-xs font-medium text-[#747d77]">
                ({formatPhp(toPhp(currentAmount, false, vndPerPhp))})
              </span>
            )}
          </div>
        </div>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold text-[#536058]">Category</span>
          <span className="relative block">
            <select
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
              className="h-11 w-full appearance-none rounded-xl border border-[#e3e6df] bg-white px-3 pr-9 text-sm outline-none focus:border-emerald-700"
            >
              <option value="">No category</option>
              {categories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-3 text-[#89928b]" size={17} />
          </span>
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold text-[#536058]">Expense date</span>
          <span className="flex gap-2">
            <input
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-11 w-full rounded-xl border border-[#e3e6df] bg-white px-3 text-sm outline-none focus:border-emerald-700"
            />
          </span>
        </label>
      </div>

      <fieldset>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <legend className="text-xs font-semibold text-[#536058]">Who paid?</legend>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`rounded-full px-3 py-1 font-semibold ${
                overpaidAmount > 0
                  ? "bg-rose-50 text-rose-700"
                  : remainingAmount === 0 && currentAmount > 0
                    ? "bg-[#eaf5ed] text-emerald-800"
                    : "bg-[#f3f4ef] text-[#26342d]"
              }`}
            >
              {overpaidAmount > 0
                ? `Over by ${formatExpenseAmount(overpaidAmount, isPeso, vndPerPhp)}`
                : `Remaining amount: ${formatExpenseAmount(remainingAmount, isPeso, vndPerPhp)}`}
            </span>
          </div>
        </div>
        <p className="mb-3 text-[11px] text-[#8b928d]">
          Click <span className="font-semibold text-[#536058]">All</span> if one person covered the full{" "}
          {formatExpenseAmount(currentAmount, isPeso, vndPerPhp)}, or enter partial amounts and the
          remaining {formatExpenseAmount(remainingAmount, isPeso, vndPerPhp)} will be shared by the
          remaining selected people.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {people.map((person, index) => {
            const payerVal = Number(payerAmounts[person.id]) || 0;
            const isFullPayer =
              currentAmount > 0 &&
              Math.round(payerVal * 100) === Math.round(currentAmount * 100);
            return (
              <div
                key={person.id}
                className="flex min-h-11 items-center gap-2 rounded-xl border border-[#eddcc4] bg-white px-3 py-1.5"
              >
                <PersonAvatar
                  name={person.name}
                  color={person.color ?? avatarColors[index % avatarColors.length]}
                  sizeClass="size-6 text-[10px]"
                />
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#2a1810]">
                  {person.name}
                </span>
                {!isPeso && payerVal > 0 && (
                  <span className="shrink-0 text-[10px] text-[#8c6f60]">
                    ({formatPhp(toPhp(payerVal, false, vndPerPhp))})
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setPersonPaidAll(person.id)}
                  aria-pressed={isFullPayer}
                  title={`Fill full total (${formatExpenseAmount(currentAmount, isPeso, vndPerPhp)}) for ${person.name}`}
                  className={`min-h-7 shrink-0 rounded-full px-2.5 text-[10px] font-semibold transition ${
                    isFullPayer
                      ? "bg-[#b91c1c] text-[#fef3c7]"
                      : "border border-[#f59e0b]/40 bg-[#fffbeb] text-[#991b1b] hover:bg-[#fef3c7]"
                  }`}
                >
                  All
                </button>
                <span className="text-xs text-[#8c6f60]">{currencySymbol}</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={payerAmounts[person.id] ?? ""}
                  onChange={(event) => changePayerAmount(person.id, event.target.value)}
                  aria-label={`Amount paid by ${person.name}`}
                  placeholder="0"
                  className="h-9 w-24 rounded-lg border border-[#eddcc4] px-2 text-right text-xs outline-none focus:border-[#b91c1c]"
                />
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <legend className="text-xs font-semibold text-[#536058]">People sharing this expense</legend>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-[11px] font-semibold text-[#991b1b]">
              Remaining amount: {formatExpenseAmount(remainingAmount, isPeso, vndPerPhp)}
            </span>
            <span className="text-[11px] text-[#8b928d]">
              {participantIds.length} selected
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {people.map((person, index) => {
            const selected = participantIds.includes(person.id);
            return (
              <button
                key={person.id}
                type="button"
                aria-pressed={selected}
                onClick={() => togglePerson(person.id)}
                className={`flex min-h-11 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition ${
                  selected
                    ? "border-[#f59e0b] bg-[#fef3c7] text-[#991b1b]"
                    : "border-[#eddcc4] bg-white text-[#8c6f60]"
                }`}
              >
                <PersonAvatar
                  name={person.name}
                  color={person.color ?? avatarColors[index % avatarColors.length]}
                  sizeClass="size-5 text-[9px]"
                />
                {person.name}
                {selected && <Check size={12} />}
              </button>
            );
          })}
        </div>
        {participantIds.length > 0 && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {participantIds.map((personId, index) => {
              const person = people.find((item) => item.id === personId);
              if (!person) return null;
              const shareVal = Number(shareAmounts[personId]) || 0;
              const isPaid = Boolean(sharePaidStatus[personId]);
              return (
                <div
                  key={personId}
                  className="flex min-h-11 flex-wrap items-center gap-2 rounded-xl border border-[#f3e5d0] bg-[#fffaf3] px-3 py-1.5"
                >
                  <PersonAvatar
                    name={person.name}
                    color={person.color ?? avatarColors[index % avatarColors.length]}
                    sizeClass="size-5 text-[9px]"
                  />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#2a1810]">
                    {person.name}’s share
                  </span>
                  {!isPeso && shareVal > 0 && (
                    <span className="shrink-0 text-[10px] text-[#8b928d]">
                      ({formatPhp(toPhp(shareVal, false, vndPerPhp))})
                    </span>
                  )}
                  <span className="text-xs text-[#8b928d]">{currencySymbol}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={shareAmounts[personId] ?? ""}
                    onChange={(event) =>
                      setShareAmounts((current) => ({ ...current, [personId]: event.target.value }))
                    }
                    aria-label={`${person.name}'s share`}
                    className="h-9 w-24 rounded-lg border border-[#e3e6df] bg-white px-2 text-right text-xs outline-none focus:border-emerald-700"
                  />
                  <button
                    type="button"
                    aria-pressed={isPaid}
                    onClick={() =>
                      setSharePaidStatus((current) => ({
                        ...current,
                        [personId]: !current[personId],
                      }))
                    }
                    className={`min-h-8 rounded-full px-2.5 text-[10px] font-semibold transition ${
                      isPaid
                        ? "bg-[#eaf5ed] text-emerald-800"
                        : "border border-[#e3e6df] bg-white text-[#747d77]"
                    }`}
                  >
                    {isPaid ? "Paid" : "Unpaid"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-[11px] text-[#8b928d]">
          {participantIds.length > 0
            ? isPartialPaymentSplit
              ? `Remaining ${formatExpenseAmount(remainingAmount, isPeso, vndPerPhp)} is shared across the ${remainingParticipantIds.length} remaining person${remainingParticipantIds.length === 1 ? "" : "s"} (${formatExpenseAmount(perPerson, isPeso, vndPerPhp)} each). Edit shares if needed.`
              : `Equal split preview: ${formatExpenseAmount(perPerson, isPeso, vndPerPhp)} each; remainder cents go to people in selection order. Edit shares if needed.`
            : "Select at least one person."}
        </p>
      </fieldset>

      {error && <p role="alert" className="text-xs font-medium text-rose-700">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e9ebe5] pt-4">
        <span className="text-xs text-[#8b928d]">Saved to the trip database</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-full px-4 text-xs font-medium text-[#68736c] hover:bg-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#193127] px-5 text-sm font-semibold text-white transition hover:bg-[#244537] disabled:cursor-wait disabled:opacity-60"
          >
            <Plus size={16} />
            {isSaving ? "Saving…" : initialExpense ? "Save changes" : "Save expense"}
          </button>
        </div>
      </div>
    </form>
  );
}

function ExpensePanel({
  people,
  categories,
  expenses,
  totalSpendVnd,
  totalSpendPhp,
  allExpensesPeso,
  vndPerPhp,
  setVndPerPhp,
  isLoading,
  isSaving,
  busyShareId,
  message,
  error,
  onCreateExpense,
  onUpdateExpense,
  onDeleteExpense,
  onSetSharePaid,
}: {
  people: Participant[];
  categories: Category[];
  expenses: Expense[];
  totalSpendVnd: number;
  totalSpendPhp: number;
  allExpensesPeso: boolean;
  vndPerPhp: number;
  setVndPerPhp: (rate: number) => void;
  isLoading: boolean;
  isSaving: boolean;
  busyShareId: string | null;
  message: string;
  error: string;
  onCreateExpense: (draft: ExpenseDraft) => Promise<void>;
  onUpdateExpense: (expense: Expense, draft: ExpenseDraft) => Promise<void>;
  onDeleteExpense: (expense: Expense) => Promise<void>;
  onSetSharePaid: (expense: Expense, shareId: string, isPaid: boolean) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [convertAmount, setConvertAmount] = useState("100000");
  const [converterError, setConverterError] = useState("");
  const [rateDraft, setRateDraft] = useState(String(vndPerPhp));
  const amountToConvert = Number(convertAmount);
  const convertedPhp =
    Number.isFinite(amountToConvert) && amountToConvert >= 0 && vndPerPhp > 0
      ? amountToConvert / vndPerPhp
      : 0;
  const unpaidTotalVnd = expenses.reduce(
    (total, expense) =>
      total +
      expense.shares
        .filter((share) => !share.is_paid)
        .reduce(
          (sum, share) => sum + toVnd(share.amount, Boolean(expense.is_peso), vndPerPhp),
          0,
        ),
    0,
  );
  const unpaidTotalPhp = expenses.reduce(
    (total, expense) =>
      total +
      expense.shares
        .filter((share) => !share.is_paid)
        .reduce(
          (sum, share) => sum + toPhp(share.amount, Boolean(expense.is_peso), vndPerPhp),
          0,
        ),
    0,
  );
  const shareCount = expenses.reduce((total, expense) => total + expense.shares.length, 0);

  useEffect(() => {
    setRateDraft(String(vndPerPhp));
  }, [vndPerPhp]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow="Keep it fair"
          title="Shared expenses"
          detail="Record expense totals, currency (PHP or VND), payer contributions, each person’s share, and whether their share has been paid."
        />
        <button
          type="button"
          disabled={isLoading || people.length === 0}
          onClick={() => {
            setEditingExpense(null);
            setShowForm(true);
          }}
          className="mb-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#b91c1c] px-5 text-sm font-semibold text-[#fef3c7] shadow-sm transition hover:bg-[#991b1b] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={17} />
          Add expense
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={ReceiptText}
          label="Trip spend"
          value={allExpensesPeso ? formatPhp(totalSpendPhp) : formatVnd(totalSpendVnd)}
          caption={
            allExpensesPeso
              ? "All recorded expenses in PHP"
              : `${formatPhp(totalSpendPhp)} converted`
          }
          tone="dark"
        />
        <SummaryCard
          icon={UsersRound}
          label="Average share"
          value={
            allExpensesPeso
              ? formatPhp(people.length ? totalSpendPhp / people.length : 0)
              : formatVnd(people.length ? totalSpendVnd / people.length : 0)
          }
          caption={
            allExpensesPeso
              ? `Across ${people.length} people · equal-share estimate`
              : `${formatPhp(people.length ? totalSpendPhp / people.length : 0)} · across ${people.length} people`
          }
          tone="light"
        />
        <SummaryCard
          icon={ArrowLeftRight}
          label="Unpaid shares"
          value={allExpensesPeso ? formatPhp(unpaidTotalPhp) : formatVnd(unpaidTotalVnd)}
          caption={
            allExpensesPeso
              ? `${shareCount} recorded share${shareCount === 1 ? "" : "s"}`
              : `${formatPhp(unpaidTotalPhp)} · ${shareCount} recorded share${shareCount === 1 ? "" : "s"}`
          }
          tone="light"
        />
      </div>

      <FormModal
        isOpen={Boolean(showForm || editingExpense)}
        eyebrow={editingExpense ? "Edit expense" : "New shared cost"}
        title={editingExpense ? "Update the trip ledger entry" : "Ano na naman ito at sino ang nagbayad?"}
        onClose={() => {
          setShowForm(false);
          setEditingExpense(null);
        }}
      >
        <ExpenseForm
          key={editingExpense?.id ?? "new-expense"}
          people={people}
          categories={categories}
          initialExpense={editingExpense ?? undefined}
          vndPerPhp={vndPerPhp}
          isSaving={isSaving}
          onCancel={() => {
            setShowForm(false);
            setEditingExpense(null);
          }}
          onSave={async (draft) => {
            if (editingExpense) await onUpdateExpense(editingExpense, draft);
            else await onCreateExpense(draft);
            setShowForm(false);
            setEditingExpense(null);
          }}
        />
      </FormModal>

      {message && <p role="status" className="rounded-xl bg-[#edf7ef] px-4 py-3 text-sm text-emerald-900">{message}</p>}
      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}

      <section className="rounded-[24px] border border-[#e8e9e3] bg-white p-5 sm:p-7">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="flex gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#edf5ee] text-emerald-800">
              <ArrowDownLeft size={18} />
            </span>
            <div>
              <h2 className="font-semibold text-[#26342d]">VND → PHP converter</h2>
              <p className="mt-1 text-xs text-[#8b928d]">An editable estimate, not a live exchange quote.</p>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-[#747d77]">
            <span>₫ per ₱1</span>
            <input
              aria-label="Vietnamese dong per Philippine peso"
              type="number"
              min="0.01"
              step="0.01"
              value={rateDraft}
              onChange={(event) => {
                const nextValue = event.target.value;
                setRateDraft(nextValue);
                const nextRate = Number(nextValue);
                if (Number.isFinite(nextRate) && nextRate > 0) {
                  setVndPerPhp(nextRate);
                  setConverterError("");
                } else {
                  setConverterError("Enter a rate greater than zero.");
                }
              }}
              className="h-9 w-24 rounded-lg border border-[#e3e6df] px-2 text-right text-sm text-[#26342d] outline-none focus:border-emerald-700"
            />
          </label>
        </div>
        <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
          <label>
            <span className="mb-2 block text-xs font-medium text-[#747d77]">Vietnamese dong</span>
            <span className="flex h-12 items-center rounded-xl border border-[#e3e6df] px-3">
              <span className="mr-2 text-sm text-[#8b928d]">₫</span>
              <input
                inputMode="numeric"
                type="number"
                min="0"
                value={convertAmount}
                onChange={(event) => setConvertAmount(event.target.value)}
                className="w-full bg-transparent text-sm outline-none"
                aria-label="Vietnamese dong amount to convert"
              />
            </span>
          </label>
          <span className="hidden text-[#a2aaa4] md:block">
            <ArrowRight size={18} />
          </span>
          <div>
            <span className="mb-2 block text-xs font-medium text-[#747d77]">Approx. Philippine pesos</span>
            <div className="flex h-12 items-center rounded-xl bg-[#f4f6f1] px-3 text-sm font-semibold text-[#21583b]">
              {formatPhp(convertedPhp)}
            </div>
          </div>
        </div>
        {converterError && <p role="alert" className="mt-2 text-xs text-rose-700">{converterError}</p>}
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[24px] border border-[#e8e9e3] bg-white p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                Payment overview
              </p>
              <h2 className="mt-1 font-semibold text-[#26342d]">Recorded by person</h2>
            </div>
            <span className="grid size-9 place-items-center rounded-full bg-[#f3f4ef] text-[#66716b]">
              <UsersRound size={16} />
            </span>
          </div>
          <p className="mb-4 text-xs leading-5 text-[#8b928d]">
            Payer records and paid shares are shown separately because the database does not record who received a settlement.
          </p>
          <div className="space-y-2">
            {people.map((person) => {
              const payerEntries = expenses.flatMap((expense) =>
                expense.payers
                  .filter((payer) => payer.person_id === person.id)
                  .map((payer) => ({ amount: payer.amount_paid, isPeso: Boolean(expense.is_peso) })),
              );
              const contributedVnd = payerEntries.reduce(
                (sum, item) => sum + toVnd(item.amount, item.isPeso, vndPerPhp),
                0,
              );
              const contributedPhp = payerEntries.reduce(
                (sum, item) => sum + toPhp(item.amount, item.isPeso, vndPerPhp),
                0,
              );
              const allPayerPeso =
                payerEntries.length > 0 && payerEntries.every((item) => item.isPeso);

              const unpaidEntries = expenses.flatMap((expense) =>
                expense.shares
                  .filter((share) => share.person_id === person.id && !share.is_paid)
                  .map((share) => ({ amount: share.amount, isPeso: Boolean(expense.is_peso) })),
              );
              const unpaidVnd = unpaidEntries.reduce(
                (sum, item) => sum + toVnd(item.amount, item.isPeso, vndPerPhp),
                0,
              );
              const unpaidPhp = unpaidEntries.reduce(
                (sum, item) => sum + toPhp(item.amount, item.isPeso, vndPerPhp),
                0,
              );
              const allUnpaidPeso =
                unpaidEntries.length > 0 && unpaidEntries.every((item) => item.isPeso);

              const paidDisplay = allPayerPeso
                ? formatPhp(contributedPhp)
                : `${formatVnd(contributedVnd)} (${formatPhp(contributedPhp)})`;
              const unpaidDisplay = allUnpaidPeso
                ? formatPhp(unpaidPhp)
                : `${formatVnd(unpaidVnd)} (${formatPhp(unpaidPhp)})`;

              return (
                <div
                  key={person.id}
                  className="flex items-center gap-3 rounded-xl border border-[#f3e5d0] bg-[#fffaf3] px-3 py-2.5"
                >
                  <PersonAvatar name={person.name} color={person.color} sizeClass="size-8 text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[#2a1810]">{person.name}</p>
                    <div className="mt-1 flex flex-wrap justify-between gap-x-3 gap-y-1 text-[10px] text-[#785c4e]">
                      <span>Paid toward expenses · {paidDisplay}</span>
                      <span>Unpaid shares · {unpaidDisplay}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {people.length === 0 && (
              <p className="rounded-xl bg-[#f7f8f4] px-4 py-5 text-sm text-[#7b847e]">
                People will appear here when the database is available.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-[24px] border border-[#e8e9e3] bg-white p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                The group ledger
              </p>
              <h2 className="mt-1 font-semibold text-[#26342d]">Recent expenses</h2>
            </div>
            <span className="grid size-9 place-items-center rounded-full bg-[#f3f4ef] text-[#66716b]">
              <CreditCard size={16} />
            </span>
          </div>
          {isLoading ? (
            <p className="rounded-2xl bg-[#f7f8f4] px-4 py-6 text-sm text-[#7b847e]">
              Loading expenses…
            </p>
          ) : expenses.length === 0 ? (
            <div className="grid min-h-52 place-items-center rounded-2xl bg-[#f7f8f4] px-6 text-center">
              <div>
                <span className="mx-auto grid size-11 place-items-center rounded-full bg-white text-emerald-800">
                  <Banknote size={19} />
                </span>
                <p className="mt-3 text-sm font-semibold text-[#536058]">No expenses yet</p>
                <p className="mt-1 text-xs leading-5 text-[#8b928d]">
                  Add a shared cost to record its total, payer contributions, and shares.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {expenses
                .slice()
                .sort((a, b) => b.spent_at.localeCompare(a.spent_at))
                .map((expense) => {
                  const isPeso = Boolean(expense.is_peso);
                  return (
                    <article
                      key={expense.id}
                      className="rounded-2xl border border-[#eff0eb] p-3.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-[#26342d]">
                              {expense.description || "Untitled expense"}
                            </p>
                            <span className="rounded-full bg-[#f3f4ef] px-2 py-0.5 text-[9px] font-semibold text-[#747d77]">
                              {expense.category?.name ?? "No category"}
                            </span>
                            <span className="rounded-full bg-[#eaf5ed] px-2 py-0.5 text-[9px] font-semibold text-emerald-800">
                              {isPeso ? "PHP ₱" : "VND ₫"}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] text-[#8b928d]">
                            {formatTripDate(expense.spent_at.slice(0, 10))}
                          </p>
                          <p className="mt-1 text-[11px] leading-5 text-[#8b928d]">
                            Paid by: {expense.payers.length
                              ? expense.payers
                                  .map(
                                    (payer) =>
                                      `${payer.person?.name ?? "Unknown person"} ${formatExpenseAmount(payer.amount_paid, isPeso, vndPerPhp)}`,
                                  )
                                  .join(" · ")
                              : "Not recorded"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-[#26342d]">
                            {formatExpenseAmount(expense.amount, isPeso, vndPerPhp)}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingExpense(expense);
                              setShowForm(false);
                            }}
                            disabled={isSaving}
                            className="mt-2 min-h-8 rounded-full px-2 text-[10px] font-medium text-emerald-800 hover:bg-[#edf7ef] disabled:opacity-50"
                            aria-label={`Edit ${expense.description || "expense"}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteExpense(expense)}
                            disabled={isSaving}
                            className="mt-2 min-h-8 rounded-full px-2 text-[10px] font-medium text-[#9a6d61] hover:bg-[#fbf2ef]"
                            aria-label={`Delete ${expense.description || "expense"}`}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <details className="mt-2 border-t border-[#eff0eb] pt-2">
                        <summary className="flex min-h-8 cursor-pointer list-none items-center gap-1 text-[10px] font-semibold text-emerald-800">
                          <ChevronDown size={13} />
                          Payer and share details
                        </summary>
                        <div className="mt-3 space-y-3">
                          <div>
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#8b928d]">
                              Payer contributions
                            </p>
                            {expense.payers.length === 0 ? (
                              <p className="text-xs text-[#8b928d]">No payer details recorded yet.</p>
                            ) : (
                              <ul className="space-y-1">
                                {expense.payers.map((payer) => (
                                  <li key={payer.id} className="flex items-center justify-between gap-3 text-xs text-[#68736c]">
                                    <span className="inline-flex items-center gap-2">
                                      <PersonAvatar
                                        name={payer.person?.name ?? "?"}
                                        sizeClass="size-5 text-[9px]"
                                      />
                                      {payer.person?.name ?? "Unknown person"}
                                    </span>
                                    <span className="font-semibold">
                                      {formatExpenseAmount(payer.amount_paid, isPeso, vndPerPhp)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div>
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[#8b928d]">
                              Shares
                            </p>
                            {expense.shares.length === 0 ? (
                              <p className="text-xs text-[#8b928d]">No shares recorded yet.</p>
                            ) : (
                              <ul className="space-y-1.5">
                                {expense.shares.map((share) => (
                                  <li key={share.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                    <span className="inline-flex items-center gap-2 text-[#68736c]">
                                      <PersonAvatar
                                        name={share.person?.name ?? "?"}
                                        sizeClass="size-5 text-[9px]"
                                      />
                                      {share.person?.name ?? "Unknown person"} ·{" "}
                                      {formatExpenseAmount(share.amount, isPeso, vndPerPhp)}
                                    </span>
                                    <button
                                      type="button"
                                      aria-pressed={share.is_paid}
                                      disabled={busyShareId === share.id}
                                      onClick={() => onSetSharePaid(expense, share.id, !share.is_paid)}
                                      className={`min-h-9 rounded-full px-3 text-[10px] font-semibold transition disabled:opacity-50 ${
                                        share.is_paid
                                          ? "bg-[#eaf5ed] text-emerald-800"
                                          : "border border-[#e5e7e1] bg-white text-[#747d77]"
                                      }`}
                                    >
                                      {busyShareId === share.id ? "Saving…" : share.is_paid ? "Paid" : "Mark paid"}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      </details>
                    </article>
                  );
                })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function App() {
  const [activeView, setActiveView] = useState<View>("overview");
  const [people, setPeople] = useState<Participant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [itineraryEntries, setItineraryEntries] = useState<ItineraryRow[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isItinerarySaving, setIsItinerarySaving] = useState(false);
  const [isTodoSaving, setIsTodoSaving] = useState(false);
  const [busyShareId, setBusyShareId] = useState<string | null>(null);
  const [busyTodoId, setBusyTodoId] = useState<string | null>(null);
  const [busyAssignmentKey, setBusyAssignmentKey] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [operationError, setOperationError] = useState("");
  const [message, setMessage] = useState("");
  const [itineraryError, setItineraryError] = useState("");
  const [itineraryMessage, setItineraryMessage] = useState("");
  const [todoError, setTodoError] = useState("");
  const [todoMessage, setTodoMessage] = useState("");
  const [savedRate, setSavedRate] = useSavedState<number>(STORAGE_KEYS.exchangeRate, 440);
  const vndPerPhp = Number.isFinite(savedRate) && savedRate > 0 ? savedRate : 440;

  async function loadTrip() {
    setIsLoading(true);
    setLoadError("");
    try {
      const data = await fetchTripData();
      setPeople(
        data.people.map((person, index) => ({
          ...person,
          color: avatarColors[index % avatarColors.length],
        })),
      );
      setCategories(data.categories);
      setExpenses(data.expenses);
      setItineraryEntries(data.itinerary);
      setTodos(data.todos);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load trip data.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTrip();
  }, []);

  async function handleCreateExpense(draft: ExpenseDraft) {
    setIsSaving(true);
    setOperationError("");
    setMessage("");
    try {
      const expense = await createExpense(draft);
      setExpenses((current) => [expense, ...current]);
      setMessage("Expense and its payer/share records were saved.");
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Could not save expense.");
      throw error;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUpdateExpense(expense: Expense, draft: ExpenseDraft) {
    setIsSaving(true);
    setOperationError("");
    setMessage("");
    try {
      const updated = await updateExpense(expense, draft);
      setExpenses((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setMessage("Expense details and related records were updated.");
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Could not update expense.");
      throw error;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteExpense(expense: Expense) {
    if (!window.confirm(`Remove "${expense.description || "this expense"}" and its payer/share rows?`)) {
      return;
    }
    setIsSaving(true);
    setOperationError("");
    setMessage("");
    try {
      await deleteExpense(expense);
      setExpenses((current) => current.filter((item) => item.id !== expense.id));
      setMessage("Expense and related records were removed.");
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Could not delete expense.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSharePaid(expense: Expense, shareId: string, isPaid: boolean) {
    const share = expense.shares.find((item) => item.id === shareId);
    if (!share) return;
    setBusyShareId(shareId);
    setOperationError("");
    setMessage("");
    try {
      await setSharePaid(share, isPaid);
      const paidAt = isPaid ? new Date().toISOString() : null;
      setExpenses((current) =>
        current.map((item) =>
          item.id === expense.id
            ? {
                ...item,
                shares: item.shares.map((currentShare) =>
                  currentShare.id === shareId
                    ? { ...currentShare, is_paid: isPaid, paid_at: paidAt }
                    : currentShare,
                ),
              }
            : item,
        ),
      );
      setMessage(isPaid ? "Share marked paid." : "Share marked unpaid.");
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : "Could not update share status.");
    } finally {
      setBusyShareId(null);
    }
  }

  const totalSpendVnd = expenses.reduce(
    (total, expense) => total + toVnd(expense.amount, Boolean(expense.is_peso), vndPerPhp),
    0,
  );
  const totalSpendPhp = expenses.reduce(
    (total, expense) => total + toPhp(expense.amount, Boolean(expense.is_peso), vndPerPhp),
    0,
  );
  const allExpensesPeso = expenses.length > 0 && expenses.every((expense) => expense.is_peso);

  function sortItinerary(items: ItineraryRow[]) {
    return items
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));
  }

  async function handleCreateItinerary(draft: ItineraryDraft) {
    setIsItinerarySaving(true);
    setItineraryError("");
    setItineraryMessage("");
    try {
      const created = await createItineraryEntry(draft);
      setItineraryEntries((current) => sortItinerary([...current, created]));
      setItineraryMessage("Itinerary activity added.");
    } catch (error) {
      setItineraryError(error instanceof Error ? error.message : "Could not add itinerary entry.");
      throw error;
    } finally {
      setIsItinerarySaving(false);
    }
  }

  async function handleUpdateItinerary(id: string, draft: ItineraryDraft) {
    setIsItinerarySaving(true);
    setItineraryError("");
    setItineraryMessage("");
    try {
      const updated = await updateItineraryEntry(id, draft);
      setItineraryEntries((current) =>
        sortItinerary(current.map((item) => (item.id === updated.id ? updated : item))),
      );
      setItineraryMessage("Itinerary activity updated.");
    } catch (error) {
      setItineraryError(
        error instanceof Error ? error.message : "Could not update itinerary entry.",
      );
      throw error;
    } finally {
      setIsItinerarySaving(false);
    }
  }

  async function handleDeleteItinerary(entry: ItineraryRow) {
    if (
      !window.confirm(
        `Remove "${entry.description || entry.location_pin || "this itinerary activity"}"?`,
      )
    ) {
      return;
    }
    setIsItinerarySaving(true);
    setItineraryError("");
    setItineraryMessage("");
    try {
      await deleteItineraryEntry(entry.id);
      setItineraryEntries((current) => current.filter((item) => item.id !== entry.id));
      setItineraryMessage("Itinerary activity removed.");
    } catch (error) {
      setItineraryError(
        error instanceof Error ? error.message : "Could not delete itinerary entry.",
      );
    } finally {
      setIsItinerarySaving(false);
    }
  }

  async function handleCreateTodo(draft: TodoDraft) {
    setIsTodoSaving(true);
    setTodoError("");
    setTodoMessage("");
    try {
      const created = await createTodo(draft);
      setTodos((current) => [created, ...current]);
      setTodoMessage("Todo added.");
    } catch (error) {
      setTodoError(error instanceof Error ? error.message : "Could not add todo.");
      throw error;
    } finally {
      setIsTodoSaving(false);
    }
  }

  async function handleUpdateTodo(todo: Todo, draft: TodoDraft) {
    setIsTodoSaving(true);
    setTodoError("");
    setTodoMessage("");
    try {
      const updated = await updateTodo(todo, draft);
      setTodos((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setTodoMessage("Todo updated.");
    } catch (error) {
      setTodoError(error instanceof Error ? error.message : "Could not update todo.");
      throw error;
    } finally {
      setIsTodoSaving(false);
    }
  }

  async function handleDeleteTodo(todo: Todo) {
    if (!window.confirm(`Remove todo "${todo.name}"?`)) {
      return;
    }
    setIsTodoSaving(true);
    setTodoError("");
    setTodoMessage("");
    try {
      await deleteTodo(todo);
      setTodos((current) => current.filter((item) => item.id !== todo.id));
      setTodoMessage("Todo removed.");
    } catch (error) {
      setTodoError(error instanceof Error ? error.message : "Could not remove todo.");
    } finally {
      setIsTodoSaving(false);
    }
  }

  async function handleToggleTodoDone(todo: Todo, done: boolean) {
    setBusyTodoId(todo.id);
    setTodoError("");
    setTodoMessage("");
    try {
      await setTodoDone(todo.id, done);
      setTodos((current) =>
        current.map((item) => (item.id === todo.id ? { ...item, done } : item)),
      );
    } catch (error) {
      setTodoError(error instanceof Error ? error.message : "Could not update todo status.");
    } finally {
      setBusyTodoId(null);
    }
  }

  async function handleToggleAssignmentDone(todo: Todo, personId: string, isDone: boolean) {
    const key = `${todo.id}:${personId}`;
    setBusyAssignmentKey(key);
    setTodoError("");
    setTodoMessage("");
    try {
      await setTodoAssignmentDone(todo.id, personId, isDone);
      setTodos((current) =>
        current.map((item) =>
          item.id === todo.id
            ? {
                ...item,
                assignments: item.assignments.map((assign) =>
                  assign.person_id === personId ? { ...assign, is_done: isDone } : assign,
                ),
              }
            : item,
        ),
      );
    } catch (error) {
      setTodoError(
        error instanceof Error ? error.message : "Could not update assignment status.",
      );
    } finally {
      setBusyAssignmentKey(null);
    }
  }

  return (
    <div className="min-h-dvh bg-[#fffaf3] pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-[#2a1810] md:pb-10">
      <header className="sticky top-0 z-30 border-b border-[#eddcc4]/90 bg-[#fffaf3]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-7 lg:px-10">
          <a href="#" className="flex min-w-0 items-center gap-3 text-inherit no-underline">
            <span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-gradient-to-br from-[#b91c1c] to-[#881313] text-[#fcd34d] shadow-sm ring-1 ring-[#fbbf24]/40">
              <Compass size={19} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-[-0.02em] text-[#2a1810]">
                Vietnam, together
              </span>
              <span className="mt-0.5 hidden text-[10px] text-[#9a6b53] sm:block">
                A shared trip notebook · Hội An & Đà Nẵng
              </span>
            </span>
          </a>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-[#7f1d1d]">{people.length} friends</p>
              <p className="mt-0.5 text-[10px] text-[#9a6b53]">Nov 24 – 29, 2026</p>
            </div>
            <AvatarStack people={people} size="small" />
          </div>
        </div>
        <nav className="mx-auto hidden max-w-7xl gap-1.5 px-7 pb-3 lg:flex lg:px-10" aria-label="Trip sections">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => setActiveView(item.id)}
                aria-current={activeView === item.id ? "page" : undefined}
                className={`flex min-h-10 items-center gap-2 rounded-full px-4 text-xs font-semibold transition ${
                  activeView === item.id
                    ? "bg-[#b91c1c] text-[#fef3c7] shadow-sm"
                    : "text-[#785c4e] hover:bg-[#f7ebd9]"
                }`}
              >
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-8 pt-6 sm:px-7 sm:pt-8 lg:px-10">
        {loadError && (
          <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <span>{loadError}</span>
            <button
              type="button"
              onClick={() => void loadTrip()}
              className="min-h-10 rounded-full border border-rose-200 bg-white px-4 text-xs font-semibold hover:bg-rose-100"
            >
              Retry
            </button>
          </div>
        )}
        {activeView === "overview" && (
          <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[28px] border border-[#f59e0b]/30 bg-gradient-to-br from-[#881313] via-[#b91c1c] to-[#c2410c] px-5 py-7 text-white shadow-md sm:px-8 sm:py-9 lg:px-10">
              <div className="absolute -right-10 -top-24 size-72 rounded-full border-[42px] border-[#fcd34d]/10" />
              <div className="absolute -bottom-36 right-[18%] size-72 rounded-full bg-[#fbbf24]/15 blur-2xl" />
              <div className="relative z-10 grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-end">
                <div>
                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#fde68a]">
                    <Sparkles size={13} />
                    HOI AN - DA NANG · Việt Nam
                  </p>
                  <h1 className="mt-3 max-w-2xl text-[clamp(2rem,6vw,3.8rem)] font-semibold leading-[1.03] tracking-[-0.06em] text-[#fffbeb]">
                    SKAI IS GOD
                  
                  </h1>
                  <p className="mt-4 max-w-lg text-sm leading-6 text-[#fef3c7]/80">
                    Tuloy na ito, sa wakas, we made it out of the group chat.
                  </p>
                </div>
                <div className="rounded-[20px] border border-[#fcd34d]/25 bg-black/15 p-4 backdrop-blur-sm sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-[#fef3c7]/85">
                      <CalendarDays size={15} />
                      Tuesday – Sunday
                    </div>
                    <span className="rounded-full bg-[#fbbf24]/25 px-2.5 py-1 text-[10px] font-semibold text-[#fde68a]">
                      5 nights
                    </span>
                  </div>
                  <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#fffbeb]">
                    November 24 – 29, 2026
                  </p>
                  <div className="my-4 h-px bg-[#fcd34d]/20" />
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-[#fffbeb]">The crew</p>
                      <p className="mt-1 text-[10px] text-[#fef3c7]/70">One trip, split together</p>
                    </div>
                    <AvatarStack people={people} />
                  </div>
                </div>
              </div>
              <div className="relative z-10 mt-7 flex flex-wrap items-center gap-2 text-[11px] font-medium text-[#fef3c7]/90">
                <span className="rounded-full border border-[#fcd34d]/30 bg-black/10 px-3 py-1.5">
                  Hoi An · Nov 24–27
                </span>
                <ArrowRight size={14} className="text-[#fcd34d]" />
                <span className="rounded-full border border-[#fcd34d]/30 bg-black/10 px-3 py-1.5">
                  Da Nang · Nov 27–29
                </span>
              </div>
            </section>

            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryCard
                icon={Wallet}
                label="Trip expenses"
                value={allExpensesPeso ? formatPhp(totalSpendPhp) : formatVnd(totalSpendVnd)}
                caption={
                  totalSpendVnd || totalSpendPhp
                    ? allExpensesPeso
                      ? "Recorded in Philippine pesos"
                      : formatPhp(totalSpendPhp)
                    : "Add costs as you go"
                }
                tone="dark"
              />
              <SummaryCard
                icon={UsersRound}
                label="Travelers"
                value={`${people.length} people`}
                caption="Loaded from the trip database"
                tone="light"
              />
              <SummaryCard
                icon={MapPin}
                label="Two stays"
                value="Hoi An + Da Nang"
                caption="3 nights · then 2 nights"
                tone="light"
              />
            </div>

            <TodosPanel
              todos={todos}
              people={people}
              isLoading={isLoading}
              isSaving={isTodoSaving}
              busyTodoId={busyTodoId}
              busyAssignmentKey={busyAssignmentKey}
              message={todoMessage}
              error={todoError}
              onCreateTodo={handleCreateTodo}
              onUpdateTodo={handleUpdateTodo}
              onDeleteTodo={handleDeleteTodo}
              onToggleTodoDone={handleToggleTodoDone}
              onToggleAssignmentDone={handleToggleAssignmentDone}
            />
          </div>
        )}

        {activeView === "itinerary" && (
          <div className="space-y-6">
            <SectionHeading
              eyebrow="Day-by-day plan"
              title="Trip itinerary"
              detail="Add activities, pin locations on Google Maps, and browse our schedule for Hội An and Đà Nẵng."
            />
            <ItineraryTimeline
              entries={itineraryEntries}
              isSaving={isItinerarySaving}
              message={itineraryMessage}
              error={itineraryError}
              onCreateEntry={handleCreateItinerary}
              onUpdateEntry={handleUpdateItinerary}
              onDeleteEntry={handleDeleteItinerary}
            />
          </div>
        )}

        {activeView === "bookings" && (
          <div className="space-y-10">
            <div className="space-y-6">
              <SectionHeading
                eyebrow="Getting there & back"
                title="Flight notes"
                detail="Only the times you provided are filled in; airline, flight number, airport, and booking reference are left open for your details."
              />
              <div className="grid gap-5 lg:grid-cols-2">
                <FlightCard
                  label="Outbound · Manila to Vietnam"
                  date="Tuesday, November 24"
                  departure="7:50 PM"
                  departureCity="Manila · departure"
                  arrival="11:00 PM"
                  arrivalCity="Hoi An · accommodation ETA"
                  note="Flight departure time and Hoi An accommodation ETA noted. Landing time and transfer details still need confirmation."
                />
                <FlightCard
                  label="Return · Vietnam to Manila"
                  date="Sunday, November 29"
                  departure="10:30 PM"
                  departureCity="Da Nang · departure"
                  arrival="—"
                  arrivalCity="Manila · arrival time to add"
                  note="Return departure time noted. Add airline, flight number, airport details, and Manila arrival time when available."
                />
              </div>
              <div className="flex items-start gap-3 rounded-[22px] border border-[#eddcc4] bg-white p-5 text-sm leading-6 text-[#785c4e]">
                <Clock3 size={18} className="mt-0.5 shrink-0 text-[#b91c1c]" />
                All times shown are local to the place they refer to. The 11:00 PM note is your Hoi An stay ETA,
                not a flight landing time.
              </div>
            </div>

            <div className="space-y-6">
              <SectionHeading
                eyebrow="Two home bases"
                title="Where we’ll stay"
                detail="Our confirmed Airbnb stays in Hội An and Đà Nẵng."
              />
              <div className="grid gap-5 lg:grid-cols-2">
                <StayCard
                  city="Hoi An"
                  dates="Nov 24, 11:00 PM – Nov 27, 12:00 PM"
                  nights="3 nights · late arrival, checkout at noon"
                  variant="hoi-an"
                  images={hoiAnImages}
                  airbnbId="20275214"
                  airbnbHref="https://www.airbnb.co.uk/rooms/20275214?adults=1&s=66&source=embed_widget"
                  airbnbSummary="Hotel in Hội An · ★4.9 · 4 bedrooms · 6 beds · 4 private bathrooms"
                />
                <StayCard
                  city="Da Nang"
                  dates="Nov 27 – Nov 29"
                  nights="2 nights · checkout details to confirm"
                  variant="da-nang"
                  images={daNangImages}
                  airbnbId="1786990244635048452"
                  airbnbHref="https://www.airbnb.co.uk/rooms/1786990244635048452?adults=1&s=66&source=embed_widget"
                  airbnbSummary="Home in Quận Sơn Trà · ★5.0 · 3 bedrooms · 4 beds · 4 bathrooms"
                />
              </div>
              <div className="rounded-[22px] border border-dashed border-[#e5cfa8] bg-white/60 p-5 text-sm leading-6 text-[#785c4e]">
                <span className="font-semibold text-[#2a1810]">Between stays:</span> Hoi An checkout is at
                noon on Nov 27. Transfer timing and luggage arrangements for Da Nang are still to be planned.
              </div>
            </div>
          </div>
        )}

        {activeView === "expenses" && (
          <ExpensePanel
            people={people}
            categories={categories}
            expenses={expenses}
            totalSpendVnd={totalSpendVnd}
            totalSpendPhp={totalSpendPhp}
            allExpensesPeso={allExpensesPeso}
            vndPerPhp={vndPerPhp}
            setVndPerPhp={setSavedRate}
            isLoading={isLoading}
            isSaving={isSaving}
            busyShareId={busyShareId}
            message={message}
            error={operationError}
            onCreateExpense={handleCreateExpense}
            onUpdateExpense={handleUpdateExpense}
            onDeleteExpense={handleDeleteExpense}
            onSetSharePaid={handleSharePaid}
          />
        )}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#eddcc4] bg-[#fffaf3]/95 px-2 pt-2 backdrop-blur-xl [padding-bottom:calc(0.5rem+env(safe-area-inset-bottom))] lg:hidden"
        aria-label="Trip sections"
      >
        <div className="mx-auto flex max-w-lg justify-around">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => setActiveView(item.id)}
                aria-current={activeView === item.id ? "page" : undefined}
                className={`flex min-h-12 min-w-[64px] flex-col items-center justify-center gap-1 rounded-xl px-2 text-[10px] font-semibold transition ${
                  activeView === item.id
                    ? "bg-[#fef3c7] text-[#b91c1c]"
                    : "text-[#8c6f60] hover:bg-[#f7ebd9]"
                }`}
              >
                <Icon size={18} strokeWidth={activeView === item.id ? 2.2 : 1.8} />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default App;
