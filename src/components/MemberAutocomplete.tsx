"use client";

import { useMemo, useRef, useState, useEffect } from "react";

export interface MemberOption {
  id: string;
  fullName: string;
}

interface MemberAutocompleteProps {
  members: MemberOption[];
  selected: MemberOption[];
  onChange: (selected: MemberOption[]) => void;
  maxSelections?: number;
  excludeIds?: string[];
  placeholder?: string;
  id?: string;
}

export function MemberAutocomplete({
  members,
  selected,
  onChange,
  maxSelections,
  excludeIds = [],
  placeholder = "Type a member name…",
  id = "member-invite",
}: MemberAutocompleteProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedIds = new Set(selected.map((m) => m.id));
  const excluded = new Set([...excludeIds, ...selectedIds]);

  const suggestions = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    if (query.length < 1) return [];
    return members
      .filter((m) => !excluded.has(m.id))
      .filter((m) => m.fullName.toLowerCase().includes(query))
      .slice(0, 10);
  }, [members, inputValue, excluded]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const atMax = maxSelections != null && selected.length >= maxSelections;

  const handleSelect = (member: MemberOption) => {
    if (atMax) return;
    onChange([...selected, member]);
    setInputValue("");
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleRemove = (memberId: string) => {
    onChange(selected.filter((m) => m.id !== memberId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "Escape") setIsOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i < suggestions.length - 1 ? i + 1 : i));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i > 0 ? i - 1 : -1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div ref={wrapperRef} className="space-y-2">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((m) => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-800"
            >
              {m.fullName}
              <button
                type="button"
                onClick={() => handleRemove(m.id)}
                className="rounded-full p-0.5 hover:bg-emerald-100"
                aria-label={`Remove ${m.fullName}`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          id={id}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => inputValue.trim() && suggestions.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={atMax ? "Maximum invites reached" : placeholder}
          disabled={atMax}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="member-suggestions"
          className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-stone-50 disabled:text-stone-400"
        />
        {isOpen && suggestions.length > 0 && !atMax && (
          <ul
            id="member-suggestions"
            role="listbox"
            className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg"
          >
            {suggestions.map((m, i) => (
              <li
                key={m.id}
                id={`member-option-${i}`}
                role="option"
                aria-selected={i === highlightedIndex}
                onMouseEnter={() => setHighlightedIndex(i)}
                onClick={() => handleSelect(m)}
                className={`cursor-pointer px-4 py-2.5 text-sm ${
                  i === highlightedIndex
                    ? "bg-emerald-50 text-emerald-900"
                    : "text-stone-900 hover:bg-stone-50"
                }`}
              >
                {m.fullName}
              </li>
            ))}
          </ul>
        )}
      </div>
      {maxSelections != null && (
        <p className="text-xs text-stone-500">
          {selected.length} of {maxSelections} invites selected
        </p>
      )}
    </div>
  );
}
