import api from './api';

export interface Disponibilidade {
  id: string;
  atendenteId: string;
  diaSemana: string;
  horaInicio: string;
  horaFim: string;
  ativo: boolean;
}

export interface DisponibilidadeForm {
  atendenteId: string;
  diaSemana: string;
  horaInicio: string;
  horaFim: string;
  ativo?: boolean;
}

export const getDisponibilidades = async () => {
  const res = await api.get<Disponibilidade[]>('/disponibilidades');
  return res.data;
};

const toTimeSpan = (time: string) => time.length === 5 ? `${time}:00` : time;

const diaSemanaMap: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
  Thursday: 4, Friday: 5, Saturday: 6,
};

const toDiaSemana = (dia: string): number | string =>
  dia in diaSemanaMap ? diaSemanaMap[dia] : dia;

const preparePayload = (data: DisponibilidadeForm) => ({
  ...data,
  diaSemana: toDiaSemana(data.diaSemana),
  horaInicio: toTimeSpan(data.horaInicio),
  horaFim: toTimeSpan(data.horaFim),
});

export const createDisponibilidade = async (data: DisponibilidadeForm) => {
  const res = await api.post<Disponibilidade>('/disponibilidades', preparePayload(data));
  return res.data;
};

export const updateDisponibilidade = async (id: string, data: DisponibilidadeForm) => {
  const res = await api.put<Disponibilidade>(`/disponibilidades/${id}`, preparePayload(data));
  return res.data;
};

export const deleteDisponibilidade = async (id: string) => {
  await api.delete(`/disponibilidades/${id}`);
};
