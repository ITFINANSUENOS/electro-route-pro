import { useMemo } from 'react';
import { format } from 'date-fns';

interface ActivitySchedule {
  hora_inicio: string | null;
  hora_fin: string | null;
  tipo_actividad: 'punto' | 'correria' | 'libre';
}

interface TimeRestrictions {
  // Evidence (photo + GPS) time window
  canUploadEvidence: boolean;
  evidenceTimeMessage: string;
  
  // Consultas/Solicitudes time window (4pm-9pm)
  canUploadConsultas: boolean;
  consultasTimeMessage: string;
  isInConsultasWindow: boolean;
  
  // Current time info
  currentHour: number;
  currentMinutes: number;
}

export function useActivityTimeRestrictions(
  todayAssignment: ActivitySchedule | null
): TimeRestrictions {
  return useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeString = `${String(currentHour).padStart(2, '0')}:${String(currentMinutes).padStart(2, '0')}`;

    // Consultas/Solicitudes window: 4pm (16:00) to 9pm (21:00)
    const consultasStartHour = 16;
    const consultasEndHour = 21;
    const isInConsultasWindow = currentHour >= consultasStartHour && currentHour < consultasEndHour;
    
    let canUploadConsultas = isInConsultasWindow;
    let consultasTimeMessage = '';
    
    if (currentHour < consultasStartHour) {
      consultasTimeMessage = `Las consultas y solicitudes se pueden registrar desde las 4:00 PM`;
    } else if (currentHour >= consultasEndHour) {
      consultasTimeMessage = `El horario para registrar consultas y solicitudes ha terminado (hasta 9:00 PM)`;
    } else {
      consultasTimeMessage = `Horario habilitado hasta las 9:00 PM`;
    }

    // Evidence time window based on activity schedule
    let canUploadEvidence = false;
    let evidenceTimeMessage = '';

    if (!todayAssignment) {
      evidenceTimeMessage = 'No tienes actividad programada para hoy';
      canUploadEvidence = false;
    } else if (todayAssignment.hora_inicio && todayAssignment.hora_fin) {
      const activityStart = todayAssignment.hora_inicio.slice(0, 5); // "HH:MM"
      const activityEnd = todayAssignment.hora_fin.slice(0, 5);
      
      // Compare time strings
      const isAfterStart = currentTimeString >= activityStart;
      const isBeforeEnd = currentTimeString <= activityEnd;
      
      if (!isAfterStart) {
        evidenceTimeMessage = `La evidencia se puede registrar desde las ${activityStart}`;
        canUploadEvidence = false;
      } else if (!isBeforeEnd) {
        evidenceTimeMessage = `El horario para registrar evidencia ha terminado (hasta ${activityEnd})`;
        canUploadEvidence = false;
      } else {
        evidenceTimeMessage = `Horario habilitado hasta las ${activityEnd}`;
        canUploadEvidence = true;
      }
    } else {
      // No specific hours set, allow all day
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
  }, [todayAssignment]);
}

// Utility to check if notification should be shown
export function shouldShowConsultasNotification(
  currentHour: number,
  hasSubmittedConsultasToday: boolean
): boolean {
  const isInWindow = currentHour >= 16 && currentHour < 21;
  return isInWindow && !hasSubmittedConsultasToday;
}
