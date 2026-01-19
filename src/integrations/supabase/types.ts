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
      carga_archivos: {
        Row: {
          cargado_por: string | null
          created_at: string
          estado: string | null
          id: string
          mensaje_error: string | null
          nombre_archivo: string
          registros_procesados: number | null
          tipo: string
        }
        Insert: {
          cargado_por?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          mensaje_error?: string | null
          nombre_archivo: string
          registros_procesados?: number | null
          tipo: string
        }
        Update: {
          cargado_por?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          mensaje_error?: string | null
          nombre_archivo?: string
          registros_procesados?: number | null
          tipo?: string
        }
        Relationships: []
      }
      historial_ediciones: {
        Row: {
          campo_editado: string
          created_at: string
          id: string
          modificado_por: string | null
          registro_id: string
          tabla: string
          valor_anterior: string | null
          valor_nuevo: string | null
        }
        Insert: {
          campo_editado: string
          created_at?: string
          id?: string
          modificado_por?: string | null
          registro_id: string
          tabla: string
          valor_anterior?: string | null
          valor_nuevo?: string | null
        }
        Update: {
          campo_editado?: string
          created_at?: string
          id?: string
          modificado_por?: string | null
          registro_id?: string
          tabla?: string
          valor_anterior?: string | null
          valor_nuevo?: string | null
        }
        Relationships: []
      }
      metas: {
        Row: {
          anio: number
          cargado_por: string | null
          codigo_asesor: string
          created_at: string
          id: string
          mes: number
          tipo_meta: string | null
          updated_at: string
          user_id: string | null
          valor_meta: number
        }
        Insert: {
          anio: number
          cargado_por?: string | null
          codigo_asesor: string
          created_at?: string
          id?: string
          mes: number
          tipo_meta?: string | null
          updated_at?: string
          user_id?: string | null
          valor_meta: number
        }
        Update: {
          anio?: number
          cargado_por?: string | null
          codigo_asesor?: string
          created_at?: string
          id?: string
          mes?: number
          tipo_meta?: string | null
          updated_at?: string
          user_id?: string | null
          valor_meta?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activo: boolean | null
          cedula: string
          created_at: string
          id: string
          nombre_completo: string
          telefono: string | null
          updated_at: string
          user_id: string
          zona: Database["public"]["Enums"]["zone_type"] | null
        }
        Insert: {
          activo?: boolean | null
          cedula: string
          created_at?: string
          id?: string
          nombre_completo: string
          telefono?: string | null
          updated_at?: string
          user_id: string
          zona?: Database["public"]["Enums"]["zone_type"] | null
        }
        Update: {
          activo?: boolean | null
          cedula?: string
          created_at?: string
          id?: string
          nombre_completo?: string
          telefono?: string | null
          updated_at?: string
          user_id?: string
          zona?: Database["public"]["Enums"]["zone_type"] | null
        }
        Relationships: []
      }
      programacion: {
        Row: {
          creado_por: string | null
          created_at: string
          fecha: string
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          latitud: number | null
          longitud: number | null
          municipio: string
          tipo_actividad: Database["public"]["Enums"]["activity_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          creado_por?: string | null
          created_at?: string
          fecha: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          latitud?: number | null
          longitud?: number | null
          municipio: string
          tipo_actividad: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          creado_por?: string | null
          created_at?: string
          fecha?: string
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          latitud?: number | null
          longitud?: number | null
          municipio?: string
          tipo_actividad?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reportes_diarios: {
        Row: {
          consultas: number | null
          created_at: string
          fecha: string
          foto_url: string | null
          gps_latitud: number | null
          gps_longitud: number | null
          hora_registro: string
          id: string
          notas: string | null
          solicitudes: number | null
          user_id: string
        }
        Insert: {
          consultas?: number | null
          created_at?: string
          fecha?: string
          foto_url?: string | null
          gps_latitud?: number | null
          gps_longitud?: number | null
          hora_registro?: string
          id?: string
          notas?: string | null
          solicitudes?: number | null
          user_id: string
        }
        Update: {
          consultas?: number | null
          created_at?: string
          fecha?: string
          foto_url?: string | null
          gps_latitud?: number | null
          gps_longitud?: number | null
          hora_registro?: string
          id?: string
          notas?: string | null
          solicitudes?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      ventas: {
        Row: {
          cargado_por: string | null
          celular_cliente: string | null
          codigo_asesor: string
          created_at: string
          fecha: string
          forma_pago: string | null
          id: string
          producto: string | null
          regional: string | null
          tipo_cliente: string | null
          user_id: string | null
          valor_venta: number
          zona: Database["public"]["Enums"]["zone_type"] | null
        }
        Insert: {
          cargado_por?: string | null
          celular_cliente?: string | null
          codigo_asesor: string
          created_at?: string
          fecha: string
          forma_pago?: string | null
          id?: string
          producto?: string | null
          regional?: string | null
          tipo_cliente?: string | null
          user_id?: string | null
          valor_venta: number
          zona?: Database["public"]["Enums"]["zone_type"] | null
        }
        Update: {
          cargado_por?: string | null
          celular_cliente?: string | null
          codigo_asesor?: string
          created_at?: string
          fecha?: string
          forma_pago?: string | null
          id?: string
          producto?: string | null
          regional?: string | null
          tipo_cliente?: string | null
          user_id?: string | null
          valor_venta?: number
          zona?: Database["public"]["Enums"]["zone_type"] | null
        }
        Relationships: []
      }
    }
    Views: {
      profiles_with_roles: {
        Row: {
          activo: boolean | null
          cedula: string | null
          created_at: string | null
          id: string | null
          nombre_completo: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          telefono: string | null
          updated_at: string | null
          user_id: string | null
          zona: Database["public"]["Enums"]["zone_type"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
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
      activity_type: "punto" | "correria" | "libre"
      app_role:
        | "asesor_comercial"
        | "jefe_ventas"
        | "lider_zona"
        | "coordinador_comercial"
        | "administrativo"
        | "administrador"
      zone_type: "norte" | "sur" | "centro" | "oriente"
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
      activity_type: ["punto", "correria", "libre"],
      app_role: [
        "asesor_comercial",
        "jefe_ventas",
        "lider_zona",
        "coordinador_comercial",
        "administrativo",
        "administrador",
      ],
      zone_type: ["norte", "sur", "centro", "oriente"],
    },
  },
} as const
