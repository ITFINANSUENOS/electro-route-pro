import { motion } from 'framer-motion';
import { Camera, List, CheckCircle, MapPin, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ActividadesViewer } from '@/components/actividades/ActividadesViewer';
import { TodayAssignmentCard } from '@/components/actividades/TodayAssignmentCard';
import { EvidenceSection } from '@/components/actividades/EvidenceSection';
import { ConsultasSection } from '@/components/actividades/ConsultasSection';
import { useTodayActivity } from '@/hooks/useTodayActivity';
import { useActivityTimeRestrictions } from '@/hooks/useActivityTimeRestrictions';
import { useActivityNotification } from '@/hooks/useActivityNotification';

export default function Actividades() {
  const { user, role } = useAuth();
  
  const {
    todayAssignment,
    todayReport,
    isLoading,
    hasEvidenceSubmitted,
    hasConsultasSubmitted,
    isFreeUser,
    hasScheduledActivity,
    submitEvidence,
    submitConsultas,
  } = useTodayActivity();

  const timeRestrictions = useActivityTimeRestrictions(todayAssignment);
  const { showNotification: showConsultasNotification } = useActivityNotification();

  // Determine if user can view activity reports
  const canViewReports = role === 'jefe_ventas' || role === 'lider_zona' || 
                          role === 'coordinador_comercial' || role === 'administrador';

  // Fetch monthly stats
  const { data: monthlyStats } = useQuery({
    queryKey: ['monthly-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { dias: 0, total: 0 };
      
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const { data, error } = await supabase
        .from('reportes_diarios')
        .select('id')
        .eq('user_id', user.id)
        .gte('fecha', format(startOfMonth, 'yyyy-MM-dd'))
        .lte('fecha', format(endOfMonth, 'yyyy-MM-dd'));

      if (error) throw error;
      
      const workingDays = Math.floor(endOfMonth.getDate() * 5 / 7);
      
      return {
        dias: data?.length || 0,
        total: workingDays,
      };
    },
    enabled: !!user?.id,
  });

  const handleSubmitEvidence = async (data: {
    photoUrl: string;
    latitude: number;
    longitude: number;
    notas?: string;
  }) => {
    await submitEvidence.mutateAsync(data);
  };

  const handleSubmitConsultas = async (data: {
    consultas: number;
    solicitudes: number;
  }) => {
    await submitConsultas.mutateAsync(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Registro de Actividades</h1>
          <p className="text-muted-foreground mt-1">
            {isFreeUser 
              ? 'Día libre - Registra tus consultas y solicitudes' 
              : 'Registra tu actividad comercial diaria'}
          </p>
        </div>
        {showConsultasNotification && (
          <Badge variant="destructive" className="animate-pulse">
            Pendiente registro
          </Badge>
        )}
      </div>

      {/* Notification banner for consultas */}
      {showConsultasNotification && (
        <Alert variant="destructive" className="bg-warning/10 border-warning">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertTitle className="text-warning">Recordatorio Importante</AlertTitle>
          <AlertDescription>
            Debes registrar tus consultas y solicitudes del día antes de las 9:00 PM
          </AlertDescription>
        </Alert>
      )}

      {canViewReports ? (
        <Tabs defaultValue="registro" className="space-y-4">
          <TabsList>
            <TabsTrigger value="registro" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Mi Registro
              {showConsultasNotification && (
                <span className="w-2 h-2 bg-destructive rounded-full" />
              )}
            </TabsTrigger>
            <TabsTrigger value="ver" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Ver Actividades
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registro">
            <ActivityRegistrationContent
              todayAssignment={todayAssignment}
              todayReport={todayReport}
              monthlyStats={monthlyStats}
              hasScheduledActivity={hasScheduledActivity}
              isFreeUser={isFreeUser}
              hasEvidenceSubmitted={hasEvidenceSubmitted}
              timeRestrictions={timeRestrictions}
              showConsultasNotification={showConsultasNotification}
              onSubmitEvidence={handleSubmitEvidence}
              onSubmitConsultas={handleSubmitConsultas}
              isSubmittingEvidence={submitEvidence.isPending}
              isSubmittingConsultas={submitConsultas.isPending}
            />
          </TabsContent>

          <TabsContent value="ver">
            <ActividadesViewer />
          </TabsContent>
        </Tabs>
      ) : (
        <ActivityRegistrationContent
          todayAssignment={todayAssignment}
          todayReport={todayReport}
          monthlyStats={monthlyStats}
          hasScheduledActivity={hasScheduledActivity}
          isFreeUser={isFreeUser}
          hasEvidenceSubmitted={hasEvidenceSubmitted}
          timeRestrictions={timeRestrictions}
          showConsultasNotification={showConsultasNotification}
          onSubmitEvidence={handleSubmitEvidence}
          onSubmitConsultas={handleSubmitConsultas}
          isSubmittingEvidence={submitEvidence.isPending}
          isSubmittingConsultas={submitConsultas.isPending}
        />
      )}
    </motion.div>
  );
}

// Separate component for the main content
interface ActivityRegistrationContentProps {
  todayAssignment: any;
  todayReport: any;
  monthlyStats: { dias: number; total: number } | undefined;
  hasScheduledActivity: boolean;
  isFreeUser: boolean;
  hasEvidenceSubmitted: boolean;
  timeRestrictions: ReturnType<typeof useActivityTimeRestrictions>;
  showConsultasNotification: boolean;
  onSubmitEvidence: (data: {
    photoUrl: string;
    latitude: number;
    longitude: number;
    notas?: string;
  }) => Promise<void>;
  onSubmitConsultas: (data: {
    consultas: number;
    solicitudes: number;
  }) => Promise<void>;
  isSubmittingEvidence: boolean;
  isSubmittingConsultas: boolean;
}

function ActivityRegistrationContent({
  todayAssignment,
  todayReport,
  monthlyStats,
  hasScheduledActivity,
  isFreeUser,
  hasEvidenceSubmitted,
  timeRestrictions,
  showConsultasNotification,
  onSubmitEvidence,
  onSubmitConsultas,
  isSubmittingEvidence,
  isSubmittingConsultas,
}: ActivityRegistrationContentProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left column - Today's Assignment */}
      <TodayAssignmentCard
        todayAssignment={todayAssignment}
        monthlyStats={monthlyStats}
      />

      {/* Right column - Activity Forms */}
      <div className="lg:col-span-2 space-y-6">
        {/* Evidence Section - Only for scheduled activities */}
        {hasScheduledActivity && (
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {hasEvidenceSubmitted ? (
                  <CheckCircle className="h-5 w-5 text-success" />
                ) : (
                  <Camera className="h-5 w-5 text-primary" />
                )}
                Evidencia de Actividad
              </CardTitle>
              <CardDescription>
                {todayAssignment?.tipo_actividad === 'correria' 
                  ? 'Registra foto y ubicación GPS para correría'
                  : 'Marca tu ubicación para punto fijo'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EvidenceSection
                todayAssignment={todayAssignment}
                canUploadEvidence={timeRestrictions.canUploadEvidence}
                evidenceTimeMessage={timeRestrictions.evidenceTimeMessage}
                hasEvidenceSubmitted={hasEvidenceSubmitted}
                onSubmitEvidence={onSubmitEvidence}
                isSubmitting={isSubmittingEvidence}
              />
            </CardContent>
          </Card>
        )}

        {/* Consultas Section - Available for all users */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-secondary" />
              Consultas y Solicitudes
              {showConsultasNotification && (
                <Badge variant="destructive" className="ml-2">Pendiente</Badge>
              )}
            </CardTitle>
            <CardDescription>
              {isFreeUser 
                ? 'Registra las consultas y solicitudes realizadas hoy (opcional)'
                : 'Registra las consultas y solicitudes del día (4pm - 9pm)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConsultasSection
              canUploadConsultas={timeRestrictions.canUploadConsultas}
              consultasTimeMessage={timeRestrictions.consultasTimeMessage}
              isInConsultasWindow={timeRestrictions.isInConsultasWindow}
              todayReport={todayReport}
              onSubmitConsultas={onSubmitConsultas}
              isSubmitting={isSubmittingConsultas}
              showNotificationBanner={showConsultasNotification}
            />
          </CardContent>
        </Card>

        {/* Free user info */}
        {isFreeUser && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Día Libre</AlertTitle>
            <AlertDescription>
              No tienes actividades programadas para hoy. Si no realizaste consultas ni solicitudes, 
              no es necesario registrar nada.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
