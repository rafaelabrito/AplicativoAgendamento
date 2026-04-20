export function getApiErrorMessage(error: any, fallback = 'Ocorreu um erro inesperado.'): string {
  const status = error?.response?.status;
  const backendMessage = error?.response?.data?.error || error?.response?.data?.message;

  if (backendMessage) return backendMessage;
  if (status === 400) return 'Dados invalidos. Verifique os campos e tente novamente.';
  if (status === 401) return 'Sessao expirada. Faça login novamente.';
  if (status === 403) return 'Voce nao tem permissao para realizar esta acao.';
  if (status === 404) return 'Recurso nao encontrado.';
  if (status >= 500) return 'Erro interno no servidor. Tente novamente em instantes.';

  return fallback;
}
