import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { goalsApi } from '../api';

export const useGoals = () =>
  useQuery({ queryKey: ['goals'], queryFn: goalsApi.list });

export const useGoal = (id: string) =>
  useQuery({
    queryKey: ['goals', id],
    queryFn: () => goalsApi.get(id),
    enabled: !!id,
  });

export const useCreateGoal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: goalsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  });
};

export const useCompleteGoal = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalsApi.complete(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      qc.invalidateQueries({ queryKey: ['goals', id] });
    },
  });
};
