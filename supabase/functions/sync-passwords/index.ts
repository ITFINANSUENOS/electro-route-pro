import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generic error messages
const GENERIC_ERRORS = {
  VALIDATION: 'Datos de entrada inválidos',
  AUTH: 'Error de autenticación',
  PERMISSION: 'Permisos insuficientes',
  SERVER: 'Error procesando la solicitud',
};

// Maximum rows
const MAX_ROWS = 500;
const MAX_LENGTHS = {
  nombre: 200,
  email: 254,
  cedula: 15,
};

// Sanitize field
function sanitizeField(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (/^[=+\-@\t\r]/.test(trimmed)) {
    return "'" + trimmed;
  }
  return trimmed;
}

// Truncate and sanitize
function truncateField(value: string | null | undefined, maxLength: number): string {
  if (!value) return '';
  return sanitizeField(value).slice(0, maxLength);
}

// Validate cedula
function validateCedula(cedula: string): boolean {
  if (!cedula || cedula.length > MAX_LENGTHS.cedula) return false;
  return /^\d{5,12}$/.test(cedula.trim());
}

interface UserCredential {
  cedula: string;
  correo: string;
  password: string;
  nombre: string;
  rol: string;
  zona: string;
}

// Role mapping
const ROLE_MAP: Record<string, string> = {
  'ASESOR': 'asesor_comercial',
  'JEFE DE VENTAS': 'jefe_ventas',
  'LÍDER DE ZONA': 'lider_zona',
  'LIDER DE ZONA': 'lider_zona',
  'COORDINADOR COMERCIAL': 'coordinador_comercial',
  'COORDINADOR': 'coordinador_comercial',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.AUTH }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.AUTH }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .single();

    if (roleData?.role !== 'administrador') {
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.PERMISSION }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { users }: { users: UserCredential[] } = await req.json();

    if (!users || !Array.isArray(users) || users.length === 0) {
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.VALIDATION }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate row count
    if (users.length > MAX_ROWS) {
      return new Response(
        JSON.stringify({ error: `El archivo excede el máximo de ${MAX_ROWS} registros` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get regionales for reference
    const { data: regionales } = await supabaseAdmin
      .from('regionales')
      .select('id, nombre, codigo');

    const regionalMap = new Map<string, string>();
    regionales?.forEach(r => {
      regionalMap.set(r.nombre.toUpperCase(), r.id);
      if (r.nombre.toUpperCase() === 'CALI') regionalMap.set('VALLE', r.id);
      if (r.nombre.toUpperCase() === 'PASTO') regionalMap.set('SUR', r.id);
    });

    // Load all profiles to find by cedula
    const { data: allProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, cedula, correo');
    
    const profileByCedula = new Map<string, { user_id: string; correo: string | null }>();
    allProfiles?.forEach(p => {
      profileByCedula.set(p.cedula, { user_id: p.user_id, correo: p.correo });
    });

    const stats = {
      updated: 0,
      created: 0,
      skipped: 0,
      validation_errors: 0,
      total: users.length
    };

    console.log(`Processing ${users.length} users for password sync...`);
    console.log(`Found ${profileByCedula.size} profiles in database`);

    for (const user of users) {
      try {
        const cedula = user.cedula?.toString().trim();
        const password = user.password?.trim();
        const nombre = truncateField(user.nombre, MAX_LENGTHS.nombre);
        const rolOriginal = user.rol?.trim().toUpperCase();
        const rol = ROLE_MAP[rolOriginal] || 'asesor_comercial';
        const zona = sanitizeField(user.zona?.trim().toUpperCase()) || '';
        
        // Validate required fields
        if (!cedula || !password || !nombre) {
          stats.skipped++;
          continue;
        }

        // Validate cedula format
        if (!validateCedula(cedula)) {
          stats.validation_errors++;
          continue;
        }

        // Validate password strength (basic check)
        if (password.length < 8) {
          stats.validation_errors++;
          console.log(`Password too short for cedula ${cedula}`);
          continue;
        }

        const correoCSV = truncateField(user.correo, MAX_LENGTHS.email).toLowerCase();
        const correoFinal = correoCSV || `${cedula}@electrocreditos.com`;
        const regionalId = regionalMap.get(zona) || null;

        const profileData = profileByCedula.get(cedula);

        if (profileData?.user_id) {
          // User exists - update password
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profileData.user_id, {
            password: password,
            email_confirm: true,
          });

          if (updateError) {
            console.error(`Error updating user ${cedula}:`, updateError.message);
            stats.validation_errors++;
            continue;
          }

          await supabaseAdmin.from('profiles')
            .update({
              nombre_completo: nombre,
              activo: true,
              correo: correoFinal,
              zona: zona.toLowerCase() || null,
              regional_id: regionalId,
            })
            .eq('cedula', cedula);

          await supabaseAdmin.from('user_roles')
            .delete()
            .eq('user_id', profileData.user_id);
          
          await supabaseAdmin.from('user_roles')
            .insert({
              user_id: profileData.user_id,
              role: rol,
            });

          stats.updated++;
          console.log(`Updated: ${cedula} (${nombre})`);
        } else {
          // User doesn't exist - create new
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: correoFinal,
            password: password,
            email_confirm: true,
            user_metadata: { cedula, nombre_completo: nombre }
          });

          if (createError) {
            console.error(`Error creating user ${cedula}:`, createError.message);
            stats.validation_errors++;
            continue;
          }

          if (newUser?.user) {
            await supabaseAdmin.from('profiles').insert({
              user_id: newUser.user.id,
              cedula: cedula,
              nombre_completo: nombre,
              activo: true,
              correo: correoFinal,
              zona: zona.toLowerCase() || null,
              regional_id: regionalId,
            });

            await supabaseAdmin.from('user_roles')
              .delete()
              .eq('user_id', newUser.user.id);
            
            await supabaseAdmin.from('user_roles').insert({
              user_id: newUser.user.id,
              role: rol,
            });

            stats.created++;
            console.log(`Created: ${cedula} (${nombre})`);
          }
        }

      } catch (err) {
        console.error('Error processing user:', err);
        stats.validation_errors++;
      }
    }

    console.log(`Sync completed: ${stats.created} created, ${stats.updated} updated, ${stats.skipped} skipped`);

    // SECURITY: Do NOT return any password-related information
    return new Response(
      JSON.stringify({
        success: true,
        stats,
        message: `Sincronización completada: ${stats.created} creados, ${stats.updated} actualizados, ${stats.skipped} omitidos.`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in sync-passwords:', error);
    return new Response(
      JSON.stringify({ error: GENERIC_ERRORS.SERVER }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
