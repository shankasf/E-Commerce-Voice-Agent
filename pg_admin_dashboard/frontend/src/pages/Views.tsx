import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { schemaApi } from '../services/api';

interface ViewInfo {
  schema_name: string;
  view_name: string;
  definition: string;
}

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

export function Views() {
  const { dbName } = useParams();
  const [expandedView, setExpandedView] = useState<string | null>(null);

  const { data: response, isLoading } = useQuery({
    queryKey: ['views', dbName],
    queryFn: () => schemaApi.getViews(dbName!),
    enabled: !!dbName,
  });

  const views = (response?.data as ViewInfo[]) || [];

  // Group views by schema
  const viewsBySchema = views.reduce((acc, view) => {
    if (!acc[view.schema_name]) {
      acc[view.schema_name] = [];
    }
    acc[view.schema_name].push(view);
    return acc;
  }, {} as Record<string, ViewInfo[]>);

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
        <h1 className="font-display text-2xl font-bold">Views</h1>
        <p className="text-text-muted text-sm mt-1">Database views in {dbName}</p>
      </div>

      {/* Views List */}
      <div className="panel">
        <div className="p-4 border-b border-panel-border flex items-center justify-between">
          <h2 className="font-semibold">Views</h2>
          <span className="badge">{views.length}</span>
        </div>

        {views.length === 0 ? (
          <div className="p-8 text-center text-text-muted">No views found in this database</div>
        ) : (
          <div className="divide-y divide-panel-border">
            {Object.entries(viewsBySchema).map(([schema, schemaViews]) => (
              <div key={schema}>
                <div className="px-4 py-2 bg-panel-hover text-sm font-medium text-text-muted">
                  {schema}
                </div>
                {schemaViews.map((view) => {
                  const viewKey = `${view.schema_name}.${view.view_name}`;
                  const isExpanded = expandedView === viewKey;
                  return (
                    <div key={viewKey} className="border-b border-panel-border/50 last:border-0">
                      <button
                        onClick={() => setExpandedView(isExpanded ? null : viewKey)}
                        className="w-full px-4 py-3 flex items-center gap-2 hover:bg-panel-hover text-left"
                      >
                        <ChevronIcon open={isExpanded} />
                        <span className="font-medium">{view.view_name}</span>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4">
                          <div className="bg-bg p-4 rounded-md overflow-x-auto">
                            <pre className="text-sm font-mono text-text-muted whitespace-pre-wrap">
                              {view.definition}
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
