import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDisponibilidades,
  createDisponibilidade,
  updateDisponibilidade,
  deleteDisponibilidade,
  Disponibilidade,
  DisponibilidadeForm,
} from '../services/disponibilidade';

export function useDisponibilidades() {
  return useQuery<Disponibilidade[]>({
    queryKey: ['disponibilidades'],
    queryFn: getDisponibilidades,
  });
}

export function useCreateDisponibilidade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createDisponibilidade,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['disponibilidades'] }),
  });
}

export function useUpdateDisponibilidade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DisponibilidadeForm }) => updateDisponibilidade(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['disponibilidades'] }),
  });
}

export function useDeleteDisponibilidade() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDisponibilidade(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['disponibilidades'] }),
  });
}
