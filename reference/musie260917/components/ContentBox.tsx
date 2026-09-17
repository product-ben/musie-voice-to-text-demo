/**
 * Content Box — Layer 2
 * No APG pattern (not a widget), and base-ui has no card primitive — a card has
 * no behaviour to own. Semantic HTML: <article> with a real heading, so the box
 * appears in the document outline as a unit rather than as an anonymous div
 * stack. Built on base-ui's `useRender` so it accepts the same `render`
 * composition prop as the rest of the set.
 *
 * Type steps are PROPS, not a hardcoded heading-sm / body-md pair — the same
 * box is a session card at heading-sm and an onboarding panel at heading-lg.
 * The heading LEVEL is also a prop, because the correct level depends on where
 * the box sits in the page, which the box cannot know (1.3.1).
 *
 * PROVISIONAL: outline="dashed" consumes --border-style-dashed (token gap G2).
 */
import * as React from 'react';
import { useRender } from '@base-ui/react/use-render';

export type TypeStep =
  | 'display-xl' | 'display-lg'
  | 'heading-lg' | 'heading-md' | 'heading-sm'
  | 'body-lg' | 'body-md' | 'body-sm'
  | 'label-lg' | 'label-md';

/** 'raised' was removed in review: an elevation-1 card and a solid-outlined
 *  card were doing the same job, and the shadow read as a second, competing
 *  boundary next to the outline. Depth stays with 'sunken'. */
export type BoxOutline = 'solid' | 'dashed' | 'sunken' | 'plain';
export type HeadingLevel = 2 | 3 | 4 | 5 | 6;

export interface ContentBoxProps {
  headline: string;
  /** Heading level for the document outline. Never guessed. */
  headingLevel?: HeadingLevel;
  headlineStep?: TypeStep;
  text?: string;
  textStep?: TypeStep;
  outline?: BoxOutline;
  /** Arbitrary content, below the text. */
  children?: React.ReactNode;
  className?: string;
  /** base-ui composition: swap <article> for another element or component. */
  render?: useRender.RenderProp;
}

export function ContentBox({
  headline, headingLevel = 3, headlineStep = 'heading-sm',
  text, textStep = 'body-md', outline = 'solid', children, className, render,
}: ContentBoxProps) {
  const H = `h${headingLevel}` as 'h2';
  return useRender({
    render: render ?? <article />,
    props: {
      className: [
        'musy-box',
        outline !== 'solid' ? `musy-box--${outline}` : '',
        className ?? '',
      ].filter(Boolean).join(' '),
      children: (
        <>
          <H className="musy-box__headline" data-type-step={headlineStep}>{headline}</H>
          {text && <p className="musy-box__text" data-type-step={textStep}>{text}</p>}
          {children && <div className="musy-box__slot">{children}</div>}
        </>
      ),
    },
  });
}
