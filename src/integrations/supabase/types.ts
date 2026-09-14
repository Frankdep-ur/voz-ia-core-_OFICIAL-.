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
      agentes: {
        Row: {
          criado_em: string
          encerrar_automaticamente: boolean
          frase_despedida: string | null
          id: string
          idioma: string
          nome: string | null
          persona_prompt: string | null
          saudacao_inicial: string | null
          silencio_para_encerrar_segundos: number
          user_id: string
          velocidade_fala: number
          voz_estabilidade: number
          voz_estilo: number
          voz_id: string | null
          voz_similaridade: number
        }
        Insert: {
          criado_em?: string
          encerrar_automaticamente?: boolean
          frase_despedida?: string | null
          id?: string
          idioma?: string
          nome?: string | null
          persona_prompt?: string | null
          saudacao_inicial?: string | null
          silencio_para_encerrar_segundos?: number
          user_id: string
          velocidade_fala?: number
          voz_estabilidade?: number
          voz_estilo?: number
          voz_id?: string | null
          voz_similaridade?: number
        }
        Update: {
          criado_em?: string
          encerrar_automaticamente?: boolean
          frase_despedida?: string | null
          id?: string
          idioma?: string
          nome?: string | null
          persona_prompt?: string | null
          saudacao_inicial?: string | null
          silencio_para_encerrar_segundos?: number
          user_id?: string
          velocidade_fala?: number
          voz_estabilidade?: number
          voz_estilo?: number
          voz_id?: string | null
          voz_similaridade?: number
        }
        Relationships: []
      }
      campanha_contatos: {
        Row: {
          atualizado_em: string
          campanha_id: string
          contato_id: string
          id: string
          status: Database["public"]["Enums"]["app_status_campanha_contato"]
          tentativas: number
        }
        Insert: {
          atualizado_em?: string
          campanha_id: string
          contato_id: string
          id?: string
          status?: Database["public"]["Enums"]["app_status_campanha_contato"]
          tentativas?: number
        }
        Update: {
          atualizado_em?: string
          campanha_id?: string
          contato_id?: string
          id?: string
          status?: Database["public"]["Enums"]["app_status_campanha_contato"]
          tentativas?: number
        }
        Relationships: [
          {
            foreignKeyName: "campanha_contatos_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campanha_contatos_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      campanhas: {
        Row: {
          agendada_para: string | null
          agente_id: string | null
          criado_em: string
          id: string
          max_tentativas: number
          nome: string | null
          status: Database["public"]["Enums"]["app_status_campanha"]
          user_id: string
        }
        Insert: {
          agendada_para?: string | null
          agente_id?: string | null
          criado_em?: string
          id?: string
          max_tentativas?: number
          nome?: string | null
          status?: Database["public"]["Enums"]["app_status_campanha"]
          user_id: string
        }
        Update: {
          agendada_para?: string | null
          agente_id?: string | null
          criado_em?: string
          id?: string
          max_tentativas?: number
          nome?: string | null
          status?: Database["public"]["Enums"]["app_status_campanha"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campanhas_agente_id_fkey"
            columns: ["agente_id"]
            isOneToOne: false
            referencedRelation: "agentes"
            referencedColumns: ["id"]
          },
        ]
      }
      contatos: {
        Row: {
          criado_em: string
          email: string | null
          id: string
          nome: string | null
          observacoes: string | null
          status: Database["public"]["Enums"]["app_status_contato"]
          tags: string | null
          telefone: string | null
          user_id: string
        }
        Insert: {
          criado_em?: string
          email?: string | null
          id?: string
          nome?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["app_status_contato"]
          tags?: string | null
          telefone?: string | null
          user_id: string
        }
        Update: {
          criado_em?: string
          email?: string | null
          id?: string
          nome?: string | null
          observacoes?: string | null
          status?: Database["public"]["Enums"]["app_status_contato"]
          tags?: string | null
          telefone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ligacoes: {
        Row: {
          campanha_id: string | null
          contato_id: string | null
          duracao_segundos: number | null
          finalizada_em: string | null
          gravacao_url: string | null
          id: string
          iniciada_em: string | null
          nota: number | null
          resultado: string | null
          sentimento: Database["public"]["Enums"]["app_sentimento"] | null
          status: string | null
          transcricao: string | null
          twilio_call_sid: string | null
          user_id: string
        }
        Insert: {
          campanha_id?: string | null
          contato_id?: string | null
          duracao_segundos?: number | null
          finalizada_em?: string | null
          gravacao_url?: string | null
          id?: string
          iniciada_em?: string | null
          nota?: number | null
          resultado?: string | null
          sentimento?: Database["public"]["Enums"]["app_sentimento"] | null
          status?: string | null
          transcricao?: string | null
          twilio_call_sid?: string | null
          user_id: string
        }
        Update: {
          campanha_id?: string | null
          contato_id?: string | null
          duracao_segundos?: number | null
          finalizada_em?: string | null
          gravacao_url?: string | null
          id?: string
          iniciada_em?: string | null
          nota?: number | null
          resultado?: string | null
          sentimento?: Database["public"]["Enums"]["app_sentimento"] | null
          status?: string | null
          transcricao?: string | null
          twilio_call_sid?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ligacoes_campanha_id_fkey"
            columns: ["campanha_id"]
            isOneToOne: false
            referencedRelation: "campanhas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ligacoes_contato_id_fkey"
            columns: ["contato_id"]
            isOneToOne: false
            referencedRelation: "contatos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          criado_em: string
          empresa: string | null
          id: string
          nome: string | null
        }
        Insert: {
          criado_em?: string
          empresa?: string | null
          id: string
          nome?: string | null
        }
        Update: {
          criado_em?: string
          empresa?: string | null
          id?: string
          nome?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_sentimento: "positivo" | "neutro" | "negativo"
      app_status_campanha:
        | "rascunho"
        | "agendada"
        | "em_andamento"
        | "pausada"
        | "concluida"
      app_status_campanha_contato:
        | "na_fila"
        | "ligando"
        | "atendida"
        | "sem_resposta"
        | "concluida"
        | "falhou"
      app_status_contato: "novo" | "ligado" | "convertido" | "nao_atender"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_sentimento: ["positivo", "neutro", "negativo"],
      app_status_campanha: [
        "rascunho",
        "agendada",
        "em_andamento",
        "pausada",
        "concluida",
      ],
      app_status_campanha_contato: [
        "na_fila",
        "ligando",
        "atendida",
        "sem_resposta",
        "concluida",
        "falhou",
      ],
      app_status_contato: ["novo", "ligado", "convertido", "nao_atender"],
    },
  },
} as const
