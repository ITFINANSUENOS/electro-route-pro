import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dataService } from '@/services';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface GroupEvidencePhoto {
  id: string;
  tipo_foto: string;
  foto_url: string;
  subido_por: string;
  gps_latitud: number | null;
  gps_longitud: number | null;
  created_at: string;
}

interface GroupIdentifier {
  fecha: string;
  tipo_actividad: string;
  municipio: string;
  nombre_actividad: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
}

export function useGroupEvidence(group: GroupIdentifier | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ['group-evidence', group?.fecha, group?.tipo_actividad, group?.municipio, group?.nombre_actividad];

  const { data: photos = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!group) return [];

      let query = dataService
        .from('evidencia_grupal')
        .select('*')
        .eq('fecha', group.fecha)
        .eq('tipo_actividad', group.tipo_actividad)
        .eq('municipio', group.municipio);

      if (group.nombre_actividad) {
        query = query.eq('nombre_actividad', group.nombre_actividad);
      } else {
        query = query.is('nombre_actividad', null);
      }

      if (group.hora_inicio) {
        query = query.eq('hora_inicio', group.hora_inicio);
      }
      if (group.hora_fin) {
        query = query.eq('hora_fin', group.hora_fin);
      }

      const { data, error } = await (query.order('created_at') as any);
      if (error) throw error;
      return (data || []) as GroupEvidencePhoto[];
    },
    enabled: !!group,
  });

  const uploadPhoto = useMutation({
    mutationFn: async (params: {
      tipoFoto: string;
      file: File;
      gpsLatitud?: number;
      gpsLongitud?: number;
      notas?: string;
    }) => {
      if (!user?.id || !group) throw new Error('No user or group');

      // Upload file to storage
      const fileName = `${group.fecha}/${group.tipo_actividad}/${group.municipio}/${params.tipoFoto}_${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('evidencia-fotos')
        .upload(fileName, params.file, { contentType: params.file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase
        .storage
        .from('evidencia-fotos')
        .getPublicUrl(uploadData.path);

      // Insert record
      const { error } = await (dataService
        .from('evidencia_grupal')
        .insert({
          fecha: group.fecha,
          tipo_actividad: group.tipo_actividad,
          municipio: group.municipio,
          nombre_actividad: group.nombre_actividad,
          hora_inicio: group.hora_inicio,
          hora_fin: group.hora_fin,
          tipo_foto: params.tipoFoto,
          foto_url: publicUrl,
          subido_por: user.id,
          gps_latitud: params.gpsLatitud,
          gps_longitud: params.gpsLongitud,
          notas: params.notas,
        }) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Foto grupal registrada correctamente');
      queryClient.invalidateQueries({ queryKey });
    },
    onError: (error: Error) => {
      toast.error(`Error al subir foto: ${error.message}`);
    },
  });

  const getPhotoByType = (tipoFoto: string): GroupEvidencePhoto | undefined => {
    return photos.find(p => p.tipo_foto === tipoFoto);
  };

  return {
    photos,
    isLoading,
    uploadPhoto,
    getPhotoByType,
    completedCount: photos.length,
  };
}
