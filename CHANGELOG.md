# Changelog

## addady-v0.2.0: every kind of place, redesign, "اعرف حقك" (2026-10-21)

### Every kind of place, not just homes
- **"مين إنت؟" onboarding** in three short steps: بيت / محل / مكتب أو شركة / مصنع / مزرعة أو ري.
- **Factories:** asked for their supply voltage in plain words ("عداد عادي 380 فولت" / "محول خاص جهد متوسط" / …).
- **Several places per phone,** each with its own class and meter.
- **Everything is priced with the right EgyptERA class:**
  - shops and offices: commercial bands, cliffs at 100 / 250 / 1000 kWh, and the 3 pt/kWh stamp
  - factories: low / medium / high / extra-high voltage, with the industrial stamp
  - irrigation and public lighting
- Coded meters are priced at the coded rate whatever the place.

### Redesign
- **Five bottom tabs:** الرئيسية / قراياتي / أدواتي / اعرف حقك / الإعدادات.
- **Visual language:** a new palette that passes WCAG AA in light and dark (checked by tests), icons always paired with words, and big hero numbers with their meaning in one line.
- **Status cues:** pills that combine colour, icon and word (أمان / خد بالك / خطر). The tier staircase is readable at 200% text.
- **Feedback:** confirmation toasts with a haptic tick after every save.

### New tools
- **ليه رصيدي اتخصم؟** Shows how much of a recharge never reached the meter. It separates the part the published service fees explain from the part to ask the company about (grace debt, tier difference, price differences, instalments).
- **حدود الشرائح:** every cliff for your class, what it costs, and how far you are from it.
- **أسعار الكهربا:** prices for every class in force, with stamps, fees and sources.

### اعرف حقك
- **Ten step-by-step cards,** each with sources, a confidence level and a 121 call button:
  - complain
  - contest a bill
  - meter test
  - self-reading
  - late payment
  - instalments
  - recharge deductions
  - coded → legal meter
  - new meter
  - tampering: the legal risk only, never how-to
- The app never submits anything on your behalf.

### Under the hood
- **Tariff data schema v2** (ADR 012): every class, plus consumption stamps. Re-signed.
  - v0.1 installs ignore the new file safely and keep their bundled prices, which are still current.
- **`eg-electricity-tariff` 0.1.0** on npm: all classes, MIT.
- **Maestro flows** for each onboarding path and the main tools, plus a CI job that runs them on an emulator against the minified release APK.
- **Run-out warnings** now read confirmed official holidays from a data file. It is empty for now: no holiday falls before late December, and an unconfirmed date would make the warning too late.

## addady-v0.1.0: public beta (2026-10-21)

First public beta. Android only, from GitHub Releases.

### What it does
- **Setup in one step:**
  - meter type: prepaid card, postpaid or coded
  - governorate, meter month-start day, low-balance threshold
- **Readings in seconds:** the register for postpaid meters; "this month" kWh plus balance for prepaid. Arabic or Western digits both work.
- **Home screen:**
  - this month's kWh and current tier, on a tier "staircase"
  - what the bill would be today
  - the month-end projection as a range (P10–P90)
  - **cliff warnings**, with the daily kWh budget that keeps you below 100 / 650 / 1000 kWh
- **Prepaid run-out:**
  - when the balance hits zero, and when the meter can actually cut
  - honours Fridays and the 17:00–10:00 window
  - uses the *earliest* plausible time, so you're warned early
- **Bill checker:** the expected bill line by line, with likely causes for any gap.
- **History:** monthly bars with properly shaped Arabic labels.
- **Appliances from their labels,** and **what-if** savings priced with the real tariff.
- **Local notifications** for run-out, cliffs and reading reminders. No server; permission is asked only after the app explains why.
- **CSV export and JSON backup/restore,** through the Android share sheet.
- **Signed tariff updates** (Ed25519) from this repo, with no app update needed.

### Tariffs
- Three sourced versions are bundled: 2024-08, 2026-04 and 2026-07.
- The 2026-07 prices are **medium confidence** until EgyptERA publishes them, so results show "تقديري" (estimated).
- See `docs/research/tariff.md`.

### Known limitations
- Holidays aren't loaded yet, so no-cut holidays are treated as normal days. This errs on the safe side: warnings come earlier, never later.
- Weather-aware projections, household sync and anonymous contributions are planned for v2.
- An English UI isn't available yet.
