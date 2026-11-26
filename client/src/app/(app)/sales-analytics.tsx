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
import { getSalesAnalytics } from '@/services/analyticsService';
import { SalesAnalytics } from '@/types/analytics';

type Period = 'week' | 'month' | 'year' | 'custom';
type Range = { start: string; end: string };
const FULL_WEEKDAYS = ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
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
function quantityLabel(p: {unit: string; quantity_sold: number; total_pieces: number}) {
  return p.unit === 'portion' ? `${formatNumber(p.quantity_sold)} порц. (${formatNumber(p.total_pieces)} шт.)` : `${formatNumber(p.total_pieces)} шт.`;
}
type Ranking = 'quantity' | 'revenue';
type ChartMode = 'sales' | 'orders';

const COLORS = {
  red: '#B83A3A',
  blue: '#527DA8',
  black: '#222222',
  gray: '#888888',
  lightGray: '#F5F5F5',
  border: '#EAEAEA',
  white: '#FFFFFF',
};

const WEEKDAYS = [
  'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс',
];

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatMoney(value: number) {
  return `${Math.round(value).toLocaleString('ru-RU')} ₸`;
}

function formatNumber(value: number) {
  return value.toLocaleString('ru-RU');
}

function shortDate(value: string) {
  const [year, month, day] = value.split('-');

  return `${day}.${month}`;
}

function getPeriodRange(period: Period, offset: number) {
  const now = new Date();

  let start = new Date(now);
  let end = new Date(now);

  if (period === 'week') {
    const weekday = (now.getDay() + 6) % 7;

    start.setDate(now.getDate() - weekday + offset * 7);

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
    start = new Date(now.getFullYear() + offset, 0, 1);
    end = new Date(now.getFullYear() + offset, 11, 31);
  }

  if (end > now) {
    end = now;
  }

  return {
    start: formatDate(start),
    end: formatDate(end),
  };
}

function AnimatedBar({ selected, height, weekday = false }: { selected: boolean; height: number; weekday?: boolean }) {
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
      weekday ? styles.weekdayTrack : styles.chartTrack,
      { backgroundColor: progress.interpolate({ inputRange: [0, 1], outputRange: [COLORS.lightGray, '#F6E6E6'] }) },
    ]}>
      <Animated.View style={[
        weekday ? styles.weekdayBar : styles.chartBar,
        { height, backgroundColor: progress.interpolate({ inputRange: [0, 1], outputRange: ['#BFC5CD', COLORS.red] }) },
      ]} />
    </Animated.View>
  );
}

function GrowthLabel({
  value,
}: {
  value: number | null;
}) {
  if (value === null) {
    return (
      <Text style={styles.growthNeutral}>
        Нет данных для сравнения
      </Text>
    );
  }

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
        size={15}
        color={
          value > 0
            ? COLORS.blue
            : value < 0
              ? COLORS.red
              : COLORS.gray
        }
      />

      <Text
        style={[
          styles.growthText,
          {
            color:
              value > 0
                ? COLORS.blue
                : value < 0
                  ? COLORS.red
                  : COLORS.gray,
          },
        ]}
      >
        {value > 0 ? '+' : ''}
        {value}%
      </Text>
    </View>
  );
}

