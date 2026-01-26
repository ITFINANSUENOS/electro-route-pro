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

// Maximum rows and field lengths
const MAX_ROWS = 500;
const MAX_LENGTHS = {
  nombre: 200,
  email: 254,
  telefono: 20,
  cedula: 15,
};

// Sanitize field to prevent CSV injection
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

// Validate email
function validateEmail(email: string): boolean {
  if (!email || email.length > MAX_LENGTHS.email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Validate cedula
function validateCedula(cedula: string): boolean {
  if (!cedula || cedula.length > MAX_LENGTHS.cedula) return false;
  return /^\d{5,12}$/.test(cedula.trim());
}

interface TeamMember {
  sede: string;
  regional: string;
  cc_asesor: string;
  codigo_asesor: string;
  nombre_asesor: string;
  movil_asesor: string;
  tipo_asesor: string;
  codigo_jefe: string;
  cc_jefe: string;
  jefe_ventas: string;
  movil_jefe: string;
  correo_jefe: string;
  cedula_lider: string;
  lider_zona: string;
  movil_lider: string;
  correo_lider: string;
  zona: string;
  cedula_coordinador: string;
  coordinador: string;
  movil_coordinador: string;
  correo_coordinador: string;
}

// Generate email from name - SECURE: Don't expose in responses
function generateEmail(name: string, cedula: string): string {
  const cleanName = name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z\s]/g, '')
    .split(' ')
    .slice(0, 2)
    .join('.');
  return `${cleanName}.${cedula.slice(-4)}@electrocreditos.com`;
}

