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
  zona?: string;
  role: 'asesor_comercial' | 'jefe_ventas' | 'lider_zona' | 'coordinador_comercial' | 'administrativo' | 'administrador';
  codigo_asesor?: string;
  codigo_jefe?: string;
  tipo_asesor?: 'INTERNO' | 'EXTERNO';
  regional_codigo?: number;
}

// Usuarios de prueba basados en USUARIOS_PRUEBAS.xlsx y BD ASESORES
const testUsers: TestUser[] = [
  // Administrador
  {
    email: 'admin@electrocreditos.com',
    password: 'Admin2026$Master',
    cedula: 'ADMIN-001',
    nombre_completo: 'Administrador E-COM',
    telefono: undefined,
    zona: undefined,
    role: 'administrador'
  },
  // Coordinador Comercial - ZONA NORTE
  {
    email: 'coorcomercialzonanorte@electrocreditosdelcauca.com',
    password: 'Coord2026$Ecom',
    cedula: '94470884',
    nombre_completo: 'TACAN PASCUAZA LUIS GONZALO',
    telefono: '3183625094',
    zona: 'norte',
    role: 'coordinador_comercial'
  },
  // Líder de Zona - SANTANDER
  {
    email: 'liderdezonasantander@electrocreditosdelcauca.com',
    password: 'Lider2026$Ecom',
    cedula: '1061428295',
    nombre_completo: 'MUNOZ LOBOA GUSTAVO ANDRES',
    telefono: '3168279196',
    zona: 'norte',
    role: 'lider_zona',
    regional_codigo: 103
  },
  // Jefe de Ventas - SANTANDER
  {
    email: 'garciazapata196@gmail.com',
    password: 'Jefe2026$Ecom',
    cedula: '16933411',
    nombre_completo: 'GARCIA ZAPATA JOSE LUIS',
    telefono: '3206595450',
    zona: 'norte',
    role: 'jefe_ventas',
    codigo_jefe: '69334',
    regional_codigo: 103
  },
  // Asesor Comercial 1 - EXTERNO - SANTANDER
  {
    email: 'asesor1@electrocreditos.com',
    password: 'Asesor2026$Ecom',
    cedula: '1061502889',
    nombre_completo: 'TOMBE DAGUA ROSA MARIA',
    telefono: '3137463494',
    zona: 'norte',
    role: 'asesor_comercial',
    codigo_asesor: '50288',
    codigo_jefe: '69334',
    tipo_asesor: 'EXTERNO',
    regional_codigo: 103
  },
  // Asesor Comercial 2 - EXTERNO - SANTANDER
  {
    email: 'asesor2@electrocreditos.com',
    password: 'Asesor2026$Ecom',
    cedula: '34608423',
    nombre_completo: 'ESTRADA PALOMINO VERONICA',
    telefono: '3225126433',
    zona: 'norte',
    role: 'asesor_comercial',
    codigo_asesor: '60842',
    codigo_jefe: '69334',
    tipo_asesor: 'EXTERNO',
    regional_codigo: 103
  },
  // Administrativo
  {
    email: 'administrativo@electrocreditos.com',
    password: 'Admin2026$Ecom',
    cedula: '1061000006',
    nombre_completo: 'USUARIO ADMINISTRATIVO PRUEBA',
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

    // First get regionales for reference
    const { data: regionales } = await supabaseAdmin
      .from('regionales')
      .select('id, codigo');

    const regionalMap = new Map(regionales?.map(r => [r.codigo, r.id]) || []);

    const createdUsers: { email: string; password: string; role: string; nombre: string; status: string }[] = [];
    const errors: string[] = [];

    for (const user of testUsers) {
      try {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === user.email);

        if (existingUser) {
          // Update password
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            password: user.password
          });

          // Update profile with new data
          await supabaseAdmin
            .from('profiles')
            .update({
              cedula: user.cedula,
              nombre_completo: user.nombre_completo,
              telefono: user.telefono,
              zona: user.zona,
              codigo_asesor: user.codigo_asesor,
              codigo_jefe: user.codigo_jefe,
              tipo_asesor: user.tipo_asesor,
              regional_id: user.regional_codigo ? regionalMap.get(user.regional_codigo) : null,
              correo: user.email
            })
            .eq('user_id', existingUser.id);

          createdUsers.push({ 
            email: user.email, 
            password: user.password,
            role: user.role, 
            nombre: user.nombre_completo,
            status: 'actualizado' 
          });
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

        // Create profile with all fields
        const profileData: Record<string, unknown> = {
          user_id: newUser.user.id,
          cedula: user.cedula,
          nombre_completo: user.nombre_completo,
          telefono: user.telefono,
          activo: true,
          correo: user.email
        };
        
        if (user.zona) profileData.zona = user.zona;
        if (user.codigo_asesor) profileData.codigo_asesor = user.codigo_asesor;
        if (user.codigo_jefe) profileData.codigo_jefe = user.codigo_jefe;
        if (user.tipo_asesor) profileData.tipo_asesor = user.tipo_asesor;
        if (user.regional_codigo) profileData.regional_id = regionalMap.get(user.regional_codigo);

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

        // Update lideres_zona table if this is a lider
        if (user.role === 'lider_zona') {
          await supabaseAdmin
            .from('lideres_zona')
            .update({ user_id: newUser.user.id })
            .eq('cedula', user.cedula);
        }

        // Update coordinadores table if this is a coordinador
        if (user.role === 'coordinador_comercial') {
          await supabaseAdmin
            .from('coordinadores')
            .update({ user_id: newUser.user.id })
            .eq('cedula', user.cedula);
        }

        createdUsers.push({ 
          email: user.email, 
          password: user.password,
          role: user.role, 
          nombre: user.nombre_completo,
          status: 'creado' 
        });
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
