export function AuthorBox({ name }: { name?: string }) {
  const displayName = name || "CallSphere Team";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="mt-12 flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-6">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-lg font-bold text-white">
        {initial}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">{displayName}</p>
        <p className="text-sm text-slate-500">
          Expert insights on AI voice agents and customer communication
          automation.
        </p>
      </div>
    </div>
  );
}
