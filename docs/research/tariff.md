# Research: Egyptian residential electricity tariff

- Researched: 2026-10-20 from public sources only (docs/PLAN.md §10).
- Every number below has a link. Raw source pages are not stored in the repo.
- **Confidence levels:**
  - **high:** the regulator (EgyptERA) states it directly, or two official sources agree.
  - **medium:** it's consistent across several independent outlets and checks out arithmetically against official figures.
  - **low:** a single source, or it conflicts with others.

## 1. How a residential bill is computed (band structure) — high
EgyptERA publishes the residential tariff as consumption **bands**. Which band you're in depends on the month's total kWh, and each band has its own pricing rule. The wording below is the regulator's own: the current page, the August 2024 page, and the July 2021 infographic all use the same structure.

| Monthly total | Regulator's wording | Rule |
|---|---|---|
| 0–100 kWh | "من 0-50" / "من 51-100" | **Progressive:** 0–50 at tier 1, 51–100 at tier 2 |
| 101–650 kWh | "المستهلك من 101 … من 0-200 / من 201-350 / من 351-650" | **Progressive from zero:** the first 200 kWh at tier 3, then tier 4, then tier 5. Tiers 1–2 no longer apply |
| 651–1000 kWh | "المستهلك أكثر من 650 ك.و.س — من صفر إلى 1000" | **Flat:** every kWh of the month at tier 6 |
| > 1000 kWh | "المستهلك أكثر من 1000 — صفر لأكثر من 1000" | **Flat:** every kWh at tier 7 |

So there are **three cliffs**: 100 → 101, 650 → 651 and 1000 → 1001 kWh.

