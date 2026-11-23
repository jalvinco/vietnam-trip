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
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  FolderOpen,
  Images,
  LayoutGrid,
  List,
  Lock,
  MapPin,
  Plane,
  Plus,
  ReceiptText,
  RefreshCw,
  Share,
  Smartphone,
  Sparkles,
  Trophy,
  Unlock,
  Upload,
  UsersRound,
  Wallet,
  Waves,
  Wifi,
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
  saveVoterNominationsForDay,
  setNominationRevealVote,
  setSharePaid,
  setTodoAssignmentDone,
  setTodoDone,
  updateExpense,
  updateItineraryEntry,
  updatePersonProfile,
  updateTodo,
  type ExpenseDetails,
  type ExpenseDraft,
  type ItineraryDraft,
  type TodoDetails,
  type TodoDraft,
  type VoterNominationDraft,
} from "./data/tripData";
import type {
  CategoryRow,
  ItineraryRow,
  NominationDayRow,
  NominationRevealStatusRow,
  NominationRevealVoteRow,
  NominationRow,
  PersonRow,
} from "./types/database";
import {
  hasGoogleMapsApiKey,
  loadGoogleMaps,
  reverseGeocodeNew,
  searchPlacesNew,
  type PickedPlace,
} from "./utils/googleMaps";
import { fetchTripWeather, type DayWeather, type TripWeatherForecast } from "./utils/weather";
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

type View = "overview" | "nominations" | "itinerary" | "bookings" | "expenses";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}
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

const avatarColors = ["#1d4ed8", "#e11d2a", "#f59e0b", "#16a34a", "#2563eb", "#dc2626", "#ca8a04"];

const navItems: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "The House", icon: Compass },
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
        title: "Flight 5J 5756 departs Manila (NAIA Terminal 3)",
        detail: "Outbound flight 5J 5756 · NAIA Terminal 3 → Da Nang International Airport Terminal 2",
        icon: Plane,
        confirmed: true,
      },
      {
        time: "9:30 PM",
        title: "Arrive at Da Nang Intl Airport (Terminal 2) & head to Hoi An",
        detail: "Evening check-in at 12 Trần Cao Vân, Hội An",
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
        time: "11:00 AM",
        title: "Check out of Hoi An stay",
        detail: "Checkout at 11:00 AM confirmed",
        icon: CheckCircle2,
        confirmed: true,
      },
      {
        time: "After checkout",
        title: "Travel to Da Nang",
        detail: "Transfer from Hoi An to Da Nang before 2:00 PM check-in",
        icon: ArrowRight,
      },
      {
        time: "2:00 PM",
        title: "Check in to Da Nang stay",
        detail: "Check-in at 2:00 PM confirmed · 27 Vũng Thùng 1, Sơn Trà",
        icon: MapPin,
        confirmed: true,
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
        detail: "Stay is booked until Nov 30 (12:00 PM checkout), so bags can stay until evening.",
        icon: Coffee,
      },
      {
        time: "6:00 PM",
        title: "Head to Da Nang International Airport (Terminal 2)",
        detail: "Leave accommodation for the airport by 6:00 PM",
        icon: ArrowRight,
        confirmed: true,
      },
      {
        time: "10:30 PM",
        title: "Return flight 5J 5757 to Manila (NAIA Terminal 3)",
        detail: "Flight 5J 5757 · Da Nang International Airport Terminal 2 → NAIA Terminal 3 (arrives 2:15 AM)",
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

function useAnimatedNumber(target: number, durationMs = 520): number {
  const [display, setDisplay] = useState(0);
  const currentRef = useRef(0);

  useEffect(() => {
    const safeTarget = Number.isFinite(target) ? target : 0;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      currentRef.current = safeTarget;
      setDisplay(safeTarget);
      return;
    }

    const startValue = currentRef.current;
    const diff = safeTarget - startValue;
    if (Math.abs(diff) < 0.005) {
      currentRef.current = safeTarget;
      setDisplay(safeTarget);
      return;
    }

    let rafId = 0;
    const startTime = performance.now();

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextVal = startValue + diff * eased;
      currentRef.current = nextVal;
      setDisplay(nextVal);
      if (progress < 1) {
        rafId = window.requestAnimationFrame(step);
      } else {
        currentRef.current = safeTarget;
        setDisplay(safeTarget);
      }
    }

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [target, durationMs]);

  return display;
}

function AnimatedVnd({ amount }: { amount: number }) {
  const animated = useAnimatedNumber(amount);
  return <span className="tabular-nums">{formatVnd(animated)}</span>;
}

function AnimatedPhp({ amount }: { amount: number }) {
  const animated = useAnimatedNumber(amount);
  return <span className="tabular-nums">{formatPhp(animated)}</span>;
}

function AnimatedExpenseAmount({
  amount,
  isPeso,
  vndPerPhp,
}: {
  amount: number;
  isPeso: boolean;
  vndPerPhp: number;
}) {
  const animatedAmount = useAnimatedNumber(amount);
  const animatedPhp = useAnimatedNumber(toPhp(amount, isPeso, vndPerPhp));
  if (isPeso) {
    return <span className="tabular-nums">{formatPhp(animatedAmount)}</span>;
  }
  return (
    <span className="tabular-nums">
      {formatVnd(animatedAmount)} ({formatPhp(animatedPhp)})
    </span>
  );
}

function AnimatedCurrencyTotal({
  amountVnd,
  amountPhp,
  allPeso,
}: {
  amountVnd: number;
  amountPhp: number;
  allPeso: boolean;
}) {
  const animatedVnd = useAnimatedNumber(amountVnd);
  const animatedPhp = useAnimatedNumber(amountPhp);
  if (allPeso) {
    return <span className="tabular-nums">{formatPhp(animatedPhp)}</span>;
  }
  return (
    <span className="tabular-nums">
      {formatVnd(animatedVnd)} ({formatPhp(animatedPhp)})
    </span>
  );
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
  const [loaded, setLoaded] = useState(false);
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-bold text-[#451a03] ${sizeClass} ${borderClass}`}
      style={{ backgroundColor: color ?? "#fcd34d" }}
      title={name}
    >
      {avatarUrl ? (
        <>
          {!loaded && <span className="animate-shimmer absolute inset-0" />}
          <img
            src={avatarUrl}
            alt={name}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className={`size-full object-cover transition-all duration-300 ${
              loaded ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
          />
        </>
      ) : (
        getPersonInitial(name)
      )}
    </span>
  );
}

function AvatarStack({
  people,
  size = "normal",
  onSelectPerson,
}: {
  people: Participant[];
  size?: "normal" | "small";
  onSelectPerson?: (person: Participant) => void;
}) {
  return (
    <div className="flex items-center" aria-label={`${people.length} trip members`}>
      {people.slice(0, 7).map((person, index) => {
        const avatarUrl = getPersonAvatarUrl(person.name);
        return (
          <button
            type="button"
            key={person.id}
            onClick={(event) => {
              event.stopPropagation();
              onSelectPerson?.(person);
            }}
            className={`relative grid place-items-center overflow-hidden rounded-full border-2 border-[#fffaf3] font-semibold text-[#451a03] shadow-sm transition duration-200 hover:z-20 hover:scale-110 ${
              size === "small" ? "size-7 text-[9px]" : "size-9 text-[10px]"
            } ${index ? "-ml-2" : ""}`}
            style={{ backgroundColor: person.color, zIndex: 10 - index }}
            title={`View ${person.name}'s profile`}
            aria-label={`View ${person.name}'s profile`}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={person.name}
                loading="lazy"
                className="size-full object-cover transition-transform duration-300"
              />
            ) : (
              getPersonInitial(person.name)
            )}
          </button>
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
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#e11d2a]">
        {eyebrow}
      </p>
      <h1 className="text-[clamp(1.7rem,4vw,2.4rem)] font-bold tracking-[-0.045em] text-[#153eb5]">
        {title}
      </h1>
      {detail && <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5c4b32]">{detail}</p>}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  caption,
  tone = "dark",
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  caption: ReactNode;
  tone?: "dark" | "light";
  onClick?: () => void;
}) {
  const isDark = tone === "dark";
  const cardClasses = `animate-fade-up w-full rounded-[22px] border-2 p-5 text-left transition duration-200 ${
    isDark
      ? "border-[#facc15]/60 bg-gradient-to-br from-[#153eb5] via-[#1d4ed8] to-[#e11d2a] text-white shadow-md"
      : "border-[#dcc294] bg-[#fffcf5] shadow-xs"
  } ${onClick ? "cursor-pointer hover:-translate-y-0.5 hover:border-[#1d4ed8] hover:shadow-md" : ""}`;

  const content = (
    <>
      <div className="mb-5 flex items-center justify-between">
        <span className={`text-xs font-semibold ${isDark ? "text-[#fde047]" : "text-[#5c4b32]"}`}>
          {label}
        </span>
        <span
          className={`grid size-9 place-items-center rounded-full ${
            isDark
              ? "bg-[#facc15]/25 text-[#fde047] ring-1 ring-[#fde047]/40"
              : "bg-[#dbeafe] text-[#1d4ed8] ring-1 ring-[#1d4ed8]/20"
          }`}
        >
          <Icon size={17} strokeWidth={1.8} />
        </span>
      </div>
      <p
        className={`text-[clamp(1.35rem,3vw,1.8rem)] font-bold tracking-[-0.04em] ${
          isDark ? "text-[#fffbeb]" : "text-[#153eb5]"
        }`}
      >
        {value}
      </p>
      <p className={`mt-1.5 text-xs ${isDark ? "text-[#fef08a]/85" : "text-[#786242]"}`}>
        {caption}
      </p>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cardClasses}>
        {content}
      </button>
    );
  }

  return <div className={cardClasses}>{content}</div>;
}

type ModalStackEntry = {
  id: number;
  close: () => void;
};

const activeModalStack: ModalStackEntry[] = [];
let pushedHistoryDepth = 0;
let ignoreNextPopStates = 0;
let historySyncTimer: number | null = null;
let globalListenersAttached = false;
let nextModalId = 1;

function ensureGlobalModalListeners() {
  if (globalListenersAttached || typeof window === "undefined") return;
  globalListenersAttached = true;

  window.addEventListener("popstate", () => {
    if (ignoreNextPopStates > 0) {
      ignoreNextPopStates -= 1;
      return;
    }
    if (activeModalStack.length > 0) {
      if (pushedHistoryDepth > 0) {
        pushedHistoryDepth -= 1;
      }
      const top = activeModalStack[activeModalStack.length - 1];
      top.close();
    }
  });

  window.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Escape" && activeModalStack.length > 0) {
      const top = activeModalStack[activeModalStack.length - 1];
      top.close();
    }
  });
}

function scheduleModalHistorySync() {
  if (typeof window === "undefined") return;
  if (historySyncTimer !== null) {
    window.clearTimeout(historySyncTimer);
  }
  historySyncTimer = window.setTimeout(() => {
    historySyncTimer = null;
    const targetDepth = activeModalStack.length;
    while (pushedHistoryDepth < targetDepth) {
      pushedHistoryDepth += 1;
      window.history.pushState(
        { ...(window.history.state ?? {}), __agyModalDepth: pushedHistoryDepth },
        "",
      );
    }
    while (pushedHistoryDepth > targetDepth) {
      pushedHistoryDepth -= 1;
      ignoreNextPopStates += 1;
      window.history.back();
    }
    document.body.style.overflow = targetDepth > 0 ? "hidden" : "";
  }, 35);
}

