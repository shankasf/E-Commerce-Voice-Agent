import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { schemaApi } from '../services/api';

interface TriggerInfo {
  trigger_name: string;
  schema_name: string;
  table_name: string;
  definition: string;
}

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export function Triggers() {
  const { dbName } = useParams();
  const [expandedTrigger, setExpandedTrigger] = useState<string | null>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ['triggers', dbName],
    queryFn: () => schemaApi.getTriggers(dbName!),
    enabled: !!dbName,
  });

  const triggers = (response?.data as TriggerInfo[]) || [];

  // Group triggers by schema.table
  const triggersByTable = triggers.reduce((acc, trigger) => {
    const key = `${trigger.schema_name}.${trigger.table_name}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(trigger);
    return acc;
  }, {} as Record<string, TriggerInfo[]>);

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
        <h1 className="font-display text-2xl font-bold">Triggers</h1>
        <p className="text-text-muted text-sm mt-1">Database triggers in {dbName}</p>
      </div>

      {/* Triggers List */}
      <div className="panel">
        <div className="p-4 border-b border-panel-border flex items-center justify-between">
          <h2 className="font-semibold">Triggers</h2>
          <span className="badge">{triggers.length}</span>
        </div>

        {triggers.length === 0 ? (
          <div className="p-8 text-center text-text-muted">No triggers found in this database</div>
        ) : (
          <div className="divide-y divide-panel-border">
            {Object.entries(triggersByTable).map(([tableKey, tableTriggers]) => (
              <div key={tableKey}>
                <div className="px-4 py-2 bg-panel-hover text-sm font-medium text-text-muted">
                  {tableKey}
                </div>
                {tableTriggers.map((trigger) => {
                  const triggerKey = `${tableKey}.${trigger.trigger_name}`;
                  const isExpanded = expandedTrigger === triggerKey;
                  return (
                    <div key={triggerKey} className="border-b border-panel-border/50 last:border-0">
                      <button
                        onClick={() => setExpandedTrigger(isExpanded ? null : triggerKey)}
                        className="w-full px-4 py-3 flex items-center gap-2 hover:bg-panel-hover text-left"
                      >
                        <ChevronIcon open={isExpanded} />
                        <span className="font-medium">{trigger.trigger_name}</span>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4">
                          <div className="bg-bg p-4 rounded-md overflow-x-auto">
                            <pre className="text-sm font-mono text-text-muted whitespace-pre-wrap">
                              {trigger.definition}
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
