// Victory Native charts with Arabic labels drawn by Skia Paragraph (shaped, bidi-aware; ADR 006).
// Plain Skia text would render Arabic as disconnected letters.
import {
  Paragraph,
  Skia,
  TextAlign,
  useFonts,
  type SkTypefaceFontProvider,
} from '@shopify/react-native-skia';
import { PixelRatio, View } from 'react-native';
import { Bar, CartesianChart, type AxisLabelRenderer } from 'victory-native';
import { MAX_FONT_SCALE } from '@addady/ui-ar';

import { useColors } from './index';

function paragraphLabels(
  fontMgr: SkTypefaceFontProvider | null,
  fontSize: number,
  color: string,
): AxisLabelRenderer<number> | undefined {
  if (!fontMgr) return undefined;
  const build = (text: string, width: number) => {
    const p = Skia.ParagraphBuilder.Make({ textAlign: TextAlign.Center }, fontMgr)
      .pushStyle({ fontFamilies: ['Plex'], fontSize, color: Skia.Color(color) })
      .addText(text)
      .build();
    p.layout(width);
    return p;
  };
  return {
    measure: ({ text }) => {
      const p = build(text, 1000);
      return { width: Math.ceil(p.getLongestLine()), height: Math.ceil(p.getHeight()), fontSize };
    },
    render: ({ text, x, y, width }) => (
      <Paragraph paragraph={build(text, width)} x={x} y={y} width={width} />
    ),
  };
}

export interface BarDatum {
  label: string;
  value: number;
}

/** Bars in time order; in RTL the earliest bar is on the right, matching the reading direction. */
export function ArabicBarChart({
  data,
  formatValue,
  height = 220,
}: {
  data: BarDatum[];
  formatValue: (v: number) => string;
  height?: number;
}) {
  const c = useColors();
  const fontMgr = useFonts({
    Plex: [require('@addady/ui-ar/assets/fonts/IBMPlexSansArabic-Regular.ttf')],
  });
  const fontScale = Math.min(PixelRatio.getFontScale(), MAX_FONT_SCALE);
  const labels = paragraphLabels(fontMgr, 11 * fontScale, c.textMuted);
  const n = data.length;
  const points = data.map((d, i) => ({ x: n - 1 - i, value: d.value }));
  if (n === 0) return null;
  return (
    <View style={{ height }}>
      <CartesianChart
        data={points}
        xKey="x"
        yKeys={['value']}
        domainPadding={{ top: 12 }}
        domain={{ y: [0] }}
        xAxis={{
          labelRenderer: labels,
          formatXLabel: (x) => data[n - 1 - x]?.label ?? '',
          tickCount: n,
          labelColor: c.textMuted,
        }}
        yAxis={[
          {
            labelRenderer: labels,
            axisSide: 'right',
            formatYLabel: (v) => formatValue(v),
            labelColor: c.textMuted,
          },
        ]}
      >
        {({ points: p, chartBounds }) => (
          <Bar
            points={p.value}
            chartBounds={chartBounds}
            color={c.primary}
            innerPadding={0.35}
            roundedCorners={{ topLeft: 4, topRight: 4 }}
          />
        )}
      </CartesianChart>
    </View>
  );
}
