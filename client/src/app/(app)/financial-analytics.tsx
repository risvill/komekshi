import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Animated,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { getFinancialAnalytics } from '@/services/analyticsService';
import { FinancialAnalytics } from '@/types/analytics';

type Period = 'week' | 'month' | 'year' | 'custom';
type Range = { start: string; end: string };
function parseDate(value: string) {
  const [y,m,d] = value.split('-').map(Number);
  return new Date(y,m-1,d);
}
function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && formatDate(parseDate(value)) === value;
}
function dayCount(range: Range) {
  return Math.round((Date.parse(range.end)-Date.parse(range.start))/86400000)+1;
}
function shiftRange(range: Range, direction: number): Range {
  const days = dayCount(range);
  const start = parseDate(range.start);
  const end = parseDate(range.end);
  start.setDate(start.getDate()+days*direction);
  end.setDate(end.getDate()+days*direction);
  return {start: formatDate(start), end: formatDate(end)};
}
type ChartMode = 'income' | 'payments';

const COLORS = {
  black: '#222222',
  white: '#FFFFFF',
  gray: '#888888',
  lightGray: '#F5F5F5',
  border: '#EAEAEA',
  red: '#B83A3A',
  blue: '#527DA8',
  lightBlue: '#EDF3F9',
};

const ACCOUNT_COLORS = [
  '#B83A3A',
  '#527DA8',
  '#333333',
  '#A4ABB5',
  '#C99B79',
  '#7B8C85',
];

