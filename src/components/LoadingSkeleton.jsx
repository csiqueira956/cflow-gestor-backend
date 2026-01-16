// Componente de skeleton para loading states

export const TableSkeleton = ({ rows = 5, columns = 6 }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-6 py-3 text-left">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const KanbanSkeleton = ({ columns = 5 }) => {
  return (
    <div className="flex gap-4 pb-4" style={{ minWidth: `${columns * 320}px` }}>
      {Array.from({ length: columns }).map((_, colIndex) => (
        <div key={colIndex} className="p-2 flex-shrink-0" style={{ width: '320px' }}>
          {/* Header da coluna */}
          <div className="mb-4">
            <div className="h-2 bg-gray-200 rounded-t-lg animate-pulse"></div>
            <div className="bg-white p-3 rounded-b-lg shadow-sm">
              <div className="h-5 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-16"></div>
            </div>
          </div>

          {/* Cards skeleton */}
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, cardIndex) => (
              <div
                key={cardIndex}
                className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
              >
                <div className="h-5 bg-gray-200 rounded animate-pulse mb-3"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton = () => {
  return (
    <div className="card">
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>
      </div>
    </div>
  );
};

export const DashboardSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/3"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const FormSkeleton = () => {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i}>
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
        </div>
      ))}
      <div className="flex gap-4 pt-4">
        <div className="h-10 bg-gray-200 rounded flex-1 animate-pulse"></div>
        <div className="h-10 bg-gray-200 rounded flex-1 animate-pulse"></div>
      </div>
    </div>
  );
};