// Generate password - SECURE: Never expose in responses
function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => chars[b % chars.length]).join('');
}

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

    // Verify admin
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

    const { data: teamData }: { data: TeamMember[] } = await req.json();

    if (!teamData || !Array.isArray(teamData)) {
      return new Response(
        JSON.stringify({ error: GENERIC_ERRORS.VALIDATION }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate row count
    if (teamData.length > MAX_ROWS) {
      return new Response(
        JSON.stringify({ error: `El archivo excede el máximo de ${MAX_ROWS} registros` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get regionales for reference
    const { data: regionales } = await supabaseAdmin
      .from('regionales')
      .select('id, nombre, codigo');

    const regionalMap = new Map(regionales?.map(r => [r.nombre.toUpperCase(), r.id]) || []);
    const regionalCodeMap = new Map(regionales?.map(r => [r.codigo, r.id]) || []);

    // Get existing users to avoid duplicates
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingEmails = new Set(existingUsers?.users?.map(u => u.email?.toLowerCase()) || []);

    // Track unique entities
    const processedAsesores = new Set<string>();
    const processedJefes = new Set<string>();
    const processedLideres = new Set<string>();
    const processedCoordinadores = new Set<string>();

    const stats = {
      asesores_created: 0,
      jefes_created: 0,
      lideres_created: 0,
      coordinadores_created: 0,
      skipped: 0,
      validation_errors: 0,
      total: teamData.length
    };

    // Track created users (WITHOUT passwords for security)
    const createdUsers: { email: string; nombre: string; role: string }[] = [];

    for (const member of teamData) {
      try {
        // Validate cedula
        if (member.cc_asesor && !validateCedula(member.cc_asesor)) {
          stats.validation_errors++;
          continue;
        }

        const zona = truncateField(member.zona?.toLowerCase(), 50) || null;
        const sedeCode = parseInt(member.sede) || null;
        const regionalId = regionalMap.get(member.regional?.toUpperCase()) || 
                          (sedeCode ? regionalCodeMap.get(sedeCode) : null);

        // 1. Process Asesor
        if (member.cc_asesor && member.codigo_asesor && !processedAsesores.has(member.cc_asesor)) {
          processedAsesores.add(member.cc_asesor);
          
          const nombre = truncateField(member.nombre_asesor, MAX_LENGTHS.nombre);
          const email = generateEmail(nombre, member.cc_asesor);
          const password = generateSecurePassword();

          if (!existingEmails.has(email.toLowerCase())) {
            try {
              const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { 
                  cedula: member.cc_asesor, 
                  nombre_completo: nombre,
                  force_password_change: true // Flag for first login
                }
              });

              if (createError) {
                console.error(`Error creating asesor ${member.cc_asesor}:`, createError.message);
                stats.validation_errors++;
              } else if (newUser?.user) {
                await supabaseAdmin.from('profiles').insert({
                  user_id: newUser.user.id,
                  cedula: member.cc_asesor,
                  nombre_completo: nombre,
                  telefono: truncateField(member.movil_asesor, MAX_LENGTHS.telefono) || null,
                  codigo_asesor: truncateField(member.codigo_asesor, 10),
                  codigo_jefe: member.codigo_jefe !== 'N/A' ? truncateField(member.codigo_jefe, 10) : null,
                  tipo_asesor: truncateField(member.tipo_asesor, 20) || null,
                  ccosto_asesor: truncateField(member.sede, 20) || null,
                  zona: zona,
                  regional_id: regionalId,
                  activo: true,
                  correo: email
                });

                await supabaseAdmin.from('user_roles').insert({
                  user_id: newUser.user.id,
                  role: 'asesor_comercial'
                });

                stats.asesores_created++;
                // SECURITY: Do NOT include password in response
                createdUsers.push({ email, nombre, role: 'asesor_comercial' });
                existingEmails.add(email.toLowerCase());
              }
            } catch (e) {
              console.error(`Error processing asesor ${member.cc_asesor}:`, e);
              stats.validation_errors++;
            }
          } else {
            stats.skipped++;
          }
        }

        // 2. Process Jefe de Ventas (similar pattern without password exposure)
        if (member.cc_jefe && member.cc_jefe !== 'N/A' && member.codigo_jefe !== 'N/A' && 
            !processedJefes.has(member.cc_jefe)) {
          processedJefes.add(member.cc_jefe);

          const nombre = truncateField(member.jefe_ventas, MAX_LENGTHS.nombre);
          await supabaseAdmin.from('jefes_ventas').upsert({
            cedula: member.cc_jefe,
            codigo: truncateField(member.codigo_jefe, 10),
            nombre: nombre,
            telefono: truncateField(member.movil_jefe, MAX_LENGTHS.telefono) || null,
            correo: truncateField(member.correo_jefe?.replace(/\\/g, ''), MAX_LENGTHS.email) || null,
            regional_id: regionalId,
            activo: true
          }, { onConflict: 'cedula' });

          const jefeEmail = member.correo_jefe?.replace(/\\/g, '') || generateEmail(nombre, member.cc_jefe);
          
          if (validateEmail(jefeEmail) && !existingEmails.has(jefeEmail.toLowerCase())) {
            try {
              const password = generateSecurePassword();
              const { data: newJefe, error: jefeError } = await supabaseAdmin.auth.admin.createUser({
                email: jefeEmail,
                password,
                email_confirm: true,
                user_metadata: { cedula: member.cc_jefe, nombre_completo: nombre, force_password_change: true }
              });

              if (!jefeError && newJefe?.user) {
                await supabaseAdmin.from('profiles').insert({
                  user_id: newJefe.user.id,
                  cedula: member.cc_jefe,
                  nombre_completo: nombre,
                  telefono: truncateField(member.movil_jefe, MAX_LENGTHS.telefono) || null,
                  codigo_jefe: truncateField(member.codigo_jefe, 10),
                  zona: zona,
                  regional_id: regionalId,
                  activo: true,
                  correo: jefeEmail
                });

                await supabaseAdmin.from('user_roles').insert({
                  user_id: newJefe.user.id,
                  role: 'jefe_ventas'
                });

                stats.jefes_created++;
                createdUsers.push({ email: jefeEmail, nombre, role: 'jefe_ventas' });
                existingEmails.add(jefeEmail.toLowerCase());
              }
            } catch {
              // Jefe may already exist, skip
            }
          }
        }

        // 3. Process Líder de Zona
        if (member.cedula_lider && member.cedula_lider !== 'N/A' && member.lider_zona &&
            !processedLideres.has(member.cedula_lider)) {
          processedLideres.add(member.cedula_lider);

          const nombre = truncateField(member.lider_zona, MAX_LENGTHS.nombre);
          await supabaseAdmin.from('lideres_zona').upsert({
            cedula: member.cedula_lider,
            nombre: nombre,
            telefono: truncateField(member.movil_lider, MAX_LENGTHS.telefono) || null,
            correo: truncateField(member.correo_lider?.replace(/[<>]/g, ''), MAX_LENGTHS.email) || null,
            zona: zona,
            regional_id: regionalId,
            activo: true
          }, { onConflict: 'cedula' });

          const liderEmail = member.correo_lider?.replace(/[<>]/g, '') || generateEmail(nombre, member.cedula_lider);

          if (validateEmail(liderEmail) && !existingEmails.has(liderEmail.toLowerCase())) {
            try {
              const password = generateSecurePassword();
              const { data: newLider, error: liderError } = await supabaseAdmin.auth.admin.createUser({
                email: liderEmail,
                password,
                email_confirm: true,
                user_metadata: { cedula: member.cedula_lider, nombre_completo: nombre, force_password_change: true }
              });

              if (!liderError && newLider?.user) {
                await supabaseAdmin.from('profiles').insert({
                  user_id: newLider.user.id,
                  cedula: member.cedula_lider,
                  nombre_completo: nombre,
                  telefono: truncateField(member.movil_lider, MAX_LENGTHS.telefono) || null,
                  zona: zona,
                  regional_id: regionalId,
                  activo: true,
                  correo: liderEmail
                });

                await supabaseAdmin.from('user_roles').insert({
                  user_id: newLider.user.id,
                  role: 'lider_zona'
                });

                await supabaseAdmin.from('lideres_zona')
                  .update({ user_id: newLider.user.id })
                  .eq('cedula', member.cedula_lider);

                stats.lideres_created++;
                createdUsers.push({ email: liderEmail, nombre, role: 'lider_zona' });
                existingEmails.add(liderEmail.toLowerCase());
              }
            } catch {
              // Lider may already exist
            }
          }
        }

        // 4. Process Coordinador
        if (member.cedula_coordinador && member.cedula_coordinador !== 'N/A' && member.coordinador &&
            !processedCoordinadores.has(member.cedula_coordinador)) {
          processedCoordinadores.add(member.cedula_coordinador);

          const nombre = truncateField(member.coordinador, MAX_LENGTHS.nombre);
          await supabaseAdmin.from('coordinadores').upsert({
            cedula: member.cedula_coordinador,
            nombre: nombre,
            telefono: truncateField(member.movil_coordinador, MAX_LENGTHS.telefono) || null,
            correo: truncateField(member.correo_coordinador?.replace(/\\/g, ''), MAX_LENGTHS.email) || null,
            zona: zona,
            activo: true
          }, { onConflict: 'cedula' });

          const coordEmail = member.correo_coordinador?.replace(/\\/g, '') || generateEmail(nombre, member.cedula_coordinador);

          if (validateEmail(coordEmail) && !existingEmails.has(coordEmail.toLowerCase())) {
            try {
              const password = generateSecurePassword();
              const { data: newCoord, error: coordError } = await supabaseAdmin.auth.admin.createUser({
                email: coordEmail,
                password,
                email_confirm: true,
                user_metadata: { cedula: member.cedula_coordinador, nombre_completo: nombre, force_password_change: true }
              });

              if (!coordError && newCoord?.user) {
                await supabaseAdmin.from('profiles').insert({
                  user_id: newCoord.user.id,
                  cedula: member.cedula_coordinador,
                  nombre_completo: nombre,
                  telefono: truncateField(member.movil_coordinador, MAX_LENGTHS.telefono) || null,
                  zona: zona,
                  activo: true,
                  correo: coordEmail
                });

                await supabaseAdmin.from('user_roles').insert({
                  user_id: newCoord.user.id,
                  role: 'coordinador_comercial'
                });

                await supabaseAdmin.from('coordinadores')
                  .update({ user_id: newCoord.user.id })
                  .eq('cedula', member.cedula_coordinador);

                stats.coordinadores_created++;
                createdUsers.push({ email: coordEmail, nombre, role: 'coordinador_comercial' });
                existingEmails.add(coordEmail.toLowerCase());
              }
            } catch {
              // Coordinador may already exist
            }
          }
        }

      } catch (err) {
        console.error('Error processing member:', err);
        stats.validation_errors++;
      }
    }

    const totalCreated = stats.asesores_created + stats.jefes_created + stats.lideres_created + stats.coordinadores_created;

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        // SECURITY: Return only email/nombre/role, NOT passwords
        created_users: createdUsers.slice(0, 50),
        message: `Importación completada: ${stats.asesores_created} asesores, ${stats.jefes_created} jefes, ${stats.lideres_created} líderes, ${stats.coordinadores_created} coordinadores. Total: ${totalCreated} usuarios creados. Los usuarios recibirán instrucciones para establecer su contraseña.`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in bulk-import-users:', error);
    return new Response(
      JSON.stringify({ error: GENERIC_ERRORS.SERVER }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
