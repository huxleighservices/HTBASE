'use client';

import { useState } from 'react';
import { deptPill } from '@/lib/departments';
import type { Department } from '@/lib/departments';
import type { ERPPerson, DepartmentId } from '@/types/erp';
import { WidgetChipWithPopover, DeptDotWithPopover } from './spreadsheet-view';

type HybridViewProps = {
  people: ERPPerson[];
  enabledDepartments: Department[];
  clientPath: string;
  widgetDepts: Record<string, string>;
  onSelectPerson: (person: ERPPerson) => void;
};

type FilterDept = DepartmentId | 'all';

const HEADER_BG = 'rgba(8,8,18,0.97)';
const NAME_BG = 'rgba(8,8,18,0.97)';
const NAME_BG_ALT = 'rgba(14,14,28,0.97)';

export function HybridView({ people, enabledDepartments, clientPath, widgetDepts, onSelectPerson }: HybridViewProps) {
  const [activeDept, setActiveDept] = useState<FilterDept>('all');

  const displayDepts =
    activeDept === 'all'
      ? enabledDepartments
      : enabledDepartments.filter((d) => d.id === activeDept);

  return (
    <div className="flex flex-col flex-grow min-h-0 gap-3">

      {/* Department filter tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0">
        <button
          onClick={() => setActiveDept('all')}
          className="shrink-0 h-7 px-3 rounded-full text-xs font-medium transition-all duration-150"
          style={
            activeDept === 'all'
              ? { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: 'var(--foreground)', boxShadow: '0 0 10px rgba(255,255,255,0.08)' }
              : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--muted-foreground)' }
          }
        >
          All Departments
        </button>
        {enabledDepartments.map((dept) => (
          <button
            key={dept.id}
            onClick={() => setActiveDept(dept.id)}
            className="shrink-0 h-7 px-3 rounded-full text-xs font-medium transition-all duration-150"
            style={
              activeDept === dept.id
                ? { ...deptPill(dept), boxShadow: `0 0 12px rgba(${dept.rgb}, 0.4)` }
                : { background: `rgba(${dept.rgb}, 0.06)`, border: `1px solid rgba(${dept.rgb}, 0.2)`, color: `rgba(${dept.rgb}, 0.7)` }
            }
          >
            {dept.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div
        className="flex-grow min-h-0 overflow-auto rounded-xl"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="min-w-max">

          {/* Header row */}
          <div
            className="flex sticky top-0 z-20"
            style={{
              background: HEADER_BG,
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              className="w-44 sm:w-56 shrink-0 px-3 py-2.5 border-r border-white/8 sticky left-0 z-30"
              style={{ background: HEADER_BG, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}
            >
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Records</span>
            </div>

            {displayDepts.map((dept) => (
              <div
                key={dept.id}
                className="w-40 shrink-0 px-3 py-2.5 border-r border-white/8 relative overflow-hidden"
              >
                <div
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{
                    background: `linear-gradient(90deg, rgba(${dept.rgb},0.9), rgba(${dept.rgb},0.2))`,
                    boxShadow: `0 0 6px rgba(${dept.rgb},0.5)`,
                  }}
                />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: dept.color }}>
                  {dept.label}
                </span>
              </div>
            ))}
          </div>

          {/* Person rows */}
          {people.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-xs text-muted-foreground">No records yet.</p>
            </div>
          ) : (
            people.map((person, rowIdx) => (
              <div
                key={person.id}
                className="flex"
                style={rowIdx % 2 === 1 ? { background: 'rgba(255,255,255,0.012)' } : {}}
              >
                {/* Name cell */}
                <div
                  onClick={() => onSelectPerson(person)}
                  className="w-44 sm:w-56 shrink-0 border-b border-r border-white/5 cursor-pointer transition-colors hover:bg-white/5 flex items-center gap-2 px-3 py-2.5 sticky left-0 z-10"
                  style={{ background: rowIdx % 2 === 1 ? NAME_BG_ALT : NAME_BG }}
                >
                  <div
                    className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{
                      background: 'rgba(244,196,48,0.15)',
                      border: '1px solid rgba(244,196,48,0.2)',
                      color: '#F4C430',
                    }}
                  >
                    {person.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-xs font-medium truncate">{person.name}</p>
                </div>

                {/* Dept cells */}
                {displayDepts.map((dept) => {
                  const inDept = person.departments.includes(dept.id);
                  const chips = Object.keys(person.widgetLinks ?? {})
                    .filter((col) => widgetDepts[col] === dept.id)
                    .map((col) => ({ col, docId: (person.widgetLinks ?? {})[col] }));
                  const active = inDept || chips.length > 0;

                  return (
                    <div
                      key={dept.id}
                      className="w-40 shrink-0 px-3 py-2 border-b border-r border-white/5 flex flex-col justify-center gap-1.5"
                      style={active ? { background: `rgba(${dept.rgb}, 0.05)` } : {}}
                    >
                      {inDept && chips.length === 0 && (
                        <DeptDotWithPopover dept={dept} person={person} />
                      )}
                      {chips.map(({ col, docId }) => (
                        <WidgetChipWithPopover
                          key={col}
                          colKey={col}
                          docId={docId}
                          clientPath={clientPath}
                        />
                      ))}
                      {!active && (
                        <span className="text-[10px] text-muted-foreground/25">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
