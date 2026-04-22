using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.IO;
using OfficeOpenXml;
using CsvHelper;
using CsvHelper.Configuration;
using System.Globalization;
using Application.Interfaces;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RelatorioController : ControllerBase
    {
        private readonly IRelatorioService _relatorioService;

        public RelatorioController(IRelatorioService relatorioService)
        {
            _relatorioService = relatorioService;
        }

        [HttpGet]
        public async Task<IActionResult> GetRelatorio()
        {
            var relatorio = await _relatorioService.GetRelatorioAsync();
            return Ok(relatorio);
        }

        [HttpGet("export/csv")]
        public async Task<IActionResult> ExportCsv()
        {
            var relatorio = await _relatorioService.GetRelatorioAsync();

            using var memoryStream = new MemoryStream();
            using var writer = new StreamWriter(memoryStream);
            using var csv = new CsvWriter(writer, new CsvConfiguration(CultureInfo.InvariantCulture));

            csv.WriteRecords(relatorio);
            writer.Flush();
            memoryStream.Position = 0;

            return File(memoryStream, "text/csv", "relatorio.csv");
        }

        [HttpGet("export/xlsx")]
        public async Task<IActionResult> ExportXlsx()
        {
            var relatorio = await _relatorioService.GetRelatorioAsync();

            using var package = new ExcelPackage();
            var worksheet = package.Workbook.Worksheets.Add("Relatório");

            worksheet.Cells.LoadFromCollection(relatorio, true);

            using var memoryStream = new MemoryStream();
            package.SaveAs(memoryStream);
            memoryStream.Position = 0;

            return File(memoryStream, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "relatorio.xlsx");
        }
    }
}