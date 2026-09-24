// Generated from the Supabase schema (project theledgerloft); only the helper types at the bottom are simplified.
// Regenerate after every migration: Supabase MCP `generate_typescript_types`, or
// `npx supabase gen types typescript --project-id jjdetdabqbqktwkvodtk > src/lib/supabase/database.types.ts`.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      accounts_manual: {
        Row: {
          archived_at: string | null;
          created_at: string;
          created_by: string | null;
          household_id: string;
          id: string;
          kind: string;
          name: string;
          opening_balance_cents: number;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          household_id: string;
          id?: string;
          kind: string;
          name: string;
          opening_balance_cents?: number;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          household_id?: string;
          id?: string;
          kind?: string;
          name?: string;
          opening_balance_cents?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "accounts_manual_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_events: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string | null;
          household_id: string | null;
          id: number;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          household_id?: string | null;
          id?: never;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          household_id?: string | null;
          id?: never;
        };
        Relationships: [
          {
            foreignKeyName: "audit_events_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      budget_lines: {
        Row: {
          budget_id: string;
          category_id: string;
          created_at: string;
          household_id: string;
          id: string;
          planned_cents: number;
          updated_at: string;
        };
        Insert: {
          budget_id: string;
          category_id: string;
          created_at?: string;
          household_id: string;
          id?: string;
          planned_cents?: number;
          updated_at?: string;
        };
        Update: {
          budget_id?: string;
          category_id?: string;
          created_at?: string;
          household_id?: string;
          id?: string;
          planned_cents?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budget_lines_budget_id_household_id_fkey";
            columns: ["budget_id", "household_id"];
            isOneToOne: false;
            referencedRelation: "budgets";
            referencedColumns: ["id", "household_id"];
          },
          {
            foreignKeyName: "budget_lines_category_id_household_id_fkey";
            columns: ["category_id", "household_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "household_id"];
          },
          {
            foreignKeyName: "budget_lines_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      budgets: {
        Row: {
          checklist: Json;
          created_at: string;
          created_by: string | null;
          ends_on: string;
          household_id: string;
          id: string;
          period: string;
          starts_on: string;
          updated_at: string;
        };
        Insert: {
          checklist?: Json;
          created_at?: string;
          created_by?: string | null;
          ends_on: string;
          household_id: string;
          id?: string;
          period: string;
          starts_on: string;
          updated_at?: string;
        };
        Update: {
          checklist?: Json;
          created_at?: string;
          created_by?: string | null;
          ends_on?: string;
          household_id?: string;
          id?: string;
          period?: string;
          starts_on?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "budgets_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          archived_at: string | null;
          category_group: string;
          created_at: string;
          created_by: string | null;
          household_id: string;
          id: string;
          name: string;
          sort_order: number;
          system_key: string | null;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          category_group: string;
          created_at?: string;
          created_by?: string | null;
          household_id: string;
          id?: string;
          name: string;
          sort_order?: number;
          system_key?: string | null;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          category_group?: string;
          created_at?: string;
          created_by?: string | null;
          household_id?: string;
          id?: string;
          name?: string;
          sort_order?: number;
          system_key?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "categories_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      debt_payments: {
        Row: {
          amount_cents: number | null;
          created_at: string;
          created_by: string | null;
          debt_id: string;
          happened_on: string;
          household_id: string;
          id: string;
          kind: string;
          new_balance_cents: number | null;
          note: string | null;
          transaction_id: string | null;
        };
        Insert: {
          amount_cents?: number | null;
          created_at?: string;
          created_by?: string | null;
          debt_id: string;
          happened_on: string;
          household_id: string;
          id?: string;
          kind: string;
          new_balance_cents?: number | null;
          note?: string | null;
          transaction_id?: string | null;
        };
        Update: {
          amount_cents?: number | null;
          created_at?: string;
          created_by?: string | null;
          debt_id?: string;
          happened_on?: string;
          household_id?: string;
          id?: string;
          kind?: string;
          new_balance_cents?: number | null;
          note?: string | null;
          transaction_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "debt_payments_debt_id_household_id_fkey";
            columns: ["debt_id", "household_id"];
            isOneToOne: false;
            referencedRelation: "debts";
            referencedColumns: ["id", "household_id"];
          },
          {
            foreignKeyName: "debt_payments_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "debt_payments_transaction_id_household_id_fkey";
            columns: ["transaction_id", "household_id"];
            isOneToOne: false;
            referencedRelation: "transactions_manual";
            referencedColumns: ["id", "household_id"];
          },
        ];
      };
      debts: {
        Row: {
          archived_at: string | null;
          balance_cents: number;
          created_at: string;
          created_by: string | null;
          household_id: string;
          id: string;
          min_payment_cents: number;
          name: string;
          note: string | null;
          opening_balance_cents: number;
          paid_off_on: string | null;
          rate_bp: number | null;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          balance_cents: number;
          created_at?: string;
          created_by?: string | null;
          household_id: string;
          id?: string;
          min_payment_cents: number;
          name: string;
          note?: string | null;
          opening_balance_cents: number;
          paid_off_on?: string | null;
          rate_bp?: number | null;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          balance_cents?: number;
          created_at?: string;
          created_by?: string | null;
          household_id?: string;
          id?: string;
          min_payment_cents?: number;
          name?: string;
          note?: string | null;
          opening_balance_cents?: number;
          paid_off_on?: string | null;
          rate_bp?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "debts_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      entitlements: {
        Row: {
          created_at: string;
          ends_at: string;
          household_id: string;
          id: string;
          kind: string;
          payment_id: string | null;
          starts_at: string;
        };
        Insert: {
          created_at?: string;
          ends_at: string;
          household_id: string;
          id?: string;
          kind?: string;
          payment_id?: string | null;
          starts_at: string;
        };
        Update: {
          created_at?: string;
          ends_at?: string;
          household_id?: string;
          id?: string;
          kind?: string;
          payment_id?: string | null;
          starts_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "entitlements_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entitlements_payment_id_household_id_fkey";
            columns: ["payment_id", "household_id"];
            isOneToOne: true;
            referencedRelation: "payments";
            referencedColumns: ["id", "household_id"];
          },
        ];
      };
      exports: {
        Row: {
          created_at: string;
          created_by: string | null;
          expires_at: string;
          file_deleted_at: string | null;
          household_id: string;
          id: string;
          include_reflections: boolean;
          kind: string;
          period: string | null;
          spec_version: string;
          storage_path: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          file_deleted_at?: string | null;
          household_id: string;
          id?: string;
          include_reflections?: boolean;
          kind: string;
          period?: string | null;
          spec_version: string;
          storage_path?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          expires_at?: string;
          file_deleted_at?: string | null;
          household_id?: string;
          id?: string;
          include_reflections?: boolean;
          kind?: string;
          period?: string | null;
          spec_version?: string;
          storage_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "exports_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      goal_contributions: {
        Row: {
          amount_cents: number;
          created_at: string;
          created_by: string | null;
          direction: string;
          goal_id: string;
          happened_on: string;
          household_id: string;
          id: string;
          transaction_id: string | null;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          created_by?: string | null;
          direction: string;
          goal_id: string;
          happened_on: string;
          household_id: string;
          id?: string;
          transaction_id?: string | null;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          created_by?: string | null;
          direction?: string;
          goal_id?: string;
          happened_on?: string;
          household_id?: string;
          id?: string;
          transaction_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "goal_contributions_goal_id_household_id_fkey";
            columns: ["goal_id", "household_id"];
            isOneToOne: false;
            referencedRelation: "goals";
            referencedColumns: ["id", "household_id"];
          },
          {
            foreignKeyName: "goal_contributions_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "goal_contributions_transaction_id_household_id_fkey";
            columns: ["transaction_id", "household_id"];
            isOneToOne: false;
            referencedRelation: "transactions_manual";
            referencedColumns: ["id", "household_id"];
          },
        ];
      };
      goals: {
        Row: {
          archived_at: string | null;
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          due_period: string | null;
          household_id: string;
          id: string;
          kind: string;
          monthly_cents: number;
          name: string;
          starting_cents: number;
          target_cents: number;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          due_period?: string | null;
          household_id: string;
          id?: string;
          kind: string;
          monthly_cents?: number;
          name: string;
          starting_cents?: number;
          target_cents: number;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          due_period?: string | null;
          household_id?: string;
          id?: string;
          kind?: string;
          monthly_cents?: number;
          name?: string;
          starting_cents?: number;
          target_cents?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goals_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      household_members: {
        Row: {
          created_at: string;
          household_id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          household_id: string;
          role?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          household_id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      households: {
        Row: {
          budget_style: string;
          checklist_hidden: string[];
          created_at: string;
          created_by: string | null;
          currency: string;
          debt_method: string;
          id: string;
          month_start_day: number;
          name: string;
          pay_frequency: string;
          setup_completed_at: string | null;
          setup_step: string | null;
          updated_at: string;
        };
        Insert: {
          budget_style?: string;
          checklist_hidden?: string[];
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          debt_method?: string;
          id?: string;
          month_start_day?: number;
          name?: string;
          pay_frequency?: string;
          setup_completed_at?: string | null;
          setup_step?: string | null;
          updated_at?: string;
        };
        Update: {
          budget_style?: string;
          checklist_hidden?: string[];
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          debt_method?: string;
          id?: string;
          month_start_day?: number;
          name?: string;
          pay_frequency?: string;
          setup_completed_at?: string | null;
          setup_step?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      income_items: {
        Row: {
          archived_at: string | null;
          created_at: string;
          created_by: string | null;
          household_id: string;
          id: string;
          monthly_cents: number;
          name: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          household_id: string;
          id?: string;
          monthly_cents: number;
          name: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          household_id?: string;
          id?: string;
          monthly_cents?: number;
          name?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "income_items_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      monthly_checkins: {
        Row: {
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          household_id: string;
          id: string;
          next_actions: Json;
          period: string;
          surprised: string | null;
          updated_at: string;
          went_well: string | null;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          household_id: string;
          id?: string;
          next_actions?: Json;
          period: string;
          surprised?: string | null;
          updated_at?: string;
          went_well?: string | null;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          household_id?: string;
          id?: string;
          next_actions?: Json;
          period?: string;
          surprised?: string | null;
          updated_at?: string;
          went_well?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "monthly_checkins_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          access_days: number;
          amount_cents: number;
          completed_at: string | null;
          created_at: string;
          household_id: string;
          id: string;
          pf_payment_id: string | null;
          pf_status: string | null;
          plan_code: string;
          reject_reason: string | null;
          status: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          access_days: number;
          amount_cents: number;
          completed_at?: string | null;
          created_at?: string;
          household_id: string;
          id?: string;
          pf_payment_id?: string | null;
          pf_status?: string | null;
          plan_code: string;
          reject_reason?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          access_days?: number;
          amount_cents?: number;
          completed_at?: string | null;
          created_at?: string;
          household_id?: string;
          id?: string;
          pf_payment_id?: string | null;
          pf_status?: string | null;
          plan_code?: string;
          reject_reason?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      transactions_manual: {
        Row: {
          amount_cents: number;
          category_id: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          description: string | null;
          household_id: string;
          id: string;
          income_item_id: string | null;
          kind: string;
          occurred_on: string;
          period: string;
          updated_at: string;
        };
        Insert: {
          amount_cents: number;
          category_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          household_id: string;
          id?: string;
          income_item_id?: string | null;
          kind: string;
          occurred_on: string;
          period?: string;
          updated_at?: string;
        };
        Update: {
          amount_cents?: number;
          category_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          description?: string | null;
          household_id?: string;
          id?: string;
          income_item_id?: string | null;
          kind?: string;
          occurred_on?: string;
          period?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_manual_category_id_household_id_fkey";
            columns: ["category_id", "household_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id", "household_id"];
          },
          {
            foreignKeyName: "transactions_manual_household_id_fkey";
            columns: ["household_id"];
            isOneToOne: false;
            referencedRelation: "households";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "transactions_manual_income_item_id_household_id_fkey";
            columns: ["income_item_id", "household_id"];
            isOneToOne: false;
            referencedRelation: "income_items";
            referencedColumns: ["id", "household_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      add_category: {
        Args: { p_budget: string; p_group: string; p_name: string; p_planned: number };
        Returns: string;
      };
      create_debt: {
        Args: {
          p_balance: number;
          p_min: number;
          p_name: string;
          p_note: string | null;
          p_rate: number | null;
        };
        Returns: string;
      };
      create_goal: {
        Args: {
          p_due: string | null;
          p_kind: string;
          p_monthly: number;
          p_name: string;
          p_starting: number;
          p_target: number;
        };
        Returns: string;
      };
      debt_record_payment: {
        Args: {
          p_cents: number;
          p_confirm_over?: boolean;
          p_debt: string;
          p_note: string | null;
          p_on: string;
        };
        Returns: number;
      };
      debt_set_balance: {
        Args: { p_cents: number; p_debt: string; p_note: string | null; p_on: string };
        Returns: undefined;
      };
      ensure_budget: { Args: { p_period: string }; Returns: string };
      goal_move_money: {
        Args: { p_cents: number; p_direction: string; p_goal: string; p_on: string };
        Returns: string;
      };
      payfast_apply_itn: {
        Args: {
          p_amount_cents: number;
          p_merchant_ok: boolean;
          p_payment_id: string;
          p_pf_payment_id: string;
          p_secret: string;
          p_status: string;
        };
        Returns: string;
      };
      move_budget_money: {
        Args: { p_budget: string; p_cents: number; p_from: string; p_to: string };
        Returns: undefined;
      };
      period_range: {
        Args: { p_period: string; start_day: number };
        Returns: Record<string, unknown>;
      };
      remove_category: { Args: { p_category: string }; Returns: string };
      remove_debt: { Args: { p_debt: string; p_mode: string }; Returns: string };
      remove_goal: { Args: { p_goal: string; p_mode: string }; Returns: string };
      period_bounds: {
        Args: { d: string; start_day: number };
        Returns: Record<string, unknown>;
      };
      period_for: { Args: { d: string; start_day: number }; Returns: string };
      plan_offer: {
        Args: { p_plan?: string };
        Returns: { access_days: number; name: string; open: boolean; price_cents: number | null }[];
      };
      save_checkin: {
        Args: {
          p_next: Json;
          p_period: string;
          p_surprised: string | null;
          p_went_well: string | null;
        };
        Returns: undefined;
      };
      start_checkout: {
        Args: { p_plan?: string };
        Returns: { amount_cents: number; item_name: string; payment_id: string }[];
      };
      setup_complete: { Args: never; Returns: undefined };
      setup_save_basics: {
        Args: {
          p_budget_style: string;
          p_month_start_day: number;
          p_pay_frequency: string;
        };
        Returns: undefined;
      };
      setup_save_categories: {
        Args: { p_group: string; p_items: Json };
        Returns: string[];
      };
      setup_save_debts_goals: {
        Args: { p_debts: Json; p_goals: Json };
        Returns: Json;
      };
      setup_save_income: { Args: { p_items: Json }; Returns: string[] };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<TableName extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][TableName]["Row"];
export type TablesInsert<TableName extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][TableName]["Insert"];
export type TablesUpdate<TableName extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][TableName]["Update"];