Sources:
- [EgyptERA, current tariff from April 2026 (EN)](https://egyptera.org/en/TarrifApril2026.aspx)
- [EgyptERA, tariff Aug 2024–Apr 2026 (AR)](https://egyptera.org/ar/TarrifAug2024.aspx)
- [EgyptERA, July 2021 bill infographic](https://egyptera.org/ar/downloads/AwarenessPublication/Tariff2021.pdf)

**Confirmed by the official EEHC examples** (El Watan, 1 Jun 2026, quoting EEHC's own awareness post), all under the April 2026 prices:
- 100 kWh ≈ 75 EGP
- 101 kWh ≈ 102 EGP. This is the 100 → 101 cliff.
- 300 kWh ≈ 356 EGP
- 1001 kWh ≈ 2622.5 EGP ("يلغى النظام التراكمي بالكامل", the cumulative system is cancelled entirely)

Each of these matches the rule above **plus** the customer-service fee to within 0.05 EGP ([El Watan](https://www.elwatannews.com/news/details/8293997)).

**Disputed:** the same EEHC post gives 800 kWh ≈ 1347.5 EGP. That only works with *progressive* billing over 651–1000; the regulator's flat rule gives 1705 EGP. We follow the regulator, and the case is kept as `disputed` in the golden set.

**Rejected:**
- *"Progressive from tier 1 all the way to 1000"* (several news calculators, e.g. Masrawy 4 Aug 2026, copied word for word by Dostor 6 Aug 2026). It contradicts both the regulator's wording and the official 101 kWh example.
- *"Prices restart only above 650"* (an earlier internal hypothesis). It contradicts the official 101 kWh example.

## 2. Price versions (piasters per kWh)
| Version | Applies to | T1 0–50 | T2 51–100 | T3 | T4 | T5 | T6 (flat) | T7 (flat) | Confidence |
|---|---|---|---|---|---|---|---|---|---|
| 2024-08 | consumption Aug 2024 – Mar 2026 | 68 | 78 | 95 | 155 | 195 | 210 | 223 | high (EgyptERA page) |
| 2026-04 | consumption from Apr 2026 | 68 | 78 | 95 | 155 | 195 | 210 | 258 | high (EgyptERA page + EEHC 1001 kWh example) |
| 2026-07 | consumption from Jul 2026 (the "August bill") | 68 | 98 | 115 | 173 | 214 | 241 | 274 | **medium**: not yet on EgyptERA's site (checked 2026-10-20) |

### Why 2026-07 uses these prices
Three tables circulated on 1 Aug 2026:
- **A:** ×1.12 on every tier: 87.36 / 106.4 / 173.6 / 218.4 / 235.2 / 289 (Masrawy, Elbalad, Akhbar El Yom)
- **B:** 95 / 115 / 172 / 218 / 240 / 274 (Egypt Independent / Al-Masry Al-Youm, Reslink)
- **C:** 98 / 115 / 173 / 214 / 241 / 274 (implied by Youm7)

The ministry's release gave, for each consumption level, what the citizen pays and what the state pays. Those figures were reported independently by [Youm7](https://www.youm7.com/story/2026/8/1/%D8%B1%D8%B3%D9%85%D9%8A%D8%A7-%D9%85%D8%B1%D9%81%D9%82-%D8%A7%D9%84%D9%83%D9%87%D8%B1%D8%A8%D8%A7%D8%A1-%D9%8A%D9%86%D8%B4%D8%B1-%D8%A3%D8%B3%D8%B9%D8%A7%D8%B1-%D8%A7%D9%84%D8%B4%D8%B1%D8%A7%D8%A6%D8%AD-%D9%88%D9%86%D8%B3%D8%A8-%D8%AF%D8%B9%D9%85-%D8%AA%D8%AA%D8%AD%D9%85%D9%84%D9%87%D8%A7-%D8%A7%D9%84%D8%AF%D9%88%D9%84%D8%A9/7499635), [Masrawy](https://www.masrawy.com/news/news_egypt/details/2026/8/1/3026220/) and [Elbalad](https://www.elbalad.news/7057875).
- Citizen + state = 2.74 EGP/kWh at every level, which is the unsubsidised cost.
- The citizen amounts at 50/100/200/300/400/500/600/1000/2000 kWh are 34 / 83 / 230 / 403 / 597 / 811 / 1025 / 2410 / 5480 EGP.
- **Only C reproduces all nine values** within rounding, using the band rule in §1:
  - A gives 213 EGP at 200 kWh (the stated value is 230).
  - B gives 815, 1033 and 2400 at 500, 600 and 1000 kWh (stated: 811, 1025, 2410).
- C also equals Youm7's stated per-tier increases: +20, +20, +18, +19, +31 and +16 piasters on the 2026-04 prices.

The effective month is the July 2026 consumption, collected from 1 Aug 2026 ([Elbalad](https://www.elbalad.news/7057875)). Prepaid and coded meters are reported as switching on 1 Aug 2026, with differences settled at the next recharge ([Al Alam Al An](https://www.alalamalan.com/), [Egypt Telegraph](https://www.egypttelegraph.com/article/266224/)). We model one version boundary at **2026-07-01 (consumption)**.

**Disputed (2026-04):** Youm7 (4 Apr 2026) and Business Today say 0–2000 kWh stayed at 223 and only usage above 2000 rose to 258. Both EgyptERA's table and EEHC's official 1001 kWh example use 258 above 1000. We follow the two official sources.

## 3. Customer-service fee (EGP per month, by the month's band) — high
Source: [EgyptERA](https://egyptera.org/en/TarrifApril2026.aspx), "starting from January 2024", still listed on the April 2026 page.

| kWh/month | 0–50 | 51–100 | 101–200 | 201–350 | 351–650 | 651–1000 | > 1000 | zero read / closed |
|---|---|---|---|---|---|---|---|---|
| Fee | 1 | 2 | 6 | 11 | 15 | 25 | 40 | 9 |

- These fees reproduce all four official EEHC examples (§1).
- **Disputed:** Masrawy (4 Aug 2026), copied by Dostor, lists 3/6/12/20/50/60/100 alongside calculations that contradict the regulator (§1). This is a single source with no official backing. **Low confidence; not used.**

## 4. Coded meters (عداد كودي) — high for April, medium for August
- **Flat 274 piasters/kWh** on all consumption, with no tiers ([EgyptERA April 2026](https://egyptera.org/en/TarrifApril2026.aspx)).
- Unchanged in the August 2026 increase, per a sector source ([Egypt Telegraph](https://www.egypttelegraph.com/article/266224/)).
- The coded meter's own service fee isn't published separately. We apply the residential schedule. **Low confidence.**

## 5. Other bill lines
- **Stamp duty:** the household *consumption* stamp exempts homes ("جميع المستهلكين فيماعدا المنازل والصناعيين", every consumer except homes and industrial users). There is an annual *supply* stamp ([EgyptERA](https://egyptera.org/ar/TarrifAug2024.aspx)); its amount is unknown.
- **Cleaning fees and governorate-specific lines** are not in the tariff. The app has an "other charges" field the user can learn from their own bill.
- **Rounding:** no official rule was found. The engine computes exact piasters (kWh is an integer and rates have at most 2 decimals), and golden cases quoted as "approximately" use a ±1 EGP tolerance.

## 6. Prepaid meters
| Fact | Confidence | Sources |
|---|---|---|
| No disconnection on Fridays, official holidays and Eids, or **daily 17:00–10:00**, if the meter's clock and date are set | medium-high | [El Watan, quoting EgyptERA](https://www.elwatannews.com/news/details/8309712), [Youm7 30 May 2026](https://www.youm7.com/story/2026/5/30/%D8%A7%D9%84%D9%83%D9%87%D8%B1%D8%A8%D8%A7%D8%A1-%D8%AA%D8%AD%D8%AF%D8%AF-%D8%A7%D9%84%D8%B3%D8%A7%D8%B9%D8%A7%D8%AA-%D8%A7%D9%84%D8%B5%D8%AF%D9%8A%D9%82%D8%A9-%D8%A7%D9%84%D8%B9%D8%AF%D8%A7%D8%AF-%D8%A7%D9%84%D8%B0%D9%83%D9%89-%D9%84%D8%A7-%D9%8A%D9%81%D8%B5%D9%84-%D9%81%D9%89-%D8%A7%D9%84%D8%A5%D8%AC%D8%A7%D8%B2%D8%A7%D8%AA/7432772), [Masrawy 2023, quoting EgyptERA](https://www.masrawy.com/news/news_egypt/details/2023/1/2/2348978/) |
| Consumption during grace ("reserve balance") is **charged at the next recharge** | medium | [Cairo24](https://www.cairo24.com/2475512), [Al Mal, quoting EEHC](https://almalnews.com/2136548/) |
| Tiers reset at the start of the month **by the meter's own date**; setting the clock doesn't reset them | medium | [El Watan](https://www.elwatannews.com/news/details/8309712), [Vetogate](https://www.vetogate.com/5653340) |
| The first recharge each month deducts fixed items: customer-service fee, cleaning fee, stamps, meter instalments, any emergency loan | medium | [Masrawy 2025](https://www.masrawy.com/news/news_egypt/details/2025/9/8/2850411/), [Vetogate](https://www.vetogate.com/5653340) |
| Balance drains faster late in the month, because each kWh is charged at the current tier | high (follows from §1) | — |

## 7. Open questions (re-check monthly)
1. When EgyptERA publishes the August 2026 table: confirm 2026-07 (C) and raise it to high confidence.
2. Whether 651–1000 is flat (regulator) or progressive (EEHC's 800 kWh example). Bill-mismatch reports after launch will settle it.
3. The coded meter's service fee.
4. Pro-rata rules when a tariff change lands mid-billing-cycle.
