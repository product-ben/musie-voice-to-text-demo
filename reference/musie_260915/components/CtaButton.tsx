/**
 * CTA Button — Layer 2
 * base-ui: Button (`@base-ui/react/button`).
 * APG pattern: Button.
 *
 * base-ui's Button keeps a disabled button FOCUSABLE (aria-disabled rather than
 * the native attribute where appropriate), which is the accessible behaviour a
 * native <button disabled> loses: a keyboard user can still reach the control
 * and find out why it is unavailable.
 *
 * Default target --target-primary (44px, brief §5.4). --target-guided (64px)
 * and --target-comfort (56px) are size variants (Decision 4) — they raise the
 * TARGET, not the type step.
 *
 * The two accent variants are NOT a hue swap on primary: ocher and purple are
 * light solids and take dark ink, where terracotta is a dark solid and takes
 * light ink. Each family carries its own solved -hover / -active / -on tokens.
 * There is still no rule in the system for WHEN to pick an accent over primary —
 * see conflict B12 and open question 7.
 */
import * as React from 'react';
import { Button } from '@base-ui/react/button';
import { Icon } from './Icon';
import type { LucideIcon } from 'lucide-react';

export type CtaVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  /** Literal placeholder names, per Decision 3 — renaming later is a
   *  find-replace, not a redesign. */
  | 'accent-placeholder1'
  | 'accent-placeholder2';

export type CtaSize = 'primary' | 'comfort' | 'guided';

export interface CtaButtonProps
  extends Omit<React.ComponentPropsWithoutRef<typeof Button>, 'className'> {
  children: React.ReactNode;
  variant?: CtaVariant;
  size?: CtaSize;
  /** Leading icon only. A trailing icon means "this opens something else",
   *  which is a different component. */
  leadingIcon?: LucideIcon;
  loading?: boolean;
  loadingLabel?: string;
  /** Fill the inline axis. A layout decision, so the consumer opts in. */
  block?: boolean;
  /** Allow the label to wrap to two lines instead of overflowing. German
   *  compounds at 393px need this more often than English does. */
  wrap?: boolean;
  className?: string;
}

export const CtaButton = React.forwardRef<HTMLButtonElement, CtaButtonProps>(
  function CtaButton({
    children, variant = 'primary', size = 'primary', leadingIcon,
    loading = false, loadingLabel = 'Wird geladen', block = false, wrap = false,
    disabled, className, ...rest
  }, ref) {
    return (
      <Button
        {...rest}
        ref={ref}
        className={[
          'musy-btn', `musy-btn--${variant}`,
          size !== 'primary' ? `musy-btn--${size}` : '',
          block ? 'musy-btn--block' : '',
          wrap ? 'musy-btn--wrap' : '',
          className ?? '',
        ].filter(Boolean).join(' ')}
        aria-busy={loading || undefined}
        data-loading={loading ? '' : undefined}
        disabled={disabled || loading}
      >
        {leadingIcon && <Icon glyph={leadingIcon} size="md" inline />}
        <span className="musy-btn__label">{children}</span>
        {loading && <span className="musy-spinner" aria-hidden="true" />}
        {loading && <span className="musy-sr-only" role="status">{loadingLabel}</span>}
      </Button>
    );
  }
);
