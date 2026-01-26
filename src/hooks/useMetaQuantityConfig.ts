import { useQuery } from '@tanstack/react-query';
import { loadMetaQuantityConfig, MetaQuantityConfig } from '@/utils/calculateMetaQuantity';

/**
 * Hook para cargar y cachear la configuración de cálculo de metas en cantidad
 */
export function useMetaQuantityConfig() {
  return useQuery<MetaQuantityConfig>({
    queryKey: ['meta-quantity-config'],
    queryFn: loadMetaQuantityConfig,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}