const MONTHS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString('ru-RU')} ₸`;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function displayDate(value: string) {
  return value.split('-').reverse().join('.');
}

function displayMonth(value: string) {
  const [year, month] = value.split('-');

  return `${MONTHS[Number(month) - 1]} ${year}`;
}

function getPeriodRange(period: Period, offset: number) {
  const now = new Date();

  let start = new Date(now);
  let end = new Date(now);

  if (period === 'week') {
    const weekday = (now.getDay() + 6) % 7;

    start.setDate(
      now.getDate() - weekday + offset * 7
    );

    end = new Date(start);
    end.setDate(start.getDate() + 6);
  }

  if (period === 'month') {
    start = new Date(
      now.getFullYear(),
      now.getMonth() + offset,
      1
    );

    end = new Date(
      now.getFullYear(),
      now.getMonth() + offset + 1,
      0
    );
  }

  if (period === 'year') {
    start = new Date(
      now.getFullYear() + offset,
      0,
      1
    );

    end = new Date(
      now.getFullYear() + offset,
      11,
      31
    );
  }

  if (end > now) {
    end = now;
  }

  return {
    start: formatDate(start),
    end: formatDate(end),
  };
}

function AnimatedBar({ selected, height }: { selected: boolean; height: number }) {
  const progress = useRef(new Animated.Value(selected ? 1 : 0)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: selected ? 1 : 0,
      duration: 240,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [selected, progress]);
  return (
    <Animated.View style={[
      styles.chartTrack,
      { backgroundColor: progress.interpolate({ inputRange: [0, 1], outputRange: [COLORS.lightGray, '#E4EDF6'] }) },
    ]}>
      <Animated.View style={[
        styles.chartBar,
        { height, backgroundColor: progress.interpolate({ inputRange: [0, 1], outputRange: ['#BFC5CD', COLORS.blue] }) },
      ]} />
    </Animated.View>
  );
}

function GrowthLabel({
  value,
  dark = false,
}: {
  value: number | null;
  dark?: boolean;
}) {
  if (value === null) {
    return (
      <Text
        style={[
          styles.growthNeutral,
          dark && { color: '#AAAAAA' },
        ]}
      >
        Нет данных для сравнения
      </Text>
    );
  }

  const color =
    value > 0
      ? dark
        ? '#A6C9EF'
        : COLORS.blue
      : value < 0
        ? dark
          ? '#F2A3A3'
          : COLORS.red
        : COLORS.gray;

  return (
    <View style={styles.growthRow}>
      <Ionicons
        name={
          value > 0
            ? 'trending-up'
            : value < 0
              ? 'trending-down'
              : 'remove'
        }
        size={17}
        color={color}
      />

      <Text
        style={[
          styles.growthText,
          { color },
        ]}
      >
        {value > 0 ? '+' : ''}
        {value}%
      </Text>
    </View>
  );
}

export default function FinancialAnalyticsScreen() {
  const { token } = useAuth();

  const [period, setPeriod] =
    useState<Period>('month');

  const [offset, setOffset] = useState(0);

  const [data, setData] =
    useState<FinancialAnalytics | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [chartMode, setChartMode] = useState<ChartMode>('income');
  const [customRange, setCustomRange] = useState<Range>(() => getPeriodRange('month', 0));
  const [dateModal, setDateModal] = useState(false);
  const [activeDate, setActiveDate] = useState<'start' | 'end'>('start');
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const [dateError, setDateError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);
  const range = period === 'custom' ? customRange : getPeriodRange(period, offset);
  const today = formatDate(new Date());
  const nextCustom = shiftRange(customRange, 1);
  const canGoNext = period === 'custom' ? nextCustom.end <= today : offset < 0;
  const resetSelection = () => {
    setSelectedDate(null);
    setScrollX(0);
  };
  const prepareRange = (next: Range) => {
    if (next.start !== range.start || next.end !== range.end) setLoading(true);
    resetSelection();
  };
  const openDates = () => {
    setActiveDate('start');
    setDraftStart(range.start);
    setDraftEnd(range.end);
    setDateError('');
    setDateModal(true);
  };
  const applyDates = () => {
    if (!validDate(draftStart) || !validDate(draftEnd) || draftStart > draftEnd || draftEnd > today) {
      setDateError('Выберите корректный период, не позднее сегодняшнего дня.');
      return;
    }
    const next = {start: draftStart, end: draftEnd};
    prepareRange(next);
    setCustomRange(next);
    setPeriod('custom');
    setOffset(0);
    setDateModal(false);
  };

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    let active = true;

    const loadAnalytics = async () => {
      try {
        setError('');

        const result = await getFinancialAnalytics(
          token,
          range.start,
          range.end
        );

        if (active) {
          setData(result);
        }
      } catch (err) {
        console.error(
          'Financial analytics error:',
          err
        );

        if (active) {
          setError(
            'Не удалось загрузить финансовую аналитику'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    loadAnalytics();

    return () => {
      active = false;
    };
  }, [
    token,
    range.start,
    range.end,
    reloadKey,
  ]);

  const changePeriod = (value: Period) => {
    if (period === value && offset === 0) return;
    prepareRange(getPeriodRange(value, 0));
    setPeriod(value);
    setOffset(0);
  };

  const changeOffset = (value: number) => {
    if (period === 'custom') {
      const next = shiftRange(customRange, value < offset ? -1 : 1);
      if (next.end > today) return;
      prepareRange(next);
      setCustomRange(next);
      return;
    }
    if (value > 0 || value === offset) return;
    prepareRange(getPeriodRange(period, value));
    setOffset(value);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setReloadKey((value) => value + 1);
  };

  const dailyDynamics = data?.dynamics || [];

  const grouping = period === 'year' || (period === 'custom' && dayCount(range) > 90)
    ? 'month' : period === 'custom' && dayCount(range) > 31 ? 'week' : 'day';
  const dynamics = Object.values(dailyDynamics.reduce<Record<string, {date: string; end: string; payments_count: number; total_income: number}>>((acc, item) => {
    const date = parseDate(item.date);
    date.setDate(date.getDate() - (date.getDay()+6)%7);
    const key = grouping === 'month' ? item.date.slice(0,7) : grouping === 'week' ? formatDate(date) : item.date;
    if (!acc[key]) acc[key] = {date: item.date, end: item.date, payments_count: 0, total_income: 0};
    acc[key].end = item.date;
    acc[key].payments_count += item.payments_count;
    acc[key].total_income += item.total_income;
    return acc;
  }, {}));
  const selectedIncome =
  dynamics.find(item => item.date === selectedDate) ||
  [...dynamics].reverse().find(item => item.total_income > 0) ||
  dynamics[dynamics.length - 1];
  const overflow = chartWidth > 0 && contentWidth > chartWidth + 1;
  const thumbWidth = overflow ? chartWidth * chartWidth / contentWidth : chartWidth;
  const thumbOffset = overflow ? Math.max(0, Math.min(1, scrollX / (contentWidth-chartWidth))) * (chartWidth-thumbWidth) : 0;

  const maxDynamics = Math.max(0, ...dynamics.map(item => chartMode === 'income' ? item.total_income : item.payments_count));
  const chartLabel = (date: string) => grouping === 'month' ? MONTHS[Number(date.slice(5, 7)) - 1].slice(0, 3) : date.slice(8, 10) + '.' + date.slice(5, 7);

  const forecastProgress =
    data && data.forecast.predicted_income > 0
      ? Math.min(
          100,
          Math.max(
            0,
            data.forecast.current_month_income /
              data.forecast.predicted_income *
              100
          )
        )
      : 0;

  const forecastRemaining = data
    ? Math.max(
        0,
        data.forecast.predicted_income -
          data.forecast.current_month_income
      )
    : 0;

  const outstanding = data?.outstanding;

  const activeOutstandingPercentage =
    outstanding &&
    outstanding.total_outstanding > 0
      ? outstanding.active_orders_outstanding /
        outstanding.total_outstanding *
        100
      : 0;

  const completedDebtPercentage =
    outstanding &&
    outstanding.total_outstanding > 0
      ? outstanding.completed_orders_debt /
        outstanding.total_outstanding *
        100
      : 0;

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.red}
          />
        }
      >
        {/* Навигация */}

        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={10}
        >
          <Ionicons
            name="chevron-back"
            size={25}
            color="#555555"
          />
        </Pressable>

        <Text style={styles.title}>
          Финансовая аналитика
        </Text>

        <Text style={styles.subtitle}>
          Доходы и денежные поступления
        </Text>

        {/* Выбор периода */}

        <View style={styles.periodSelector}>
          {(
            [
              ['week', 'Неделя'],
              ['month', 'Месяц'],
              ['year', 'Год'],
            ] as const
          ).map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => changePeriod(value)}
              style={[
                styles.periodButton,
                period === value &&
                  styles.periodButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  period === value &&
                    styles.periodButtonTextActive,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.dateNavigation}>
          <Pressable
            onPress={() =>
              changeOffset(offset - 1)
            }
            style={styles.dateArrow}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={COLORS.black}
            />
          </Pressable>

          <Pressable style={styles.dateLabel} onPress={openDates}>
            <Ionicons
              name="calendar-outline"
              size={17}
              color={COLORS.gray}
            />

            <Text style={styles.dateText}>
              {range.start.split('-').reverse().join('.')}
              {' — '}
              {range.end.split('-').reverse().join('.')}
            </Text>
          </Pressable>

          <Pressable
            disabled={!canGoNext}
            onPress={() =>
              changeOffset(offset + 1)
            }
            style={styles.dateArrow}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={
                offset === 0
                  ? '#D5D5D5'
                  : COLORS.black
              }
            />
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={COLORS.red}
            />
          </View>
        ) : error ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={35}
              color={COLORS.gray}
            />

            <Text style={styles.emptyText}>
              {error}
            </Text>

            <Pressable onPress={handleRefresh}>
              <Text style={styles.link}>
                Попробовать снова
              </Text>
            </Pressable>
          </View>
        ) : data ? (
          <>
            {/* Общая сумма поступлений */}

            <View style={styles.mainCard}>
              <View style={styles.mainCardHeader}>
                <Text style={styles.mainCardLabel}>
                  Общая сумма поступлений
                </Text>

                <Ionicons
                  name="wallet-outline"
                  size={24}
                  color="#BBBBBB"
                />
              </View>

              <Text style={styles.mainCardValue}>
                {formatMoney(
                  data.summary.total_income
                )}
              </Text>

              <GrowthLabel
                value={data.growth.total_income}
                dark
              />

              <View style={styles.mainDivider} />

              <View style={styles.betweenRow}>
                <Text style={styles.mainCardCaption}>
                  Предыдущий период
                </Text>

                <Text style={styles.mainCardPrevious}>
                  {formatMoney(
                    data.previous_period.total_income
                  )}
                </Text>
              </View>

              <View style={styles.betweenRow}>
                <Text style={styles.mainCardCaption}>
                  Разница
                </Text>

                <Text style={styles.mainCardPrevious}>
                  {data.summary.total_income -
                    data.previous_period.total_income > 0
                    ? '+'
                    : ''}

                  {formatMoney(
                    data.summary.total_income -
                      data.previous_period.total_income
                  )}
                </Text>
              </View>
            </View>

            {/* Дополнительные показатели */}

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Ionicons
                  name="trending-up-outline"
                  size={24}
                  color={COLORS.blue}
                />

                <Text style={styles.metricLabel}>
                  Средний доход в день
                </Text>

                <Text style={styles.metricValue}>
                  {formatMoney(
                    data.summary.average_daily_income
                  )}
                </Text>

                <GrowthLabel
                  value={
                    data.growth.average_daily_income
                  }
                />
              </View>

              <View style={styles.metricCard}>
                <Ionicons
                  name="card-outline"
                  size={24}
                  color={COLORS.red}
                />

                <Text style={styles.metricLabel}>
                  Количество оплат
                </Text>

                <Text style={styles.metricValue}>
                  {data.summary.payments_count}
                </Text>

                <GrowthLabel
                  value={data.growth.payments_count}
                />
              </View>
            </View>

            {/* Динамика доходов */}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Динамика доходов
              </Text>

              <Text style={styles.sectionSubtitle}>
                Фактические денежные поступления
              </Text>

              <View style={styles.smallSelector}>
                {([['income', 'Сумма поступлений'], ['payments', 'Оплаты']] as const).map(([value, label]) => (
                  <Pressable key={value} onPress={() => setChartMode(value)} style={[styles.smallSelectorButton, chartMode === value && styles.smallSelectorActive]}>
                    <Text style={[styles.smallSelectorText, chartMode === value && styles.smallSelectorTextActive]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.chartCard}>
                {selectedIncome && <View style={styles.selectionInfo}>
                  <Text style={styles.selectionDate}>{grouping === 'month' ? displayMonth(selectedIncome.date.slice(0, 7)) : displayDate(selectedIncome.date)}{grouping === 'week' && selectedIncome.end !== selectedIncome.date ? ` — ${displayDate(selectedIncome.end)}` : ''}</Text>
                  <Text style={styles.chartValue}>{formatMoney(selectedIncome.total_income)}</Text>
                  <Text style={styles.chartCaption}>Оплат: {selectedIncome.payments_count}</Text>
                </View>}
                <Text style={styles.chartMaximum}>{chartMode === 'income' ? formatMoney(maxDynamics) : `Оплат: ${maxDynamics}`}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  key={`${range.start}-${range.end}-${grouping}`}
                  onLayout={e => setChartWidth(e.nativeEvent.layout.width)}
                  onContentSizeChange={w => setContentWidth(w)}
                  onScroll={e => setScrollX(e.nativeEvent.contentOffset.x)}
                  scrollEventThrottle={16} contentContainerStyle={styles.chartContent}>
                  {dynamics.map(item => {
                    const value = chartMode === 'income' ? item.total_income : item.payments_count;
                    const height = maxDynamics > 0 ? value / maxDynamics * 130 : 0;
                    return <Pressable key={item.date} onPress={() => setSelectedDate(item.date)} style={[styles.chartColumn, {width: dynamics.length <= 7 ? 40 : 28}]}>
                      <AnimatedBar selected={selectedIncome?.date === item.date} height={Math.max(value > 0 ? 4 : 0, height)} />
                      <Text style={styles.chartDate}>{chartLabel(item.date)}</Text>
                    </Pressable>;
                  })}
                </ScrollView>
                {overflow && <>
                  <View style={styles.scrollTrack}><View style={[styles.scrollThumb, {width: thumbWidth, left: thumbOffset}]} /></View>
                  <Text style={styles.scrollHint}>Листайте для просмотра всех дат</Text>
                </>}
              </View>
            </View>

            {/* Прогноз дохода */}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Прогноз дохода
              </Text>

              <Text style={styles.sectionSubtitle}>
                До конца текущего месяца
              </Text>

              <View style={styles.forecastCard}>
                <View style={styles.betweenRow}>
                  <Text style={styles.forecastLabel}>
                    Ожидаемый доход за месяц
                  </Text>

                  <Ionicons
                    name="analytics-outline"
                    size={25}
                    color={COLORS.blue}
                  />
                </View>

                <Text style={styles.forecastValue}>
                  {formatMoney(
                    data.forecast.predicted_income
                  )}
                </Text>

                <View style={styles.forecastTrack}>
                  <View
                    style={[
                      styles.forecastFill,
                      {
                        width: `${forecastProgress}%`,
                      },
                    ]}
                  />
                </View>

                <View style={styles.betweenRow}>
                  <Text style={styles.forecastProgressText}>
                    {Math.round(forecastProgress)}%
                    {' от прогноза'}
                  </Text>

                  <Text style={styles.forecastProgressText}>
                    {data.forecast.elapsed_days}
                    {' из '}
                    {data.forecast.total_days}
                    {' дней'}
                  </Text>
                </View>

                <View style={styles.forecastDivider} />

                <View style={styles.betweenRow}>
                  <Text style={styles.forecastDetailLabel}>
                    Уже поступило
                  </Text>

                  <Text style={styles.forecastDetailValue}>
                    {formatMoney(
                      data.forecast.current_month_income
                    )}
                  </Text>
                </View>

                <View style={styles.betweenRow}>
                  <Text style={styles.forecastDetailLabel}>
                    Прогноз оставшихся поступлений
                  </Text>

                  <Text style={styles.forecastDetailValue}>
                    {formatMoney(forecastRemaining)}
                  </Text>
                </View>

                <View style={styles.betweenRow}>
                  <Text style={styles.forecastDetailLabel}>
                    Средний доход в день
                  </Text>

                  <Text style={styles.forecastDetailValue}>
                    {formatMoney(
                      data.forecast.average_daily_income
                    )}
                  </Text>
                </View>

                <View style={styles.forecastInfo}>
                  <Ionicons
                    name="information-circle-outline"
                    size={18}
                    color={COLORS.blue}
                  />

                  <Text style={styles.forecastInfoText}>
                    Прогноз рассчитывается при сохранении
                    текущего темпа поступлений.
                  </Text>
                </View>
              </View>
            </View>

            {/* Ожидаемые поступления */}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Ожидаемые поступления
              </Text>

              <Text style={styles.sectionSubtitle}>
                Неоплаченный остаток по всем заказам
              </Text>

              <View style={styles.outstandingCard}>
                <View style={styles.betweenRow}>
                  <Text style={styles.outstandingLabel}>
                    Общая сумма к получению
                  </Text>

                  <Ionicons
                    name="time-outline"
                    size={24}
                    color={COLORS.red}
                  />
                </View>

                <Text style={styles.outstandingValue}>
                  {formatMoney(
                    data.outstanding.total_outstanding
                  )}
                </Text>

                <Text style={styles.outstandingCaption}>
                  Заказов с остатком к оплате:{' '}
                  {data.outstanding.unpaid_orders_count}
                </Text>

                <View style={styles.outstandingTrack}>
                  <View
                    style={{
                      width:
                        `${activeOutstandingPercentage}%`,
                      backgroundColor: COLORS.blue,
                      height: '100%',
                    }}
                  />

                  <View
                    style={{
                      width:
                        `${completedDebtPercentage}%`,
                      backgroundColor: COLORS.red,
                      height: '100%',
                    }}
                  />
                </View>

                <View style={styles.outstandingRow}>
                  <View
                    style={[
                      styles.legendDot,
                      {
                        backgroundColor: COLORS.blue,
                      },
                    ]}
                  />

                  <View style={styles.flex}>
                    <Text style={styles.rowTitle}>
                      Активные заказы
                    </Text>

                    <Text style={styles.rowSubtitle}>
                      Ожидаемые оплаты
                    </Text>
                  </View>

                  <Text style={styles.outstandingRowValue}>
                    {formatMoney(
                      data.outstanding
                        .active_orders_outstanding
                    )}
                  </Text>
                </View>

                <View style={styles.outstandingRow}>
                  <View
                    style={[
                      styles.legendDot,
                      {
                        backgroundColor: COLORS.red,
                      },
                    ]}
                  />

                  <View style={styles.flex}>
                    <Text style={styles.rowTitle}>
                      Завершённые заказы
                    </Text>

                    <Text style={styles.rowSubtitle}>
                      Неоплаченный остаток
                    </Text>
                  </View>

                  <Text style={styles.outstandingRowValue}>
                    {formatMoney(
                      data.outstanding
                        .completed_orders_debt
                    )}
                  </Text>
                </View>
              </View>
            </View>

            {/* Распределение по счетам */}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Поступления по счетам
              </Text>

              <Text style={styles.sectionSubtitle}>
                Распределение доходов за выбранный период
              </Text>

              <View style={styles.accountsCard}>
                {data.accounts.length === 0 ? (
                  <Text style={styles.emptyText}>
                    За этот период поступлений не было
                  </Text>
                ) : (
                  <>
                    <View style={styles.accountTotal}>
                      <Text style={styles.accountTotalLabel}>
                        Всего поступило
                      </Text>

                      <Text style={styles.accountTotalValue}>
                        {formatMoney(
                          data.summary.total_income
                        )}
                      </Text>
                    </View>

                    <View style={styles.accountsTrack}>
                      {data.accounts.map(
                        (account, index) => (
                          <View
                            key={account.account_id}
                            style={{
                              flex: Math.max(
                                0,
                                account.total_income
                              ),

                              height: '100%',

                              backgroundColor:
                                ACCOUNT_COLORS[
                                  index %
                                    ACCOUNT_COLORS.length
                                ],
                            }}
                          />
                        )
                      )}
                    </View>

                    {data.accounts.map(
                      (account, index) => {
                        const color =
                          ACCOUNT_COLORS[
                            index %
                              ACCOUNT_COLORS.length
                          ];

                        return (
                          <View
                            key={account.account_id}
                            style={[
                              styles.accountRow,

                              index ===
                                data.accounts.length - 1 &&
                                styles.lastRow,
                            ]}
                          >
                            <View
                              style={[
                                styles.accountIcon,
                                {
                                  backgroundColor:
                                    `${color}15`,
                                },
                              ]}
                            >
                              <Ionicons
                                name={
                                  account.type === 'CASH'
                                    ? 'cash-outline'
                                    : 'card-outline'
                                }
                                size={22}
                                color={color}
                              />
                            </View>

                            <View style={styles.flex}>
                              <Text style={styles.rowTitle}>
                                {account.name}
                              </Text>

                              <Text style={styles.rowSubtitle}>
                                {account.payments_count}
                                {' оплат'}

                                {!account.is_active
                                  ? ' · Архив'
                                  : ''}
                              </Text>
                            </View>

                            <View style={styles.accountRight}>
                              <Text style={styles.accountAmount}>
                                {formatMoney(
                                  account.total_income
                                )}
                              </Text>

                              <Text
                                style={[
                                  styles.accountPercentage,
                                  { color },
                                ]}
                              >
                                {account.percentage}%
                              </Text>
                            </View>
                          </View>
                        );
                      }
                    )}
                  </>
                )}
              </View>
            </View>

            {/* Финансовые рекорды */}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Лучшие результаты
              </Text>

              <Text style={styles.sectionSubtitle}>
                Максимальные поступления за выбранный период
              </Text>

              <View style={styles.recordsCard}>
                <View style={styles.recordRow}>
                  <View
                    style={[
                      styles.recordIcon,
                      {
                        backgroundColor: '#EDF3F9',
                      },
                    ]}
                  >
                    <Ionicons
                      name="sunny-outline"
                      size={24}
                      color={COLORS.blue}
                    />
                  </View>

                  <View style={styles.flex}>
                    <Text style={styles.recordLabel}>
                      Самый доходный день
                    </Text>

                    <Text style={styles.recordValue}>
                      {data.best_day
                        ? formatMoney(
                            data.best_day.total_income
                          )
                        : '—'}
                    </Text>

                    <Text style={styles.recordDate}>
                      {data.best_day
                        ? displayDate(data.best_day.date)
                        : 'Нет поступлений'}
                    </Text>
                  </View>
                </View>

                <View style={styles.recordDivider} />

                <View style={styles.recordRow}>
                  <View
                    style={[
                      styles.recordIcon,
                      {
                        backgroundColor: '#F8EEEE',
                      },
                    ]}
                  >
                    <Ionicons
                      name="trophy-outline"
                      size={24}
                      color={COLORS.red}
                    />
                  </View>

                  <View style={styles.flex}>
                    <Text style={styles.recordLabel}>
                      Самый доходный месяц
                    </Text>

                    <Text style={styles.recordValue}>
                      {data.best_month
                        ? formatMoney(
                            data.best_month.total_income
                          )
                        : '—'}
                    </Text>

                    <Text style={styles.recordDate}>
                      {data.best_month
                        ? displayMonth(
                            data.best_month.month
                          )
                        : 'Нет поступлений'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Информация */}

            <View style={styles.footer}>
              <Ionicons
                name="information-circle-outline"
                size={17}
                color={COLORS.gray}
              />

              <Text style={styles.footerText}>
                Финансовая аналитика формируется на основе
                фактических оплат по дате поступления.
                Прогноз относится к текущему месяцу,
                а ожидаемые поступления учитывают все
                актуальные неоплаченные заказы независимо
                от выбранного периода.
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
      <Modal visible={dateModal} transparent animationType="slide" onRequestClose={() => setDateModal(false)}>
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDateModal(false)} />
          <SafeAreaView edges={['bottom']} style={styles.modalCard}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sectionTitle}>Выбор периода</Text>
              <Pressable hitSlop={12} onPress={() => setDateModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.gray} />
              </Pressable>
            </View>
            <Text style={styles.sectionSubtitle}>Выберите начало и конец периода</Text>
            {(['start', 'end'] as const).map(field => (
              <Pressable key={field} onPress={() => setActiveDate(field)} style={[styles.dateInput, activeDate === field && styles.activeDateInput]}>
                <View>
                  <Text style={styles.dateFieldLabel}>{field === 'start' ? 'Дата начала' : 'Дата окончания'}</Text>
                  <Text style={styles.dateFieldValue}>{parseDate(field === 'start' ? draftStart : draftEnd).toLocaleDateString('ru-RU', {day: 'numeric', month: 'long', year: 'numeric'})}</Text>
                </View>
                <Ionicons name="calendar-outline" size={21} color={activeDate === field ? COLORS.blue : COLORS.gray} />
              </Pressable>
            ))}
            {dateModal && <DateTimePicker
              key={activeDate}
              value={parseDate(activeDate === 'start' ? draftStart : draftEnd)}
              mode="date"
              display="spinner"
              locale="ru-RU"
              themeVariant="light"
              minimumDate={activeDate === 'end' ? parseDate(draftStart) : undefined}
              maximumDate={parseDate(today)}
              onChange={(_, date) => {
                if (!date) return;
                const value = formatDate(date);
                setDateError('');
                if (activeDate === 'start') {
                  setDraftStart(value);
                  if (value > draftEnd) setDraftEnd(value);
                } else {
                  setDraftEnd(value < draftStart ? draftStart : value);
                }
              }}
              style={styles.datePicker}
            />}
            {!!dateError && <Text style={styles.dateError}>{dateError}</Text>}
            <Pressable style={styles.applyButton} onPress={applyDates}><Text style={styles.applyText}>Применить</Text></Pressable>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  selectionInfo: {marginBottom: 14, gap: 3},
  
  scrollTrack: {height: 3, backgroundColor: COLORS.lightGray, borderRadius: 3, marginTop: 12},
  scrollThumb: {position: 'absolute', height: 3, backgroundColor: '#A9A9A9', borderRadius: 3},
  scrollHint: {fontSize: 10, color: COLORS.gray, textAlign: 'center', marginTop: 7},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end'},
  modalCard: {backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20},
  sheetHandle: {width: 36, height: 4, borderRadius: 2, backgroundColor: '#CCCCCC', alignSelf: 'center', marginBottom: 20},
  sheetHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  activeDateInput: {borderColor: COLORS.blue},
  dateFieldLabel: {fontSize: 12, color: COLORS.gray, marginBottom: 5},
  dateFieldValue: {fontSize: 16, color: COLORS.black, fontWeight: '600'},
  datePicker: {height: 180, alignSelf: 'stretch'},
  dateInput: {backgroundColor: COLORS.lightGray, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8},
  dateError: {color: COLORS.blue, fontSize: 12, marginTop: 10},
  applyButton: {backgroundColor: COLORS.black, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 20},
  applyText: {color: COLORS.white, fontWeight: '600'},

  smallSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },

  smallSelectorButton: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },

  smallSelectorActive: {
    backgroundColor: COLORS.black,
  },

  smallSelectorText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.gray,
  },

  smallSelectorTextActive: {
    color: COLORS.white,
  },

  chartMaximum: {
    fontSize: 11,
    color: COLORS.gray,
    marginBottom: 10,
  },

  selectionDate: {fontSize: 14, fontWeight: '600', color: COLORS.black},

  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  container: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },

  flex: {
    flex: 1,
  },

  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 24,
  },

  title: {
    fontSize: 29,
    fontWeight: '700',
    color: COLORS.black,
    letterSpacing: -0.8,
  },

  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 6,
    marginBottom: 24,
  },

  periodSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.lightGray,
    borderRadius: 13,
    padding: 4,
  },

  periodButton: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderRadius: 10,
  },

  periodButtonActive: {
    backgroundColor: COLORS.black,
  },

  periodButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.gray,
  },

  periodButtonTextActive: {
    color: COLORS.white,
    fontWeight: '600',
  },

  dateNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 18,
  },

  dateArrow: {
    width: 32,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dateLabel: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  dateText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.black,
  },

  mainCard: {
    backgroundColor: COLORS.black,
    borderRadius: 22,
    padding: 22,
    marginBottom: 14,
  },

  mainCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },

  mainCardLabel: {
    flex: 1,
    fontSize: 14,
    color: '#CCCCCC',
  },

  mainCardValue: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -1.2,
    marginTop: 14,
    marginBottom: 4,
  },

  mainDivider: {
    height: 1,
    backgroundColor: '#414141',
    marginVertical: 16,
  },

  betweenRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },

  mainCardCaption: {
    flexShrink: 1,
    fontSize: 12,
    color: '#AAAAAA',
  },

  mainCardPrevious: {
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '600',
  },

  growthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 7,
  },

  growthText: {
    fontSize: 12,
    fontWeight: '600',
  },

  growthNeutral: {
    fontSize: 10,
    color: COLORS.gray,
    marginTop: 7,
  },

  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },

  metricCard: {
    flex: 1,
    backgroundColor: COLORS.lightGray,
    borderRadius: 18,
    padding: 15,
    minHeight: 140,
  },

  metricLabel: {
    fontSize: 12,
    color: '#777777',
    marginTop: 12,
    marginBottom: 7,
  },

  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.black,
    letterSpacing: -0.5,
  },

  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
  },

  rowSubtitle: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 5,
  },

  section: {
    marginTop: 28,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.black,
    letterSpacing: -0.4,
  },

  sectionSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.gray,
    marginTop: 5,
    marginBottom: 15,
  },

  chartCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 15,
  },

  chartCaption: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 6,
  },

  chartValue: {
    fontSize: 23,
    fontWeight: '700',
    color: COLORS.black,
  },

  chartContent: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 8,
  },

  chartColumn: {
    alignItems: 'center',
  },

  chartTrack: {
    height: 140,
    width: '100%',
    backgroundColor: COLORS.lightGray,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },

  chartBar: {
    width: '100%',
    borderRadius: 5,
  },

  chartDate: {
    fontSize: 9,
    color: COLORS.gray,
    marginTop: 9,
  },

  forecastCard: {
    backgroundColor: COLORS.lightBlue,
    borderRadius: 20,
    padding: 20,
  },

  forecastLabel: {
    flex: 1,
    fontSize: 13,
    color: '#52708E',
    fontWeight: '500',
  },

  forecastValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.black,
    letterSpacing: -0.8,
    marginTop: 8,
    marginBottom: 22,
  },

  forecastTrack: {
    height: 10,
    borderRadius: 6,
    backgroundColor: '#D9E4F0',
    overflow: 'hidden',
    marginBottom: 10,
  },

  forecastFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: COLORS.blue,
  },

  forecastProgressText: {
    fontSize: 11,
    color: '#52708E',
  },

  forecastDivider: {
    height: 1,
    backgroundColor: '#D9E4F0',
    marginVertical: 16,
  },

  forecastDetailLabel: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: '#52708E',
  },

  forecastDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.black,
  },

  forecastInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 16,
  },

  forecastInfoText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: '#52708E',
  },

  outstandingCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 20,
  },

  outstandingLabel: {
    flex: 1,
    fontSize: 13,
    color: COLORS.gray,
  },

  outstandingValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.black,
    letterSpacing: -0.8,
    marginTop: 8,
  },

  outstandingCaption: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 8,
    marginBottom: 20,
  },

  outstandingTrack: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 6,
    backgroundColor: COLORS.lightGray,
    overflow: 'hidden',
    marginBottom: 18,
  },

  outstandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
  },

  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  outstandingRowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.black,
  },

  accountsCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 16,
  },

  accountTotal: {
    marginBottom: 18,
  },

  accountTotalLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 7,
  },

  accountTotalValue: {
    fontSize: 25,
    fontWeight: '700',
    color: COLORS.black,
  },

  accountsTrack: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
    overflow: 'hidden',
    marginBottom: 12,
  },

  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  lastRow: {
    borderBottomWidth: 0,
  },

  accountIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  accountRight: {
    alignItems: 'flex-end',
  },

  accountAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
  },

  accountPercentage: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
  },

  recordsCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 18,
  },

  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    paddingVertical: 6,
  },

  recordIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },

  recordLabel: {
    fontSize: 12,
    color: COLORS.gray,
  },

  recordValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.black,
    marginTop: 6,
  },

  recordDate: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 5,
  },

  recordDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 17,
  },

  loadingContainer: {
    paddingVertical: 80,
    alignItems: 'center',
  },

  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    gap: 12,
  },

  emptyText: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
    paddingVertical: 18,
  },

  link: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.red,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 26,
  },

  footerText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 17,
    color: COLORS.gray,
  },
});