"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type PickerOption = {
  value: string;
  label: string;
  hint?: string;
  quote?: string;
};

type SearchablePickerProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: PickerOption[];
  placeholder?: string;
  disabled?: boolean;
  allowCustom?: boolean;
  emptyMessage?: string;
};

export function SearchablePicker({
  value,
  onValueChange,
  options,
  placeholder = "Search...",
  disabled = false,
  allowCustom = false,
  emptyMessage = "No matches found",
}: SearchablePickerProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;

    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(normalizedQuery) ||
        option.value.toLowerCase().includes(normalizedQuery) ||
        option.hint?.toLowerCase().includes(normalizedQuery) ||
        option.quote?.toLowerCase().includes(normalizedQuery)
    );
  }, [options, query]);

  const trimmedQuery = query.trim();
  const showCustomOption =
    allowCustom &&
    trimmedQuery.length > 0 &&
    !filteredOptions.some(
      (option) => option.value.toLowerCase() === trimmedQuery.toLowerCase()
    );

  const listItems = showCustomOption
    ? [
        ...filteredOptions,
        {
          value: trimmedQuery,
          label: `Use "${trimmedQuery}"`,
          hint: "Custom entry",
        },
      ]
    : filteredOptions;

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery(value);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open, value]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, open]);

  function selectOption(option: PickerOption) {
    onValueChange(option.value);
    setQuery(option.value);
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      setOpen(true);
      return;
    }

    if (!open) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((index) =>
        index < listItems.length - 1 ? index + 1 : index
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((index) => (index > 0 ? index - 1 : 0));
      return;
    }

    if (event.key === "Enter" && listItems[highlightedIndex]) {
      event.preventDefault();
      selectOption(listItems[highlightedIndex]);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setQuery(value);
      inputRef.current?.blur();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex items-center gap-2 border border-input bg-card/60 px-3 transition-colors",
          "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          disabled={disabled}
          value={open ? query : selectedOption?.label ?? query}
          placeholder={placeholder}
          className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          onFocus={() => {
            setOpen(true);
            setQuery(value);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (allowCustom) {
              onValueChange(event.target.value);
            }
          }}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-label={open ? "Close options" : "Open options"}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (disabled) return;
            if (open) {
              setOpen(false);
              setQuery(value);
              inputRef.current?.blur();
              return;
            }
            setOpen(true);
            setQuery(value);
            inputRef.current?.focus();
          }}
        >
          <ChevronDown
            className={cn("size-4 transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {open && !disabled && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-80 w-full overflow-y-auto border border-border bg-popover shadow-md"
        >
          {listItems.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          ) : (
            listItems.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;

              return (
                <button
                  key={`${option.value}-${option.hint ?? "default"}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    "flex w-full items-start justify-between gap-3 px-3 py-3 text-left text-sm transition-colors",
                    isHighlighted && "bg-secondary/80",
                    !isHighlighted && "hover:bg-secondary/60"
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => selectOption(option)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-foreground">{option.label}</span>
                    {option.quote ? (
                      <span className="instrument-quote instrument-quote-compact mt-2 block border-l-accent/25">
                        {option.quote}
                      </span>
                    ) : (
                      option.hint &&
                      option.hint !== "Custom entry" && (
                        <span className="instrument-meta mt-0.5 block normal-case tracking-normal">
                          {option.hint}
                        </span>
                      )
                    )}
                  </span>
                  {isSelected && (
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
