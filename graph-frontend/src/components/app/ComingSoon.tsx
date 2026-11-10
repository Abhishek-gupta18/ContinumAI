import React from 'react';

export function ComingSoon({ title }: { title: string }): React.ReactElement {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-xs text-[#8A92A6]">{title} is coming soon.</p>
    </div>
  );
}
