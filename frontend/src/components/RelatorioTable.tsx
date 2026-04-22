import React from 'react';
import { useTable, useSortBy } from 'react-table';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import { Column } from 'react-table';

interface RelatorioData {
  nomeCliente: string;
  nomeAtendente: string;
  dataAtendimento: string;
  horario: string;
  tipoAtendimento: string;
  status: string;
  dataCriacao: string;
  dataConfirmacao?: string;
  dataCancelamento?: string;
  justificativa?: string;
}

interface RelatorioTableProps {
  data: RelatorioData[];
}

const RelatorioTable: React.FC<RelatorioTableProps> = ({ data }) => {
  const columns: Column<RelatorioData>[] = React.useMemo(
    () => [
      { Header: 'Nome do Cliente', accessor: 'nomeCliente' },
      { Header: 'Nome do Atendente', accessor: 'nomeAtendente' },
      { Header: 'Data do Atendimento', accessor: 'dataAtendimento' },
      { Header: 'Horário', accessor: 'horario' },
      { Header: 'Tipo de Atendimento', accessor: 'tipoAtendimento' },
      { Header: 'Status', accessor: 'status' },
      { Header: 'Data de Criação', accessor: 'dataCriacao' },
      { Header: 'Data de Confirmação', accessor: 'dataConfirmacao' },
      { Header: 'Data de Cancelamento', accessor: 'dataCancelamento' },
      { Header: 'Justificativa', accessor: 'justificativa' },
    ],
    []
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable({ columns, data }, useSortBy);

  const exportToCSV = () => {
    const csvData = data.map(row => ({
      ...row,
    }));
    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'relatorio.csv');
  };

  const exportToXLSX = () => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório');
    XLSX.writeFile(workbook, 'relatorio.xlsx');
  };

  return (
    <div>
      <button onClick={exportToCSV}>Exportar para CSV</button>
      <button onClick={exportToXLSX}>Exportar para XLSX</button>
      <table {...getTableProps()}>
        <thead>
          {headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map(column => (
                <th {...column.getHeaderProps(column.getSortByToggleProps())}>
                  {column.render('Header')}
                  <span>
                    {column.isSorted
                      ? column.isSortedDesc
                        ? ' 🔽'
                        : ' 🔼'
                      : ''}
                  </span>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map(row => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map(cell => (
                  <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default RelatorioTable;

// Extender os tipos do react-table para suportar ordenação
import 'react-table';
declare module 'react-table' {
  export interface ColumnInstance {
    getSortByToggleProps: () => any;
    isSorted: boolean;
    isSortedDesc: boolean;
  }
}