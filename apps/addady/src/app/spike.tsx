// Chart spike (ADR 006): Arabic RTL text, Eastern Arabic digits, 200% font scale, and the
// same monthly-kWh bar and line charts drawn with Victory Native XL (Skia) and gifted-charts (SVG).
import {
  Paragraph,
  Skia,
  TextAlign,
  useFont,
  useFonts,
  type SkTypefaceFontProvider,
} from '@shopify/react-native-skia';
import {
  I18nManager,
  PixelRatio,
  ScrollView,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bar, CartesianChart, Line, type AxisLabelRenderer } from 'victory-native';
import {
  ArText,
  MAX_FONT_SCALE,
  directionalTransform,
  fontFamily,
  formatMoney,
  formatNumber,
  palette,
  spacing,
} from '@addady/ui-ar';

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو'];
const KWH = [180, 165, 210, 290, 420, 610];

// In RTL the earliest month sits on the right, so time reads in the same direction as the text.
const rtl = I18nManager.isRTL;
const victoryData = KWH.map((kwh, i) => ({ x: rtl ? KWH.length - 1 - i : i, kwh }));
const monthAt = (x: number) => MONTHS[rtl ? KWH.length - 1 - x : x] ?? '';

const giftedData = KWH.map((value, i) => ({ value, label: MONTHS[i] }));

// Skia's plain Text/useFont draws Arabic unshaped (isolated letters). SkParagraph shapes text
// (HarfBuzz + bidi), so axis labels are rendered as paragraphs through Victory's labelRenderer.
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

export default function ChartSpike() {
  const colors = palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
  const fontScale = Math.min(PixelRatio.getFontScale(), MAX_FONT_SCALE);
  const chartFont = useFont(
    require('@addady/ui-ar/assets/fonts/IBMPlexSansArabic-Regular.ttf'),
    12 * fontScale,
  );
  const fontMgr = useFonts({
    Plex: [require('@addady/ui-ar/assets/fonts/IBMPlexSansArabic-Regular.ttf')],
  });
  const shapedLabels = paragraphLabels(fontMgr, 12 * fontScale, colors.textMuted);
  const labelStyle = { fontFamily: fontFamily.regular, color: colors.textMuted, fontSize: 11 };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ArText variant="title" color={colors.text}>
          استهلاك الكهرباء
        </ArText>
        <ArText color={colors.textMuted}>
          {`اتجاه الواجهة: ${rtl ? 'من اليمين لليسار' : 'من اليسار لليمين'} · حجم الخط ×${formatNumber(PixelRatio.getFontScale(), { maximumFractionDigits: 2 })}`}
        </ArText>

        <View style={[styles.row, { borderColor: colors.border }]}>
          <ArText color={colors.text}>{`الشهر ده: ${formatNumber(88)} ك.و.س`}</ArText>
          <ArText color={colors.primary} style={{ transform: directionalTransform() }}>
            ›
          </ArText>
        </View>
        <ArText variant="heading" color={colors.text}>
          {`الفاتورة المتوقعة: ${formatMoney(14250, 'EGP')} — ${formatMoney(14250, 'EGP', { digits: 'latn' })}`}
        </ArText>

        <ArText variant="heading" color={colors.text}>
          Victory Native: أعمدة
        </ArText>
        <View style={styles.chart}>
          <CartesianChart
            data={victoryData}
            xKey="x"
            yKeys={['kwh']}
            domainPadding={24}
            xAxis={{ font: chartFont, formatXLabel: monthAt, labelColor: colors.textMuted }}
            yAxis={[
              {
                font: chartFont,
                axisSide: rtl ? 'right' : 'left',
                formatYLabel: (v) => formatNumber(v),
                labelColor: colors.textMuted,
              },
            ]}
          >
            {({ points, chartBounds }) => (
              <Bar
                points={points.kwh}
                chartBounds={chartBounds}
                color={colors.primary}
                roundedCorners={{ topLeft: 4, topRight: 4 }}
              />
            )}
          </CartesianChart>
        </View>

        <ArText variant="heading" color={colors.text}>
          Victory Native: خط (Paragraph)
        </ArText>
        <View style={styles.chart}>
          <CartesianChart
            data={victoryData}
            xKey="x"
            yKeys={['kwh']}
            domainPadding={24}
            xAxis={{
              font: chartFont,
              labelRenderer: shapedLabels,
              formatXLabel: monthAt,
              labelColor: colors.textMuted,
            }}
            yAxis={[
              {
                font: chartFont,
                labelRenderer: shapedLabels,
                axisSide: rtl ? 'right' : 'left',
                formatYLabel: (v) => formatNumber(v),
                labelColor: colors.textMuted,
              },
            ]}
          >
            {({ points }) => (
              <Line
                points={points.kwh}
                color={colors.primary}
                strokeWidth={3}
                curveType="natural"
              />
            )}
          </CartesianChart>
        </View>

        <ArText variant="heading" color={colors.text}>
          gifted-charts: أعمدة
        </ArText>
        <BarChart
          data={giftedData}
          rtl={rtl}
          barWidth={22}
          spacing={18}
          frontColor={colors.primary}
          xAxisLabelTextStyle={labelStyle}
          yAxisTextStyle={labelStyle}
          formatYLabel={(label) => formatNumber(Number(label))}
          noOfSections={4}
        />

        <ArText variant="heading" color={colors.text}>
          gifted-charts: خط
        </ArText>
        <LineChart
          data={giftedData}
          color={colors.primary}
          thickness={3}
          curved
          dataPointsColor={colors.primary}
          xAxisLabelTextStyle={labelStyle}
          yAxisTextStyle={labelStyle}
          formatYLabel={(label) => formatNumber(Number(label))}
          noOfSections={4}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chart: { height: 240 },
});