function useModalBackHandler(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    ensureGlobalModalListeners();

    const entryId = nextModalId++;
    const entry: ModalStackEntry = {
      id: entryId,
      close: () => onCloseRef.current(),
    };
    activeModalStack.push(entry);
    scheduleModalHistorySync();

    return () => {
      const idx = activeModalStack.findIndex((item) => item.id === entryId);
      if (idx !== -1) {
        activeModalStack.splice(idx, 1);
      }
      scheduleModalHistorySync();
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
      className="animate-backdrop-in fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div className="animate-modal-in flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[26px] border-2 border-[#dcc294] bg-[#fffcf5] shadow-2xl sm:max-h-[88dvh] sm:rounded-[26px]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#dcc294] bg-[#f8edd7] px-5 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#e11d2a]">
              {eyebrow}
            </p>
            <h2 className="mt-0.5 text-base font-bold tracking-[-0.02em] text-[#153eb5] sm:text-lg">
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#dcc294] bg-white px-3.5 text-xs font-semibold text-[#153eb5] transition hover:bg-[#fef08a]"
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
            Pakigawa kunde papasok ka sa confession room.
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#422006]">
            Tasks ni koya
          </h2>
          <p className="mt-1 text-xs text-[#854d0e]">
            Shared tasks and reminders · assigning people is optional, and both todos and individual assignments can be marked done. Click on a name to mark done.
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

const DEFAULT_NOMINATION_DATES = [
  "2026-11-24",
  "2026-11-25",
  "2026-11-26",
  "2026-11-27",
  "2026-11-28",
  "2026-11-29",
];

const NOMINATION_POINT_OPTIONS = [1, 2, 3] as const;

const HOUSE_UPLOAD_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSc0n169dR0qrKGT92IUyCQTTb2MTuJL8kHLZxKIlqmN-eGLvQ/viewform";
const HOUSE_UPLOAD_FORM_EMBED_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSc0n169dR0qrKGT92IUyCQTTb2MTuJL8kHLZxKIlqmN-eGLvQ/viewform?embedded=true";
const HOUSE_DRIVE_FOLDER_ID =
  "1JXnRissSMKqsgjp9Sdz8zkOsUsN1k64XaEBzjSCXHYlY9m8FcY90a4q9DJSRYw5cvNzt41Nb";
const HOUSE_DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${HOUSE_DRIVE_FOLDER_ID}?usp=sharing`;

function HouseFilesPanel() {
  const [driveLayout, setDriveLayout] = useState<"grid" | "list">("grid");
  const [showEmbeddedForm, setShowEmbeddedForm] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const embeddedDriveUrl = `https://drive.google.com/embeddedfolderview?id=${HOUSE_DRIVE_FOLDER_ID}#${driveLayout}`;

  return (
    <section
      id="house-files"
      className="animate-fade-up overflow-hidden rounded-[26px] border-2 border-[#dcc294] bg-[#fffcf5] p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#dcc294] pb-4">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#e11d2a]">
            <FolderOpen size={13} />
            The House Vault · Shared Files & Photos
          </p>
          <h2 className="mt-1 text-xl font-extrabold tracking-[-0.03em] text-[#153eb5] sm:text-2xl">
            Upload & View Trip Files
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[#5c4b32] sm:text-sm">
            Upload tickets, receipts, photos, or documents through our Google Form and browse all uploaded files directly from our shared Google Drive folder below.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={HOUSE_UPLOAD_FORM_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border-2 border-[#facc15] bg-gradient-to-r from-[#e11d2a] to-[#b91c1c] px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-[#fde047] no-underline shadow-sm transition hover:brightness-110"
          >
            <Upload size={14} />
            Upload Files (Google Form)
            <ExternalLink size={12} />
          </a>
          <button
            type="button"
            onClick={() => setShowEmbeddedForm((current) => !current)}
            aria-expanded={showEmbeddedForm}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#dcc294] bg-[#f8edd7] px-3.5 py-2 text-xs font-bold text-[#153eb5] transition hover:bg-[#f1dfc0]"
          >
            <Upload size={13} />
            {showEmbeddedForm ? "Hide Inline Form" : "Embed Form Here"}
          </button>
          <a
            href={HOUSE_DRIVE_FOLDER_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#1d4ed8]/30 bg-[#eff6ff] px-3.5 py-2 text-xs font-bold text-[#153eb5] no-underline transition hover:bg-[#dbeafe]"
          >
            <FolderOpen size={14} />
            Open Drive Folder
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {showEmbeddedForm && (
        <div className="mt-5 rounded-2xl border-2 border-[#1d4ed8]/30 bg-[#f8edd7]/60 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-[#153eb5]">
                Google Form File Uploader
              </p>
              <p className="text-[11px] text-[#5c4b32]">
                Note: Because Google Forms file upload questions require Google Account sign-in, if the form below prompts you to open in a new window, tap{" "}
                <a
                  href={HOUSE_UPLOAD_FORM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[#e11d2a] underline"
                >
                  Upload Files (Google Form)
                </a>{" "}
                above.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowEmbeddedForm(false)}
              className="inline-flex min-h-8 items-center gap-1 rounded-full border border-[#dcc294] bg-white px-3 text-xs font-semibold text-[#5c4b32] hover:bg-[#fef08a]"
            >
              <X size={13} />
              Close Form
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-[#dcc294] bg-white">
            <iframe
              src={HOUSE_UPLOAD_FORM_EMBED_URL}
              title="House File Upload Google Form"
              className="h-[520px] w-full border-0"
              loading="lazy"
            />
          </div>
        </div>
      )}

      <div className="mt-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-full bg-[#1d4ed8] text-[#fde047]">
              <FolderOpen size={14} />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-[#172554]">
                Uploaded Files in Google Drive
              </h3>
              <p className="text-[11px] text-[#786242]">
                Click any file below to preview or download it from Google Drive
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="inline-flex rounded-full border border-[#dcc294] bg-[#f8edd7] p-0.5">
              <button
                type="button"
                onClick={() => setDriveLayout("grid")}
                aria-pressed={driveLayout === "grid"}
                className={`inline-flex min-h-8 items-center gap-1 rounded-full px-3 text-xs font-bold transition ${
                  driveLayout === "grid"
                    ? "bg-[#1d4ed8] text-[#fde047] shadow-2xs"
                    : "text-[#5c4b32] hover:text-[#153eb5]"
                }`}
              >
                <LayoutGrid size={13} />
                Grid
              </button>
              <button
                type="button"
                onClick={() => setDriveLayout("list")}
                aria-pressed={driveLayout === "list"}
                className={`inline-flex min-h-8 items-center gap-1 rounded-full px-3 text-xs font-bold transition ${
                  driveLayout === "list"
                    ? "bg-[#1d4ed8] text-[#fde047] shadow-2xs"
                    : "text-[#5c4b32] hover:text-[#153eb5]"
                }`}
              >
                <List size={13} />
                List
              </button>
            </div>

            <button
              type="button"
              onClick={() => setRefreshTick((t) => t + 1)}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[#dcc294] bg-white px-3 text-xs font-bold text-[#153eb5] transition hover:bg-[#f8edd7]"
              title="Refresh Google Drive folder view after uploading"
            >
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border-2 border-[#dcc294] bg-white shadow-inner">
          <iframe
            key={`${driveLayout}-${refreshTick}`}
            src={embeddedDriveUrl}
            title="Shared Google Drive Folder - Uploaded Trip Files"
            className="h-[420px] w-full border-0"
            loading="lazy"
            allow="autoplay"
          />
        </div>
      </div>
    </section>
  );
}

function InstallAppModal({
  isOpen,
  canPromptNative,
  onTriggerNativeInstall,
  onClose,
}: {
  isOpen: boolean;
  canPromptNative: boolean;
  onTriggerNativeInstall: () => void;
  onClose: () => void;
}) {
  return (
    <FormModal
      isOpen={isOpen}
      eyebrow="Add to Home Screen · Phone App"
      title="Install PBB 7.0 Vietnam on Your Phone"
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-2xl border-2 border-[#facc15] bg-gradient-to-r from-[#153eb5] via-[#1d4ed8] to-[#e11d2a] p-4 text-white">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-black/25 text-[#fde047] ring-1 ring-[#facc15]">
            <Smartphone size={22} />
          </span>
          <div>
            <p className="text-sm font-extrabold text-[#fffbeb]">
              Use our trip planner like a native mobile app
            </p>
            <p className="mt-1 text-xs leading-5 text-[#fef9c3]/90">
              Launch straight from your phone’s home screen in full-screen mode with quick access to The House, Nominations, Itinerary, Bookings, and Expenses.
            </p>
          </div>
        </div>

        {canPromptNative && (
          <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4">
            <p className="text-xs font-bold text-emerald-900">
              One-Tap Install Available
            </p>
            <p className="mt-1 text-xs text-emerald-800">
              Your browser supports direct app installation. Tap below to add the app to your phone now:
            </p>
            <button
              type="button"
              onClick={onTriggerNativeInstall}
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full bg-emerald-600 px-5 text-xs font-extrabold uppercase tracking-wider text-white shadow-xs transition hover:bg-emerald-700"
            >
              <Download size={15} />
              Install App Now
            </button>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border-2 border-[#dcc294] bg-[#f8edd7]/70 p-4">
            <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#153eb5]">
              <Share size={14} />
              iPhone & iPad (Safari)
            </p>
            <ol className="mt-2.5 list-decimal space-y-1.5 pl-4 text-xs leading-5 text-[#5c4b32]">
              <li>
                Open this page in <strong>Safari</strong>.
              </li>
              <li>
                Tap the <strong>Share</strong> button{" "}
                <span className="rounded bg-white px-1.5 py-0.5 font-semibold text-[#153eb5]">
                  ⍐
                </span>{" "}
                at the bottom of the screen.
              </li>
              <li>
                Scroll down and tap <strong>Add to Home Screen</strong>.
              </li>
              <li>
                Tap <strong>Add</strong> in the top-right corner.
              </li>
            </ol>
          </div>

          <div className="rounded-2xl border-2 border-[#dcc294] bg-[#f8edd7]/70 p-4">
            <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[#e11d2a]">
              <Download size={14} />
              Android (Chrome)
            </p>
            <ol className="mt-2.5 list-decimal space-y-1.5 pl-4 text-xs leading-5 text-[#5c4b32]">
              <li>
                Open this page in <strong>Chrome</strong>.
              </li>
              <li>
                Tap the <strong>⋮ menu</strong> in the top-right corner (or tap the install button above).
              </li>
              <li>
                Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.
              </li>
              <li>
                Confirm by tapping <strong>Install</strong>.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </FormModal>
  );
}

type NominationsPageTab = "board" | "cast";

function NominationsPage({
  people,
  nominationDays,
  nominations,
  revealVotes,
  revealStatus,
  isSaving,
  busyRevealKey,
  revealError,
  initialTab,
  onTabChange,
  onBackToHouse,
  onSaveNominations,
  onToggleRevealVote,
}: {
  people: Participant[];
  nominationDays: NominationDayRow[];
  nominations: NominationRow[];
  revealVotes: NominationRevealVoteRow[];
  revealStatus: NominationRevealStatusRow[];
  isSaving: boolean;
  busyRevealKey: string | null;
  revealError: string;
  initialTab: NominationsPageTab;
  onTabChange: (tab: NominationsPageTab) => void;
  onBackToHouse: () => void;
  onSaveNominations: (
    nominationDate: string,
    voterPersonId: string,
    entries: VoterNominationDraft[],
  ) => Promise<void>;
  onToggleRevealVote: (
    nominationDate: string,
    personId: string,
    shouldVote: boolean,
  ) => Promise<void>;
}) {
  const availableDays =
    nominationDays.length > 0
      ? nominationDays
      : DEFAULT_NOMINATION_DATES.map((d) => ({
          nomination_date: d,
        }));

  const [selectedDate, setSelectedDate] = useState(
    availableDays[0]?.nomination_date ?? "2026-11-24",
  );
  const [focusedNomineeId, setFocusedNomineeId] = useState<string>("all");
  const [expandedGrandPersonId, setExpandedGrandPersonId] = useState<string | null>(null);
  const [voterId, setVoterId] = useState("");
  const [nomineeDrafts, setNomineeDrafts] = useState<
    Record<string, { points: number; comment: string }>
  >({});
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");

  const activeVoterId = people.some((p) => p.id === voterId) ? voterId : "";

  useEffect(() => {
    if (!activeVoterId || !selectedDate) {
      setNomineeDrafts({});
      return;
    }
    const existingForVoterAndDay = nominations.filter(
      (n) => n.nomination_date === selectedDate && n.voter_person_id === activeVoterId,
    );
    const nextDrafts: Record<string, { points: number; comment: string }> = {};
    for (const row of existingForVoterAndDay) {
      nextDrafts[row.nominee_person_id] = {
        points: row.points > 0 ? row.points : 1,
        comment: row.comment ?? "",
      };
    }
    setNomineeDrafts(nextDrafts);
    setError("");
  }, [activeVoterId, selectedDate, nominations]);

  function getDayRevealInfo(nominationDate: string) {
    const statusRow = revealStatus.find((s) => s.nomination_date === nominationDate);
    const votesForDay = revealVotes.filter((v) => v.nomination_date === nominationDate);
    const totalPeople = statusRow ? statusRow.total_people : people.length;
    const revealVoteCount = statusRow ? statusRow.reveal_votes : votesForDay.length;
    const isRevealed = statusRow
      ? Boolean(statusRow.is_revealed)
      : totalPeople > 0 && votesForDay.length >= totalPeople;
    return {
      totalPeople,
      revealVoteCount,
      isRevealed,
      voterIds: new Set(votesForDay.map((v) => v.person_id)),
    };
  }

  function toggleNominee(personId: string) {
    if (!activeVoterId || personId === activeVoterId) return;
    setError("");
    setStatusMessage("");
    setNomineeDrafts((current) => {
      if (current[personId]) {
        const copy = { ...current };
        delete copy[personId];
        return copy;
      }
      return {
        ...current,
        [personId]: { points: 1, comment: "" },
      };
    });
  }

  function setNomineePoints(personId: string, points: number) {
    if (!activeVoterId || personId === activeVoterId) return;
    setError("");
    setStatusMessage("");
    setNomineeDrafts((current) => ({
      ...current,
      [personId]: {
        points,
        comment: current[personId]?.comment ?? "",
      },
    }));
  }

  function setNomineeComment(personId: string, comment: string) {
    if (!activeVoterId || personId === activeVoterId) return;
    setError("");
    setStatusMessage("");
    setNomineeDrafts((current) => ({
      ...current,
      [personId]: {
        points: current[personId]?.points ?? 1,
        comment,
      },
    }));
  }

  const selectedEntries: VoterNominationDraft[] = Object.entries(nomineeDrafts)
    .filter(([personId]) => personId !== activeVoterId)
    .map(([nomineePersonId, value]) => ({
      nomineePersonId,
      points: value.points,
      comment: value.comment.trim() || null,
    }));

  const selectedPointsSum = selectedEntries.reduce((sum, item) => sum + item.points, 0);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatusMessage("");
    if (!activeVoterId) {
      setError("Select your profile first to enter the Confession Room.");
      return;
    }
    try {
      await onSaveNominations(selectedDate, activeVoterId, selectedEntries);
      const voterName = people.find((p) => p.id === activeVoterId)?.name ?? "Housemate";
      setStatusMessage(
        selectedEntries.length === 0
          ? `Cleared ${voterName}'s nominations for ${formatTripDate(selectedDate)}.`
          : `Saved ${voterName}'s ${selectedEntries.length} nomination${selectedEntries.length === 1 ? "" : "s"} (${selectedPointsSum} pt${selectedPointsSum === 1 ? "" : "s"}) for ${formatTripDate(selectedDate)}!`,
      );
    } catch (saveErr) {
      setError(
        saveErr instanceof Error ? saveErr.message : "Could not save nominations.",
      );
    }
  }

  const selectedDayInfo = getDayRevealInfo(selectedDate);
  const selectedDayNominations = nominations.filter((n) => n.nomination_date === selectedDate);
  const selectedDayTotalPoints = selectedDayNominations.reduce(
    (sum, n) => sum + (n.points ?? 1),
    0,
  );

  // Anonymous daily tally: sort votes received by points descending, without exposing voter identity
  const selectedDayTally = people
    .map((person) => {
      const votesReceived = selectedDayNominations.filter(
        (n) => n.nominee_person_id === person.id,
      );
      const totalPoints = votesReceived.reduce((sum, v) => sum + (v.points ?? 1), 0);
      const anonymousVotes = [...votesReceived]
        .sort((a, b) => (b.points ?? 1) - (a.points ?? 1))
        .map((v, idx) => ({
          id: v.id,
          ballotNumber: idx + 1,
          points: v.points ?? 1,
          comment: v.comment,
        }));
      return {
        person,
        totalPoints,
        voteCount: votesReceived.length,
        anonymousVotes,
      };
    })
    .sort(
      (a, b) =>
        b.totalPoints - a.totalPoints ||
        b.voteCount - a.voteCount ||
        a.person.name.localeCompare(b.person.name),
    );

  const filteredDayTally =
    focusedNomineeId === "all"
      ? selectedDayTally
      : selectedDayTally.filter((entry) => entry.person.id === focusedNomineeId);

  const revealedDateSet = new Set(
    availableDays
      .filter((day) => getDayRevealInfo(day.nomination_date).isRevealed)
      .map((day) => day.nomination_date),
  );
  const isAllDaysRevealed =
    availableDays.length > 0 && revealedDateSet.size === availableDays.length;

  const revealedNominations = nominations.filter((n) =>
    revealedDateSet.has(n.nomination_date),
  );
  const revealedTotalPoints = revealedNominations.reduce(
    (sum, n) => sum + (n.points ?? 1),
    0,
  );

  const grandTotalTally = people
    .map((person) => {
      const votesReceived = revealedNominations.filter(
        (n) => n.nominee_person_id === person.id,
      );
      const totalPoints = votesReceived.reduce((sum, v) => sum + (v.points ?? 1), 0);
      const anonymousAllDaysVotes = [...votesReceived]
        .sort(
          (a, b) =>
            a.nomination_date.localeCompare(b.nomination_date) ||
            (b.points ?? 1) - (a.points ?? 1),
        )
        .map((v) => ({
          id: v.id,
          nominationDate: v.nomination_date,
          points: v.points ?? 1,
          comment: v.comment,
        }));
      const byDay = availableDays.map((day, index) => {
        const isDayRevealed = revealedDateSet.has(day.nomination_date);
        const dayPoints = isDayRevealed
          ? votesReceived
              .filter((v) => v.nomination_date === day.nomination_date)
              .reduce((sum, v) => sum + (v.points ?? 1), 0)
          : null;
        return {
          nominationDate: day.nomination_date,
          dayNumber: index + 1,
          isDayRevealed,
          dayPoints,
        };
      });
      return {
        person,
        totalPoints,
        voteCount: votesReceived.length,
        anonymousAllDaysVotes,
        byDay,
      };
    })
    .sort(
      (a, b) =>
        b.totalPoints - a.totalPoints ||
        b.voteCount - a.voteCount ||
        a.person.name.localeCompare(b.person.name),
    );

  const existingVoterChoices = selectedDayNominations.filter(
    (n) => n.voter_person_id === activeVoterId,
  );

  return (
    <div className="space-y-6">
      {/* Top Hero Banner for Nominations Page */}
      <section className="relative overflow-hidden rounded-[28px] border-2 border-[#facc15] bg-gradient-to-r from-[#0f36a8] via-[#1d4ed8] to-[#e11d2a] px-5 py-6 text-white shadow-lg sm:px-8 sm:py-8">
        <div className="absolute -right-12 -top-24 size-64 rounded-full border-[36px] border-[#fde047]/15" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={onBackToHouse}
              className="mb-3 inline-flex min-h-8 items-center gap-1.5 rounded-full border border-[#fde047]/50 bg-black/25 px-3 text-xs font-bold text-[#fde047] transition hover:bg-black/40"
            >
              <ChevronLeft size={14} />
              Back to The House
            </button>
            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#fde047]">
              <Sparkles size={13} />
              Confession Room · Anonymous Eviction Tally
            </p>
            <h1 className="mt-1.5 text-[clamp(1.6rem,4vw,2.6rem)] font-extrabold tracking-[-0.04em] text-[#fffbeb]">
              Housemate Nominations Board
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#fef9c3]/90 sm:text-sm">
              View daily eviction tallies, anonymous nomination points, and reasons once all housemates vote to reveal a day—or step into the Confession Room to cast or edit your secret votes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#fde047]/40 bg-[#0b1942]/45 p-1.5 backdrop-blur-xs">
            <button
              type="button"
              onClick={() => onTabChange("board")}
              aria-pressed={initialTab === "board"}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-extrabold uppercase tracking-wider transition ${
                initialTab === "board"
                  ? "bg-[#facc15] text-[#172554] shadow-sm"
                  : "text-white hover:bg-white/10"
              }`}
            >
              <Trophy size={15} />
              Eviction Board & Tally
            </button>
            <button
              type="button"
              onClick={() => onTabChange("cast")}
              aria-pressed={initialTab === "cast"}
              className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-extrabold uppercase tracking-wider transition ${
                initialTab === "cast"
                  ? "bg-[#e11d2a] text-[#fde047] shadow-sm ring-2 ring-[#fde047]"
                  : "text-white hover:bg-white/10"
              }`}
            >
              <Flame size={15} />
              Confession Room (Vote)
            </button>
          </div>
        </div>
      </section>

      {/* Shared Day Selector Bar (Day 1 - Day 6) */}
      <section className="rounded-[24px] border-2 border-[#dcc294] bg-[#fffcf5] p-5 shadow-xs">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#e11d2a]">
              6 Nomination Days · Nov 24 – Nov 29, 2026
            </p>
            <h2 className="text-base font-bold text-[#153eb5]">
              Select Nomination Day
            </h2>
          </div>
          <span className="rounded-full border border-[#dcc294] bg-[#f8edd7] px-3 py-1 text-xs font-bold text-[#153eb5]">
            {revealedDateSet.size} of {availableDays.length} days revealed
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {availableDays.map((day, idx) => {
            const isSelected = day.nomination_date === selectedDate;
            const info = getDayRevealInfo(day.nomination_date);
            const dayRows = nominations.filter(
              (n) => n.nomination_date === day.nomination_date,
            );
            const dayPointsSum = dayRows.reduce((sum, n) => sum + (n.points ?? 1), 0);
            return (
              <button
                key={day.nomination_date}
                type="button"
                onClick={() => {
                  setSelectedDate(day.nomination_date);
                  setStatusMessage("");
                  setError("");
                }}
                aria-pressed={isSelected}
                className={`rounded-2xl border-2 p-3 text-left transition ${
                  isSelected
                    ? "border-[#facc15] bg-[#1d4ed8] text-[#fde047] shadow-md"
                    : info.isRevealed
                      ? "border-emerald-300 bg-emerald-50/70 text-[#172554] hover:bg-emerald-50"
                      : "border-[#dcc294] bg-[#f8edd7] text-[#5c4b32] hover:bg-[#f1dfc0]"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] opacity-85">
                    DAY {idx + 1}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      info.isRevealed
                        ? isSelected
                          ? "bg-emerald-400/25 text-emerald-200"
                          : "bg-emerald-600 text-white"
                        : isSelected
                          ? "bg-black/25 text-[#fde047]"
                          : "bg-[#e5cfa8] text-[#5c4b32]"
                    }`}
                  >
                    {info.isRevealed ? <Unlock size={10} /> : <Lock size={10} />}
                    {info.revealVoteCount}/{info.totalPeople}
                  </span>
                </div>
                <span className="mt-1.5 block text-sm font-extrabold">
                  {formatTripDate(day.nomination_date)}
                </span>
                <span
                  className={`mt-1 block text-[11px] font-semibold ${
                    isSelected
                      ? "text-white/90"
                      : info.isRevealed
                        ? "text-emerald-700"
                        : "text-[#786242]"
                  }`}
                >
                  {info.isRevealed
                    ? `${dayPointsSum} pt${dayPointsSum === 1 ? "" : "s"} · ${dayRows.length} vote${dayRows.length === 1 ? "" : "s"}`
                    : "Sealed · Vote to reveal"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {initialTab === "board" ? (
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
          {/* Left Column: Selected Day Reveal Consent + Anonymous Nominated Persons Votes & Reasons */}
          <div className="space-y-6">
            {/* Reveal Consent Card */}
            <section className="rounded-[24px] border-2 border-[#1d4ed8]/30 bg-gradient-to-br from-[#eff6ff] via-white to-[#fefce8] p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#1d4ed8]">
                    Unanimous Reveal Consent · {formatTripDate(selectedDate)}
                  </p>
                  <h3 className="mt-0.5 text-base font-bold text-[#172554]">
                    Vote to Reveal {formatTripDate(selectedDate)} Nominations
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-extrabold ${
                    selectedDayInfo.isRevealed
                      ? "bg-emerald-600 text-white"
                      : "bg-[#1d4ed8] text-[#fde047]"
                  }`}
                >
                  {selectedDayInfo.isRevealed ? <Eye size={14} /> : <EyeOff size={14} />}
                  {selectedDayInfo.revealVoteCount} / {selectedDayInfo.totalPeople} ready to reveal
                </span>
              </div>

              <p className="mt-1.5 text-xs text-[#5c4b32]">
                Tap your name when you are ready to reveal {formatTripDate(selectedDate)}’s nominations. Tap again anytime to withdraw your consent and re-lock the day. All voter identities remain anonymous even when revealed!
              </p>

              <div className="mt-3.5 flex flex-wrap gap-2">
                {people.map((person) => {
                  const hasVoted = selectedDayInfo.voterIds.has(person.id);
                  const busyKey = `${selectedDate}:${person.id}`;
                  const isBusy = busyRevealKey === busyKey;
                  return (
                    <button
                      key={person.id}
                      type="button"
                      disabled={isBusy}
                      aria-pressed={hasVoted}
                      onClick={() =>
                        void onToggleRevealVote(selectedDate, person.id, !hasVoted)
                      }
                      className={`flex min-h-10 items-center gap-2 rounded-full border-2 px-3.5 py-1.5 text-xs font-bold transition disabled:opacity-55 ${
                        hasVoted
                          ? "border-emerald-600 bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                          : "border-[#dcc294] bg-white text-[#172554] hover:border-[#1d4ed8] hover:bg-[#f8edd7]"
                      }`}
                    >
                      <PersonAvatar
                        name={person.name}
                        color={person.color}
                        sizeClass="size-5 text-[9px]"
                      />
                      <span>{person.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                          hasVoted
                            ? "bg-black/20 text-[#fde047]"
                            : "bg-[#f8edd7] text-[#786242]"
                        }`}
                      >
                        {isBusy ? "…" : hasVoted ? "Ready · Withdraw" : "Vote Reveal"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {revealError && (
                <p
                  role="alert"
                  className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700"
                >
                  {revealError}
                </p>
              )}
            </section>

            {/* Selected Day Nominated Housemates Votes & Anonymous Reasons */}
            <section className="rounded-[24px] border-2 border-[#dcc294] bg-[#fffcf5] p-5 shadow-xs">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#e11d2a]">
                    Daily Anonymous Eviction Tally · {formatTripDate(selectedDate)}
                  </p>
                  <h3 className="mt-0.5 text-lg font-extrabold text-[#153eb5]">
                    {selectedDayInfo.isRevealed
                      ? `Nominated Housemates, Points & Reasons (${selectedDayTotalPoints} total pt${selectedDayTotalPoints === 1 ? "" : "s"})`
                      : `Nominations Locked for ${formatTripDate(selectedDate)}`}
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${
                    selectedDayInfo.isRevealed
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-[#fee2e2] text-[#991b1b]"
                  }`}
                >
                  {selectedDayInfo.isRevealed ? (
                    <>
                      <Unlock size={13} />
                      Revealed · Voters Hidden
                    </>
                  ) : (
                    <>
                      <Lock size={13} />
                      Locked ({selectedDayInfo.revealVoteCount}/{selectedDayInfo.totalPeople})
                    </>
                  )}
                </span>
              </div>

              {selectedDayInfo.isRevealed ? (
                <>
                  {/* Filter pills to inspect all or a specific nominated housemate's votes & reasons */}
                  <div className="mb-4 flex flex-wrap items-center gap-1.5 border-b border-[#dcc294] pb-3">
                    <button
                      type="button"
                      onClick={() => setFocusedNomineeId("all")}
                      aria-pressed={focusedNomineeId === "all"}
                      className={`min-h-8 rounded-full px-3 py-1 text-xs font-bold transition ${
                        focusedNomineeId === "all"
                          ? "bg-[#1d4ed8] text-[#fde047] shadow-xs"
                          : "border border-[#dcc294] bg-[#f8edd7] text-[#5c4b32] hover:bg-[#f1dfc0]"
                      }`}
                    >
                      All Housemates ({people.length})
                    </button>
                    {selectedDayTally.map(({ person, totalPoints }) => (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => setFocusedNomineeId(person.id)}
                        aria-pressed={focusedNomineeId === person.id}
                        className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition ${
                          focusedNomineeId === person.id
                            ? "bg-[#e11d2a] text-[#fde047] shadow-xs"
                            : totalPoints > 0
                              ? "border border-[#e11d2a]/40 bg-[#fff5f5] text-[#991b1b] hover:bg-[#fee2e2]"
                              : "border border-[#dcc294] bg-white text-[#786242] hover:bg-[#f8edd7]"
                        }`}
                      >
                        <span>{person.name}</span>
                        <span className="rounded-full bg-black/10 px-1.5 py-0.2 text-[10px]">
                          {totalPoints}pt
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3.5">
                    {filteredDayTally.map(({ person, totalPoints, voteCount, anonymousVotes }) => {
                      const rankIndex = selectedDayTally.findIndex(
                        (item) => item.person.id === person.id,
                      );
                      return (
                        <article
                          key={person.id}
                          className={`rounded-2xl border-2 p-4 transition ${
                            totalPoints > 0
                              ? "border-[#e11d2a]/45 bg-gradient-to-br from-[#fff5f5] via-white to-[#fefce8] shadow-xs"
                              : "border-[#e8d7b5] bg-white"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <span
                                className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-extrabold ${
                                  totalPoints > 0
                                    ? "bg-[#e11d2a] text-[#fde047]"
                                    : "bg-[#f8edd7] text-[#786242]"
                                }`}
                              >
                                #{rankIndex + 1}
                              </span>
                              <PersonAvatar
                                name={person.name}
                                color={person.color}
                                sizeClass="size-10 text-xs"
                                borderClass={
                                  totalPoints > 0
                                    ? "border-2 border-[#e11d2a]"
                                    : "border border-[#dcc294]"
                                }
                              />
                              <div className="min-w-0">
                                <h4 className="truncate text-base font-extrabold text-[#172554]">
                                  {person.name}
                                </h4>
                                <p className="text-xs font-medium text-[#786242]">
                                  {voteCount > 0
                                    ? `Received ${voteCount} anonymous nomination${voteCount === 1 ? "" : "s"}`
                                    : "0 nominations received on this day"}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full px-3.5 py-1 text-sm font-black ${
                                  totalPoints > 0
                                    ? "bg-[#e11d2a] text-[#fde047] shadow-xs ring-2 ring-[#facc15]"
                                    : "bg-[#f8edd7] text-[#786242]"
                                }`}
                              >
                                {totalPoints} pt{totalPoints === 1 ? "" : "s"}
                              </span>
                            </div>
                          </div>

                          {anonymousVotes.length > 0 && (
                            <div className="mt-3.5 border-t border-[#e11d2a]/20 pt-3">
                              <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#991b1b]">
                                Anonymous Votes & Reasons for {person.name}
                              </p>
                              <ul className="space-y-2">
                                {anonymousVotes.map((vote) => (
                                  <li
                                    key={vote.id}
                                    className="rounded-xl border border-[#dcc294] bg-white p-3 shadow-2xs"
                                  >
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#153eb5]">
                                        <span className="grid size-5 place-items-center rounded-full bg-[#1d4ed8]/10 text-[#1d4ed8]">
                                          <EyeOff size={11} />
                                        </span>
                                        Anonymous Housemate · Ballot #{vote.ballotNumber}
                                      </span>
                                      <span
                                        className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                                          vote.points >= 3
                                            ? "bg-[#e11d2a] text-[#fde047]"
                                            : vote.points === 2
                                              ? "bg-[#f59e0b] text-[#172554]"
                                              : "bg-[#1d4ed8] text-white"
                                        }`}
                                      >
                                        +{vote.points} pt{vote.points === 1 ? "" : "s"}
                                      </span>
                                    </div>
                                    {vote.comment ? (
                                      <p className="mt-2 rounded-lg bg-[#fffcf5] px-3 py-2 text-xs leading-5 text-[#172554] italic border border-[#e8d7b5]">
                                        “{vote.comment}”
                                      </p>
                                    ) : (
                                      <p className="mt-1.5 text-[11px] italic text-[#9c8462]">
                                        No reason written.
                                      </p>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#dcc294] bg-[#f8edd7]/55 px-6 py-12 text-center">
                  <span className="grid size-14 place-items-center rounded-full bg-[#1d4ed8]/10 text-[#1d4ed8]">
                    <Lock size={26} />
                  </span>
                  <p className="mt-3 text-base font-extrabold text-[#172554]">
                    {formatTripDate(selectedDate)} Nominations Are Still Sealed
                  </p>
                  <p className="mt-1.5 max-w-md text-xs leading-5 text-[#786242]">
                    {selectedDayInfo.revealVoteCount} of {selectedDayInfo.totalPeople} housemates have voted to reveal this day. Once all {selectedDayInfo.totalPeople} housemates tap their name above, each nominee’s points and anonymous reasons will appear here!
                  </p>
                  <button
                    type="button"
                    onClick={() => onTabChange("cast")}
                    className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-[#e11d2a] px-5 text-xs font-extrabold uppercase tracking-wider text-[#fde047] shadow-xs ring-2 ring-[#facc15] transition hover:brightness-110"
                  >
                    <Flame size={14} />
                    Go to Confession Room to Cast Votes
                  </button>
                </div>
              )}
            </section>
          </div>

          {/* Right Column: Grand Total Eviction Leaderboard Across All Days (Shown ONLY when all days are revealed) */}
          <aside className="space-y-6">
            <section className="rounded-[24px] border-2 border-[#facc15] bg-gradient-to-br from-[#153eb5] via-[#1d4ed8] to-[#991b1b] p-5 text-white shadow-lg">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#fde047]">
                    <Trophy size={13} />
                    All 6 Days · Eviction Leaderboard
                  </p>
                  <h3 className="mt-0.5 text-lg font-extrabold text-white">
                    {isAllDaysRevealed
                      ? `Grand Total (${revealedTotalPoints} pt${revealedTotalPoints === 1 ? "" : "s"})`
                      : "Grand Total Locked"}
                  </h3>
                </div>
                <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-bold text-[#fde047]">
                  {revealedDateSet.size}/{availableDays.length} days unlocked
                </span>
              </div>

              {isAllDaysRevealed ? (
                <>
                  <p className="mb-4 text-xs text-[#fef9c3]/90">
                    All {availableDays.length} days are revealed! Tap a housemate to view all their anonymous votes & reasons across the trip.
                  </p>

                  <div className="space-y-2.5">
                    {grandTotalTally.map(
                      ({ person, totalPoints, voteCount, anonymousAllDaysVotes, byDay }, index) => {
                        const isExpanded = expandedGrandPersonId === person.id;
                        return (
                          <div
                            key={person.id}
                            className="rounded-2xl border border-white/20 bg-white/95 p-3.5 text-xs text-[#172554] shadow-xs"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2.5">
                                <span
                                  className={`grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-extrabold ${
                                    index === 0 && totalPoints > 0
                                      ? "bg-[#e11d2a] text-[#fde047]"
                                      : "bg-[#f8edd7] text-[#153eb5]"
                                  }`}
                                >
                                  #{index + 1}
                                </span>
                                <PersonAvatar
                                  name={person.name}
                                  color={person.color}
                                  sizeClass="size-8 text-[10px]"
                                />
                                <div className="min-w-0">
                                  <span className="block truncate text-sm font-extrabold">
                                    {person.name}
                                  </span>
                                  <span className="block text-[10px] text-[#786242]">
                                    {voteCount} anonymous vote{voteCount === 1 ? "" : "s"}
                                  </span>
                                </div>
                              </div>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-black ${
                                  totalPoints > 0
                                    ? "bg-[#e11d2a] text-[#fde047]"
                                    : "bg-[#f8edd7] text-[#786242]"
                                }`}
                              >
                                {totalPoints} total pt{totalPoints === 1 ? "" : "s"}
                              </span>
                            </div>

                            <div className="mt-2.5 grid grid-cols-6 gap-1">
                              {byDay.map((d) => (
                                <button
                                  key={d.nominationDate}
                                  type="button"
                                  onClick={() => setSelectedDate(d.nominationDate)}
                                  className={`rounded-lg px-1.5 py-1 text-center text-[10px] transition ${
                                    d.dayPoints && d.dayPoints > 0
                                      ? "bg-[#fee2e2] font-bold text-[#991b1b] hover:bg-[#fecaca]"
                                      : "bg-[#f8edd7] text-[#5c4b32] hover:bg-[#f1dfc0]"
                                  }`}
                                  title={`${formatTripDate(d.nominationDate)}: ${d.dayPoints} pt(s)`}
                                >
                                  <span className="block text-[8px] font-bold uppercase opacity-75">
                                    D{d.dayNumber}
                                  </span>
                                  <span>{d.dayPoints}pt</span>
                                </button>
                              ))}
                            </div>

                            {anonymousAllDaysVotes.length > 0 && (
                              <div className="mt-2.5 border-t border-[#e8d7b5] pt-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedGrandPersonId(isExpanded ? null : person.id)
                                  }
                                  className="flex w-full items-center justify-between text-[11px] font-bold text-[#153eb5] hover:underline"
                                >
                                  <span>
                                    {isExpanded ? "Hide" : "View"} all {anonymousAllDaysVotes.length} vote
                                    {anonymousAllDaysVotes.length === 1 ? "" : "s"} & reasons
                                  </span>
                                  <ChevronDown
                                    size={14}
                                    className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                  />
                                </button>

                                {isExpanded && (
                                  <ul className="mt-2 space-y-1.5">
                                    {anonymousAllDaysVotes.map((v) => (
                                      <li
                                        key={v.id}
                                        className="rounded-lg border border-[#dcc294] bg-[#fffcf5] px-2.5 py-2"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-[10px] font-bold text-[#786242]">
                                            {formatTripDate(v.nominationDate)} · Anonymous
                                          </span>
                                          <span className="rounded-full bg-[#fee2e2] px-2 py-0.5 text-[10px] font-extrabold text-[#991b1b]">
                                            +{v.points} pt{v.points === 1 ? "" : "s"}
                                          </span>
                                        </div>
                                        {v.comment ? (
                                          <p className="mt-1 text-[11px] italic text-[#172554]">
                                            “{v.comment}”
                                          </p>
                                        ) : (
                                          <p className="mt-1 text-[10px] italic text-[#9c8462]">
                                            No reason written.
                                          </p>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      },
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#fde047]/45 bg-[#0b1942]/40 px-5 py-10 text-center">
                  <span className="grid size-12 place-items-center rounded-full bg-[#fde047]/15 text-[#fde047]">
                    <Lock size={22} />
                  </span>
                  <p className="mt-3 text-sm font-extrabold text-[#fffbeb]">
                    Grand Tally Is Hidden Until All {availableDays.length} Days Are Revealed
                  </p>
                  <p className="mt-1.5 text-xs leading-5 text-[#fef9c3]/85">
                    Currently {revealedDateSet.size} of {availableDays.length} days have been unlocked. Once every housemate votes to reveal all {availableDays.length} days (Nov 24–29), the overall Grand Total Eviction Leaderboard will unlock here!
                  </p>
                </div>
              )}
            </section>
          </aside>
        </div>
      ) : (
        /* Confession Room Tab: Cast or Edit Anonymous Nominations */
        <section className="rounded-[24px] border-2 border-[#dcc294] bg-[#fffcf5] p-5 shadow-xs sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#dcc294] pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#e11d2a]">
                Confession Room · Secret Ballot ({formatTripDate(selectedDate)})
              </p>
              <h2 className="mt-0.5 text-lg font-extrabold text-[#153eb5]">
                Cast or Edit Your Nominations
              </h2>
              <p className="mt-1 text-xs text-[#5c4b32]">
                Your identity is hidden on the Eviction Board. Only the points and reasons you submit will be shown once the day is revealed.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onTabChange("board")}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#1d4ed8] bg-[#1d4ed8] px-4 text-xs font-bold text-[#fde047] transition hover:bg-[#153eb5]"
            >
              <Eye size={14} />
              View Eviction Board & Tally
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#153eb5]">
                  1. Who is entering the Confession Room?
                </span>
                {activeVoterId && (
                  <button
                    type="button"
                    onClick={() => {
                      setVoterId("");
                      setNomineeDrafts({});
                      setStatusMessage("");
                      setError("");
                    }}
                    className="text-xs font-semibold text-[#e11d2a] hover:underline"
                  >
                    Lock / Switch voter
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {people.map((person) => {
                  const isVoter = person.id === activeVoterId;
                  return (
                    <button
                      key={person.id}
                      type="button"
                      aria-pressed={isVoter}
                      onClick={() => {
                        setVoterId(person.id);
                        setStatusMessage("");
                        setError("");
                      }}
                      className={`flex min-h-10 items-center gap-2 rounded-full border-2 px-3.5 py-1.5 text-xs font-bold transition ${
                        isVoter
                          ? "border-[#facc15] bg-[#1d4ed8] text-[#fde047] shadow-sm"
                          : "border-[#dcc294] bg-white text-[#5c4b32] hover:bg-[#f8edd7]"
                      }`}
                    >
                      <PersonAvatar
                        name={person.name}
                        color={person.color}
                        sizeClass="size-5 text-[9px]"
                      />
                      <span>{person.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {!activeVoterId ? (
              <div className="rounded-2xl border-2 border-dashed border-[#dcc294] bg-[#f8edd7]/50 px-5 py-10 text-center">
                <p className="text-sm font-bold text-[#153eb5]">
                  Tap your name above to enter the Confession Room
                </p>
                <p className="mt-1 text-xs text-[#786242]">
                  To keep everyone’s ballot private, select your own profile before viewing or editing your nominations for {formatTripDate(selectedDate)}.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-[#e11d2a]/35 bg-gradient-to-br from-[#fff5f5] via-white to-[#fefce8] p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#e11d2a]">
                      2. Nominate Housemates & Assign 1, 2, or 3 Points ({formatTripDate(selectedDate)})
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#5c4b32]">
                      {existingVoterChoices.length > 0
                        ? "Editing your saved nominations for this day. Pick any number of housemates, choose 1, 2, or 3 points, and add your optional reason."
                        : "Nominate any number of housemates, assign 1, 2, or 3 points each, and write an optional reason."}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#e11d2a] px-3.5 py-1 text-xs font-bold text-[#fde047]">
                    {selectedEntries.length} nominated · {selectedPointsSum} pt
                    {selectedPointsSum === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {people
                    .filter((person) => person.id !== activeVoterId)
                    .map((person) => {
                      const draft = nomineeDrafts[person.id];
                      const isNominated = Boolean(draft);
                      return (
                        <div
                          key={person.id}
                          className={`rounded-2xl border-2 p-3.5 transition ${
                            isNominated
                              ? "border-[#e11d2a] bg-[#fff5f5] shadow-xs"
                              : "border-[#dcc294] bg-white hover:border-[#1d4ed8]"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2.5">
                            <button
                              type="button"
                              aria-pressed={isNominated}
                              onClick={() => toggleNominee(person.id)}
                              className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                            >
                              <PersonAvatar
                                name={person.name}
                                color={person.color}
                                sizeClass="size-9 text-xs"
                                borderClass={
                                  isNominated
                                    ? "border-2 border-[#e11d2a]"
                                    : "border border-[#dcc294]"
                                }
                              />
                              <div className="min-w-0">
                                <span className="block truncate text-sm font-bold text-[#172554]">
                                  {person.name}
                                </span>
                                <span className="block text-[10px] text-[#786242]">
                                  {isNominated
                                    ? `${draft.points} point${draft.points === 1 ? "" : "s"} assigned`
                                    : "Tap a point button to nominate"}
                                </span>
                              </div>
                            </button>

                            <div className="flex items-center gap-1.5">
                              {NOMINATION_POINT_OPTIONS.map((pt) => {
                                const isPointActive = isNominated && draft.points === pt;
                                return (
                                  <button
                                    key={pt}
                                    type="button"
                                    aria-pressed={isPointActive}
                                    onClick={() => setNomineePoints(person.id, pt)}
                                    className={`min-h-8 rounded-full border px-2.5 py-1 text-[11px] font-extrabold transition ${
                                      isPointActive
                                        ? "border-[#facc15] bg-[#e11d2a] text-[#fde047] shadow-xs ring-1 ring-[#facc15]"
                                        : "border-[#dcc294] bg-[#f8edd7] text-[#5c4b32] hover:border-[#1d4ed8] hover:bg-[#fef08a]"
                                    }`}
                                  >
                                    {pt} pt{pt === 1 ? "" : "s"}
                                  </button>
                                );
                              })}
                              {isNominated && (
                                <button
                                  type="button"
                                  onClick={() => toggleNominee(person.id)}
                                  className="min-h-8 rounded-full bg-[#991b1b] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white transition hover:bg-[#7f1d1d]"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>

                          {isNominated && (
                            <div className="mt-3 border-t border-[#e11d2a]/20 pt-2.5">
                              <label className="block">
                                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#991b1b]">
                                  Reason for nominating {person.name} (optional · shown anonymously)
                                </span>
                                <input
                                  type="text"
                                  value={draft.comment}
                                  onChange={(event) =>
                                    setNomineeComment(person.id, event.target.value)
                                  }
                                  placeholder={`Why does ${person.name} get ${draft.points} point${draft.points === 1 ? "" : "s"}? (optional)`}
                                  className="min-h-9 w-full rounded-xl border border-[#dcc294] bg-white px-3 text-xs text-[#172554] placeholder:text-[#9c8462] focus:border-[#1d4ed8] focus:outline-hidden"
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                {statusMessage && (
                  <p
                    role="status"
                    className="mt-4 rounded-xl border border-[#eab308] bg-[#fef08a] px-3.5 py-2.5 text-xs font-semibold text-[#713f12]"
                  >
                    {statusMessage}
                  </p>
                )}
                {error && (
                  <p
                    role="alert"
                    className="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700"
                  >
                    {error}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[#dcc294] pt-4">
                  {selectedEntries.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setNomineeDrafts({})}
                      className="min-h-9 rounded-full border border-[#dcc294] bg-white px-3.5 text-xs font-semibold text-[#786242] hover:bg-[#f8edd7]"
                    >
                      Clear all selections
                    </button>
                  ) : (
                    <span className="text-[11px] text-[#786242]">
                      Save with 0 selected to remove your votes for this day
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full bg-gradient-to-r from-[#e11d2a] to-[#b91c1c] px-6 text-xs font-extrabold uppercase tracking-wider text-[#fde047] shadow-sm ring-2 ring-[#facc15] transition hover:brightness-110 disabled:opacity-50"
                  >
                    {isSaving
                      ? "Saving…"
                      : existingVoterChoices.length > 0
                        ? "Update Nominations"
                        : "Confirm Nominations"}
                  </button>
                </div>
              </div>
            )}
          </form>
        </section>
      )}
    </div>
  );
}

function PeopleDirectoryModal({
  isOpen,
  people,
  expenses,
  todos,
  vndPerPhp,
  onClose,
  onSelectPerson,
}: {
  isOpen: boolean;
  people: Participant[];
  expenses: Expense[];
  todos: Todo[];
  vndPerPhp: number;
  onClose: () => void;
  onSelectPerson: (person: Participant) => void;
}) {
  return (
    <FormModal
      isOpen={isOpen}
      eyebrow="Trip housemates"
      title={`${people.length} people on this trip`}
      onClose={onClose}
    >
      <div className="space-y-2.5">
        <p className="mb-2 text-xs text-[#5c4b32]">
          Tap anyone below to view their full profile, age, details, expense breakdown (shares & paid), and assigned todos.
        </p>
        {people.map((person) => {
          const shareEntries = expenses.flatMap((expense) =>
            expense.shares
              .filter((share) => share.person_id === person.id)
              .map((share) => ({
                amount: share.amount,
                isPaid: share.is_paid,
                isPeso: Boolean(expense.is_peso),
              })),
          );
          const totalSharesVnd = shareEntries.reduce(
            (sum, item) => sum + toVnd(item.amount, item.isPeso, vndPerPhp),
            0,
          );
          const totalSharesPhp = shareEntries.reduce(
            (sum, item) => sum + toPhp(item.amount, item.isPeso, vndPerPhp),
            0,
          );
          const assignedTodosCount = todos.filter((todo) =>
            todo.assignments.some((a) => a.person_id === person.id),
          ).length;

          return (
            <button
              key={person.id}
              type="button"
              onClick={() => onSelectPerson(person)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border-2 border-[#dcc294] bg-[#fffcf5] p-3.5 text-left transition hover:border-[#1d4ed8] hover:bg-white"
            >
              <div className="flex min-w-0 items-center gap-3">
                <PersonAvatar
                  name={person.name}
                  color={person.color}
                  sizeClass="size-12 text-sm"
                  borderClass="border-2 border-[#facc15]"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-bold text-[#153eb5]">{person.name}</p>
                    {person.age !== null && person.age !== undefined && (
                      <span className="rounded-full bg-[#dbeafe] px-2 py-0.5 text-[10px] font-semibold text-[#1d4ed8]">
                        Age {person.age}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[#5c4b32]">
                    {person.details || "Tap to view profile details, expenses & todos"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-3 text-[10px] font-medium text-[#786242]">
                    <span>
                      Total share:{" "}
                      <AnimatedCurrencyTotal
                        amountVnd={totalSharesVnd}
                        amountPhp={totalSharesPhp}
                        allPeso={false}
                      />
                    </span>
                    <span>· {assignedTodosCount} assigned todo{assignedTodosCount === 1 ? "" : "s"}</span>
                  </div>
                </div>
              </div>
              <ArrowRight size={16} className="shrink-0 text-[#1d4ed8]" />
            </button>
          );
        })}
      </div>
    </FormModal>
  );
}

function PersonProfileModal({
  person,
  expenses,
  todos,
  vndPerPhp,
  busyShareId,
  busyAssignmentKey,
  onClose,
  onBackToList,
  onSetSharePaid,
  onToggleAssignmentDone,
  onUpdateProfile,
}: {
  person: Participant | null;
  expenses: Expense[];
  todos: Todo[];
  vndPerPhp: number;
  busyShareId: string | null;
  busyAssignmentKey: string | null;
  onClose: () => void;
  onBackToList?: () => void;
  onSetSharePaid: (expense: Expense, shareId: string, isPaid: boolean) => Promise<void>;
  onToggleAssignmentDone: (todo: Todo, personId: string, isDone: boolean) => Promise<void>;
  onUpdateProfile: (
    personId: string,
    draft: { age: number | null; details: string | null },
  ) => Promise<void>;
}) {
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [ageInput, setAgeInput] = useState("");
  const [detailsInput, setDetailsInput] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    if (!person) return;
    setIsEditingProfile(false);
    setAgeInput(person.age !== null && person.age !== undefined ? String(person.age) : "");
    setDetailsInput(person.details ?? "");
    setProfileError("");
  }, [person?.id, person?.age, person?.details]);

  if (!person) return null;

  const personShares = expenses
    .flatMap((expense) =>
      expense.shares
        .filter((share) => share.person_id === person.id)
        .map((share) => ({
          expense,
          share,
          isPeso: Boolean(expense.is_peso),
        })),
    )
    .sort((a, b) => b.expense.spent_at.localeCompare(a.expense.spent_at));

  const personPayments = expenses
    .flatMap((expense) =>
      expense.payers
        .filter((payer) => payer.person_id === person.id)
        .map((payer) => ({
          expense,
          payer,
          isPeso: Boolean(expense.is_peso),
        })),
    )
    .sort((a, b) => b.expense.spent_at.localeCompare(a.expense.spent_at));

  const assignedTodos = todos.filter((todo) =>
    todo.assignments.some((item) => item.person_id === person.id),
  );

  const totalPaidVnd = personPayments.reduce(
    (sum, item) => sum + toVnd(item.payer.amount_paid, item.isPeso, vndPerPhp),
    0,
  );
  const totalPaidPhp = personPayments.reduce(
    (sum, item) => sum + toPhp(item.payer.amount_paid, item.isPeso, vndPerPhp),
    0,
  );
  const allPaidPeso =
    personPayments.length > 0 && personPayments.every((item) => item.isPeso);

  const totalShareVnd = personShares.reduce(
    (sum, item) => sum + toVnd(item.share.amount, item.isPeso, vndPerPhp),
    0,
  );
  const totalSharePhp = personShares.reduce(
    (sum, item) => sum + toPhp(item.share.amount, item.isPeso, vndPerPhp),
    0,
  );
  const allSharesPeso =
    personShares.length > 0 && personShares.every((item) => item.isPeso);

  const unpaidShareVnd = personShares
    .filter((item) => !item.share.is_paid)
    .reduce((sum, item) => sum + toVnd(item.share.amount, item.isPeso, vndPerPhp), 0);
  const unpaidSharePhp = personShares
    .filter((item) => !item.share.is_paid)
    .reduce((sum, item) => sum + toPhp(item.share.amount, item.isPeso, vndPerPhp), 0);

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!person) return;
    setProfileError("");
    const parsedAge = ageInput.trim() === "" ? null : Number(ageInput);
    if (parsedAge !== null && (!Number.isInteger(parsedAge) || parsedAge < 0)) {
      setProfileError("Enter a valid whole number for age.");
      return;
    }
    setIsSavingProfile(true);
    try {
      await onUpdateProfile(person.id, {
        age: parsedAge,
        details: detailsInput.trim() || null,
      });
      setIsEditingProfile(false);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Could not update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  return (
    <FormModal
      isOpen={Boolean(person)}
      eyebrow="Housemate profile"
      title={person.name}
      onClose={onClose}
    >
      <div className="space-y-6">
        {onBackToList && (
          <div>
            <button
              type="button"
              onClick={onBackToList}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#dcc294] bg-[#fffcf5] px-3 py-1 text-xs font-semibold text-[#153eb5] hover:bg-[#fef08a]"
            >
              <ChevronLeft size={14} />
              All {7} people
            </button>
          </div>
        )}

        <div className="rounded-2xl border-2 border-[#facc15] bg-gradient-to-r from-[#153eb5] via-[#1d4ed8] to-[#e11d2a] p-4 text-white shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <PersonAvatar
                name={person.name}
                color={person.color}
                sizeClass="size-16 text-lg"
                borderClass="border-2 border-[#fde047]"
              />
              <div>
                <h3 className="text-xl font-extrabold tracking-[-0.03em] text-white">
                  {person.name}
                </h3>
                <p className="mt-1 inline-flex items-center rounded-full bg-[#facc15] px-2.5 py-0.5 text-xs font-bold text-[#172554]">
                  {person.age !== null && person.age !== undefined
                    ? `Age: ${person.age}`
                    : "Age: Not specified"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsEditingProfile((open) => !open)}
              className="min-h-8 rounded-full border border-[#fde047]/60 bg-black/20 px-3 py-1 text-xs font-semibold text-[#fde047] transition hover:bg-black/35"
            >
              {isEditingProfile ? "Cancel edit" : "Edit profile"}
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-white/15 bg-black/20 p-3.5 text-xs leading-5 text-[#fef9c3]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#fde047]">
              Details
            </p>
            <p className="mt-1 whitespace-pre-wrap">
              {person.details || "No profile details added yet."}
            </p>
          </div>

          {isEditingProfile && (
            <form
              onSubmit={handleSaveProfile}
              className="mt-4 space-y-3 rounded-xl bg-white p-3.5 text-[#172554]"
            >
              <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-[#5c4b32]">
                    Age
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={ageInput}
                    onChange={(event) => setAgeInput(event.target.value)}
                    placeholder="e.g. 26"
                    className="h-9 w-full rounded-lg border border-[#dcc294] px-2.5 text-xs outline-none focus:border-[#1d4ed8]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold text-[#5c4b32]">
                    Details
                  </span>
                  <input
                    type="text"
                    value={detailsInput}
                    onChange={(event) => setDetailsInput(event.target.value)}
                    placeholder="Add bio, role, notes, or preferences…"
                    className="h-9 w-full rounded-lg border border-[#dcc294] px-2.5 text-xs outline-none focus:border-[#1d4ed8]"
                  />
                </label>
              </div>
              {profileError && (
                <p role="alert" className="text-xs font-medium text-rose-700">
                  {profileError}
                </p>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="min-h-8 rounded-full bg-[#1d4ed8] px-4 py-1 text-xs font-semibold text-[#fde047] hover:bg-[#153eb5] disabled:opacity-50"
                >
                  {isSavingProfile ? "Saving…" : "Save profile"}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="animate-fade-up rounded-2xl border-2 border-[#dcc294] bg-[#fffcf5] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#e11d2a]">
              Total Share ({personShares.length} expense{personShares.length === 1 ? "" : "s"})
            </p>
            <p className="mt-1 text-base font-bold text-[#153eb5]">
              <AnimatedCurrencyTotal
                amountVnd={totalShareVnd}
                amountPhp={totalSharePhp}
                allPeso={allSharesPeso}
              />
            </p>
            <p className="mt-1 text-[11px] text-[#786242]">
              Unpaid share:{" "}
              <span className="font-semibold text-[#e11d2a]">
                <AnimatedCurrencyTotal
                  amountVnd={unpaidShareVnd}
                  amountPhp={unpaidSharePhp}
                  allPeso={allSharesPeso}
                />
              </span>
            </p>
          </div>
          <div className="animate-fade-up rounded-2xl border-2 border-[#dcc294] bg-[#fffcf5] p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#153eb5]">
              Total Paid By {person.name} ({personPayments.length})
            </p>
            <p className="mt-1 text-base font-bold text-[#153eb5]">
              <AnimatedCurrencyTotal
                amountVnd={totalPaidVnd}
                amountPhp={totalPaidPhp}
                allPeso={allPaidPeso}
              />
            </p>
            <p className="mt-1 text-[11px] text-[#786242]">
              Recorded payer contributions
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#e11d2a]">
              Expense Shares Breakdown
            </p>
            <h4 className="text-sm font-bold text-[#153eb5]">
              {person.name}’s share per expense
            </h4>
          </div>
          {personShares.length === 0 ? (
            <p className="rounded-xl border border-[#dcc294] bg-[#fffcf5] px-4 py-3 text-xs text-[#786242]">
              No expense shares recorded for {person.name} yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {personShares.map(({ expense, share, isPeso }) => (
                <li
                  key={share.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#dcc294] bg-[#fffcf5] px-3.5 py-2.5 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-[#172554]">
                        {expense.description || "Untitled expense"}
                      </span>
                      <span className="rounded-full bg-[#fef08a] px-2 py-0.5 text-[9px] font-semibold text-[#713f12]">
                        {expense.category?.name ?? "No category"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-[#786242]">
                      {formatTripDate(expense.spent_at.slice(0, 10))} · Total expense:{" "}
                      {formatExpenseAmount(expense.amount, isPeso, vndPerPhp)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#153eb5]">
                      {formatExpenseAmount(share.amount, isPeso, vndPerPhp)}
                    </span>
                    <button
                      type="button"
                      aria-pressed={share.is_paid}
                      disabled={busyShareId === share.id}
                      onClick={() => void onSetSharePaid(expense, share.id, !share.is_paid)}
                      className={`min-h-7 rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition disabled:opacity-50 ${
                        share.is_paid
                          ? "bg-[#dcfce7] text-[#15803d]"
                          : "border border-[#e11d2a]/40 bg-white text-[#e11d2a]"
                      }`}
                    >
                      {busyShareId === share.id ? "Saving…" : share.is_paid ? "Paid" : "Unpaid"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#153eb5]">
              Paid By {person.name}
            </p>
            <h4 className="text-sm font-bold text-[#153eb5]">
              Expenses paid by {person.name}
            </h4>
          </div>
          {personPayments.length === 0 ? (
            <p className="rounded-xl border border-[#dcc294] bg-[#fffcf5] px-4 py-3 text-xs text-[#786242]">
              No payer records for {person.name} yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {personPayments.map(({ expense, payer, isPeso }) => (
                <li
                  key={payer.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#dcc294] bg-[#fffcf5] px-3.5 py-2.5 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-[#172554]">
                        {expense.description || "Untitled expense"}
                      </span>
                      <span className="rounded-full bg-[#dbeafe] px-2 py-0.5 text-[9px] font-semibold text-[#1d4ed8]">
                        {expense.category?.name ?? "No category"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-[#786242]">
                      {formatTripDate(expense.spent_at.slice(0, 10))} · Total expense:{" "}
                      {formatExpenseAmount(expense.amount, isPeso, vndPerPhp)}
                    </p>
                  </div>
                  <span className="font-bold text-[#15803d]">
                    Paid {formatExpenseAmount(payer.amount_paid, isPeso, vndPerPhp)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3 rounded-2xl border-2 border-[#facc15] bg-[#fef9c3] p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a16207]">
                Assigned Todos
              </p>
              <h4 className="text-sm font-bold text-[#422006]">
                {person.name}’s tasks ({assignedTodos.length})
              </h4>
            </div>
          </div>
          {assignedTodos.length === 0 ? (
            <p className="rounded-xl border border-[#fde047] bg-white/80 px-3.5 py-2.5 text-xs text-[#854d0e]">
              No todos assigned to {person.name} yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {assignedTodos.map((todo) => {
                const assignment = todo.assignments.find((a) => a.person_id === person.id);
                const isDone = Boolean(assignment?.is_done || todo.done);
                const assignKey = `${todo.id}:${person.id}`;
                const isBusy = busyAssignmentKey === assignKey;
                return (
                  <li
                    key={todo.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#facc15] bg-white px-3.5 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p
                        className={`font-semibold ${
                          isDone ? "text-[#854d0e] line-through" : "text-[#422006]"
                        }`}
                      >
                        {todo.name}
                      </p>
                      {todo.comment && (
                        <p className="mt-0.5 text-[11px] text-[#713f12]/80">{todo.comment}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={isBusy}
                      aria-pressed={isDone}
                      onClick={() =>
                        void onToggleAssignmentDone(todo, person.id, !assignment?.is_done)
                      }
                      className={`min-h-7 rounded-full px-3 py-0.5 text-[10px] font-bold transition disabled:opacity-50 ${
                        isDone
                          ? "bg-[#fde047] text-[#713f12]"
                          : "border border-[#eab308] bg-[#fefce8] text-[#854d0e]"
                      }`}
                    >
                      {isBusy ? "Saving…" : isDone ? "Done ✓" : "Mark done"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </FormModal>
  );
}

function getSampleCoordinates(city: string): {
  location_name: string;
  address: string;
  latitude: number;
  longitude: number;
} {
  if (city.includes("Da Nang") && !city.startsWith("Hoi An")) {
    return {
      location_name: "Đà Nẵng Stay",
      address: "27 Vũng Thùng 1, Sơn Trà, Đà Nẵng 550000, Vietnam",
      latitude: 16.0772,
      longitude: 108.2414,
    };
  }
  return {
    location_name: "Hội An Stay",
    address: "12 Trần Cao Vân, Sơn Phong, Tp. Hội An, Quảng Nam, Vietnam",
    latitude: 15.8825,
    longitude: 108.3292,
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PickedPlace[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [mapError, setMapError] = useState("");
  const [error, setError] = useState("");

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);

  function selectPlace(place: PickedPlace) {
    setLocationName(place.locationName);
    setLocationPin((current) => current || place.locationName);
    if (place.address) setAddress(place.address);
    if (place.googlePlaceId) setGooglePlaceId(place.googlePlaceId);
    setLatitude(String(place.latitude));
    setLongitude(String(place.longitude));
    setSearchQuery(place.locationName);
    setSearchResults([]);

    const map = mapInstanceRef.current;
    const marker = markerInstanceRef.current;
    if (map && marker) {
      const pos = { lat: place.latitude, lng: place.longitude };
      map.panTo(pos);
      map.setZoom(16);
      marker.setPosition(pos);
      marker.setVisible(true);
    }
  }

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setIsSearchingPlaces(false);
      return;
    }
    let isCancelled = false;
    setIsSearchingPlaces(true);
    const timer = window.setTimeout(() => {
      void searchPlacesNew(trimmed)
        .then((results) => {
          if (!isCancelled) {
            setSearchResults(results);
          }
        })
        .finally(() => {
          if (!isCancelled) {
            setIsSearchingPlaces(false);
          }
        });
    }, 320);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

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

          void reverseGeocodeNew(nextLat, nextLng).then((info) => {
            if (!info) return;
            if (info.address) setAddress(info.address);
            if (info.googlePlaceId) setGooglePlaceId(info.googlePlaceId);
            setLocationName((current) => current || info.locationName);
            setLocationPin((current) => current || info.locationName);
          });
        });
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

        <div className="relative mb-3">
          <span className="mb-1.5 block text-[11px] font-semibold text-[#536058]">
            Search place on Google Maps (Places API New)
          </span>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (searchResults.length > 0) {
                    selectPlace(searchResults[0]);
                  }
                }
              }}
              placeholder="Search a place, hotel, restaurant, or attraction in Vietnam…"
              className="h-10 w-full rounded-xl border border-[#e3e6df] bg-[#fafaf8] px-3 text-xs outline-none focus:border-[#b91c1c] focus:bg-white"
            />
          </div>
          {isSearchingPlaces && (
            <p className="mt-1 text-[11px] text-[#8c6f60]">Searching places…</p>
          )}
          {searchResults.length > 0 && (
            <ul className="absolute z-30 mt-1 max-h-56 w-full divide-y divide-[#f3e5d0] overflow-y-auto rounded-xl border border-[#eddcc4] bg-white shadow-lg">
              {searchResults.map((place, idx) => (
                <li key={`${place.googlePlaceId || place.locationName}-${idx}`}>
                  <button
                    type="button"
                    onClick={() => selectPlace(place)}
                    className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition hover:bg-[#fffaf3]"
                  >
                    <MapPin size={14} className="mt-0.5 shrink-0 text-[#b91c1c]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-[#2a1810]">
                        {place.locationName}
                      </p>
                      {place.address && (
                        <p className="truncate text-[11px] text-[#785c4e]">{place.address}</p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

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
              const found = await searchPlacesNew(`${query}, Vietnam`);
              if (found.length > 0) {
                pos = { lat: found[0].latitude, lng: found[0].longitude };
              }
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
  weatherByDate,
  isSaving,
  message,
  error,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
}: {
  entries: ItineraryRow[];
  weatherByDate: Record<string, DayWeather>;
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
    <section className="rounded-[24px] border-2 border-[#dcc294] bg-[#fffcf5] p-5 shadow-xs sm:p-7">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#e11d2a]">
            The plan so far
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-[-0.03em] text-[#153eb5]">
            {isUsingSample
              ? "Sample itinerary · awaiting database entries"
              : `${dates.length} day${dates.length === 1 ? "" : "s"} planned`}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#eab308]/40 bg-[#fef08a] px-3 py-1.5 text-xs font-semibold text-[#153eb5]">
            Times are local to Vietnam
          </span>
          <button
            type="button"
            onClick={() => {
              setEditingEntry(null);
              setShowAddForm(true);
            }}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#1d4ed8] px-3.5 py-1.5 text-xs font-semibold text-[#fef08a] shadow-sm ring-1 ring-[#facc15]/50 transition hover:bg-[#153eb5]"
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
        {dates.map((date, index) => {
          const dayWeather = weatherByDate[date];
          return (
            <button
              key={date}
              type="button"
              onClick={() => {
                setActiveDate(date);
                setSelectedEntryId(null);
              }}
              aria-pressed={selectedDate === date}
              className={`min-w-[92px] rounded-2xl border px-3 py-2.5 text-left transition-colors ${
                selectedDate === date
                  ? "border-[#facc15] bg-[#1d4ed8] text-[#fef08a] shadow-sm"
                  : "border-[#dcc294] bg-[#f8edd7] text-[#5c4b32] hover:bg-[#f1dfc0]"
              }`}
            >
              {dayWeather && (
                <span
                  className={`mb-1 flex items-center gap-1 text-[10px] font-semibold ${
                    selectedDate === date ? "text-[#fde047]" : "text-[#e11d2a]"
                  }`}
                >
                  <span>{dayWeather.emoji}</span>
                  <span>{dayWeather.tempMax}°C</span>
                  <span className="truncate opacity-85">{dayWeather.label}</span>
                </span>
              )}
              <span className="block text-[9px] font-bold tracking-[0.12em] opacity-70">
                DAY {index + 1}
              </span>
              <span className="mt-0.5 block text-sm font-semibold">
                {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
                  new Date(`${date}T12:00:00`),
                )}
              </span>
            </button>
          );
        })}
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
        <div className="text-right">
          {selectedDate && weatherByDate[selectedDate] && (
            <p className="mb-1 text-xs font-semibold text-[#b91c1c]">
              {weatherByDate[selectedDate].emoji} {weatherByDate[selectedDate].tempMin}°–
              {weatherByDate[selectedDate].tempMax}°C · {weatherByDate[selectedDate].label} (
              {weatherByDate[selectedDate].city})
            </p>
          )}
          <span className="inline-flex items-center gap-1.5 text-xs text-[#747d77]">
            <CalendarDays size={14} />
            {selectedDate
              ? `${new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date(`${selectedDate}T12:00:00`))}, ${formatTripDate(selectedDate)}`
              : "No dates"}
          </span>
        </div>
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
  address,
  wifiNetwork,
  wifiPassword,
  dates,
  nights,
  variant,
  images,
  airbnbId,
  airbnbHref,
  airbnbSummary,
}: {
  city: string;
  address: string;
  wifiNetwork?: string;
  wifiPassword?: string;
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
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedWifi, setCopiedWifi] = useState(false);

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
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#f3e5d0] bg-[#fffaf3] px-3.5 py-2.5">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <MapPin size={15} className="mt-0.5 shrink-0 text-[#b91c1c]" />
            <p className="text-xs font-medium leading-5 text-[#2a1810]">{address}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(address);
                setCopiedAddress(true);
                window.setTimeout(() => setCopiedAddress(false), 1800);
              }}
              className="min-h-7 rounded-full border border-[#eddcc4] bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#785c4e] transition hover:bg-[#fef3c7] hover:text-[#991b1b]"
            >
              {copiedAddress ? "Copied!" : "Copy"}
            </button>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-7 items-center gap-1 rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-[11px] font-semibold text-[#991b1b] transition hover:bg-[#fde68a]"
            >
              Maps
              <ExternalLink size={10} />
            </a>
          </div>
        </div>
        {(wifiNetwork || wifiPassword) && (
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#fde047] bg-[#fefce8] px-3.5 py-2.5">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <Wifi size={15} className="mt-0.5 shrink-0 text-[#b45309]" />
              <div className="min-w-0 text-xs leading-5 text-[#422006]">
                {wifiNetwork && (
                  <p>
                    <span className="font-semibold text-[#854d0e]">Wi-Fi Network:</span>{" "}
                    {wifiNetwork}
                  </p>
                )}
                {wifiPassword && (
                  <p>
                    <span className="font-semibold text-[#854d0e]">Password:</span>{" "}
                    <code className="rounded bg-[#fef08a] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#713f12]">
                      {wifiPassword}
                    </code>
                  </p>
                )}
              </div>
            </div>
            {wifiPassword && (
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard?.writeText(wifiPassword);
                  setCopiedWifi(true);
                  window.setTimeout(() => setCopiedWifi(false), 1800);
                }}
                className="min-h-7 shrink-0 rounded-full border border-[#eab308] bg-white px-2.5 py-0.5 text-[11px] font-semibold text-[#854d0e] transition hover:bg-[#fef08a]"
              >
                {copiedWifi ? "Copied!" : "Copy password"}
              </button>
            )}
          </div>
        )}
        <div className="mt-4 overflow-x-auto border-t border-[#eff0eb] pt-4">
          <p className="mb-3 text-center text-xs font-medium text-[#991b1b]">
            Tap below Airbnb link to view in Airbnb
          </p>
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
  flightNumber,
  date,
  departure,
  departureCity,
  departureTerminal,
  arrival,
  arrivalCity,
  arrivalTerminal,
  note,
}: {
  label: string;
  flightNumber: string;
  date: string;
  departure: string;
  departureCity: string;
  departureTerminal: string;
  arrival: string;
  arrivalCity: string;
  arrivalTerminal: string;
  note: string;
}) {
  return (
    <article className="overflow-hidden rounded-[24px] border border-[#eddcc4] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f3e5d0] px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-[#fef3c7] text-[#b91c1c]">
            <Plane size={17} />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#2a1810]">{label}</p>
            <p className="mt-0.5 text-xs text-[#8c6f60]">{date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#b91c1c] px-3 py-1.5 text-xs font-bold tracking-wide text-[#fef3c7]">
            Flight {flightNumber}
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-[#fef3c7] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[#991b1b]">
            <BadgeCheck size={13} />
            Confirmed
          </span>
        </div>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 py-6 sm:px-8 sm:py-7">
        <div>
          <p className="text-2xl font-semibold tracking-[-0.04em] text-[#2a1810]">{departure}</p>
          <p className="mt-1 text-xs font-semibold text-[#5c3d2e]">{departureCity}</p>
          <p className="mt-0.5 text-[11px] text-[#8c6f60]">{departureTerminal}</p>
        </div>
        <div className="flex min-w-16 flex-col items-center gap-1 text-[#a2aaa4]">
          <span className="text-[10px] font-bold tracking-wider text-[#b91c1c]">
            {flightNumber}
          </span>
          <div className="flex w-full items-center gap-1">
            <span className="h-px flex-1 border-t border-dashed border-[#d6bfa3]" />
            <Plane size={15} className="rotate-90 text-[#b91c1c]" />
            <span className="h-px flex-1 border-t border-dashed border-[#d6bfa3]" />
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tracking-[-0.04em] text-[#2a1810]">{arrival}</p>
          <p className="mt-1 text-xs font-semibold text-[#5c3d2e]">{arrivalCity}</p>
          <p className="mt-0.5 text-[11px] text-[#8c6f60]">{arrivalTerminal}</p>
        </div>
      </div>
      <div className="mx-5 mb-5 rounded-xl bg-[#fffaf3] px-4 py-3 text-xs leading-5 text-[#785c4e] sm:mx-6 sm:mb-6">
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
  onSelectPerson,
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
  onSelectPerson: (person: Participant) => void;
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
          className="mb-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#1d4ed8] px-5 text-sm font-semibold text-[#fef08a] shadow-sm ring-2 ring-[#facc15]/50 transition hover:bg-[#153eb5] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={17} />
          Add expense
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={ReceiptText}
          label="Trip spend"
          value={
            allExpensesPeso ? (
              <AnimatedPhp amount={totalSpendPhp} />
            ) : (
              <AnimatedVnd amount={totalSpendVnd} />
            )
          }
          caption={
            allExpensesPeso ? (
              "All recorded expenses in PHP"
            ) : (
              <>
                <AnimatedPhp amount={totalSpendPhp} /> converted
              </>
            )
          }
          tone="dark"
        />
        <SummaryCard
          icon={UsersRound}
          label="Average share"
          value={
            allExpensesPeso ? (
              <AnimatedPhp amount={people.length ? totalSpendPhp / people.length : 0} />
            ) : (
              <AnimatedVnd amount={people.length ? totalSpendVnd / people.length : 0} />
            )
          }
          caption={
            allExpensesPeso ? (
              `Across ${people.length} people · equal-share estimate`
            ) : (
              <>
                <AnimatedPhp amount={people.length ? totalSpendPhp / people.length : 0} /> · across{" "}
                {people.length} people
              </>
            )
          }
          tone="light"
        />
        <SummaryCard
          icon={ArrowLeftRight}
          label="Unpaid shares"
          value={
            allExpensesPeso ? (
              <AnimatedPhp amount={unpaidTotalPhp} />
            ) : (
              <AnimatedVnd amount={unpaidTotalVnd} />
            )
          }
          caption={
            allExpensesPeso ? (
              `${shareCount} recorded share${shareCount === 1 ? "" : "s"}`
            ) : (
              <>
                <AnimatedPhp amount={unpaidTotalPhp} /> · {shareCount} recorded share
                {shareCount === 1 ? "" : "s"}
              </>
            )
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
            <div className="flex h-12 items-center rounded-xl bg-[#f4f6f1] px-3 text-sm font-semibold text-[#153eb5]">
              <AnimatedPhp amount={convertedPhp} />
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

              return (
                <button
                  type="button"
                  key={person.id}
                  onClick={() => onSelectPerson(person)}
                  className="animate-fade-up flex w-full items-center gap-3 rounded-xl border border-[#f3e5d0] bg-[#fffaf3] px-3 py-2.5 text-left transition hover:border-[#1d4ed8] hover:bg-white"
                >
                  <PersonAvatar name={person.name} color={person.color} sizeClass="size-8 text-xs" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-[#153eb5]">{person.name}</p>
                    <div className="mt-1 flex flex-wrap justify-between gap-x-3 gap-y-1 text-[10px] text-[#785c4e]">
                      <span>
                        Paid toward expenses ·{" "}
                        <AnimatedCurrencyTotal
                          amountVnd={contributedVnd}
                          amountPhp={contributedPhp}
                          allPeso={allPayerPeso}
                        />
                      </span>
                      <span>
                        Unpaid shares ·{" "}
                        <AnimatedCurrencyTotal
                          amountVnd={unpaidVnd}
                          amountPhp={unpaidPhp}
                          allPeso={allUnpaidPeso}
                        />
                      </span>
                    </div>
                  </div>
                </button>
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
                            <AnimatedExpenseAmount
                              amount={expense.amount}
                              isPeso={isPeso}
                              vndPerPhp={vndPerPhp}
                            />
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
  const [nominationDays, setNominationDays] = useState<NominationDayRow[]>([]);
  const [nominations, setNominations] = useState<NominationRow[]>([]);
  const [nominationRevealVotes, setNominationRevealVotes] = useState<NominationRevealVoteRow[]>(
    [],
  );
  const [nominationRevealStatus, setNominationRevealStatus] = useState<
    NominationRevealStatusRow[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isItinerarySaving, setIsItinerarySaving] = useState(false);
  const [isTodoSaving, setIsTodoSaving] = useState(false);
  const [isNominationSaving, setIsNominationSaving] = useState(false);
  const [nominationsPageTab, setNominationsPageTab] = useState<NominationsPageTab>("board");
  const [busyRevealKey, setBusyRevealKey] = useState<string | null>(null);
  const [revealError, setRevealError] = useState("");
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
  const [isPeopleDirectoryOpen, setIsPeopleDirectoryOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [openedFromDirectory, setOpenedFromDirectory] = useState(false);
  const [deferredInstallPrompt, setDeferredInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallHelpOpen, setIsInstallHelpOpen] = useState(false);
  const [isStandaloneApp, setIsStandaloneApp] = useState(false);
  const [weather, setWeather] = useState<TripWeatherForecast>({
    byDate: {},
    hoiAnSummary: null,
    daNangSummary: null,
  });
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
      setNominationDays(data.nominationDays);
      setNominations(data.nominations);
      setNominationRevealVotes(data.nominationRevealVotes);
      setNominationRevealStatus(data.nominationRevealStatus);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load trip data.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadTrip();
    void fetchTripWeather()
      .then((forecast) => setWeather(forecast))
      .catch(() => {
        // Ignore weather network errors silently
      });
  }, []);

  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneDisplay = window.matchMedia("(display-mode: standalone)").matches;
      const isIosStandalone = Boolean(
        (window.navigator as Navigator & { standalone?: boolean }).standalone,
      );
      setIsStandaloneApp(isStandaloneDisplay || isIosStandalone);
    };
    checkStandalone();

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredInstallPrompt(null);
      setIsStandaloneApp(true);
      setIsInstallHelpOpen(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstallAppClick() {
    if (deferredInstallPrompt) {
      try {
        await deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setDeferredInstallPrompt(null);
        }
        return;
      } catch {
        // Fall back to instructions modal
      }
    }
    setIsInstallHelpOpen(true);
  }

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

  async function handleUpdatePersonProfile(
    personId: string,
    draft: { age: number | null; details: string | null },
  ) {
    const updated = await updatePersonProfile(personId, draft);
    setPeople((current) =>
      current.map((person) =>
        person.id === updated.id ? { ...person, age: updated.age, details: updated.details } : person,
      ),
    );
  }

  async function handleSaveNominations(
    nominationDate: string,
    voterPersonId: string,
    entries: VoterNominationDraft[],
  ) {
    setIsNominationSaving(true);
    try {
      const savedRows = await saveVoterNominationsForDay(
        nominationDate,
        voterPersonId,
        entries,
      );
      setNominations((current) => [
        ...savedRows,
        ...current.filter(
          (item) =>
            !(
              item.nomination_date === nominationDate &&
              item.voter_person_id === voterPersonId
            ),
        ),
      ]);
    } finally {
      setIsNominationSaving(false);
    }
  }

  async function handleToggleRevealVote(
    nominationDate: string,
    personId: string,
    shouldVote: boolean,
  ) {
    const key = `${nominationDate}:${personId}`;
    setBusyRevealKey(key);
    setRevealError("");
    try {
      const result = await setNominationRevealVote(nominationDate, personId, shouldVote);
      setNominationRevealVotes((current) => {
        const withoutTarget = current.filter(
          (v) => !(v.nomination_date === nominationDate && v.person_id === personId),
        );
        return result.vote ? [...withoutTarget, result.vote] : withoutTarget;
      });
      if (result.status) {
        setNominationRevealStatus((current) => {
          const exists = current.some((s) => s.nomination_date === nominationDate);
          if (exists) {
            return current.map((s) =>
              s.nomination_date === nominationDate ? result.status! : s,
            );
          }
          return [...current, result.status!];
        });
      }
    } catch (err) {
      setRevealError(
        err instanceof Error ? err.message : "Could not update reveal vote.",
      );
    } finally {
      setBusyRevealKey(null);
    }
  }

  const totalNominationDaysCount =
    nominationDays.length > 0 ? nominationDays.length : DEFAULT_NOMINATION_DATES.length;
  const revealedDaysCount = (
    nominationDays.length > 0
      ? nominationDays.map((d) => d.nomination_date)
      : DEFAULT_NOMINATION_DATES
  ).filter((dateStr) => {
    const statusRow = nominationRevealStatus.find((s) => s.nomination_date === dateStr);
    if (statusRow) return Boolean(statusRow.is_revealed);
    const votesForDay = nominationRevealVotes.filter((v) => v.nomination_date === dateStr);
    return people.length > 0 && votesForDay.length >= people.length;
  }).length;

  const selectedPerson = people.find((item) => item.id === selectedPersonId) ?? null;

  return (
    <div className="min-h-dvh pb-[calc(5.5rem+env(safe-area-inset-bottom))] text-[#172554] md:pb-10">
      <header className="sticky top-0 z-30 border-b-2 border-[#d8be90] bg-[#f5e7cb]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-7 lg:px-10">
          <a href="#" className="flex min-w-0 items-center gap-3 text-inherit no-underline">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-r from-[#1d4ed8] via-[#2563eb] to-[#e11d2a] text-[#fde047] shadow-sm ring-2 ring-[#facc15]">
              <Compass size={19} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-[-0.02em] text-[#153eb5]">
                PBB 7.0 · Hội An & Đà Nẵng
              </span>
              <span className="mt-0.5 hidden text-[10px] font-medium text-[#6b5335] sm:block">
                Please review our important deets · Hội An & Đà Nẵng
              </span>
            </span>
          </a>
          <div className="flex items-center gap-2.5 sm:gap-4">
            {!isStandaloneApp && (
              <button
                type="button"
                onClick={() => void handleInstallAppClick()}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border-2 border-[#facc15] bg-gradient-to-r from-[#1d4ed8] to-[#e11d2a] px-3 py-1 text-[11px] font-extrabold text-[#fde047] shadow-xs transition hover:brightness-110"
                title="Install web app on your phone"
              >
                <Download size={13} />
                <span>Install App</span>
              </button>
            )}
            <div className="hidden text-right sm:block">
              {(weather.hoiAnSummary || weather.daNangSummary) && (
                <p className="mb-0.5 text-[10px] font-bold text-[#e11d2a]">
                  {weather.hoiAnSummary
                    ? `Hội An ${weather.hoiAnSummary.emoji} ${weather.hoiAnSummary.tempMax}°C ${weather.hoiAnSummary.label}`
                    : ""}
                  {weather.hoiAnSummary && weather.daNangSummary ? " · " : ""}
                  {weather.daNangSummary
                    ? `Đà Nẵng ${weather.daNangSummary.emoji} ${weather.daNangSummary.tempMax}°C ${weather.daNangSummary.label}`
                    : ""}
                </p>
              )}
              <button
                type="button"
                onClick={() => setIsPeopleDirectoryOpen(true)}
                className="text-xs font-bold text-[#153eb5] hover:underline"
              >
                {people.length} friends
              </button>
              <p className="mt-0.5 text-[10px] font-medium text-[#6b5335]">Nov 24 – 29, 2026</p>
            </div>
            <AvatarStack
              people={people}
              size="small"
              onSelectPerson={(person) => {
                setOpenedFromDirectory(false);
                setSelectedPersonId(person.id);
              }}
            />
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
                className={`flex min-h-10 items-center gap-2 rounded-full px-4 text-xs font-bold transition ${
                  activeView === item.id
                    ? "bg-[#1d4ed8] text-[#fde047] shadow-sm ring-2 ring-[#facc15]/70"
                    : "text-[#4a3b28] hover:bg-[#ead8b5]"
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
            <section className="relative overflow-hidden rounded-[28px] border-2 border-[#facc15] bg-gradient-to-r from-[#0f36a8] via-[#1d4ed8] to-[#e11d2a] px-5 py-7 text-white shadow-lg sm:px-8 sm:py-9 lg:px-10">
              <div className="absolute -right-10 -top-24 size-72 rounded-full border-[42px] border-[#fde047]/15" />
              <div className="absolute -bottom-28 left-[38%] size-72 rounded-full bg-[#facc15]/25 blur-2xl" />
              <div className="relative z-10 grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-end">
                <div>
                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#fde047]">
                    <Sparkles size={13} />
                    HOI AN - DA NANG · Việt Nam
                  </p>
                  <h1 className="mt-3 max-w-2xl text-[clamp(2rem,6vw,3.8rem)] font-extrabold leading-[1.03] tracking-[-0.05em] text-[#fffbeb] drop-shadow-[0_2px_0_rgba(217,119,6,0.6)]">
                    PINOY BIG BRUH 7.0
                  </h1>
                  <p className="mt-4 max-w-lg text-sm leading-6 text-[#fef9c3]/90">
                    Tuloy na ito, sa wakas, we made it out of the group chat.
                  </p>
                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() => {
                        setNominationsPageTab("cast");
                        setActiveView("nominations");
                      }}
                      className="group inline-flex flex-col items-start rounded-2xl border-2 border-[#fde047] bg-gradient-to-r from-[#e11d2a] via-[#dc2626] to-[#991b1b] px-5 py-3 text-left shadow-lg ring-2 ring-black/15 transition duration-200 hover:-translate-y-0.5 hover:brightness-110"
                    >
                      <span className="flex items-center gap-2 text-base font-black tracking-[0.08em] text-[#fde047]">
                        NOMINATE
                        <span className="rounded-full bg-black/25 px-2 py-0.5 text-[10px] font-bold text-white">
                          {nominations.reduce((sum, n) => sum + (n.points ?? 1), 0)} pt
                          {nominations.reduce((sum, n) => sum + (n.points ?? 1), 0) === 1 ? "" : "s"} ·{" "}
                          {nominations.length} vote{nominations.length === 1 ? "" : "s"}
                        </span>
                      </span>
                      <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#fffbeb]/90">
                        nominate A HOUSEMATE FOR EVICTION
                      </span>
                    </button>
                  </div>
                </div>
                <div className="rounded-[20px] border-2 border-[#fde047]/45 bg-[#0b1942]/35 p-4 backdrop-blur-sm sm:p-5">
                  {(weather.hoiAnSummary || weather.daNangSummary) && (
                    <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-[#fde047]/25 pb-2.5 text-[11px] font-semibold text-[#fde047]">
                      {weather.hoiAnSummary && (
                        <span>
                          Hội An (Nov 24–27): {weather.hoiAnSummary.emoji}{" "}
                          {weather.hoiAnSummary.tempMin}°–{weather.hoiAnSummary.tempMax}°C ·{" "}
                          {weather.hoiAnSummary.label}
                        </span>
                      )}
                      {weather.daNangSummary && (
                        <span>
                          · Đà Nẵng (Nov 27–29): {weather.daNangSummary.emoji}{" "}
                          {weather.daNangSummary.tempMin}°–{weather.daNangSummary.tempMax}°C ·{" "}
                          {weather.daNangSummary.label}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-[#fef9c3]">
                      <CalendarDays size={15} />
                      Tuesday – Sunday
                    </div>
                    <span className="rounded-full bg-[#facc15] px-2.5 py-1 text-[10px] font-bold text-[#172554]">
                      5 nights
                    </span>
                  </div>
                  <p className="mt-2 text-xl font-bold tracking-[-0.03em] text-white">
                    November 24 – 29, 2026
                  </p>
                  <div className="my-4 h-px bg-[#fde047]/25" />
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setIsPeopleDirectoryOpen(true)}
                      className="text-left transition hover:opacity-85"
                    >
                      <p className="text-xs font-semibold text-[#fde047] underline-offset-2 hover:underline">
                        The Housemates ({people.length})
                      </p>
                      <p className="mt-1 text-[10px] text-white/80">Tap to list all or click a circle</p>
                    </button>
                    <AvatarStack
                      people={people}
                      onSelectPerson={(person) => {
                        setOpenedFromDirectory(false);
                        setSelectedPersonId(person.id);
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="relative z-10 mt-7 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-white">
                <span className="rounded-full border border-[#fde047]/50 bg-[#153eb5]/60 px-3 py-1.5">
                  {weather.hoiAnSummary
                    ? `${weather.hoiAnSummary.emoji} ${weather.hoiAnSummary.tempMax}°C ${weather.hoiAnSummary.label} · `
                    : ""}
                  Hoi An · Nov 24–27
                </span>
                <ArrowRight size={14} className="text-[#fde047]" />
                <span className="rounded-full border border-[#fde047]/50 bg-[#b91c1c]/60 px-3 py-1.5">
                  {weather.daNangSummary
                    ? `${weather.daNangSummary.emoji} ${weather.daNangSummary.tempMax}°C ${weather.daNangSummary.label} · `
                    : ""}
                  Da Nang · Nov 27–29
                </span>
              </div>
            </section>

            <div className="grid gap-3 sm:grid-cols-3">
              <SummaryCard
                icon={Wallet}
                label="Trip expenses"
                value={
                  allExpensesPeso ? (
                    <AnimatedPhp amount={totalSpendPhp} />
                  ) : (
                    <AnimatedVnd amount={totalSpendVnd} />
                  )
                }
                caption={
                  totalSpendVnd || totalSpendPhp ? (
                    allExpensesPeso ? (
                      "Recorded in Philippine pesos"
                    ) : (
                      <AnimatedPhp amount={totalSpendPhp} />
                    )
                  ) : (
                    "Add costs as you go"
                  )
                }
                tone="dark"
              />
              <SummaryCard
                icon={UsersRound}
                label="Travelers"
                value={`${people.length} people`}
                caption="Tap to view all housemates & profiles"
                tone="light"
                onClick={() => setIsPeopleDirectoryOpen(true)}
              />
              <SummaryCard
                icon={Trophy}
                label="Eviction Board · Daily & Grand Total"
                value="Nominations"
                caption={`${revealedDaysCount} of ${totalNominationDaysCount} days revealed · Tap to open page`}
                tone="light"
                onClick={() => {
                  setNominationsPageTab("board");
                  setActiveView("nominations");
                }}
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

            <HouseFilesPanel />
          </div>
        )}

        {activeView === "nominations" && (
          <NominationsPage
            people={people}
            nominationDays={nominationDays}
            nominations={nominations}
            revealVotes={nominationRevealVotes}
            revealStatus={nominationRevealStatus}
            isSaving={isNominationSaving}
            busyRevealKey={busyRevealKey}
            revealError={revealError}
            initialTab={nominationsPageTab}
            onTabChange={setNominationsPageTab}
            onBackToHouse={() => setActiveView("overview")}
            onSaveNominations={handleSaveNominations}
            onToggleRevealVote={handleToggleRevealVote}
          />
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
              weatherByDate={weather.byDate}
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
                detail="Confirmed flights between Manila (NAIA Terminal 3) and Da Nang International Airport (Terminal 2)."
              />
              <div className="grid gap-5 lg:grid-cols-2">
                <FlightCard
                  label="Outbound · Manila to Da Nang"
                  flightNumber="5J 5756"
                  date="Tuesday, November 24"
                  departure="7:50 PM"
                  departureCity="Manila (MNL)"
                  departureTerminal="NAIA Terminal 3"
                  arrival="9:30 PM"
                  arrivalCity="Da Nang (DAD) → Hoi An"
                  arrivalTerminal="Da Nang Intl Airport · Terminal 2"
                  note="Flight 5J 5756 departs Manila (NAIA Terminal 3) at 7:50 PM and arrives at Da Nang International Airport (Terminal 2) at 9:30 PM before transferring to Hoi An."
                />
                <FlightCard
                  label="Return · Da Nang to Manila"
                  flightNumber="5J 5757"
                  date="Sunday, November 29"
                  departure="10:30 PM"
                  departureCity="Da Nang (DAD)"
                  departureTerminal="Da Nang Intl Airport · Terminal 2"
                  arrival="2:15 AM"
                  arrivalCity="Manila (MNL)"
                  arrivalTerminal="NAIA Terminal 3"
                  note="Return flight 5J 5757 departs Da Nang International Airport (Terminal 2) at 10:30 PM and arrives in Manila (NAIA Terminal 3) at 2:15 AM."
                />
              </div>
              <div className="flex items-start gap-3 rounded-[22px] border border-[#eddcc4] bg-white p-5 text-sm leading-6 text-[#785c4e]">
                <Clock3 size={18} className="mt-0.5 shrink-0 text-[#b91c1c]" />
                All times shown are local to the place they refer to. Outbound flight 5J 5756 lands at Da Nang International Airport Terminal 2 at 9:30 PM, and return flight 5J 5757 lands at NAIA Terminal 3 at 2:15 AM.
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
                  address="12 Trần Cao Vân, Sơn Phong, Tp. Hội An, Quảng Nam, Vietnam"
                  wifiNetwork="dao tien homestay 1 or 2"
                  wifiPassword="12trancaovan"
                  dates="Nov 24, 9:30 PM – Nov 27, 11:00 AM"
                  nights="3 nights · 9:30 PM arrival, checkout at 11:00 AM on Nov 27"
                  variant="hoi-an"
                  images={hoiAnImages}
                  airbnbId="20275214"
                  airbnbHref="https://www.airbnb.co.uk/rooms/20275214?adults=1&s=66&source=embed_widget"
                  airbnbSummary="Hotel in Hội An · ★4.9 · 4 bedrooms · 6 beds · 4 private bathrooms"
                />
                <StayCard
                  city="Da Nang"
                  address="27 Vũng Thùng 1, Sơn Trà, Đà Nẵng 550000, Vietnam"
                  dates="Nov 27, 2:00 PM – Nov 30, 12:00 PM"
                  nights="Check-in 2:00 PM Nov 27 · checkout 12:00 PM Nov 30 (leave for airport by 6:00 PM Nov 29)"
                  variant="da-nang"
                  images={daNangImages}
                  airbnbId="1786990244635048452"
                  airbnbHref="https://www.airbnb.co.uk/rooms/1786990244635048452?adults=1&s=66&source=embed_widget"
                  airbnbSummary="Home in Quận Sơn Trà · ★5.0 · 3 bedrooms · 4 beds · 4 bathrooms"
                />
              </div>
              <div className="rounded-[22px] border border-dashed border-[#e5cfa8] bg-white/60 p-5 text-sm leading-6 text-[#785c4e]">
                <span className="font-semibold text-[#2a1810]">Stay schedule notes:</span> Hoi An
                checkout is at <span className="font-semibold text-[#2a1810]">11:00 AM on Nov 27</span>, and
                Da Nang check-in is at <span className="font-semibold text-[#2a1810]">2:00 PM on Nov 27</span>.
                Da Nang checkout is at <span className="font-semibold text-[#2a1810]">12:00 PM on Nov 30</span>,
                but we will head to the airport by{" "}
                <span className="font-semibold text-[#2a1810]">6:00 PM on Nov 29</span>.
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
            onSelectPerson={(person) => {
              setOpenedFromDirectory(false);
              setSelectedPersonId(person.id);
            }}
          />
        )}
      </main>

      <PeopleDirectoryModal
        isOpen={isPeopleDirectoryOpen && !selectedPerson}
        people={people}
        expenses={expenses}
        todos={todos}
        vndPerPhp={vndPerPhp}
        onClose={() => setIsPeopleDirectoryOpen(false)}
        onSelectPerson={(person) => {
          setOpenedFromDirectory(true);
          setIsPeopleDirectoryOpen(false);
          setSelectedPersonId(person.id);
        }}
      />

      <PersonProfileModal
        person={selectedPerson}
        expenses={expenses}
        todos={todos}
        vndPerPhp={vndPerPhp}
        busyShareId={busyShareId}
        busyAssignmentKey={busyAssignmentKey}
        onClose={() => setSelectedPersonId(null)}
        onBackToList={
          openedFromDirectory
            ? () => {
                setSelectedPersonId(null);
                setIsPeopleDirectoryOpen(true);
              }
            : undefined
        }
        onSetSharePaid={handleSharePaid}
        onToggleAssignmentDone={handleToggleAssignmentDone}
        onUpdateProfile={handleUpdatePersonProfile}
      />

      <InstallAppModal
        isOpen={isInstallHelpOpen}
        canPromptNative={Boolean(deferredInstallPrompt)}
        onTriggerNativeInstall={() => void handleInstallAppClick()}
        onClose={() => setIsInstallHelpOpen(false)}
      />

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-[#d8be90] bg-[#f5e7cb]/95 px-2 pt-2 backdrop-blur-xl [padding-bottom:calc(0.5rem+env(safe-area-inset-bottom))] lg:hidden"
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
                className={`flex min-h-12 min-w-[64px] flex-col items-center justify-center gap-1 rounded-xl px-2 text-[10px] font-bold transition ${
                  activeView === item.id
                    ? "bg-[#1d4ed8] text-[#fde047] shadow-xs ring-1 ring-[#facc15]"
                    : "text-[#5c4b32] hover:bg-[#ead8b5]"
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
