import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestUser {
  email: string;
  password: string;
  cedula: string;
  nombre_completo: string;
  telefono?: string;
  zona?: 'norte' | 'sur' | 'centro' | 'oriente';
  role: 'asesor_comercial' | 'jefe_ventas' | 'lider_zona' | 'coordinador_comercial' | 'administrativo' | 'administrador';
}

const testUsers: TestUser[] = [
  {
    email: 'coordinador.norte@electrocreditos.com',
    password: 'Coord2026$Ecom',
    cedula: '1061000001',
    nombre_completo: 'Carlos Gómez Martínez',
    telefono: '3101234567',
    zona: 'norte',
    role: 'coordinador_comercial'
  },
  {
    email: 'lider.popayan@electrocreditos.com',
    password: 'Lider2026$Ecom',
    cedula: '1061000002',
    nombre_completo: 'María López Rodríguez',
    telefono: '3152345678',
    zona: 'centro',
    role: 'lider_zona'
  },
  {
    email: 'jefe.ventas@electrocreditos.com',
    password: 'Jefe2026$Ecom',
    cedula: '1061000003',
    nombre_completo: 'Pedro Sánchez Vargas',
    telefono: '3183456789',
    zona: 'sur',
    role: 'jefe_ventas'
  },
  {
    email: 'asesor1@electrocreditos.com',
    password: 'Asesor2026$Ecom',
    cedula: '1061000004',
    nombre_completo: 'Ana Patricia Ruiz',
    telefono: '3164567890',
    zona: 'centro',
    role: 'asesor_comercial'
  },
  {
    email: 'asesor2@electrocreditos.com',
    password: 'Asesor2026$Ecom',
    cedula: '1061000005',
    nombre_completo: 'Luis Fernando Torres',
    telefono: '3175678901',
    zona: 'norte',
    role: 'asesor_comercial'
  },
  {
    email: 'administrativo@electrocreditos.com',
    password: 'Admin2026$Ecom',
    cedula: '1061000006',
    nombre_completo: 'Gloria Esperanza Castro',
    telefono: '3126789012',
    zona: undefined,
    role: 'administrativo'
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const createdUsers: { email: string; role: string; status: string }[] = [];
    const errors: string[] = [];

    for (const user of testUsers) {
      try {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const userExists = existingUsers?.users?.some(u => u.email === user.email);

        if (userExists) {
          createdUsers.push({ email: user.email, role: user.role, status: 'ya existía' });
          continue;
        }

        // Create auth user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            cedula: user.cedula,
            nombre_completo: user.nombre_completo,
          }
        });

        if (createError) {
          errors.push(`${user.email}: ${createError.message}`);
          continue;
        }

        // Create profile
        const profileData: Record<string, unknown> = {
          user_id: newUser.user.id,
          cedula: user.cedula,
          nombre_completo: user.nombre_completo,
          telefono: user.telefono,
          activo: true
        };
        if (user.zona) {
          profileData.zona = user.zona;
        }

        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert(profileData);

        if (profileError) {
          await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
          errors.push(`${user.email} (perfil): ${profileError.message}`);
          continue;
        }

        // Assign role
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: newUser.user.id,
            role: user.role
          });

        if (roleError) {
          await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
          errors.push(`${user.email} (rol): ${roleError.message}`);
          continue;
        }

        createdUsers.push({ email: user.email, role: user.role, status: 'creado' });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
        errors.push(`${user.email}: ${errorMsg}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Se procesaron ${createdUsers.length} usuarios`,
        users: createdUsers,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({ error: `Error interno: ${errorMessage}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
