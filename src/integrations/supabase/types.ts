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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ingredients: {
        Row: {
          created_at: string
          id: string
          min_threshold: number
          name: string
          restaurant_id: string
          stock_qty: number
          unit: string
        }
        Insert: {
          created_at?: string
          id?: string
          min_threshold?: number
          name: string
          restaurant_id: string
          stock_qty?: number
          unit: string
        }
        Update: {
          created_at?: string
          id?: string
          min_threshold?: number
          name?: string
          restaurant_id?: string
          stock_qty?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          category: Database["public"]["Enums"]["menu_category"]
          created_at: string
          description: string | null
          goes_to_kitchen: boolean
          id: string
          name: string
          photo: string | null
          price: number
          restaurant_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["menu_category"]
          created_at?: string
          description?: string | null
          goes_to_kitchen?: boolean
          id?: string
          name: string
          photo?: string | null
          price?: number
          restaurant_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["menu_category"]
          created_at?: string
          description?: string | null
          goes_to_kitchen?: boolean
          id?: string
          name?: string
          photo?: string | null
          price?: number
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          delivery_status: Database["public"]["Enums"]["item_delivery_status"]
          id: string
          menu_item_category: Database["public"]["Enums"]["menu_category"]
          menu_item_goes_to_kitchen: boolean
          menu_item_id: string | null
          menu_item_name: string
          menu_item_price: number
          notes: string | null
          order_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          delivery_status?: Database["public"]["Enums"]["item_delivery_status"]
          id?: string
          menu_item_category: Database["public"]["Enums"]["menu_category"]
          menu_item_goes_to_kitchen?: boolean
          menu_item_id?: string | null
          menu_item_name: string
          menu_item_price: number
          notes?: string | null
          order_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          delivery_status?: Database["public"]["Enums"]["item_delivery_status"]
          id?: string
          menu_item_category?: Database["public"]["Enums"]["menu_category"]
          menu_item_goes_to_kitchen?: boolean
          menu_item_id?: string | null
          menu_item_name?: string
          menu_item_price?: number
          notes?: string | null
          order_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          bill_requested_at: string | null
          created_at: string
          id: string
          payment_type: Database["public"]["Enums"]["payment_type_enum"] | null
          restaurant_id: string
          status: Database["public"]["Enums"]["order_status"]
          table_id: string
          table_name: string
          waiter_id: string | null
          waiter_name: string
        }
        Insert: {
          bill_requested_at?: string | null
          created_at?: string
          id?: string
          payment_type?: Database["public"]["Enums"]["payment_type_enum"] | null
          restaurant_id: string
          status?: Database["public"]["Enums"]["order_status"]
          table_id: string
          table_name?: string
          waiter_id?: string | null
          waiter_name?: string
        }
        Update: {
          bill_requested_at?: string | null
          created_at?: string
          id?: string
          payment_type?: Database["public"]["Enums"]["payment_type_enum"] | null
          restaurant_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          table_id?: string
          table_name?: string
          waiter_id?: string | null
          waiter_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string
          restaurant_id: string | null
        }
        Insert: {
          created_at?: string
          id: string
          name?: string
          restaurant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          id: string
          ingredient_id: string
          menu_item_id: string
          quantity: number
        }
        Insert: {
          id?: string
          ingredient_id: string
          menu_item_id: string
          quantity?: number
        }
        Update: {
          id?: string
          ingredient_id?: string
          menu_item_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipes_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          capacity: number
          created_at: string
          id: string
          name: string
          restaurant_id: string
          status: Database["public"]["Enums"]["table_status"]
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          name: string
          restaurant_id: string
          status?: Database["public"]["Enums"]["table_status"]
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          name?: string
          restaurant_id?: string
          status?: Database["public"]["Enums"]["table_status"]
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      compute_and_set_table_status: {
        Args: { _table_id: string }
        Returns: undefined
      }
      get_user_restaurant_id: { Args: { _user_id: string }; Returns: string }
      handle_signup:
        | {
            Args: {
              _name: string
              _role: Database["public"]["Enums"]["app_role"]
            }
            Returns: undefined
          }
        | {
            Args: {
              _name: string
              _role: Database["public"]["Enums"]["app_role"]
              _user_id?: string
            }
            Returns: undefined
          }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "manager" | "waiter" | "kitchen"
      item_delivery_status:
        | "nuevo"
        | "en_preparacion"
        | "para_entregar"
        | "entregado"
      menu_category: "entradas" | "principales" | "postres" | "bebidas"
      order_status:
        | "nuevo"
        | "en_preparacion"
        | "listo"
        | "entregado"
        | "pagado"
      payment_type_enum: "efectivo" | "tarjeta" | "sin_especificar"
      table_status:
        | "free"
        | "occupied_waiting"
        | "cooking"
        | "ready"
        | "occupied_all_served"
        | "bill_requested"
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
      app_role: ["owner", "manager", "waiter", "kitchen"],
      item_delivery_status: [
        "nuevo",
        "en_preparacion",
        "para_entregar",
        "entregado",
      ],
      menu_category: ["entradas", "principales", "postres", "bebidas"],
      order_status: ["nuevo", "en_preparacion", "listo", "entregado", "pagado"],
      payment_type_enum: ["efectivo", "tarjeta", "sin_especificar"],
      table_status: [
        "free",
        "occupied_waiting",
        "cooking",
        "ready",
        "occupied_all_served",
        "bill_requested",
      ],
    },
  },
} as const