export default function SalesAnalyticsScreen() {
  const { token } = useAuth();

  const [period, setPeriod] = useState<Period>('month');
  const [offset, setOffset] = useState(0);

  const [ranking, setRanking] =
    useState<Ranking>('quantity');

  const [chartMode, setChartMode] =
    useState<ChartMode>('sales');

  const [data, setData] =
    useState<SalesAnalytics | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [showAllProducts, setShowAllProducts] =
    useState(false);

  const [showAllUnsold, setShowAllUnsold] =
    useState(false);

  const [customRange, setCustomRange] = useState<Range>(() => getPeriodRange('month', 0));
  const [dateModal, setDateModal] = useState(false);
  const [activeDate, setActiveDate] = useState<'start' | 'end'>('start');
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const [dateError, setDateError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedWeekday, setSelectedWeekday] = useState<number | null>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);
  const range = period === 'custom' ? customRange : getPeriodRange(period, offset);
  const today = formatDate(new Date());
  const nextCustom = shiftRange(customRange, 1);
  const canGoNext = period === 'custom' ? nextCustom.end <= today : offset < 0;
  const resetSelection = () => {
    setSelectedDate(null);
    setSelectedWeekday(null);
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

        const result = await getSalesAnalytics(
          token,
          range.start,
          range.end
        );

        if (active) {
          setData(result);
        }
      } catch (err) {
        console.error('Sales analytics error:', err);

        if (active) {
          setError('Не удалось загрузить аналитику');
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
  }, [token, range.start, range.end, reloadKey]);

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

  const products = [...(data?.products || [])].sort(
    (a, b) =>
      ranking === 'quantity'
        ? b.total_pieces - a.total_pieces
        : b.revenue - a.revenue
  );

  const visibleProducts = showAllProducts
    ? products
    : products.slice(0, 5);

  const unsoldProducts = data?.unsold_products || [];

  const visibleUnsold = showAllUnsold
    ? unsoldProducts
    : unsoldProducts.slice(0, 5);

  const leastPopular = [...(data?.products || [])]
    .sort((a, b) => a.total_pieces - b.total_pieces)
    .slice(0, 3);

  const maxProductValue = Math.max(
    1,
    ...products.map((product) =>
      ranking === 'quantity'
        ? product.total_pieces
        : product.revenue
    )
  );

  const dailyDynamics = data?.dynamics || [];

  const grouping = period === 'year' || (period === 'custom' && dayCount(range) > 90)
    ? 'month' : period === 'custom' && dayCount(range) > 31 ? 'week' : 'day';
  const dynamics = Object.values(dailyDynamics.reduce<Record<string, {date: string; end: string; orders_count: number; total_sales: number}>>((acc, item) => {
    const date = parseDate(item.date);
    date.setDate(date.getDate() - (date.getDay()+6)%7);
    const key = grouping === 'month' ? item.date.slice(0,7) : grouping === 'week' ? formatDate(date) : item.date;
    if (!acc[key]) acc[key] = {date: item.date, end: item.date, orders_count: 0, total_sales: 0};
    acc[key].end = item.date;
    acc[key].orders_count += item.orders_count;
    acc[key].total_sales += item.total_sales;
    return acc;
  }, {}));
  const selectedItem =
  dynamics.find(item => item.date === selectedDate) ||
  [...dynamics].reverse().find(item => item.orders_count > 0) ||
  dynamics[dynamics.length - 1];
  const overflow = chartWidth > 0 && contentWidth > chartWidth + 1;
  const thumbWidth = overflow ? chartWidth * chartWidth / contentWidth : chartWidth;
  const thumbOffset = overflow ? Math.max(0, Math.min(1, scrollX / (contentWidth-chartWidth))) * (chartWidth-thumbWidth) : 0;

  const maxDynamics = Math.max(
    1,
    ...dynamics.map((item) =>
      chartMode === 'sales'
        ? item.total_sales
        : item.orders_count
    )
  );

  const maxWeekday = Math.max(
    1,
    ...(data?.weekdays || []).map(
      (item) => item.average_orders
    )
  );

  const busiestDay = [...(data?.weekdays || [])]
    .filter(item => item.days_count > 0)
    .sort((a, b) => b.average_orders - a.average_orders)[0];

  const selectedDay = data?.weekdays.find(item => item.weekday === selectedWeekday && item.days_count > 0) || busiestDay;
  const hasSales = (data?.summary.orders_count || 0) > 0;

  const monthNames = [
    'Янв', 'Фев', 'Мар', 'Апр',
    'Май', 'Июн', 'Июл', 'Авг',
    'Сен', 'Окт', 'Ноя', 'Дек',
  ];

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
          Аналитика продаж
        </Text>

        <Text style={styles.subtitle}>
          Статистика товаров и заказов
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

        {/* Переключение дат */}

        <View style={styles.dateNavigation}>
          <Pressable
            onPress={() => changeOffset(offset - 1)}
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
            onPress={() => changeOffset(offset + 1)}
            style={styles.dateArrow}
          >
            <Ionicons
              name="chevron-forward"
              size={20}
              color={
                !canGoNext
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
            {/* Общая сумма продаж */}

            <View style={styles.mainCard}>
              <View style={styles.mainCardHeader}>
                <Text style={styles.mainCardLabel}>
                  Общая сумма продаж
                </Text>

                <Ionicons
                  name="stats-chart-outline"
                  size={23}
                  color="#BBBBBB"
                />
              </View>

              <Text style={styles.mainCardValue}>
                {formatMoney(data.summary.total_sales)}
              </Text>

              <View style={styles.mainCardBottom}>
                <Text style={styles.mainCardCaption}>
                  Предыдущий период
                </Text>

                <Text style={styles.mainCardPrevious}>
                  {formatMoney(
                    data.previous_period.total_sales
                  )}
                </Text>
              </View>

              <GrowthLabel
                value={data.growth.total_sales}
              />
            </View>

            {/* Основные показатели */}

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Ionicons
                  name="receipt-outline"
                  size={23}
                  color={COLORS.red}
                />

                <Text style={styles.metricLabel}>
                  Завершённые заказы
                </Text>

                <Text style={styles.metricValue}>
                  {data.summary.orders_count}
                </Text>

                <GrowthLabel
                  value={data.growth.orders_count}
                />
              </View>

              <View style={styles.metricCard}>
                <Ionicons
                  name="wallet-outline"
                  size={23}
                  color={COLORS.blue}
                />

                <Text style={styles.metricLabel}>
                  Средний чек
                </Text>

                <Text style={styles.metricValue}>
                  {formatMoney(data.summary.average_check)}
                </Text>

                <GrowthLabel
                  value={data.growth.average_check}
                />
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Ionicons
                  name="person-add-outline"
                  size={23}
                  color={COLORS.gray}
                />

                <Text style={styles.metricLabel}>
                  Новые клиенты
                </Text>

                <Text style={styles.metricValue}>
                  {formatNumber(data.summary.new_clients)}
                </Text>

                <Text style={styles.metricUnit}>
                  {formatNumber(data.summary.new_clients_percentage)}% клиентов
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Ionicons
                  name="people-outline"
                  size={23}
                  color={COLORS.gray}
                />

                <Text style={styles.metricLabel}>
                  Повторные клиенты
                </Text>

                <Text style={styles.metricValue}>
                  {formatNumber(data.summary.repeat_clients)}
                </Text>

                <Text style={styles.metricUnit}>
                  {formatNumber(data.summary.repeat_clients_percentage)}% клиентов
                </Text>
              </View>
            </View>

            {/* Динамика продаж */}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Динамика продаж
              </Text>

              <Text style={styles.sectionSubtitle}>
                Изменение показателей за период
              </Text>

              <View style={styles.smallSelector}>
                <Pressable
                  onPress={() => setChartMode('sales')}
                  style={[
                    styles.smallSelectorButton,
                    chartMode === 'sales' &&
                      styles.smallSelectorActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.smallSelectorText,
                      chartMode === 'sales' &&
                        styles.smallSelectorTextActive,
                    ]}
                  >
                    Сумма продаж
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setChartMode('orders')}
                  style={[
                    styles.smallSelectorButton,
                    chartMode === 'orders' &&
                      styles.smallSelectorActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.smallSelectorText,
                      chartMode === 'orders' &&
                        styles.smallSelectorTextActive,
                    ]}
                  >
                    Заказы
                  </Text>
                </Pressable>
              </View>

              <View style={styles.chartCard}>
                {selectedItem && <View style={styles.selectionInfo}>
                  <Text style={styles.productName}>{shortDate(selectedItem.date)}{selectedItem.end !== selectedItem.date ? ` — ${shortDate(selectedItem.end)}` : ''}</Text>
                  <Text style={styles.metricValue}>{formatMoney(selectedItem.total_sales)}</Text>
                  <Text style={styles.metricUnit}>{selectedItem.orders_count} зак.</Text>
                </View>}
                <Text style={styles.chartMaximum}>
                  {chartMode === 'sales'
                    ? formatMoney(maxDynamics)
                    : `${maxDynamics} зак.`}
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  key={`${range.start}-${range.end}-${grouping}`}
                  onLayout={e => setChartWidth(e.nativeEvent.layout.width)}
                  onContentSizeChange={w => setContentWidth(w)}
                  onScroll={e => setScrollX(e.nativeEvent.contentOffset.x)}
                  scrollEventThrottle={16}
                  contentContainerStyle={
                    styles.chartContent
                  }
                >
                  {dynamics.map((item) => {
                    const value =
                      chartMode === 'sales'
                        ? item.total_sales
                        : item.orders_count;

                    const height =
                      (value / maxDynamics) * 130;

                    return (
                      <Pressable
                        onPress={() => setSelectedDate(item.date)}
                        key={item.date}
                        style={[
                          styles.chartColumn,
                          {
                            width:
                              dynamics.length <= 7
                                ? 40
                                : 28,
                          },
                        ]}
                      >
                        <AnimatedBar selected={selectedItem?.date === item.date} height={Math.max(value > 0 ? 4 : 0, height)} />

                        <Text style={styles.chartDate}>
                          {grouping === 'month'
                            ? monthNames[
                                Number(
                                  item.date.slice(5, 7)
                                ) - 1
                              ]
                            : shortDate(item.date)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                {overflow && <>
                  <View style={styles.scrollTrack}><View style={[styles.scrollThumb, {width: thumbWidth, left: thumbOffset}]} /></View>
                  <Text style={styles.scrollHint}>Листайте для просмотра всех дат</Text>
                </>}
              </View>
            </View>

            {/* Популярные товары */}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Популярные товары
              </Text>

              <Text style={styles.sectionSubtitle}>
                Рейтинг по результатам продаж
              </Text>

              <View style={styles.smallSelector}>
                {(
                  [
                    ['quantity', 'По количеству'],
                    ['revenue', 'По выручке'],
                  ] as const
                ).map(([value, label]) => (
                  <Pressable
                    key={value}
                    onPress={() => setRanking(value)}
                    style={[
                      styles.smallSelectorButton,
                      ranking === value &&
                        styles.smallSelectorActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.smallSelectorText,
                        ranking === value &&
                          styles.smallSelectorTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.listCard}>
                {visibleProducts.length === 0 ? (
                  <Text style={styles.emptyText}>
                    За этот период продаж не было
                  </Text>
                ) : (
                  visibleProducts.map((product, index) => {
                    const value =
                      ranking === 'quantity'
                        ? product.total_pieces
                        : product.revenue;

                    return (
                      <View
                        key={`${product.product_id}-${product.name}-${product.unit}`}
                        style={[
                          styles.productRow,
                          index ===
                            visibleProducts.length - 1 &&
                            styles.lastRow,
                        ]}
                      >
                        <View style={styles.productRank}>
                          <Text style={styles.productRankText}>
                            {String(index + 1).padStart(2, '0')}
                          </Text>
                        </View>

                        <View style={styles.productInfo}>
                          <View style={styles.productHeader}>
                            <Text
                              style={styles.productName}
                              numberOfLines={2}
                            >
                              {product.name}
                            </Text>

                            <Text style={styles.productValue}>
                              {ranking === 'quantity'
                                ? `${formatNumber(product.total_pieces)} шт.`
                                : formatMoney(product.revenue)}
                            </Text>
                          </View>

                          <View style={styles.progressTrack}>
                            <View
                              style={[
                                styles.progressFill,
                                {
                                  width: `${
                                    (value / maxProductValue) *
                                    100
                                  }%`,
                                  backgroundColor:
                                    ranking === 'quantity'
                                      ? COLORS.red
                                      : COLORS.blue,
                                },
                              ]}
                            />
                          </View>

                          <Text style={styles.productCaption}>
                            {product.orders_count} зак.

                            {ranking === 'quantity'
                                ? product.unit === 'portion'
                                ? ` · ${formatNumber(product.quantity_sold)} порц.`
                                : ''
                                : ` · ${quantityLabel(product)}`}
                            </Text>
                        </View>
                      </View>
                    );
                  })
                )}

                {products.length > 5 && (
                  <Pressable
                    style={styles.showAllButton}
                    onPress={() =>
                      setShowAllProducts(!showAllProducts)
                    }
                  >
                    <Text style={styles.link}>
                      {showAllProducts
                        ? 'Свернуть'
                        : `Все товары (${products.length})`}
                    </Text>

                    <Ionicons
                      name={
                        showAllProducts
                          ? 'chevron-up'
                          : 'chevron-down'
                      }
                      size={16}
                      color={COLORS.red}
                    />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Загруженность по дням недели */}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Загруженность
              </Text>

              <Text style={styles.sectionSubtitle}>
                Среднее количество заказов по дням недели
              </Text>

              <View style={styles.chartCard}>
                {selectedDay && <View style={styles.selectionInfo}>
                  <Text style={styles.productName}>{FULL_WEEKDAYS[selectedDay.weekday-1]}</Text>
                  <Text style={styles.metricValue}>{formatNumber(selectedDay.average_orders)} зак. в среднем</Text>
                  <Text style={styles.metricUnit}>Всего: {selectedDay.orders_count} зак.</Text>
                </View>}
                <View style={styles.weekdaysChart}>
                  {data.weekdays.map((item) => {
                    const isBusiest =
                      item.weekday === selectedDay?.weekday;

                    return (
                      <Pressable
                        disabled={item.days_count === 0}
                        onPress={() => setSelectedWeekday(item.weekday)}
                        key={item.weekday}
                        style={styles.weekdayColumn}
                      >
                        <Text style={styles.weekdayCount}>
                          {item.days_count ? formatNumber(item.average_orders) : "—"}
                        </Text>

                        <AnimatedBar weekday selected={isBusiest} height={(item.average_orders / maxWeekday) * 105} />

                        <Text style={styles.weekdayLabel}>
                          {WEEKDAYS[item.weekday - 1]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {hasSales && busiestDay && (
                  <View style={styles.insight}>
                    <Ionicons
                      name="information-circle-outline"
                      size={19}
                      color={COLORS.blue}
                    />

                    <Text style={styles.insightText}>
                      Самый загруженный день недели —{' '}
                      {
                        [
                          'понедельник',
                          'вторник',
                          'среда',
                          'четверг',
                          'пятница',
                          'суббота',
                          'воскресенье',
                        ][busiestDay.weekday - 1]
                      }
                      .
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Товары с низким спросом */}

            {leastPopular.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Товары с низким спросом
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Наименьшее количество проданных изделий
                </Text>

                <View style={styles.listCard}>
                  {leastPopular.map((product, index) => (
                    <View
                      key={`${product.product_id}-${product.name}-${product.unit}`}
                      style={[
                        styles.simpleProductRow,
                        index === leastPopular.length - 1 &&
                          styles.lastRow,
                      ]}
                    >
                      <View style={styles.grayIcon}>
                        <Ionicons
                          name="trending-down-outline"
                          size={20}
                          color={COLORS.gray}
                        />
                      </View>

                      <View style={styles.simpleProductInfo}>
                        <Text style={styles.productName}>
                          {product.name}
                        </Text>

                        <Text style={styles.productCaption}>
                          {quantityLabel(product)} · {product.orders_count} зак.
                        </Text>
                      </View>

                      <Text style={styles.productValue}>
                        {formatNumber(product.total_pieces)} шт.
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Товары без продаж */}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Товары без продаж
              </Text>

              <Text style={styles.sectionSubtitle}>
                Не покупались за выбранный период
              </Text>

              <View style={styles.listCard}>
                {visibleUnsold.length === 0 ? (
                  <Text style={styles.emptyText}>
                    Нет товаров без продаж
                  </Text>
                ) : (
                  visibleUnsold.map((product, index) => (
                    <View
                      key={product.product_id}
                      style={[
                        styles.simpleProductRow,
                        index === visibleUnsold.length - 1 &&
                          styles.lastRow,
                      ]}
                    >
                      <View style={styles.grayIcon}>
                        <Ionicons
                          name="cube-outline"
                          size={20}
                          color={COLORS.gray}
                        />
                      </View>

                      <View style={styles.simpleProductInfo}>
                        <Text style={styles.productName}>
                          {product.name}
                        </Text>
                      </View>

                      <Text style={styles.zeroValue}>
                        0 продаж
                      </Text>
                    </View>
                  ))
                )}

                {unsoldProducts.length > 5 && (
                  <Pressable
                    style={styles.showAllButton}
                    onPress={() =>
                      setShowAllUnsold(!showAllUnsold)
                    }
                  >
                    <Text style={styles.link}>
                      {showAllUnsold
                        ? 'Свернуть'
                        : `Все товары (${unsoldProducts.length})`}
                    </Text>

                    <Ionicons
                      name={
                        showAllUnsold
                          ? 'chevron-up'
                          : 'chevron-down'
                      }
                      size={16}
                      color={COLORS.red}
                    />
                  </Pressable>
                )}
              </View>
            </View>

            <View style={styles.footer}>
              <Ionicons
                name="information-circle-outline"
                size={17}
                color={COLORS.gray}
              />

              <Text style={styles.footerText}>
                Аналитика формируется на основе завершённых
                заказов за выбранный период. Суммы продаж
                рассчитаны с учётом скидок.
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
                <Ionicons name="calendar-outline" size={21} color={activeDate === field ? COLORS.red : COLORS.gray} />
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
  activeDateInput: {borderColor: COLORS.red},
  dateFieldLabel: {fontSize: 12, color: COLORS.gray, marginBottom: 5},
  dateFieldValue: {fontSize: 16, color: COLORS.black, fontWeight: '600'},
  datePicker: {height: 180, alignSelf: 'stretch'},
  dateInput: {backgroundColor: COLORS.lightGray, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8},
  dateError: {color: COLORS.red, fontSize: 12, marginTop: 10},
  applyButton: {backgroundColor: COLORS.black, borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 20},
  applyText: {color: COLORS.white, fontWeight: '600'},

  safeArea: {
    flex: 1,
    backgroundColor: COLORS.white,
  },

  container: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
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
  },

  mainCardLabel: {
    fontSize: 14,
    color: '#CCCCCC',
  },

  mainCardValue: {
    fontSize: 34,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: -1,
    marginTop: 12,
    marginBottom: 20,
  },

  mainCardBottom: {
    borderTopWidth: 1,
    borderTopColor: '#414141',
    paddingTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9,
  },

  mainCardCaption: {
    fontSize: 12,
    color: '#AAAAAA',
  },

  mainCardPrevious: {
    fontSize: 13,
    color: COLORS.white,
    fontWeight: '500',
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
    minHeight: 138,
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

  metricUnit: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 6,
  },

  growthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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

  section: {
    marginTop: 26,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.black,
    letterSpacing: -0.4,
  },

  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 5,
    marginBottom: 15,
  },

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

  chartCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 15,
  },

  chartMaximum: {
    fontSize: 11,
    color: COLORS.gray,
    marginBottom: 10,
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
    marginTop: 8,
  },

  listCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  lastRow: {
    borderBottomWidth: 0,
  },

  productRank: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.lightGray,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  productRankText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
  },

  productInfo: {
    flex: 1,
  },

  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },

  productName: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
  },

  productValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.black,
  },

  progressTrack: {
    height: 5,
    borderRadius: 5,
    backgroundColor: COLORS.lightGray,
    marginTop: 10,
    overflow: 'hidden',
  },

  progressFill: {
    height: 5,
    borderRadius: 5,
  },

  productCaption: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 7,
  },

  showAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },

  link: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.red,
  },

  weekdaysChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },

  weekdayColumn: {
    flex: 1,
    alignItems: 'center',
  },

  weekdayCount: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 8,
  },

  weekdayTrack: {
    width: '100%',
    height: 110,
    backgroundColor: COLORS.lightGray,
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },

  weekdayBar: {
    width: '100%',
    borderRadius: 6,
  },

  weekdayLabel: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 9,
  },

  insight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#F0F4F8',
    borderRadius: 12,
    padding: 12,
    marginTop: 18,
  },

  insightText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#52708E',
  },

  simpleProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  simpleProductInfo: {
    flex: 1,
  },

  grayIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },

  zeroValue: {
    fontSize: 12,
    color: COLORS.gray,
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