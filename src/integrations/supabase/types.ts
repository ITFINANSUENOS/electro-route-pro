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
      config_metas_porcentajes: {
        Row: {
          created_at: string
          id: string
          porcentaje_aumento_1: number
          porcentaje_aumento_2: number
          porcentaje_aumento_3: number
          regional_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          porcentaje_aumento_1?: number
          porcentaje_aumento_2?: number
          porcentaje_aumento_3?: number
          regional_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          porcentaje_aumento_1?: number
          porcentaje_aumento_2?: number
          porcentaje_aumento_3?: number
          regional_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_metas_porcentajes_regional_id_fkey"
            columns: ["regional_id"]
            isOneToOne: true
            referencedRelation: "regionales"
            referencedColumns: ["id"]
          },
        ]
      }
      config_metas_promedio: {
        Row: {
          created_at: string
          id: string
          regional_id: string
          tipo_asesor: string
          tipo_venta: string
          updated_at: string
          valor_promedio: number
        }
        Insert: {
          created_at?: string
          id?: string
          regional_id: string
          tipo_asesor: string
          tipo_venta: string
          updated_at?: string
          valor_promedio?: number
        }
        Update: {
          created_at?: string
          id?: string
          regional_id?: string
          tipo_asesor?: string
          tipo_venta?: string
          updated_at?: string
          valor_promedio?: number
        }
        Relationships: [
          {
            foreignKeyName: "config_metas_promedio_regional_id_fkey"
            columns: ["regional_id"]
            isOneToOne: false
            referencedRelation: "regionales"
            referencedColumns: ["id"]
          },
        ]
      }
      coordinadores: {
        Row: {
          activo: boolean | null
          cedula: string
          correo: string | null
          created_at: string
          id: string
          nombre: string
          telefono: string | null
          user_id: string | null
          zona: string | null
        }
        Insert: {
          activo?: boolean | null
          cedula: string
          correo?: string | null
          created_at?: string
          id?: string
          nombre: string
          telefono?: string | null
          user_id?: string | null
          zona?: string | null
        }
        Update: {
          activo?: boolean | null
          cedula?: string
          correo?: string | null
          created_at?: string
          id?: string
          nombre?: string
          telefono?: string | null
          user_id?: string | null
          zona?: string | null
        }
        Relationships: []
      }
      evidencia_grupal: {
        Row: {
          created_at: string | null
          fecha: string
          foto_url: string
          gps_latitud: number | null
          gps_longitud: number | null
          hora_fin: string | null
          hora_inicio: string | null
          id: string
          municipio: string
          nombre_actividad: string | null
          notas: string | null
          subido_por: string
          tipo_actividad: string
          tipo_foto: string
        }
        Insert: {
          created_at?: string | null
          fecha: string
          foto_url: string
          gps_latitud?: number | null
          gps_longitud?: number | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          municipio: string
          nombre_actividad?: string | null
          notas?: string | null
          subido_por: string
          tipo_actividad: string
          tipo_foto: string
        }
        Update: {
          created_at?: string | null
          fecha?: string
          foto_url?: string
          gps_latitud?: number | null
          gps_longitud?: number | null
          hora_fin?: string | null
          hora_inicio?: string | null
          id?: string
          municipio?: string
          nombre_actividad?: string | null
          notas?: string | null
          subido_por?: string
          tipo_actividad?: string
          tipo_foto?: string
        }
        Relationships: []
      }
      formas_pago: {
        Row: {
          activo: boolean | null
          cod_forma: string | null
          codigo: string
          created_at: string
          id: string
          nombre: string
          tipo_venta: string
        }
        Insert: {
          activo?: boolean | null
          cod_forma?: string | null
          codigo: string
          created_at?: string
          id?: string
          nombre: string
          tipo_venta: string
        }
        Update: {
          activo?: boolean | null
          cod_forma?: string | null
          codigo?: string
          created_at?: string
          id?: string
          nombre?: string
          tipo_venta?: string
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
      historial_metas: {
        Row: {
          accion: string
          anio: number
          created_at: string
          id: string
          mes: number
          modificado_por: string | null
          monto_total_anterior: number | null
          monto_total_nuevo: number | null
          notas: string | null
          registros_afectados: number
        }
        Insert: {
          accion?: string
          anio: number
          created_at?: string
          id?: string
          mes: number
          modificado_por?: string | null
          monto_total_anterior?: number | null
          monto_total_nuevo?: number | null
          notas?: string | null
          registros_afectados?: number
        }
        Update: {
          accion?: string
          anio?: number
          created_at?: string
          id?: string
          mes?: number
          modificado_por?: string | null
          monto_total_anterior?: number | null
          monto_total_nuevo?: number | null
          notas?: string | null
          registros_afectados?: number
        }
        Relationships: []
      }
      jefes_ventas: {
        Row: {
          activo: boolean | null
          cedula: string
          codigo: string
          correo: string | null
          created_at: string
          id: string
          nombre: string
          regional_id: string | null
          telefono: string | null
        }
        Insert: {
          activo?: boolean | null
          cedula: string
          codigo: string
          correo?: string | null
          created_at?: string
          id?: string
          nombre: string
          regional_id?: string | null
          telefono?: string | null
        }
        Update: {
          activo?: boolean | null
          cedula?: string
          codigo?: string
          correo?: string | null
          created_at?: string
          id?: string
          nombre?: string
          regional_id?: string | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jefes_ventas_regional_id_fkey"
            columns: ["regional_id"]
            isOneToOne: false
            referencedRelation: "regionales"
            referencedColumns: ["id"]
          },
        ]
      }
      lideres_zona: {
        Row: {
          activo: boolean | null
          cedula: string
          correo: string | null
          created_at: string
          id: string
          nombre: string
          regional_id: string | null
          telefono: string | null
          user_id: string | null
          zona: string | null
        }
        Insert: {
          activo?: boolean | null
          cedula: string
          correo?: string | null
          created_at?: string
          id?: string
          nombre: string
          regional_id?: string | null
          telefono?: string | null
          user_id?: string | null
          zona?: string | null
        }
        Update: {
          activo?: boolean | null
          cedula?: string
          correo?: string | null
          created_at?: string
          id?: string
          nombre?: string
          regional_id?: string | null
          telefono?: string | null
          user_id?: string | null
          zona?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lideres_zona_regional_id_fkey"
            columns: ["regional_id"]
            isOneToOne: false
            referencedRelation: "regionales"
            referencedColumns: ["id"]
          },
        ]
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
          tipo_meta_categoria: string
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
          tipo_meta_categoria?: string
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
          tipo_meta_categoria?: string
          updated_at?: string
          user_id?: string | null
          valor_meta?: number
        }
        Relationships: []
      }
      periodos_ventas: {
        Row: {
          anio: number
          cerrado_por: string | null
          created_at: string
          estado: string
          fecha_cierre: string | null
          id: string
          mes: number
          monto_total: number | null
          registros_totales: number | null
          updated_at: string
        }
        Insert: {
          anio: number
          cerrado_por?: string | null
          created_at?: string
          estado?: string
          fecha_cierre?: string | null
          id?: string
          mes: number
          monto_total?: number | null
          registros_totales?: number | null
          updated_at?: string
        }
        Update: {
          anio?: number
          cerrado_por?: string | null
          created_at?: string
          estado?: string
          fecha_cierre?: string | null
          id?: string
          mes?: number
          monto_total?: number | null
          registros_totales?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      permisos_roles: {
        Row: {
          categoria: string
          created_at: string
          habilitado: boolean
          id: string
          permiso: string
          rol: string
          updated_at: string
        }
        Insert: {
          categoria?: string
          created_at?: string
          habilitado?: boolean
          id?: string
          permiso: string
          rol: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          habilitado?: boolean
          id?: string
          permiso?: string
          rol?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          activo: boolean | null
          ccosto_asesor: string | null
          cedula: string
          codigo_asesor: string | null
          codigo_jefe: string | null
          correo: string | null
          created_at: string
          id: string
          nombre_completo: string
          regional_id: string | null
          telefono: string | null
          tipo_asesor: string | null
          updated_at: string
          user_id: string
          zona: string | null
        }
        Insert: {
          activo?: boolean | null
          ccosto_asesor?: string | null
          cedula: string
          codigo_asesor?: string | null
          codigo_jefe?: string | null
          correo?: string | null
          created_at?: string
          id?: string
          nombre_completo: string
          regional_id?: string | null
          telefono?: string | null
          tipo_asesor?: string | null
          updated_at?: string
          user_id: string
          zona?: string | null
        }
        Update: {
          activo?: boolean | null
          ccosto_asesor?: string | null
          cedula?: string
          codigo_asesor?: string | null
          codigo_jefe?: string | null
          correo?: string | null
          created_at?: string
          id?: string
          nombre_completo?: string
          regional_id?: string | null
          telefono?: string | null
          tipo_asesor?: string | null
          updated_at?: string
          user_id?: string
          zona?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_regional_id_fkey"
            columns: ["regional_id"]
            isOneToOne: false
            referencedRelation: "regionales"
            referencedColumns: ["id"]
          },
        ]
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
          nombre: string | null
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
          nombre?: string | null
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
          nombre?: string | null
          tipo_actividad?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      regional_mappings: {
        Row: {
          activo: boolean
          creado_por: string | null
          created_at: string
          fecha_efectiva: string
          fecha_fin: string | null
          id: string
          notas: string | null
          source_cod_region: number
          source_regional_id: string
          target_cod_region: number
          target_regional_id: string
        }
        Insert: {
          activo?: boolean
          creado_por?: string | null
          created_at?: string
          fecha_efectiva?: string
          fecha_fin?: string | null
          id?: string
          notas?: string | null
          source_cod_region: number
          source_regional_id: string
          target_cod_region: number
          target_regional_id: string
        }
        Update: {
          activo?: boolean
          creado_por?: string | null
          created_at?: string
          fecha_efectiva?: string
          fecha_fin?: string | null
          id?: string
          notas?: string | null
          source_cod_region?: number
          source_regional_id?: string
          target_cod_region?: number
          target_regional_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "regional_mappings_source_regional_id_fkey"
            columns: ["source_regional_id"]
            isOneToOne: false
            referencedRelation: "regionales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regional_mappings_target_regional_id_fkey"
            columns: ["target_regional_id"]
            isOneToOne: false
            referencedRelation: "regionales"
            referencedColumns: ["id"]
          },
        ]
      }
      regionales: {
        Row: {
          activo: boolean | null
          codigo: number
          created_at: string
          id: string
          nombre: string
          zona: string | null
        }
        Insert: {
          activo?: boolean | null
          codigo: number
          created_at?: string
          id?: string
          nombre: string
          zona?: string | null
        }
        Update: {
          activo?: boolean | null
          codigo?: number
          created_at?: string
          id?: string
          nombre?: string
          zona?: string | null
        }
        Relationships: []
      }
      reportes_diarios: {
        Row: {
          consultas: number | null
          created_at: string
          estado_evidencia: string | null
          evidencia_completa: boolean | null
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
          estado_evidencia?: string | null
          evidencia_completa?: boolean | null
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
          estado_evidencia?: string | null
          evidencia_completa?: boolean | null
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
          asesor_nombre: string | null
          cantidad: number | null
          carga_id: string | null
          cargado_por: string | null
          categoria: string | null
          cedula_asesor: string | null
          cliente_direccion: string | null
          cliente_email: string | null
          cliente_identificacion: string | null
          cliente_nombre: string | null
          cliente_telefono: string | null
          cod_forma_pago: string | null
          cod_linea: string | null
          cod_marca: string | null
          cod_region: number | null
          codigo_asesor: string
          codigo_cco: string | null
          codigo_ean: string | null
          codigo_jefe: string | null
          created_at: string
          destino: string | null
          destino_nombre: string | null
          fecha: string
          forma_pago: string | null
          forma1_pago: string | null
          id: string
          iva: number | null
          jefe_ventas: string | null
          linea: string | null
          lote: string | null
          marca: string | null
          mcn_clase: string | null
          motivo_dev: string | null
          nombre_cco: string | null
          nombre_corto: string | null
          numero_doc: string | null
          producto: string | null
          referencia: string | null
          regional: string | null
          sede: string | null
          serial: string | null
          subtotal: number | null
          tipo_docum: string | null
          tipo_documento: string | null
          tipo_venta: string | null
          total: number | null
          user_id: string | null
          vtas_ant_i: number
          zona: string | null
        }
        Insert: {
          asesor_nombre?: string | null
          cantidad?: number | null
          carga_id?: string | null
          cargado_por?: string | null
          categoria?: string | null
          cedula_asesor?: string | null
          cliente_direccion?: string | null
          cliente_email?: string | null
          cliente_identificacion?: string | null
          cliente_nombre?: string | null
          cliente_telefono?: string | null
          cod_forma_pago?: string | null
          cod_linea?: string | null
          cod_marca?: string | null
          cod_region?: number | null
          codigo_asesor: string
          codigo_cco?: string | null
          codigo_ean?: string | null
          codigo_jefe?: string | null
          created_at?: string
          destino?: string | null
          destino_nombre?: string | null
          fecha: string
          forma_pago?: string | null
          forma1_pago?: string | null
          id?: string
          iva?: number | null
          jefe_ventas?: string | null
          linea?: string | null
          lote?: string | null
          marca?: string | null
          mcn_clase?: string | null
          motivo_dev?: string | null
          nombre_cco?: string | null
          nombre_corto?: string | null
          numero_doc?: string | null
          producto?: string | null
          referencia?: string | null
          regional?: string | null
          sede?: string | null
          serial?: string | null
          subtotal?: number | null
          tipo_docum?: string | null
          tipo_documento?: string | null
          tipo_venta?: string | null
          total?: number | null
          user_id?: string | null
          vtas_ant_i: number
          zona?: string | null
        }
        Update: {
          asesor_nombre?: string | null
          cantidad?: number | null
          carga_id?: string | null
          cargado_por?: string | null
          categoria?: string | null
          cedula_asesor?: string | null
          cliente_direccion?: string | null
          cliente_email?: string | null
          cliente_identificacion?: string | null
          cliente_nombre?: string | null
          cliente_telefono?: string | null
          cod_forma_pago?: string | null
          cod_linea?: string | null
          cod_marca?: string | null
          cod_region?: number | null
          codigo_asesor?: string
          codigo_cco?: string | null
          codigo_ean?: string | null
          codigo_jefe?: string | null
          created_at?: string
          destino?: string | null
          destino_nombre?: string | null
          fecha?: string
          forma_pago?: string | null
          forma1_pago?: string | null
          id?: string
          iva?: number | null
          jefe_ventas?: string | null
          linea?: string | null
          lote?: string | null
          marca?: string | null
          mcn_clase?: string | null
          motivo_dev?: string | null
          nombre_cco?: string | null
          nombre_corto?: string | null
          numero_doc?: string | null
          producto?: string | null
          referencia?: string | null
          regional?: string | null
          sede?: string | null
          serial?: string | null
          subtotal?: number | null
          tipo_docum?: string | null
          tipo_documento?: string | null
          tipo_venta?: string | null
          total?: number | null
          user_id?: string | null
          vtas_ant_i?: number
          zona?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ventas_carga_id_fkey"
            columns: ["carga_id"]
            isOneToOne: false
            referencedRelation: "carga_archivos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      profiles_with_roles: {
        Row: {
          activo: boolean | null
          ccosto_asesor: string | null
          cedula: string | null
          codigo_asesor: string | null
          codigo_jefe: string | null
          correo: string | null
          created_at: string | null
          id: string | null
          nombre_completo: string | null
          regional_codigo: number | null
          regional_id: string | null
          regional_nombre: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          telefono: string | null
          tipo_asesor: string | null
          updated_at: string | null
          user_id: string | null
          zona: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_regional_id_fkey"
            columns: ["regional_id"]
            isOneToOne: false
            referencedRelation: "regionales"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      advisor_can_view_sale: {
        Args: {
          sale_asesor_nombre: string
          sale_cedula_asesor: string
          sale_codigo_asesor: string
        }
        Returns: boolean
      }
      count_group_advisors: { Args: { p_codigo_jefe: string }; Returns: number }
      count_regional_advisors: {
        Args: { p_regional_id: string }
        Returns: number
      }
      get_advisor_group_position: {
        Args: {
          p_codigo_asesor: string
          p_codigo_jefe: string
          p_end_date: string
          p_start_date: string
        }
        Returns: number
      }
      get_advisor_regional_position: {
        Args: {
          p_codigo_asesor: string
          p_end_date: string
          p_regional_id: string
          p_start_date: string
        }
        Returns: number
      }
      get_effective_cod_region: {
        Args: { p_cod_region: number; p_fecha?: string }
        Returns: number
      }
      get_effective_regional_id: {
        Args: { p_fecha?: string; p_regional_id: string }
        Returns: string
      }
      get_top_regional_sales: {
        Args: {
          p_end_date: string
          p_regional_id: string
          p_start_date: string
        }
        Returns: number
      }
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
      is_colleague_in_activity: {
        Args: {
          p_fecha: string
          p_hora_fin: string
          p_hora_inicio: string
          p_municipio: string
          p_nombre: string
          p_tipo_actividad: string
          p_user_id: string
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
    },
  },
} as const
