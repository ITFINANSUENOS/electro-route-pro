import { useMemo } from 'react';
import { useConsultasConfig } from './useConsultasConfig';

interface ActivitySchedule {
  hora_inicio: string | null;
  hora_fin: string | null;
  tipo_actividad: 'punto' | 'correria' | 'libre';
}

interface TimeRestrictions {
  canUploadEvidence: boolean;
  evidenceTimeMessage: string;
  canUploadConsultas: boolean;
  consultasTimeMessage: string;
  isInConsultasWindow: boolean;
  currentHour: number;
  currentMinutes: number;
}

export function useActivityTimeRestrictions(
  todayAssignment: ActivitySchedule | null
): TimeRestrictions {
  const consultasConfig = useConsultasConfig();

  return useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;

    // Dynamic consultas window from config
    const consultasStartHour = consultasConfig.consultasStartHour;
    const consultasStartMin = consultasConfig.consultasStartMinutes;
    const consultasEndHour = consultasConfig.consultasEndHour;
    const consultasEndMin = consultasConfig.consultasEndMinutes;

    const currentTotalMin = currentHour * 60 + currentMinutes;
    const consultasStartTotalMin = consultasStartHour * 60 + consultasStartMin;
    const consultasEndTotalMin = consultasEndHour * 60 + consultasEndMin;

    const isInConsultasWindow = currentTotalMin >= consultasStartTotalMin && currentTotalMin < consultasEndTotalMin;

    const canUploadConsultas = isInConsultasWindow;
    let consultasTimeMessage = '';

    const formatHour = (h: number, m: number) => {
      const period = h >= 12 ? 'PM' : 'AM';
      const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
      return m > 0 ? `${displayH}:${String(m).padStart(2, '0')} ${period}` : `${displayH}:00 ${period}`;
    };

    if (currentTotalMin < consultasStartTotalMin) {
      consultasTimeMessage = `Las consultas y solicitudes se pueden registrar desde las ${formatHour(consultasStartHour, consultasStartMin)}`;
    } else if (currentTotalMin >= consultasEndTotalMin) {
      consultasTimeMessage = `El horario para registrar consultas y solicitudes ha terminado (hasta ${formatHour(consultasEndHour, consultasEndMin)})`;
    } else {
      consultasTimeMessage = `Horario habilitado hasta las ${formatHour(consultasEndHour, consultasEndMin)}`;
    }

    // Evidence time window based on activity schedule (GPS restricted to scheduled hours)
    let canUploadEvidence = false;
    let evidenceTimeMessage = '';

    if (!todayAssignment) {
      evidenceTimeMessage = 'No tienes actividad programada para hoy';
      canUploadEvidence = false;
    } else if (todayAssignment.hora_inicio && todayAssignment.hora_fin) {
      const activityStart = todayAssignment.hora_inicio.slice(0, 5);
      const activityEnd = todayAssignment.hora_fin.slice(0, 5);

      const isAfterStart = currentTimeString >= activityStart;
      const isBeforeEnd = currentTimeString <= activityEnd;

      if (!isAfterStart) {
        evidenceTimeMessage = `La ubicación GPS se puede registrar desde las ${activityStart}`;
        canUploadEvidence = false;
      } else if (!isBeforeEnd) {
        evidenceTimeMessage = `El horario para registrar ubicación GPS ha terminado (hasta ${activityEnd})`;
        canUploadEvidence = false;
      } else {
        evidenceTimeMessage = `Ubicación GPS habilitada hasta las ${activityEnd}`;
        canUploadEvidence = true;
      }
    } else {
      canUploadEvidence = true;
      evidenceTimeMessage = 'Horario habilitado todo el día';
    }

    return {
      canUploadEvidence,
      evidenceTimeMessage,
      canUploadConsultas,
      consultasTimeMessage,
      isInConsultasWindow,
      currentHour,
      currentMinutes,
    };
  }, [todayAssignment, consultasConfig]);
}

export function shouldShowConsultasNotification(
  currentHour: number,
  hasSubmittedConsultasToday: boolean,
  consultasStartHour: number = 12,
  consultasEndHour: number = 22
): boolean {
  const isInWindow = currentHour >= consultasStartHour && currentHour < consultasEndHour;
  return isInWindow && !hasSubmittedConsultasToday;
}
