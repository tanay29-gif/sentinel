// components/sentinel/page-header.tsx
import React from 'react';
import { Button } from "@/components/ui/button";
import type { PageHeaderProps } from "@/lib/interface";



export function PageHeader({ title, eyebrow, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">
          {eyebrow}
        </p>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
      </div>

      {action && (
        <div>
          {/* 
            FIX: If the action is just text, use the standard Button.
            If it's an object (like <AddServiceSidebar />), render it directly!
          */}
          {typeof action === "string" ? (
            <Button className="bg-slate-950 hover:bg-slate-800 text-white">
              {action}
            </Button>
          ) : (
            action
          )}
        </div>
      )}
    </div>
  );
}