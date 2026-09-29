import type { ComponentProps } from 'react';
import { Card } from '@heroui/react';

/**
 * Shared glass styling for HeroUI cards. Caller classes are appended to the
 * base styles; all other Card props and child components remain available.
 */
const GLASS_CARD_CLASSNAME =
  'border border-white/10 bg-white/10 text-white shadow-2xl backdrop-blur-xl';

type GlassCardProps = ComponentProps<typeof Card>;

function GlassCard({ className, ...props }: GlassCardProps) {
  return (
    <Card
      className={
        className ? `${GLASS_CARD_CLASSNAME} ${className}` : GLASS_CARD_CLASSNAME
      }
      {...props}
    />
  );
}

export default GlassCard;
