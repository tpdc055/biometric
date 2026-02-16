import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Citizen } from "@/lib/db";
import { findDuplicates, type DuplicateMatch } from "@/lib/validation";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  Calendar,
  Home,
} from "lucide-react";

interface DuplicateCheckerProps {
  citizenData: Partial<Citizen>;
  onSelectExisting?: (citizen: Citizen) => void;
}

export function DuplicateChecker({ citizenData, onSelectExisting }: DuplicateCheckerProps) {
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [checking, setChecking] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Check for duplicates when citizen data changes
  useEffect(() => {
    const checkDuplicates = async () => {
      // Only check if we have at least first name and last name
      if (!citizenData.firstName?.trim() || !citizenData.lastName?.trim()) {
        setDuplicates([]);
        return;
      }

      setChecking(true);
      try {
        const matches = await findDuplicates(citizenData, 0.6);
        setDuplicates(matches);
        // Auto-expand if duplicates found
        if (matches.length > 0) {
          setExpanded(true);
        }
      } catch (error) {
        console.error("Duplicate check error:", error);
      } finally {
        setChecking(false);
      }
    };

    // Debounce the check
    const timeout = setTimeout(checkDuplicates, 500);
    return () => clearTimeout(timeout);
  }, [citizenData.firstName, citizenData.lastName, citizenData.phoneNumber, citizenData.dateOfBirth]);

  if (duplicates.length === 0 && !checking) {
    return null;
  }

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <div className="rounded-xl border-2 border-amber-300 bg-amber-50 overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full p-3 flex items-center justify-between text-left hover:bg-amber-100 transition-colors">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">
                  {checking ? "Checking for duplicates..." : `${duplicates.length} potential duplicate${duplicates.length === 1 ? "" : "s"} found`}
                </p>
                <p className="text-xs text-amber-600">
                  Click to {expanded ? "hide" : "review"} matches
                </p>
              </div>
            </div>
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-amber-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-amber-600" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-2">
            {duplicates.map((match) => (
              <div
                key={match.citizen.id}
                className="p-3 rounded-lg bg-white border border-amber-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-500" />
                      <span className="font-medium text-slate-800">
                        {match.citizen.firstName} {match.citizen.lastName}
                        {match.citizen.otherNames && (
                          <span className="text-slate-500"> ({match.citizen.otherNames})</span>
                        )}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge
                        variant={match.matchScore > 0.8 ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {Math.round(match.matchScore * 100)}% match
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {match.citizen.uniqueId}
                      </Badge>
                    </div>

                    <div className="mt-2 space-y-1">
                      {match.citizen.phoneNumber && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Phone className="w-3 h-3" />
                          {match.citizen.phoneNumber}
                        </div>
                      )}
                      {match.citizen.dateOfBirth && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(match.citizen.dateOfBirth).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {match.matchReasons.map((reason, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700"
                        >
                          {reason}
                        </span>
                      ))}
                    </div>
                  </div>

                  {onSelectExisting && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectExisting(match.citizen)}
                    >
                      View
                    </Button>
                  )}
                </div>
              </div>
            ))}

            <p className="text-xs text-amber-600 text-center pt-2">
              Review these records before creating a new one to avoid duplicates
            </p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
