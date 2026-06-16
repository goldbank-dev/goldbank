export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          admin_id: string
          created_at: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          operation: string
          target_id: string | null
          target_table: string
        }
        Insert: {
          admin_id: string
          created_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          operation: string
          target_id?: string | null
          target_table: string
        }
        Update: {
          admin_id?: string
          created_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          operation?: string
          target_id?: string | null
          target_table?: string
        }
        Relationships: []
      }
      admin_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          target_id: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          target_id?: string | null
        }
        Relationships: []
      }
      audit_events: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          idempotency_key: string | null
          payload: Json | null
          status: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          idempotency_key?: string | null
          payload?: Json | null
          status: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          idempotency_key?: string | null
          payload?: Json | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      core_transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: Database["public"]["Enums"]["currency_type"]
          description: string | null
          id: string
          reference: string | null
          status: Database["public"]["Enums"]["tx_status"]
          type: Database["public"]["Enums"]["tx_type"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency: Database["public"]["Enums"]["currency_type"]
          description?: string | null
          id?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          type: Database["public"]["Enums"]["tx_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          description?: string | null
          id?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["tx_status"]
          type?: Database["public"]["Enums"]["tx_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "core_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      financial_requests: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          receipt_url: string | null
          rejection_reason: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          receipt_url?: string | null
          rejection_reason?: string | null
          status?: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          receipt_url?: string | null
          rejection_reason?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      idempotency_keys: {
        Row: {
          created_at: string | null
          id: string
          key: string
          response_data: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          response_data?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          response_data?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      kyc_documents: {
        Row: {
          created_at: string | null
          document_type: string
          document_url: string
          id: string
          review_notes: string | null
          reviewed_by: string | null
          status: string | null
          submission_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          document_type: string
          document_url: string
          id?: string
          review_notes?: string | null
          reviewed_by?: string | null
          status?: string | null
          submission_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          document_type?: string
          document_url?: string
          id?: string
          review_notes?: string | null
          reviewed_by?: string | null
          status?: string | null
          submission_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      ledger_accounts: {
        Row: {
          balance: number
          created_at: string | null
          currency: Database["public"]["Enums"]["currency_type"]
          id: string
          type: Database["public"]["Enums"]["account_type"]
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          balance?: number
          created_at?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          id?: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          balance?: number
          created_at?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          id?: string
          type?: Database["public"]["Enums"]["account_type"]
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ledger_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_city: string | null
          address_state: string | null
          avatar_url: string | null
          city: string | null
          complement: string | null
          created_at: string
          currency_balance: number | null
          display_name: string | null
          document_number: string | null
          document_type: string | null
          gold_balance: number | null
          id: string
          neighborhood: string | null
          number: string | null
          phone: string | null
          state: string | null
          street: string | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address_city?: string | null
          address_state?: string | null
          avatar_url?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string
          currency_balance?: number | null
          display_name?: string | null
          document_number?: string | null
          document_type?: string | null
          gold_balance?: number | null
          id?: string
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address_city?: string | null
          address_state?: string | null
          avatar_url?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string
          currency_balance?: number | null
          display_name?: string | null
          document_number?: string | null
          document_type?: string | null
          gold_balance?: number | null
          id?: string
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      security_alert_dispatches: {
        Row: {
          channels: Json
          details: Json | null
          dispatched_at: string
          email_status: string | null
          event_count: number
          id: string
          threshold: number
          webhook_status: string | null
          window_minutes: number
        }
        Insert: {
          channels?: Json
          details?: Json | null
          dispatched_at?: string
          email_status?: string | null
          event_count: number
          id?: string
          threshold: number
          webhook_status?: string | null
          window_minutes: number
        }
        Update: {
          channels?: Json
          details?: Json | null
          dispatched_at?: string
          email_status?: string | null
          event_count?: number
          id?: string
          threshold?: number
          webhook_status?: string | null
          window_minutes?: number
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          actor_id: string | null
          attempted_payload: Json | null
          event_type: string
          id: string
          metadata: Json | null
          occurred_at: string
          reason: string
          request_id: string | null
          target_function: string | null
          target_table: string | null
        }
        Insert: {
          actor_id?: string | null
          attempted_payload?: Json | null
          event_type: string
          id?: string
          metadata?: Json | null
          occurred_at?: string
          reason: string
          request_id?: string | null
          target_function?: string | null
          target_table?: string | null
        }
        Update: {
          actor_id?: string | null
          attempted_payload?: Json | null
          event_type?: string
          id?: string
          metadata?: Json | null
          occurred_at?: string
          reason?: string
          request_id?: string | null
          target_function?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      token_price_history: {
        Row: {
          id: string
          price: number
          recorded_at: string | null
          token_id: string | null
        }
        Insert: {
          id?: string
          price: number
          recorded_at?: string | null
          token_id?: string | null
        }
        Update: {
          id?: string
          price?: number
          recorded_at?: string | null
          token_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "token_price_history_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_prices: {
        Row: {
          created_at: string | null
          id: string
          price: number
          token_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          price: number
          token_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          price?: number
          token_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_prices_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      token_reserves: {
        Row: {
          amount: number
          asset: string
          created_at: string | null
          id: string
          token_id: string
        }
        Insert: {
          amount: number
          asset: string
          created_at?: string | null
          id?: string
          token_id: string
        }
        Update: {
          amount?: number
          asset?: string
          created_at?: string | null
          id?: string
          token_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "token_reserves_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      tokens: {
        Row: {
          audit_status: string | null
          circulating_supply: number | null
          created_at: string | null
          current_price: number
          custody_location: string | null
          decimals: number | null
          id: string
          is_active: boolean | null
          last_audit_date: string | null
          name: string
          symbol: string
          total_supply: number | null
          updated_at: string | null
        }
        Insert: {
          audit_status?: string | null
          circulating_supply?: number | null
          created_at?: string | null
          current_price: number
          custody_location?: string | null
          decimals?: number | null
          id?: string
          is_active?: boolean | null
          last_audit_date?: string | null
          name: string
          symbol: string
          total_supply?: number | null
          updated_at?: string | null
        }
        Update: {
          audit_status?: string | null
          circulating_supply?: number | null
          created_at?: string | null
          current_price?: number
          custody_location?: string | null
          decimals?: number | null
          id?: string
          is_active?: boolean | null
          last_audit_date?: string | null
          name?: string
          symbol?: string
          total_supply?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transaction_entries: {
        Row: {
          account_id: string
          amount: number
          created_at: string | null
          entry_type: string
          id: string
          transaction_id: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string | null
          entry_type: string
          id?: string
          transaction_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string | null
          entry_type?: string
          id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "core_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_currency: number
          amount_grams: number
          created_at: string | null
          description: string | null
          fee: number | null
          gold_price_at_time: number
          id: string
          status: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount_currency: number
          amount_grams: number
          created_at?: string | null
          description?: string | null
          fee?: number | null
          gold_price_at_time: number
          id?: string
          status?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount_currency?: number
          amount_grams?: number
          created_at?: string | null
          description?: string | null
          fee?: number | null
          gold_price_at_time?: number
          id?: string
          status?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_user_id_fkey_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      transfer_audit_events: {
        Row: {
          amount: number
          created_at: string
          currency: string
          error_message: string | null
          id: string
          idempotency_key: string | null
          metadata: Json | null
          receiver_id: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          receiver_id?: string | null
          status: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          receiver_id?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string | null
          granted: boolean | null
          id: string
          permission_key: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted?: boolean | null
          id?: string
          permission_key: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted?: boolean | null
          id?: string
          permission_key?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_change_user_role: {
        Args: {
          _new_role: Database["public"]["Enums"]["app_role"]
          _reason?: string
          _target_user_id: string
        }
        Returns: Json
      }
      admin_reset_user_password: {
        Args: { new_password: string; target_user_id: string }
        Returns: Json
      }
      create_ledger_deposit: {
        Args: {
          p_amount: number
          p_currency: Database["public"]["Enums"]["currency_type"]
          p_description?: string
          p_idempotency_key?: string
          p_user_id: string
        }
        Returns: Json
      }
      create_ledger_withdrawal: {
        Args: {
          p_amount: number
          p_currency: Database["public"]["Enums"]["currency_type"]
          p_description?: string
          p_idempotency_key?: string
          p_user_id: string
        }
        Returns: Json
      }
      execute_trade: {
        Args: { p_amount: number; p_type: string }
        Returns: Json
      }
      has_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_kyc_approved: { Args: { _user_id: string }; Returns: boolean }
      kyc_is_required: { Args: never; Returns: boolean }
      log_security_event: {
        Args: {
          _event_type: string
          _metadata?: Json
          _payload?: Json
          _reason: string
          _target_function?: string
          _target_table?: string
        }
        Returns: undefined
      }
      mask_sensitive_jsonb: { Args: { p_payload: Json }; Returns: Json }
      perform_ledger_transfer: {
        Args: {
          p_amount: number
          p_currency: Database["public"]["Enums"]["currency_type"]
          p_description?: string
          p_idempotency_key?: string
          p_receiver_id: string
          p_sender_id: string
          p_tx_type: Database["public"]["Enums"]["tx_type"]
        }
        Returns: Json
      }
    }
    Enums: {
      account_type: "USER" | "SYSTEM" | "FEE" | "RESERVE" | "LIQUIDITY"
      app_role: "admin" | "user" | "manager"
      currency_type: "BRL" | "TOKEN"
      kyc_status: "PENDING" | "APPROVED" | "REJECTED"
      tx_status: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED"
      tx_type:
        | "DEPOSIT"
        | "WITHDRAW"
        | "TRANSFER"
        | "TOKEN_BUY"
        | "TOKEN_SELL"
        | "FEE"
        | "ADJUSTMENT"
      user_status: "ACTIVE" | "BLOCKED" | "PENDING"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_type: ["USER", "SYSTEM", "FEE", "RESERVE", "LIQUIDITY"],
      app_role: ["admin", "user", "manager"],
      currency_type: ["BRL", "TOKEN"],
      kyc_status: ["PENDING", "APPROVED", "REJECTED"],
      tx_status: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
      tx_type: [
        "DEPOSIT",
        "WITHDRAW",
        "TRANSFER",
        "TOKEN_BUY",
        "TOKEN_SELL",
        "FEE",
        "ADJUSTMENT",
      ],
      user_status: ["ACTIVE", "BLOCKED", "PENDING"],
    },
  },
} as const
