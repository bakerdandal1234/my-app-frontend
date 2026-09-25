import type { ComponentProps } from 'react';
import { Card } from '@heroui/react';

/**
 * The "glass" card look — a translucent frosted card on the dark FlowDesk
 * background — was copy-pasted as the exact same className string onto
 * HeroUI's <Card> across ~17 pages (auth forms, profile/security/sessions,
 * admin lists, status pages). This wraps <Card>
 * with that base style as the default so pages stop hand-carrying the
 * long className, while staying a plain <Card> under the hood — Card.Header,
 * Card.Title, Card.Description, Card.Content and Card.Footer are imported
 * and used exactly as before in every page, unchanged.
 *
 * Any className a page passes in is appended after the base classes, so a
 * page-specific sizing class (e.g. "w-full max-w-sm") still applies.
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
