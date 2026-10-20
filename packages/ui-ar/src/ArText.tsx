import { Text, type TextProps } from 'react-native';

import { MAX_FONT_SCALE, typography } from './theme';

export type ArTextVariant = keyof typeof typography;

export interface ArTextProps extends TextProps {
  variant?: ArTextVariant;
  color?: string;
}

/** Text in the bundled Arabic font that scales with the system setting up to 200%. */
export function ArText({ variant = 'body', color, style, ...rest }: ArTextProps) {
  return (
    <Text
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      style={[typography[variant], color ? { color } : null, style]}
      {...rest}
    />
  );
}
