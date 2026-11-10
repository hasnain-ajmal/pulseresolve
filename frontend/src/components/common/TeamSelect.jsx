import React, { useEffect, useRef, useState } from 'react';

export const TEAMS = [
  'Support Team',
  'Payments Ops',
  'Delivery Team',
  'Authentication Team',
  'Engineering',
  'Product Team',
];

const OTHER = '__other__';

/**
 * Team picker: a drop-down of built-in teams plus "Other...".
 * Choosing "Other..." reveals a text box asking which team. `value` is the final team name ('' = none).
 */
export function TeamSelect({ value, onChange, optional = false, id = 'team-select' }) {
  const isCustom = Boolean(value) && !TEAMS.includes(value);
  const [otherChosen, setOtherChosen] = useState(isCustom);
  const textRef = useRef(null);

  useEffect(() => {
    if (value && TEAMS.includes(value)) setOtherChosen(false);
    if (isCustom) setOtherChosen(true);
  }, [value, isCustom]);

  useEffect(() => {
    if (otherChosen && !isCustom && textRef.current) textRef.current.focus();
  }, [otherChosen, isCustom]);

  const selected = otherChosen || isCustom ? OTHER : value || '';

  const handleSelect = (e) => {
    const v = e.target.value;
    if (v === OTHER) {
      setOtherChosen(true);
      onChange(''); // wait for the typed team name
    } else {
      setOtherChosen(false);
      onChange(v);
    }
  };

  return (
    <div className="space-y-2">
      <select
        id={id}
        value={selected}
        onChange={handleSelect}
        className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-purple-600"
      >
        {optional ? <option value="">No team yet</option> : <option value="" disabled>Select a team...</option>}
        {TEAMS.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
        <option value={OTHER}>Other...</option>
      </select>

      {selected === OTHER && (
        <div>
          <label htmlFor={`${id}-other`} className="block text-[11px] font-semibold text-slate-600 mb-1">
            Which team should this be assigned to?
          </label>
          <input
            id={`${id}-other`}
            ref={textRef}
            type="text"
            maxLength={80}
            value={isCustom ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type the team name, e.g. Data Platform"
            className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-600"
          />
        </div>
      )}
    </div>
  );
}
