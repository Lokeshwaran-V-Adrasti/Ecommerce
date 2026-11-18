import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface SizeChartData {
  _id?: string;
  name: string;
  category: string;
  headers: string[];
  rows: Array<{ cells: string[] }>;
}

interface SizeChartEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SizeChartData) => void;
  initialData?: SizeChartData;
  category: string;
}

const SizeChartEditor: React.FC<SizeChartEditorProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  category,
}) => {
  const [chartData, setChartData] = useState<SizeChartData>(
    initialData || {
      name: `${category} Size Chart`,
      category,
      headers: ['Size', 'Chest', 'Length', 'Sleeve'],
      rows: [
        { cells: ['XS', '32"', '26"', '20"'] },
        { cells: ['S', '34"', '27"', '21"'] },
        { cells: ['M', '36"', '28"', '22"'] },
        { cells: ['L', '38"', '29"', '23"'] },
        { cells: ['XL', '40"', '30"', '24"'] },
        { cells: ['XXL', '42"', '31"', '25"'] },
      ],
    }
  );

  const handleHeaderChange = (index: number, value: string) => {
    const newHeaders = [...chartData.headers];
    newHeaders[index] = value;
    setChartData({ ...chartData, headers: newHeaders });
  };

  const handleCellChange = (rowIndex: number, cellIndex: number, value: string) => {
    const newRows = [...chartData.rows];
    newRows[rowIndex].cells[cellIndex] = value;
    setChartData({ ...chartData, rows: newRows });
  };

  const addRow = () => {
    const newRow = { cells: Array(chartData.headers.length).fill('') };
    setChartData({ ...chartData, rows: [...chartData.rows, newRow] });
  };

  const deleteRow = (index: number) => {
    const newRows = chartData.rows.filter((_, i) => i !== index);
    setChartData({ ...chartData, rows: newRows });
  };

  const addColumn = () => {
    setChartData({
      ...chartData,
      headers: [...chartData.headers, ''],
      rows: chartData.rows.map(row => ({
        cells: [...row.cells, '']
      }))
    });
  };

  const deleteColumn = (index: number) => {
    setChartData({
      ...chartData,
      headers: chartData.headers.filter((_, i) => i !== index),
      rows: chartData.rows.map(row => ({
        cells: row.cells.filter((_, i) => i !== index)
      }))
    });
  };

  const handleSave = () => {
    if (!chartData.name.trim()) {
      toast.error('Chart name is required');
      return;
    }
    if (chartData.headers.some(h => !h.trim())) {
      toast.error('All headers must be filled');
      return;
    }
    onSave(chartData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            {initialData ? 'Edit Size Chart' : 'Create Size Chart'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chart Name
            </label>
            <input
              type="text"
              value={chartData.name}
              onChange={(e) => setChartData({ ...chartData, name: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="e.g., T-Shirt Size Chart"
            />
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {chartData.headers.map((header, idx) => (
                    <th
                      key={idx}
                      className="px-4 py-3 text-left text-sm font-medium text-gray-900 border-r border-gray-200 relative group"
                    >
                      <input
                        type="text"
                        value={header}
                        onChange={(e) => handleHeaderChange(idx, e.target.value)}
                        className="w-full bg-transparent border-b border-gray-300 py-1 text-sm focus:outline-none focus:border-purple-500"
                        placeholder={`Header ${idx + 1}`}
                      />
                      {chartData.headers.length > 1 && (
                        <button
                          onClick={() => deleteColumn(idx)}
                          className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1"
                          title="Delete column"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chartData.rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="border-t border-gray-200 hover:bg-gray-50">
                    {row.cells.map((cell, cellIdx) => (
                      <td
                        key={cellIdx}
                        className="px-4 py-3 border-r border-gray-200"
                      >
                        <input
                          type="text"
                          value={cell}
                          onChange={(e) => handleCellChange(rowIdx, cellIdx, e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Enter value"
                        />
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      {chartData.rows.length > 1 && (
                        <button
                          onClick={() => deleteRow(rowIdx)}
                          className="text-red-500 hover:text-red-700 p-1"
                          title="Delete row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button
              onClick={addRow}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Row
            </button>
            <button
              onClick={addColumn}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Column
            </button>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            {initialData ? 'Update Chart' : 'Create Chart'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SizeChartEditor;
