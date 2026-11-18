import React from 'react';
import { X } from 'lucide-react';

interface SizeChartData {
  _id?: string;
  name: string;
  headers: string[];
  rows: Array<{ cells: string[] }>;
}

interface SizeChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  sizeChart?: SizeChartData;
}

const SizeChartModal: React.FC<SizeChartModalProps> = ({
  isOpen,
  onClose,
  sizeChart,
}) => {
  if (!isOpen || !sizeChart) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 p-6 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>📏</span>
            {sizeChart.name}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-purple-50">
                  {sizeChart.headers.map((header, idx) => (
                    <th
                      key={idx}
                      className="border border-purple-200 px-4 py-3 text-left text-sm font-semibold text-purple-900"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sizeChart.rows.map((row, rowIdx) => (
                  <tr
                    key={rowIdx}
                    className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    {row.cells.map((cell, cellIdx) => (
                      <td
                        key={cellIdx}
                        className="border border-purple-200 px-4 py-3 text-sm text-gray-700"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>💡 Tip:</strong> Use this size chart to select the right size for your body measurements. If you're between sizes, we recommend choosing the larger size for a comfortable fit.
            </p>
          </div>
        </div>

        <div className="bg-gray-50 border-t border-gray-200 p-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SizeChartModal;
