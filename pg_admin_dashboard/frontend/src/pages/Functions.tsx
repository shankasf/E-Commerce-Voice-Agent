import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { schemaApi } from '../services/api';

interface FunctionInfo {
  schema_name: string;
  function_name: string;
  definition: string;
  arguments: string;
  return_type: string;
}

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export function Functions() {
  const { dbName } = useParams();
  const [expandedFunc, setExpandedFunc] = useState<string | null>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ['functions', dbName],
    queryFn: () => schemaApi.getFunctions(dbName!),
    enabled: !!dbName,
  });

  const functions = (response?.data as FunctionInfo[]) || [];

  // Group functions by schema
  const funcsBySchema = functions.reduce((acc, func) => {
    if (!acc[func.schema_name]) {
      acc[func.schema_name] = [];
    }
    acc[func.schema_name].push(func);
    return acc;
  }, {} as Record<string, FunctionInfo[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold">Functions</h1>
        <p className="text-text-muted text-sm mt-1">Database functions in {dbName}</p>
      </div>

      {/* Functions List */}
      <div className="panel">
        <div className="p-4 border-b border-panel-border flex items-center justify-between">
          <h2 className="font-semibold">Functions</h2>
          <span className="badge">{functions.length}</span>
        </div>

        {functions.length === 0 ? (
          <div className="p-8 text-center text-text-muted">No user functions found in this database</div>
        ) : (
          <div className="divide-y divide-panel-border">
            {Object.entries(funcsBySchema).map(([schema, schemaFuncs]) => (
              <div key={schema}>
                <div className="px-4 py-2 bg-panel-hover text-sm font-medium text-text-muted">
                  {schema}
                </div>
                {schemaFuncs.map((func) => {
                  const funcKey = `${func.schema_name}.${func.function_name}`;
                  const isExpanded = expandedFunc === funcKey;
                  return (
                    <div key={funcKey} className="border-b border-panel-border/50 last:border-0">
                      <button
                        onClick={() => setExpandedFunc(isExpanded ? null : funcKey)}
                        className="w-full px-4 py-3 flex items-center gap-2 hover:bg-panel-hover text-left"
                      >
                        <ChevronIcon open={isExpanded} />
                        <div className="flex-1">
                          <span className="font-medium">{func.function_name}</span>
                          <span className="text-text-muted text-sm ml-2">
                            ({func.arguments || ''}) → {func.return_type}
                          </span>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4">
                          <div className="bg-bg p-4 rounded-md overflow-x-auto">
                            <pre className="text-sm font-mono text-text-muted whitespace-pre-wrap">
                              {func.definition}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
