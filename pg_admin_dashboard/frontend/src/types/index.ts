export interface User {
  id: string;
  username: string;
  email?: string;
  role: 'admin' | 'editor' | 'viewer';
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface DatabaseInfo {
  datname: string;
  size_bytes: number;
  owner: string;
  datallowconn: boolean;
  tables?: TableInfo[];
}

export interface TableInfo {
  table_schema: string;
  table_name: string;
}

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
  is_primary: boolean;
}

export interface IndexInfo {
  indexname: string;
  indexdef: string;
  is_unique: boolean;
  index_type: string;
  columns: string;
}

export interface ConstraintInfo {
  constraint_name: string;
  constraint_type: string;
  definition: string;
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number | null;
  fields: { name: string; dataTypeID: number }[];
  command: string;
  duration: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    offset?: number;
    total?: number;
  };
}

export interface RoleInfo {
  rolname: string;
  rolsuper: boolean;
  rolinherit: boolean;
  rolcreatedb: boolean;
  rolcreaterole: boolean;
  rolcanlogin: boolean;
}

export interface FunctionInfo {
  schema_name: string;
  function_name: string;
  definition: string;
  arguments: string;
  return_type: string;
}

export interface TriggerInfo {
  trigger_name: string;
  schema_name: string;
  table_name: string;
  definition: string;
}

export interface ViewInfo {
  schema_name: string;
  view_name: string;
  definition: string;
}

export interface ExtensionInfo {
  extname: string;
  extversion: string;
}

export interface SchemaOverview {
  tables: { schema_name: string; table_name: string }[];
  views: { schema_name: string; view_name: string }[];
  functionsCount: number;
  triggersCount: number;
  typesCount: number;
  extensions: ExtensionInfo[];
  foreignKeysCount: number;
}
