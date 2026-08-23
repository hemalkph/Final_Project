import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DataTable } from '@/components/data-table';
import { PageHeader } from '@/components/layout/page-header';
import { FilterBar } from '@/components/filter-bar';
import { TableSkeleton } from '@/components/table-skeleton';
import { ErrorState } from '@/components/error-state';
import { queryKeys } from '@/lib/queryKeys';
import { AGENT_STATUSES, SPECIALIZATIONS, type Agent, type AgentStatus } from '@/types/agent';
import { agentsApi } from './api';
import { getAgentColumns } from './columns';
import { AgentFormDialog } from './AgentFormDialog';
import { ViewAgentDialog } from './ViewAgentDialog';
import { DeleteAgentAlert } from './DeleteAgentAlert';

const ALL_VALUE = 'all';

export function AgentsPage() {
  // Backend supports no search/filter/sort/pagination params for agents
  // (AgentController accepts no query params at all) — one fetch, all
  // narrowing done here in React. Filter state stays local component
  // state and never enters the query key, so changing a filter re-renders
  // but never triggers a duplicate network fetch.
  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.all(),
    queryFn: agentsApi.getAll,
  });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AgentStatus | typeof ALL_VALUE>(ALL_VALUE);
  const [specializationFilter, setSpecializationFilter] = useState(ALL_VALUE);
  const [locationFilter, setLocationFilter] = useState(ALL_VALUE);

  // Location is free text (see types/agent.ts), so its filter options are
  // derived from whatever values are actually present — not a fabricated
  // taxonomy.
  const locationOptions = useMemo(() => {
    const values = new Set<string>();
    for (const agent of agentsQuery.data ?? []) {
      if (agent.location) values.add(agent.location);
    }
    return Array.from(values).sort();
  }, [agentsQuery.data]);

  const hasActiveFilters =
    search.trim() !== '' ||
    statusFilter !== ALL_VALUE ||
    specializationFilter !== ALL_VALUE ||
    locationFilter !== ALL_VALUE;

  const filteredAgents = useMemo(() => {
    const data = agentsQuery.data ?? [];
    const q = search.trim().toLowerCase();
    return data.filter((agent) => {
      if (statusFilter !== ALL_VALUE && agent.status !== statusFilter) return false;
      if (specializationFilter !== ALL_VALUE && agent.specialization !== specializationFilter) return false;
      if (locationFilter !== ALL_VALUE && agent.location !== locationFilter) return false;
      if (!q) return true;
      return [agent.name, agent.email, agent.title, agent.specialization]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(q));
    });
  }, [agentsQuery.data, search, statusFilter, specializationFilter, locationFilter]);

  const [formState, setFormState] = useState<{ mode: 'add' | 'edit'; agent?: Agent } | null>(null);
  const [viewAgent, setViewAgent] = useState<Agent | null>(null);
  const [deleteAgentTarget, setDeleteAgentTarget] = useState<Agent | null>(null);

  const columns = getAgentColumns({
    onView: setViewAgent,
    onEdit: (agent) => setFormState({ mode: 'edit', agent }),
    onDelete: setDeleteAgentTarget,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agents"
        description="Manage real estate agent profiles."
        actions={
          <Button onClick={() => setFormState({ mode: 'add' })}>
            <Plus className="mr-1.5 size-4" /> Add Agent
          </Button>
        }
      />

      <FilterBar>
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search name, email, title, specialization…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AgentStatus | typeof ALL_VALUE)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Statuses</SelectItem>
            {AGENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Specialization" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Specializations</SelectItem>
            {SPECIALIZATIONS.map((spec) => (
              <SelectItem key={spec} value={spec}>
                {spec}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Locations</SelectItem>
            {locationOptions.map((location) => (
              <SelectItem key={location} value={location}>
                {location}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {agentsQuery.isLoading && <TableSkeleton />}

      {agentsQuery.isError && (
        <ErrorState error={agentsQuery.error} onRetry={() => agentsQuery.refetch()} resourceName="agents" />
      )}

      {agentsQuery.isSuccess && (
        <DataTable
          columns={columns}
          data={filteredAgents}
          emptyMessage={hasActiveFilters ? 'No agents match these filters.' : 'No agents yet — add the first one.'}
        />
      )}

      <AgentFormDialog
        open={Boolean(formState)}
        onOpenChange={(open) => !open && setFormState(null)}
        mode={formState?.mode ?? 'add'}
        agent={formState?.agent}
      />

      <ViewAgentDialog
        open={Boolean(viewAgent)}
        onOpenChange={(open) => !open && setViewAgent(null)}
        agent={viewAgent}
      />

      <DeleteAgentAlert agent={deleteAgentTarget} onOpenChange={(open) => !open && setDeleteAgentTarget(null)} />
    </div>
  );
}
