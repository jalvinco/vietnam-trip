type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<Row, Insert, Update, Relationships extends Relationship[] = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

export type PersonRow = {
  id: string;
  name: string;
  age: number | null;
  created_at: string;
};

export type CategoryRow = {
  id: string;
  name: string;
};

export type ExpenseRow = {
  id: string;
  amount: number;
  is_peso: boolean;
  expense_category_id: string | null;
  description: string | null;
  spent_at: string;
  created_at: string;
};

export type ExpensePayerRow = {
  id: string;
  expense_id: string;
  person_id: string;
  amount_paid: number;
  created_at: string;
};

export type ExpenseShareRow = {
  id: string;
  expense_id: string;
  person_id: string;
  amount: number;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
};

export type ItineraryRow = {
  id: string;
  date: string;
  time: string | null;
  location_pin: string | null;
  location_name: string | null;
  address: string | null;
  google_place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  created_at: string;
};

export type TodoRow = {
  id: string;
  name: string;
  comment: string | null;
  done: boolean;
};

export type TodoAssignmentRow = {
  todo_id: string;
  person_id: string;
  is_done: boolean;
};

export type Database = {
  public: {
    Tables: {
      people: Table<
        PersonRow,
        { id?: string; name: string; age?: number | null; created_at?: string },
        { id?: string; name?: string; age?: number | null; created_at?: string }
      >;
      expense_categories: Table<
        CategoryRow,
        { id?: string; name: string },
        { id?: string; name?: string }
      >;
      expenses: Table<
        ExpenseRow,
        {
          id?: string;
          amount: number;
          is_peso?: boolean;
          expense_category_id?: string | null;
          description?: string | null;
          spent_at?: string;
          created_at?: string;
        },
        {
          id?: string;
          amount?: number;
          is_peso?: boolean;
          expense_category_id?: string | null;
          description?: string | null;
          spent_at?: string;
          created_at?: string;
        },
        [
          {
            foreignKeyName: "expenses_expense_category_id_fkey";
            columns: ["expense_category_id"];
            isOneToOne: false;
            referencedRelation: "expense_categories";
            referencedColumns: ["id"];
          },
        ]
      >;
      expense_payers: Table<
        ExpensePayerRow,
        {
          id?: string;
          expense_id: string;
          person_id: string;
          amount_paid: number;
          created_at?: string;
        },
        {
          id?: string;
          expense_id?: string;
          person_id?: string;
          amount_paid?: number;
          created_at?: string;
        },
        [
          {
            foreignKeyName: "expense_payers_expense_id_fkey";
            columns: ["expense_id"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expense_payers_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ]
      >;
      expense_shares: Table<
        ExpenseShareRow,
        {
          id?: string;
          expense_id: string;
          person_id: string;
          amount: number;
          is_paid?: boolean;
          paid_at?: string | null;
          created_at?: string;
        },
        {
          id?: string;
          expense_id?: string;
          person_id?: string;
          amount?: number;
          is_paid?: boolean;
          paid_at?: string | null;
          created_at?: string;
        },
        [
          {
            foreignKeyName: "expense_shares_expense_id_fkey";
            columns: ["expense_id"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "expense_shares_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ]
      >;
      itinerary: Table<
        ItineraryRow,
        {
          id?: string;
          date: string;
          time?: string | null;
          location_pin?: string | null;
          location_name?: string | null;
          address?: string | null;
          google_place_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          description?: string | null;
          created_at?: string;
        },
        {
          id?: string;
          date?: string;
          time?: string | null;
          location_pin?: string | null;
          location_name?: string | null;
          address?: string | null;
          google_place_id?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          description?: string | null;
          created_at?: string;
        }
      >;
      todos: Table<
        TodoRow,
        {
          id?: string;
          name: string;
          comment?: string | null;
          done?: boolean;
        },
        {
          id?: string;
          name?: string;
          comment?: string | null;
          done?: boolean;
        }
      >;
      todo_assignments: Table<
        TodoAssignmentRow,
        {
          todo_id: string;
          person_id: string;
          is_done?: boolean;
        },
        {
          todo_id?: string;
          person_id?: string;
          is_done?: boolean;
        },
        [
          {
            foreignKeyName: "todo_assignments_todo_id_fkey";
            columns: ["todo_id"];
            isOneToOne: false;
            referencedRelation: "todos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "todo_assignments_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ]
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
