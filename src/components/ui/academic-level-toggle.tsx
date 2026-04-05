"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import { GraduationCap, BookOpen, FlaskConical } from "lucide-react";

export type AcademicLevel = "UG" | "PG" | "PHD";

interface AcademicLevelConfig {
  label: string;
  fullName: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  bloomFocus: string[];
}

const ACADEMIC_LEVELS: Record<AcademicLevel, AcademicLevelConfig> = {
  UG: {
    label: "UG",
    fullName: "Undergraduate",
    description: "Focus on Apply and Analyze levels. Tests fundamental principles and standard applications.",
    icon: BookOpen,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/50",
    borderColor: "border-blue-200 dark:border-blue-800",
    bloomFocus: ["Apply", "Analyze"],
  },
  PG: {
    label: "PG",
    fullName: "Postgraduate",
    description: "Focus on Evaluate and Create levels. Requires synthesis of multiple concepts and advanced problem-solving.",
    icon: GraduationCap,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/50",
    borderColor: "border-purple-200 dark:border-purple-800",
    bloomFocus: ["Evaluate", "Create"],
  },
  PHD: {
    label: "PhD",
    fullName: "Doctoral",
    description: "Focus on Original Synthesis and Research Gap Identification. Open-ended questions requiring professional-grade rigor.",
    icon: FlaskConical,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/50",
    borderColor: "border-amber-200 dark:border-amber-800",
    bloomFocus: ["Create", "Evaluate", "Research"],
  },
};

interface AcademicLevelToggleProps {
  value: AcademicLevel;
  onChange: (level: AcademicLevel) => void;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function AcademicLevelToggle({
  value,
  onChange,
  disabled = false,
  className,
  size = "md",
}: AcademicLevelToggleProps) {
  const levels: AcademicLevel[] = ["UG", "PG", "PHD"];

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
  };

  const iconSizes = {
    sm: "h-3.5 w-3.5",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          "inline-flex rounded-lg border bg-muted/50 p-1",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        role="radiogroup"
        aria-label="Academic Level"
      >
        {levels.map((level) => {
          const config = ACADEMIC_LEVELS[level];
          const isSelected = value === level;
          const Icon = config.icon;

          return (
            <Tooltip key={level}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={disabled}
                  onClick={() => !disabled && onChange(level)}
                  className={cn(
                    "relative inline-flex items-center gap-2 rounded-md font-medium transition-all duration-200",
                    sizeClasses[size],
                    isSelected
                      ? cn(
                        "bg-background shadow-sm",
                        config.color,
                        config.borderColor,
                        "border"
                      )
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
                    disabled && "pointer-events-none"
                  )}
                >
                  <Icon className={iconSizes[size]} />
                  <span>{config.label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                className="max-w-xs"
                sideOffset={8}
              >
                <div className="space-y-2">
                  <div className="font-semibold">{config.fullName}</div>
                  <p className="text-xs text-muted-foreground">
                    {config.description}
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {config.bloomFocus.map((bloom) => (
                      <Badge
                        key={bloom}
                        variant="secondary"
                        className="text-xs"
                      >
                        {bloom}
                      </Badge>
                    ))}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

interface AcademicLevelBadgeProps {
  level: AcademicLevel;
  showIcon?: boolean;
  className?: string;
}

export function AcademicLevelBadge({
  level,
  showIcon = true,
  className,
}: AcademicLevelBadgeProps) {
  const config = ACADEMIC_LEVELS[level];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5",
        config.color,
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.fullName}
    </Badge>
  );
}

export { ACADEMIC_LEVELS };
