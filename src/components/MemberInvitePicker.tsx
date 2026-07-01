"use client";

import { AvatarWithSash } from "@/components/AvatarWithSash";
import { MemberAutocomplete, type MemberOption } from "@/components/MemberAutocomplete";

export interface MemberInviteOption extends MemberOption {
  imageUrl?: string | null;
  isFavorite?: boolean;
}

interface MemberInvitePickerProps {
  members: MemberInviteOption[];
  selected: MemberOption[];
  onChange: (selected: MemberOption[]) => void;
  excludeIds?: string[];
}

export function MemberInvitePicker({
  members,
  selected,
  onChange,
  excludeIds = [],
}: MemberInvitePickerProps) {
  const favoriteMembers = members.filter((m) => m.isFavorite);
  const selectedIds = new Set(selected.map((m) => m.id));

  const toggleInvite = (member: MemberOption) => {
    if (selectedIds.has(member.id)) {
      onChange(selected.filter((m) => m.id !== member.id));
    } else {
      onChange([...selected, { id: member.id, fullName: member.fullName }]);
    }
  };

  const inviteAllFavorites = () => {
    const toAdd = favoriteMembers.filter((m) => !selectedIds.has(m.id));
    if (toAdd.length === 0) return;
    onChange([
      ...selected,
      ...toAdd.map((m) => ({ id: m.id, fullName: m.fullName })),
    ]);
  };

  return (
    <div>
      {favoriteMembers.length > 0 && (
        <div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-stone-700">Your favorites</p>
            {favoriteMembers.some((m) => !selectedIds.has(m.id)) && (
              <button
                type="button"
                onClick={inviteAllFavorites}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
              >
                Invite all
              </button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {favoriteMembers.map((member) => {
              const invited = selectedIds.has(member.id);
              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => toggleInvite(member)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    invited
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-stone-200 bg-white text-stone-700 hover:border-emerald-300 hover:bg-emerald-50/50"
                  }`}
                >
                  <AvatarWithSash
                    imageUrl={member.imageUrl ?? null}
                    alt={member.fullName}
                    size="sm"
                    fallback={member.fullName[0]?.toUpperCase() ?? "?"}
                    className="ring-1 ring-stone-200"
                  />
                  <span>{member.fullName}</span>
                  {invited && (
                    <svg
                      className="h-4 w-4 text-emerald-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      aria-hidden
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={favoriteMembers.length > 0 ? "mt-5" : ""}>
        <p className="mb-2 text-sm font-medium text-stone-700">Search members</p>
        <MemberAutocomplete
          members={members}
          selected={selected}
          onChange={onChange}
          excludeIds={excludeIds}
        />
      </div>
    </div>
  );
}
