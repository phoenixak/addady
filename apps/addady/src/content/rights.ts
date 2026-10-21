// "اعرف حقك": consumer procedures as step cards. Every card cites its sources and a confidence
// level (docs/research/rights.md). Procedures change: the app always says to confirm with the
// distribution company, and never submits anything on the user's behalf.
import type { Confidence } from 'eg-electricity-tariff';

import type { IconName } from '../ui';

export interface RightsCard {
  id: string;
  icon: IconName;
  title: string;
  summary: string;
  steps: string[];
  /** Optional tool inside the app that helps with this procedure. */
  tool?: { label: string; href: '/bill-check' | '/explain-recharge' | '/reading' };
  confidence: Confidence;
  sources: { label: string; url: string }[];
}

export const HOTLINE = '121';

export const RIGHTS: RightsCard[] = [
  {
    id: 'complain',
    icon: 'phone-in-talk',
    title: 'اشتكي من قراية غلط أو عطل',
    summary: 'الخط الساخن الموحد 121، وبعده الفرع، وبعده جهاز تنظيم مرفق الكهرباء',
    steps: [
      'اتصل بـ 121 (الخط الساخن الموحد للكهرباء) واشرح المشكلة، وخد رقم الشكوى.',
      'غالبًا فني بيعدي عليك في حدود 48 ساعة.',
      'لو المشكلة مااتحلتش، روح فرع شركة التوزيع بتاعتك ومعاك رقم الشكوى.',
      'لو برضه مااتحلتش، ابعت شكوى لجهاز تنظيم مرفق الكهرباء وحماية المستهلك على Complaints@egyptera.org ومعاك رقم الشكوى وصور الفواتير.',
    ],
    confidence: 'medium',
    sources: [
      { label: 'الدستور', url: 'https://www.dostor.org/5683848' },
      { label: 'جهاز تنظيم مرفق الكهرباء', url: 'https://egyptera.org/en/TarrifApril2026.aspx' },
    ],
  },
  {
    id: 'contest-bill',
    icon: 'file-document-edit-outline',
    title: 'اعترض على فاتورة',
    summary: 'طلب مكتوب في الإدارة التجارية بالفرع، ومعاك صور الفواتير والإيصالات',
    steps: [
      'احسب الفاتورة المفروض تبقى كام من «راجع فاتورتك» عشان تعرف الفرق بالظبط.',
      'صور العداد والقراية باينة والتاريخ ظاهر.',
      'قدم طلب مكتوب في الإدارة التجارية في فرع شركة التوزيع، ومعاك صور آخر فواتير والإيصالات.',
      'أشهر الأسباب: قراية تقديرية من غير ما حد يقرا العداد، أو فاتورة محسوبة على شهر تاني، أو عطل في العداد.',
      'خد صورة من الطلب أو رقمه عشان تتابع.',
    ],
    tool: { label: 'راجع فاتورتك', href: '/bill-check' },
    confidence: 'medium',
    sources: [
      { label: 'الوطن', url: 'https://www.elwatannews.com/news/details/8376821' },
      { label: 'الدستور', url: 'https://www.dostor.org/5683848' },
    ],
  },
  {
    id: 'meter-test',
    icon: 'gauge',
    title: 'اطلب اختبار العداد',
    summary: 'لو العداد طلع بايظ، رسوم الاختبار بترجعلك والفرق بيتسوى',
    steps: [
      'قدم طلب مكتوب في الفرع إنك عايز تختبر العداد، وادفع رسوم الاختبار (المبلغ بيختلف، اسأل الفرع).',
      'العداد بيتختبر في المعمل المركزي.',
      'لو طلع فيه عيب، رسوم الاختبار بترجعلك، والفلوس الزيادة بتتخصم من فواتيرك الجاية.',
    ],
    confidence: 'medium',
    sources: [
      { label: 'الدستور', url: 'https://www.dostor.org/5683848' },
      { label: 'بانكير', url: 'https://www.banker.news/156155' },
    ],
  },
  {
    id: 'self-read',
    icon: 'counter',
    title: 'سجل قرايتك بنفسك',
    summary: 'عشان متجيلكش فاتورة تقديرية',
    steps: [
      'سجل القراية على منصة الخدمات الإلكترونية الموحدة لشركات الكهرباء.',
      'اكتب الأرقام زي ما هي على شاشة العداد بالظبط، وراجعها قبل ما تأكد.',
      'سجلها كمان في عدّادي عشان تعرف شريحتك وفاتورتك المتوقعة.',
    ],
    tool: { label: 'سجل قراية', href: '/reading' },
    confidence: 'medium',
    sources: [{ label: 'الدستور', url: 'https://www.dostor.org/5683852' }],
  },
  {
    id: 'late-fee',
    icon: 'calendar-alert',
    title: 'لو اتأخرت في الدفع',
    summary: 'غرامة 7% بعد مهلة لحد 30 يوم من استلام الفاتورة',
    steps: [
      'الغرامة على العداد العادي (الفاتورة الشهرية) بس.',
      'المهلة بتتحسب من يوم ما استلمت الفاتورة، مش من تاريخ إصدارها.',
      'لو التأخير استمر، ممكن الشركة تغير العداد لعداد كارت (المصادر بتقول بعد شهر لشهرين).',
    ],
    confidence: 'medium',
    sources: [{ label: 'المال', url: 'https://almalnews.com/2139113/' }],
  },
  {
    id: 'installments',
    icon: 'cash-multiple',
    title: 'تقسيط المتأخرات',
    summary: 'مش تلقائي، بيتدرس حالة بحالة',
    steps: [
      'قدم طلب تقسيط في فرع شركة التوزيع.',
      'الطلب بيتدرس حالة بحالة، ومفيش مدة ثابتة منشورة (فيه تقارير عن 6 لـ 12 شهر).',
    ],
    confidence: 'low',
    sources: [{ label: 'الوطن', url: 'https://www.elwatannews.com/news/details/8333415' }],
  },
  {
    id: 'prepaid-deductions',
    icon: 'credit-card-minus-outline',
    title: 'ليه الرصيد اتخصم وأنا بشحن؟',
    summary: 'مديونية فترة السماح، فرق الشرائح، مقابل الخدمة، فروق الأسعار',
    steps: [
      'استهلاك فترة السماح: لو الرصيد خلص والعداد فضل شغال (الجمعة والإجازات وبالليل)، الاستهلاك ده بيتخصم من أول شحنة.',
      'فرق الشرائح: لما الشهر يعدي حد شريحة، كل استهلاك الشهر بيتحسب بسعر أعلى، والفرق بيتخصم مرة واحدة.',
      'مقابل خدمة العملاء: بيتخصم عن كل شهر، ولو مشحنتش شهور بيتجمع.',
      'فروق الأسعار: لو الأسعار اتغيرت، الفرق ممكن يتخصم.',
      'أقساط العداد أو الرصيد الاحتياطي (الطوارئ) لو اتصرف.',
      'اللمبة الحمرا بتنور لما الرصيد يوصل 10 جنيه.',
    ],
    tool: { label: 'ليه رصيدي اتخصم؟', href: '/explain-recharge' },
    confidence: 'medium',
    sources: [
      { label: 'الوطن', url: 'https://www.elwatannews.com/news/details/8333518' },
      { label: 'برلماني', url: 'https://www.parlmany.com/News/2/557365/' },
    ],
  },
  {
    id: 'coded-to-legal',
    icon: 'file-certificate-outline',
    title: 'تقنين العداد الكودي',
    summary: 'من كودي لقانوني: الورق المطلوب والخطوات',
    steps: [
      'جهز: البطاقة، وعقد الملكية أو الإيجار المسجل، وآخر إيصال كهربا.',
      'جهز شهادة التصالح أو قبول التصالح (نموذج 8). المباني اللي قبل 1975 محتاجة بس إثبات إن المبنى قديم.',
      'قدم على منصة شركة التوزيع، وبعدها فيه معاينة فنية.',
      'غالبًا العداد نفسه بيفضل زي ما هو.',
    ],
    confidence: 'medium',
    sources: [
      {
        label: 'مصراوي',
        url: 'https://www.masrawy.com/news/news_egypt/details/2026/4/20/2975195/',
      },
      { label: 'الدستور', url: 'https://www.dostor.org/5518671' },
    ],
  },
  {
    id: 'new-meter',
    icon: 'flash-outline',
    title: 'عداد جديد',
    summary: 'التقديم على منصة الخدمات الإلكترونية الموحدة',
    steps: [
      'اعمل حساب على منصة الخدمات الإلكترونية الموحدة وقدم الطلب، وارفع الورق المطلوب.',
      'الأسعار بتتغير، فاسأل الفرع عن التكلفة قبل ما تقدم.',
    ],
    confidence: 'low',
    sources: [{ label: 'المال', url: 'https://almalnews.com/2140324/' }],
  },
  {
    id: 'tampering',
    icon: 'alert-octagon-outline',
    title: 'سرقة التيار والتلاعب بالعداد',
    summary: 'جريمة: فسخ العقد ومحضر وحبس وغرامة كبيرة',
    steps: [
      'التلاعب بالعداد أو توصيل سلك قبل العداد سرقة تيار.',
      'العقوبة: فسخ العقد ومحضر شرطة وحبس وغرامات كبيرة، والتصالح بيبقى بضعف قيمة الاستهلاك أو أكتر.',
      'أرقام العقوبة مختلفة بين المصادر بعد تعديل 2024، فمكتبناش رقم واحد.',
      'لو شاكك إن عدادك بيحسب غلط، الطريق الصح هو «اطلب اختبار العداد».',
    ],
    confidence: 'medium',
    sources: [
      {
        label: 'مصراوي',
        url: 'https://www.masrawy.com/news/news_egypt/details/2024/11/20/2678215/',
      },
      { label: 'الدستور', url: 'https://www.dostor.org/5507046' },
    ],
  },
];

export function rightsCard(id: string): RightsCard | undefined {
  return RIGHTS.find((r) => r.id === id);
}
