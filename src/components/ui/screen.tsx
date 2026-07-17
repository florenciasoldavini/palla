import { ScrollView } from '@/components/ui/primitives';
import { cn } from '@/utils/cn';

import type { ComponentProps } from 'react';

type ScreenProps = ComponentProps<typeof ScrollView>;

export function Screen({ className, contentContainerClassName, ...props }: ScreenProps) {
  return (
    <ScrollView
      className={cn('bg-canvas flex-1', className)}
      contentContainerClassName={contentContainerClassName}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      {...props}
    />
  );
}
