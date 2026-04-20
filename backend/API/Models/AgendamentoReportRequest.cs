using System;
using System.Collections.Generic;

namespace API.Models
{
    public class AgendamentoReportRequest
    {
        public DateTime? DataInicio { get; set; }
        public DateTime? DataFim { get; set; }
        public Guid? ClienteId { get; set; }
        public Guid? AtendenteId { get; set; }
        public List<Guid>? ClienteIds { get; set; }
        public List<Guid>? AtendenteIds { get; set; }
        public string? Status { get; set; }
        public string? TipoAtendimento { get; set; }
        public string? ExportFormat { get; set; } // "csv" ou "xlsx"
        
        // Novos campos para ordenação e tipos de relatório
        public string? ReportType { get; set; } // "agendamentos", "estatisticas-atendente", "por-status", "por-tipo", "total-por-cliente", "taxa-realizados-cancelados"
        public string? SortBy { get; set; } // "data", "status", "titulo", "cliente", "atendente"
        public string? SortOrder { get; set; } // "asc", "desc"
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 100;
    }

    public class AgendamentoReportResponse
    {
        public List<AgendamentoResponse>? Resultados { get; set; }
        public List<object>? Estatisticas { get; set; }
        public int TotalRegistros { get; set; }
        public int Pagina { get; set; }
        public int TotalPaginas { get; set; }
        public byte[]? ArquivoExportado { get; set; }
        public string? ContentType { get; set; }
        public string? FileName { get; set; }
    }

    public class EstatisticasAtendente
    {
        public Guid AtendenteId { get; set; }
        public string? AtendenteName { get; set; }
        public int Total { get; set; }
        public int Confirmados { get; set; }
        public int Realizados { get; set; }
        public int Cancelados { get; set; }
        public int Recusados { get; set; }
        public decimal TaxaSucesso { get; set; } // % de realizados vs total
    }

    public class RelatorioFiltroOpcoesResponse
    {
        public List<RelatorioUsuarioOpcao> Clientes { get; set; } = new();
        public List<RelatorioUsuarioOpcao> Atendentes { get; set; } = new();
    }

    public class RelatorioUsuarioOpcao
    {
        public Guid Id { get; set; }
        public string Nome { get; set; } = string.Empty;
    }
}
