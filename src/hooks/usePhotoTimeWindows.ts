import { useQuery } from '@tanstack/react-query';
import { dataService } from '@/services';
import { useMemo } from 'react';

interface PhotoConfig {
  // Correría windows
  correriaInicioDesdе: string;
  correriaInicioHasta: string;
  correriaIntermedioDesdе: string;
  correriaIntermedioHasta: string;
  correriaCierreDesdе: string;
  correriaCierreHasta: string;
  // Punto fijo margin
  puntoMargenMinutos: number;
  // Flags
  fotosAperturaCierrePunto: boolean;
  fotosGrupalesCorreriaCount: number;
  etiquetasFotosCorreria: string[];
}

interface PhotoWindowResult {
  config: PhotoConfig;
  isLoading: boolean;
  canUploadPhoto: (tipoFoto: string, horaInicioProgramada?: string | null, horaFinProgramada?: string | null) => boolean;
  getPhotoWindowMessage: (tipoFoto: string, horaInicioProgramada?: string | null, horaFinProgramada?: string | null) => string;
}

function parseTime(timeStr: string): { h: number; m: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { h: h || 0, m: m || 0 };
}

function currentTimeInMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function timeToMinutes(timeStr: string): number {
  const { h, m } = parseTime(timeStr);
  return h * 60 + m;
}

export function usePhotoTimeWindows(): PhotoWindowResult {
  const { data, isLoading } = useQuery({
    queryKey: ['photo-time-windows-config'],
    queryFn: async () => {
      const { data, error } = await (dataService
        .from('permisos_roles')
        .select('permiso, rol')
        .eq('categoria', 'programacion_config') as any);

      if (error) throw error;
      return data as { permiso: string; rol: string }[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const config = useMemo((): PhotoConfig => {
    const getValue = (permiso: string, defaultVal: string) => {
      const found = data?.find(d => d.permiso === permiso);
      return found?.rol || defaultVal;
    };

    let etiquetas: string[];
    try {
      etiquetas = JSON.parse(getValue('etiquetas_fotos_correria', '["Inicio del viaje","Instalación en el punto","Cierre / Llegada al destino"]'));
    } catch {
      etiquetas = ['Inicio del viaje', 'Instalación en el punto', 'Cierre / Llegada al destino'];
    }

    return {
      correriaInicioDesdе: getValue('foto_correria_inicio_desde', '05:00'),
      correriaInicioHasta: getValue('foto_correria_inicio_hasta', '09:00'),
      correriaIntermedioDesdе: getValue('foto_correria_intermedio_desde', '05:00'),
      correriaIntermedioHasta: getValue('foto_correria_intermedio_hasta', '19:00'),
      correriaCierreDesdе: getValue('foto_correria_cierre_desde', '16:00'),
      correriaCierreHasta: getValue('foto_correria_cierre_hasta', '19:00'),
      puntoMargenMinutos: parseInt(getValue('foto_punto_margen_minutos', '30')),
      fotosAperturaCierrePunto: getValue('fotos_apertura_cierre_punto', 'true') === 'true',
      fotosGrupalesCorreriaCount: parseInt(getValue('fotos_grupales_correria_cantidad', '3')),
      etiquetasFotosCorreria: etiquetas,
    };
  }, [data]);

  const canUploadPhoto = (tipoFoto: string, horaInicioProgramada?: string | null, horaFinProgramada?: string | null): boolean => {
    const now = currentTimeInMinutes();

    switch (tipoFoto) {
      case 'inicio_correria':
        return now >= timeToMinutes(config.correriaInicioDesdе) && now <= timeToMinutes(config.correriaInicioHasta);
      case 'instalacion_correria':
        return now >= timeToMinutes(config.correriaIntermedioDesdе) && now <= timeToMinutes(config.correriaIntermedioHasta);
      case 'cierre_correria':
        return now >= timeToMinutes(config.correriaCierreDesdе) && now <= timeToMinutes(config.correriaCierreHasta);
      case 'apertura_punto': {
        if (!horaInicioProgramada) return false;
        const scheduled = timeToMinutes(horaInicioProgramada.slice(0, 5));
        return now >= (scheduled - config.puntoMargenMinutos) && now <= (scheduled + config.puntoMargenMinutos);
      }
      case 'cierre_punto': {
        if (!horaFinProgramada) return false;
        const scheduled = timeToMinutes(horaFinProgramada.slice(0, 5));
        return now >= (scheduled - config.puntoMargenMinutos) && now <= (scheduled + config.puntoMargenMinutos);
      }
      default:
        return false;
    }
  };

  const getPhotoWindowMessage = (tipoFoto: string, horaInicioProgramada?: string | null, horaFinProgramada?: string | null): string => {
    const now = currentTimeInMinutes();

    switch (tipoFoto) {
      case 'inicio_correria': {
        const desde = config.correriaInicioDesdе;
        const hasta = config.correriaInicioHasta;
        if (now < timeToMinutes(desde)) return `Disponible desde las ${desde}`;
        if (now > timeToMinutes(hasta)) return `Ventana cerrada (hasta las ${hasta})`;
        return `Habilitado hasta las ${hasta}`;
      }
      case 'instalacion_correria': {
        const desde = config.correriaIntermedioDesdе;
        const hasta = config.correriaIntermedioHasta;
        if (now < timeToMinutes(desde)) return `Disponible desde las ${desde}`;
        if (now > timeToMinutes(hasta)) return `Ventana cerrada (hasta las ${hasta})`;
        return `Habilitado hasta las ${hasta}`;
      }
      case 'cierre_correria': {
        const desde = config.correriaCierreDesdе;
        const hasta = config.correriaCierreHasta;
        if (now < timeToMinutes(desde)) return `Disponible desde las ${desde}`;
        if (now > timeToMinutes(hasta)) return `Ventana cerrada (hasta las ${hasta})`;
        return `Habilitado hasta las ${hasta}`;
      }
      case 'apertura_punto': {
        if (!horaInicioProgramada) return 'Sin hora programada';
        const hora = horaInicioProgramada.slice(0, 5);
        const m = config.puntoMargenMinutos;
        return `Ventana: ${m} min antes/después de las ${hora}`;
      }
      case 'cierre_punto': {
        if (!horaFinProgramada) return 'Sin hora programada';
        const hora = horaFinProgramada.slice(0, 5);
        const m = config.puntoMargenMinutos;
        return `Ventana: ${m} min antes/después de las ${hora}`;
      }
      default:
        return '';
    }
  };

  return { config, isLoading, canUploadPhoto, getPhotoWindowMessage };
}
