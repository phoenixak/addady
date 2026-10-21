import { router, type Href } from 'expo-router';

import { pricedClass, hasBands } from '../../domain/place';
import { t } from '../../i18n';
import { useCurrentHome } from '../../state';
import { Caption, IconTile, Screen, Section, TileGrid, type IconName } from '../../ui';

interface Tool {
  icon: IconName;
  label: string;
  hint: string;
  href: Href;
  show?: boolean;
}

export default function Tools() {
  const { home } = useCurrentHome();
  const banded = home ? hasBands(pricedClass(home)) : true;
  const prepaid = home?.meterType === 'prepaid';

  const bills: Tool[] = [
    {
      icon: 'file-document-check-outline',
      label: t('tools.billCheck'),
      hint: t('tools.billCheckHint'),
      href: '/bill-check',
    },
    {
      icon: 'help-circle-outline',
      label: t('tools.explain'),
      hint: t('tools.explainHint'),
      href: '/explain-recharge',
      show: prepaid || !home,
    },
    {
      icon: 'stairs',
      label: t('tools.cliffs'),
      hint: t('tools.cliffsHint'),
      href: '/cliffs',
      show: banded,
    },
    {
      icon: 'cash-multiple',
      label: t('tools.prices'),
      hint: t('tools.pricesHint'),
      href: '/prices',
    },
  ];
  const saving: Tool[] = [
    {
      icon: 'washing-machine',
      label: t('tools.appliances'),
      hint: t('tools.appliancesHint'),
      href: '/appliances',
    },
    {
      icon: 'lightbulb-on-outline',
      label: t('tools.whatIf'),
      hint: t('tools.whatIfHint'),
      href: '/what-if',
    },
  ];

  const grid = (tools: Tool[]) => (
    <TileGrid>
      {tools
        .filter((x) => x.show !== false)
        .map((x) => (
          <IconTile
            key={x.label}
            icon={x.icon}
            label={x.label}
            hint={x.hint}
            onPress={() => router.push(x.href)}
          />
        ))}
    </TileGrid>
  );

  return (
    <Screen>
      <Section title={t('tools.billsSection')}>{grid(bills)}</Section>
      <Section title={t('tools.savingSection')}>{grid(saving)}</Section>
      <Caption>{t('tools.comingSoon')}</Caption>
    </Screen>
  );
}
